import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const register = async (req, res) => {
  try {
    const { full_name, email, phone, password, face_descriptor, face_photo } = req.body;

    if (!full_name || !email || !password) {
      return errorResponse(res, 'Full legal name, email address, and password are required', 400);
    }

    // Strict Facial Biometric Validation: Must be a genuine 128-d human face scan
    if (!face_descriptor || !face_photo) {
      return errorResponse(res, 'Valid live facial biometric scan is required to register. Please scan your face via webcam.', 400);
    }

    let parsedDescriptor = face_descriptor;
    if (typeof face_descriptor === 'string') {
      try {
        parsedDescriptor = JSON.parse(face_descriptor);
      } catch {
        return errorResponse(res, 'Invalid biometric face descriptor format', 400);
      }
    }

    if (!Array.isArray(parsedDescriptor) || parsedDescriptor.length !== 128) {
      return errorResponse(res, 'Biometric scan rejected: must contain a valid 128-dimensional facial embedding vector.', 400);
    }

    const isValidFloats = parsedDescriptor.every(n => typeof n === 'number' && !isNaN(n) && isFinite(n));
    const nonZeroCount = parsedDescriptor.filter(n => Math.abs(n) > 0.0001).length;
    if (!isValidFloats || nonZeroCount < 30) {
      return errorResponse(res, 'Biometric scan rejected: no valid human face was detected.', 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Strict Unique Email Validation
    const existingEmail = db.prepare('SELECT id FROM voters WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingEmail) {
      return errorResponse(res, 'This email address is already registered. Please sign in or use a different email.', 409);
    }

    // 2. Strict Biometric Deduplication Check (Prevent duplicate registrations by the same person)
    const registeredFaces = db.prepare(`
      SELECT fd.voter_id, fd.face_descriptor, v.full_name, v.voter_id_number 
      FROM face_data fd
      JOIN voters v ON fd.voter_id = v.id
      WHERE fd.face_descriptor IS NOT NULL
    `).all();

    for (const record of registeredFaces) {
      try {
        const storedDescriptor = JSON.parse(record.face_descriptor);
        if (Array.isArray(storedDescriptor) && storedDescriptor.length === 128) {
          let sumSquares = 0;
          for (let i = 0; i < 128; i++) {
            const diff = storedDescriptor[i] - parsedDescriptor[i];
            sumSquares += diff * diff;
          }
          const distance = Math.sqrt(sumSquares);

          // Threshold 0.48: Confirms matching facial biometrics of the same individual
          if (distance <= 0.48) {
            console.warn(`[Biometric Duplicate] Face matches existing voter ${record.voter_id_number} (${record.full_name}) with distance ${distance.toFixed(3)}`);
            return errorResponse(
              res, 
              `Biometric duplicate detected: A voter with this facial biometric identity is already registered in the system (Voter ID: ${record.voter_id_number}). Duplicate registrations by the same individual are strictly prohibited.`, 
              409, 
              { duplicateDetected: true, matchedVoterId: record.voter_id_number, distance: Number(distance.toFixed(4)) }
            );
          }
        }
      } catch (parseErr) {
        // Skip any unparseable legacy records
      }
    }

    // Automatically generate a unique, cryptographically random Voter ID Number
    let voter_id_number = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      attempts++;
      const randomDigits = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
      voter_id_number = `VOTER-${randomDigits}`;
      const duplicate = db.prepare('SELECT id FROM voters WHERE voter_id_number = ?').get(voter_id_number);
      if (!duplicate) {
        isUnique = true;
      }
    }

    // Dynamically locate the default active or upcoming election for general voting eligibility
    const defaultElection = db.prepare(`
      SELECT id, title, status FROM elections 
      WHERE status IN ('active', 'upcoming')
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, start_date ASC 
      LIMIT 1
    `).get();

    const assignedElectionId = defaultElection ? defaultElection.id : null;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const stmt = db.prepare(`
      INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?)
    `);

    const result = stmt.run(full_name, email, phone || null, voter_id_number, passwordHash, assignedElectionId);
    const voterId = result.lastInsertRowid;

    // Handle facial biometric data enrollment
    let savedPhotoUrl = null;
    if (face_photo) {
      try {
        const base64Data = face_photo.replace(/^data:image\/\w+;base64,/, '');
        const filename = `face_${voterId}_${Date.now()}.jpg`;
        const facesDir = path.join(process.cwd(), 'uploads', 'faces');
        if (!fs.existsSync(facesDir)) {
          fs.mkdirSync(facesDir, { recursive: true });
        }
        const filePath = path.join(facesDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        savedPhotoUrl = `/uploads/faces/${filename}`;
      } catch (imgErr) {
        console.error('Error saving face photo:', imgErr);
      }
    }

    if (face_descriptor || savedPhotoUrl) {
      try {
        const descriptorStr = face_descriptor 
          ? (typeof face_descriptor === 'string' ? face_descriptor : JSON.stringify(face_descriptor))
          : null;
        
        db.prepare(`
          INSERT INTO face_data (voter_id, face_descriptor, photo_url)
          VALUES (?, ?, ?)
        `).run(voterId, descriptorStr, savedPhotoUrl);
      } catch (faceErr) {
        console.error('Error inserting face_data:', faceErr);
      }
    }

    const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
    const token = jwt.sign(
      { id: voterId, voter_id_number, role: 'voter' },
      secret,
      { expiresIn: '24h' }
    );

    const voterData = {
      id: voterId,
      full_name,
      email,
      phone,
      voter_id_number,
      has_voted: 0,
      is_verified: 0,
      election_id: assignedElectionId,
      election_title: defaultElection?.title || 'General Election',
      election_status: defaultElection?.status || 'upcoming',
      has_face_data: face_descriptor ? 1 : 0,
      photo_url: savedPhotoUrl
    };

    return successResponse(res, { token, voter: voterData }, 'Voter registered and biometric data enrolled successfully.', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to register voter', 500, error);
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return errorResponse(res, 'Voter ID or Email and password are required', 400);
    }

    // Find voter by voter_id_number or email
    const voter = db.prepare(`
      SELECT v.*, e.title as election_title, e.status as election_status, e.start_date, e.end_date,
             fd.photo_url as face_photo_url,
             CASE WHEN fd.id IS NOT NULL THEN 1 ELSE 0 END as has_face_data
      FROM voters v
      LEFT JOIN elections e ON v.election_id = e.id
      LEFT JOIN face_data fd ON fd.voter_id = v.id
      WHERE v.voter_id_number = ? OR v.email = ?
    `).get(identifier, identifier);

    if (!voter) {
      return errorResponse(res, 'Invalid Voter ID/Email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, voter.password_hash);
    if (!isMatch) {
      return errorResponse(res, 'Invalid Voter ID/Email or password', 401);
    }

    const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
    const token = jwt.sign(
      { id: voter.id, voter_id_number: voter.voter_id_number, role: 'voter' },
      secret,
      { expiresIn: '24h' }
    );

    const { password_hash, ...voterData } = voter;

    return successResponse(res, { token, voter: voterData }, 'Voter logged in successfully');
  } catch (error) {
    return errorResponse(res, 'Voter login failed', 500, error);
  }
};

export const getProfile = (req, res) => {
  try {
    let voter = db.prepare(`
      SELECT v.id, v.full_name, v.email, v.phone, v.voter_id_number, v.has_voted, v.is_verified, v.election_id, v.created_at,
             e.title as election_title, e.description as election_description, e.status as election_status, e.start_date, e.end_date,
             fd.photo_url as face_photo_url,
             CASE WHEN fd.id IS NOT NULL THEN 1 ELSE 0 END as has_face_data
      FROM voters v
      LEFT JOIN elections e ON v.election_id = e.id
      LEFT JOIN face_data fd ON fd.voter_id = v.id
      WHERE v.id = ?
    `).get(req.user.id);

    if (!voter) {
      return errorResponse(res, 'Voter profile not found', 404);
    }

    // If voter has no election assigned or election has passed, dynamically assign to current active election
    if (!voter.election_id) {
      const activeElection = db.prepare(`
        SELECT id, title, description, status, start_date, end_date 
        FROM elections 
        WHERE status IN ('active', 'upcoming')
        ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, start_date ASC 
        LIMIT 1
      `).get();

      if (activeElection) {
        db.prepare('UPDATE voters SET election_id = ? WHERE id = ?').run(activeElection.id, voter.id);
        voter.election_id = activeElection.id;
        voter.election_title = activeElection.title;
        voter.election_description = activeElection.description;
        voter.election_status = activeElection.status;
        voter.start_date = activeElection.start_date;
        voter.end_date = activeElection.end_date;
      }
    }

    return successResponse(res, voter, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch voter profile', 500, error);
  }
};

export const getAvailableElections = (req, res) => {
  try {
    const elections = db.prepare(`
      SELECT id, title, description, start_date, end_date, status,
             (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidate_count
      FROM elections e
      WHERE status IN ('upcoming', 'active')
      ORDER BY start_date ASC
    `).all();

    return successResponse(res, elections, 'Available elections retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch available elections', 500, error);
  }
};

export const getFaceDescriptor = (req, res) => {
  try {
    const voterId = req.user.id;
    const faceRow = db.prepare('SELECT face_descriptor, photo_url FROM face_data WHERE voter_id = ?').get(voterId);
    if (!faceRow || !faceRow.face_descriptor) {
      return errorResponse(res, 'No registered face biometric data found for this voter', 404);
    }
    const descriptor = JSON.parse(faceRow.face_descriptor);
    return successResponse(res, { descriptor, photo_url: faceRow.photo_url }, 'Face descriptor retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch face descriptor', 500, error);
  }
};

export const verifyFace = (req, res) => {
  try {
    const voterId = req.user.id;
    const { live_descriptor, election_id } = req.body;

    if (!live_descriptor || !Array.isArray(live_descriptor) || live_descriptor.length === 0) {
      return errorResponse(res, 'Valid live face biometric descriptor is required', 400);
    }

    const voter = db.prepare('SELECT * FROM voters WHERE id = ?').get(voterId);
    if (!voter) {
      return errorResponse(res, 'Voter not found', 404);
    }

    if (voter.is_verified !== 1) {
      return errorResponse(res, 'Voter account is not yet verified by an administrator', 403);
    }

    if (voter.has_voted === 1) {
      return errorResponse(res, 'You have already cast your ballot for this election', 400);
    }

    const faceRow = db.prepare('SELECT face_descriptor FROM face_data WHERE voter_id = ?').get(voterId);
    if (!faceRow || !faceRow.face_descriptor) {
      return errorResponse(res, 'No registered facial biometric record found. Please contact administration.', 404);
    }

    const registeredDescriptor = JSON.parse(faceRow.face_descriptor);

    // Compute Euclidean Distance
    let sumSquaredDiff = 0;
    for (let i = 0; i < Math.min(registeredDescriptor.length, live_descriptor.length); i++) {
      const diff = registeredDescriptor[i] - live_descriptor[i];
      sumSquaredDiff += diff * diff;
    }
    const distance = Math.sqrt(sumSquaredDiff);

    // Standard face-api distance: <= 0.58 is high confidence match
    const isMatch = distance <= 0.58;
    const confidenceScore = Math.max(10, Math.min(99, Math.round((1 - distance / 0.8) * 100)));

    if (!isMatch) {
      return errorResponse(res, `Face verification failed. Match distance (${distance.toFixed(3)}) exceeds threshold. Please align your face directly to the camera with clear lighting.`, 401, { distance, confidenceScore });
    }

    // Generate signed ballot access token
    const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
    const ballotToken = jwt.sign(
      {
        voter_id: voterId,
        election_id: election_id || voter.election_id,
        verified_biometrics: true,
        role: 'verified_voter'
      },
      secret,
      { expiresIn: '30m' }
    );

    return successResponse(res, {
      verified: true,
      distance: Number(distance.toFixed(4)),
      confidenceScore,
      ballotToken,
      message: 'Facial identity verified successfully! You may now cast your vote.'
    }, 'Biometric verification successful');
  } catch (error) {
    return errorResponse(res, 'Face verification processing failed', 500, error);
  }
};
