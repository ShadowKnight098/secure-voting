import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const register = async (req, res) => {
  try {
    const { full_name, email, phone, voter_id_number, password, election_id, face_descriptor, face_photo } = req.body;

    if (!full_name || !email || !voter_id_number || !password || !election_id) {
      return errorResponse(res, 'Full name, email, voter ID number, password, and election are required', 400);
    }

    // Check if email already registered
    const existingEmail = db.prepare('SELECT id FROM voters WHERE email = ?').get(email);
    if (existingEmail) {
      return errorResponse(res, 'A voter with this email is already registered', 409);
    }

    // Check if voter_id_number already exists
    const existingVoterId = db.prepare('SELECT id FROM voters WHERE voter_id_number = ?').get(voter_id_number);
    if (existingVoterId) {
      return errorResponse(res, 'A voter with this Voter ID Number is already registered', 409);
    }

    // Verify election exists
    const election = db.prepare('SELECT id, title, status FROM elections WHERE id = ?').get(election_id);
    if (!election) {
      return errorResponse(res, 'Selected election does not exist', 404);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const stmt = db.prepare(`
      INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?)
    `);

    const result = stmt.run(full_name, email, phone || null, voter_id_number, passwordHash, election_id);
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
      election_id,
      election_title: election.title,
      election_status: election.status,
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
    const voter = db.prepare(`
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
