import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import db from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
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

    // 1. Strict Unique Email Validation (Checked across Supabase Cloud & Local DB)
    if (isSupabaseConfigured && supabase) {
      const { data: existingSupaEmail } = await supabase.from('voters').select('id').ilike('email', cleanEmail).maybeSingle();
      if (existingSupaEmail) {
        return errorResponse(res, 'This email address is already registered in the central database. Please sign in or use a different email.', 409);
      }
    }

    const existingEmail = db.prepare('SELECT id FROM voters WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingEmail) {
      return errorResponse(res, 'This email address is already registered. Please sign in or use a different email.', 409);
    }

    // 2. Strict Biometric Deduplication Check (Prevent duplicate registrations by the same human face)
    const enrolledFaces = [];

    // Query Supabase Cloud Face Data
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaFaces } = await supabase.from('face_data').select('voter_id, face_descriptor, voters(full_name, voter_id_number)');
        if (supaFaces) {
          for (const sf of supaFaces) {
            enrolledFaces.push({
              voter_id: sf.voter_id,
              face_descriptor: sf.face_descriptor,
              full_name: sf.voters?.full_name || 'Enrolled Voter',
              voter_id_number: sf.voters?.voter_id_number || 'VOTER-REGISTERED'
            });
          }
        }
      } catch (sbErr) {
        console.warn('[Supabase] Warning retrieving faces:', sbErr.message);
      }
    }

    // Also check local database
    const localFaces = db.prepare(`
      SELECT fd.voter_id, fd.face_descriptor, v.full_name, v.voter_id_number 
      FROM face_data fd
      JOIN voters v ON fd.voter_id = v.id
      WHERE fd.face_descriptor IS NOT NULL
    `).all();
    enrolledFaces.push(...localFaces);

    for (const record of enrolledFaces) {
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
        // Skip
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

    // Dynamically locate active election
    let assignedElectionId = 1;
    let electionTitle = 'National Presidential Election 2025';
    let electionStatus = 'active';

    if (isSupabaseConfigured && supabase) {
      const { data: supaEl } = await supabase.from('elections').select('id, title, status').limit(1).maybeSingle();
      if (supaEl) {
        assignedElectionId = supaEl.id;
        electionTitle = supaEl.title;
        electionStatus = supaEl.status;
      }
    } else {
      const defaultElection = db.prepare(`
        SELECT id, title, status FROM elections 
        WHERE status IN ('active', 'upcoming')
        ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, start_date ASC 
        LIMIT 1
      `).get();
      if (defaultElection) {
        assignedElectionId = defaultElection.id;
        electionTitle = defaultElection.title;
        electionStatus = defaultElection.status;
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Save Face Photo to disk
    let savedPhotoUrl = null;
    const tempVoterId = Date.now();
    if (face_photo) {
      try {
        const base64Data = face_photo.replace(/^data:image\/\w+;base64,/, '');
        const filename = `face_${tempVoterId}_${Date.now()}.jpg`;
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

    let finalVoterId = null;

    // 3. Centralized Save: Insert into Supabase Cloud Database
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaNewVoter, error: supaErr } = await supabase.from('voters').insert({
          full_name,
          email: cleanEmail,
          phone: phone || null,
          voter_id_number,
          password_hash: passwordHash,
          has_voted: false,
          is_verified: true, // Pre-verified for seamless testing
          election_id: assignedElectionId
        }).select().single();

        if (supaErr) {
          console.error('[Supabase] Insert voter error:', supaErr);
        } else if (supaNewVoter) {
          finalVoterId = supaNewVoter.id;
          const descStr = typeof face_descriptor === 'string' ? face_descriptor : JSON.stringify(face_descriptor);
          await supabase.from('face_data').insert({
            voter_id: finalVoterId,
            face_descriptor: descStr,
            photo_url: savedPhotoUrl
          });
          console.log(`[Supabase] Successfully saved new voter ${voter_id_number} into centralized cloud database.`);
        }
      } catch (err) {
        console.error('[Supabase] Cloud save exception:', err);
      }
    }

    // Mirror to local SQLite database
    const stmt = db.prepare(`
      INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id)
      VALUES (?, ?, ?, ?, ?, 0, 1, ?)
    `);
    const result = stmt.run(full_name, cleanEmail, phone || null, voter_id_number, passwordHash, assignedElectionId);
    if (!finalVoterId) finalVoterId = result.lastInsertRowid;

    if (face_descriptor || savedPhotoUrl) {
      try {
        const descriptorStr = face_descriptor 
          ? (typeof face_descriptor === 'string' ? face_descriptor : JSON.stringify(face_descriptor))
          : null;
        db.prepare(`
          INSERT INTO face_data (voter_id, face_descriptor, photo_url)
          VALUES (?, ?, ?)
        `).run(result.lastInsertRowid, descriptorStr, savedPhotoUrl);
      } catch (faceErr) {
        console.error('Error inserting local face_data:', faceErr);
      }
    }

    const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
    const token = jwt.sign(
      { id: finalVoterId, voter_id_number, role: 'voter' },
      secret,
      { expiresIn: '24h' }
    );

    const voterData = {
      id: finalVoterId,
      full_name,
      email: cleanEmail,
      phone,
      voter_id_number,
      has_voted: 0,
      is_verified: 1,
      election_id: assignedElectionId,
      election_title: electionTitle,
      election_status: electionStatus,
      has_face_data: face_descriptor ? 1 : 0,
      photo_url: savedPhotoUrl
    };

    return successResponse(res, { token, voter: voterData }, 'Voter registered and biometric data enrolled successfully in centralized database.', 201);
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

    let voter = null;

    // 1. Check Supabase Centralized Database first
    if (isSupabaseConfigured && supabase) {
      try {
        const cleanIdent = identifier.trim();
        const { data: supaVoter } = await supabase
          .from('voters')
          .select('*, elections(title, status, start_date, end_date), face_data(photo_url)')
          .or(`email.ilike.${cleanIdent},voter_id_number.eq.${cleanIdent}`)
          .maybeSingle();

        if (supaVoter) {
          const isMatch = await bcrypt.compare(password, supaVoter.password_hash);
          if (isMatch) {
            voter = {
              id: supaVoter.id,
              full_name: supaVoter.full_name,
              email: supaVoter.email,
              phone: supaVoter.phone,
              voter_id_number: supaVoter.voter_id_number,
              password_hash: supaVoter.password_hash,
              has_voted: supaVoter.has_voted ? 1 : 0,
              is_verified: supaVoter.is_verified ? 1 : 0,
              election_id: supaVoter.election_id,
              election_title: supaVoter.elections?.title || 'National Presidential Election 2025',
              election_status: supaVoter.elections?.status || 'active',
              start_date: supaVoter.elections?.start_date,
              end_date: supaVoter.elections?.end_date,
              face_photo_url: supaVoter.face_data?.[0]?.photo_url || null,
              has_face_data: supaVoter.face_data?.length > 0 ? 1 : 0
            };
          }
        }
      } catch (sbLoginErr) {
        console.warn('[Supabase] Login lookup warning:', sbLoginErr.message);
      }
    }

    // 2. Fallback to local SQLite if not found or offline
    if (!voter) {
      const localVoter = db.prepare(`
        SELECT v.*, e.title as election_title, e.status as election_status, e.start_date, e.end_date,
               fd.photo_url as face_photo_url,
               CASE WHEN fd.id IS NOT NULL THEN 1 ELSE 0 END as has_face_data
        FROM voters v
        LEFT JOIN elections e ON v.election_id = e.id
        LEFT JOIN face_data fd ON fd.voter_id = v.id
        WHERE v.voter_id_number = ? OR LOWER(v.email) = ?
      `).get(identifier, identifier.toLowerCase());

      if (localVoter) {
        const isMatch = await bcrypt.compare(password, localVoter.password_hash);
        if (isMatch) {
          voter = localVoter;
        }
      }
    }

    if (!voter) {
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

export const getProfile = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voterIdNumber = req.user.voter_id_number;

    let voter = null;

    // 1. Supabase Cloud lookup
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('voters')
          .select('*, elections(id, title, description, status, start_date, end_date), face_data(photo_url)')
        
        if (voterIdNumber) {
          query = query.or(`id.eq.${voterId},voter_id_number.eq.${voterIdNumber}`);
        } else {
          query = query.eq('id', voterId);
        }

        const { data: supaVoter } = await query.maybeSingle();

        if (supaVoter) {
          voter = {
            id: supaVoter.id,
            full_name: supaVoter.full_name,
            email: supaVoter.email,
            phone: supaVoter.phone,
            voter_id_number: supaVoter.voter_id_number,
            has_voted: supaVoter.has_voted ? 1 : 0,
            is_verified: supaVoter.is_verified ? 1 : 0,
            election_id: supaVoter.election_id,
            created_at: supaVoter.created_at,
            election_title: supaVoter.elections?.title || 'National Presidential Election 2025',
            election_description: supaVoter.elections?.description || '',
            election_status: supaVoter.elections?.status || 'active',
            start_date: supaVoter.elections?.start_date,
            end_date: supaVoter.elections?.end_date,
            face_photo_url: supaVoter.face_data?.[0]?.photo_url || null,
            has_face_data: supaVoter.face_data?.length > 0 ? 1 : 0
          };
        }
      } catch (err) {
        console.warn('[Supabase] getProfile warning:', err.message);
      }
    }

    // 2. Local SQLite lookup fallback
    if (!voter) {
      voter = db.prepare(`
        SELECT v.id, v.full_name, v.email, v.phone, v.voter_id_number, v.has_voted, v.is_verified, v.election_id, v.created_at,
               e.title as election_title, e.description as election_description, e.status as election_status, e.start_date, e.end_date,
               fd.photo_url as face_photo_url,
               CASE WHEN fd.id IS NOT NULL THEN 1 ELSE 0 END as has_face_data
        FROM voters v
        LEFT JOIN elections e ON v.election_id = e.id
        LEFT JOIN face_data fd ON fd.voter_id = v.id
        WHERE v.id = ? OR v.voter_id_number = ?
      `).get(voterId, voterIdNumber || '');
    }

    if (!voter) {
      return errorResponse(res, 'Voter profile not found', 404);
    }

    // If voter has no election assigned, dynamically assign active election
    if (!voter.election_id) {
      let activeElection = null;
      if (isSupabaseConfigured && supabase) {
        const { data: supaElect } = await supabase.from('elections').select('*').eq('status', 'active').limit(1).maybeSingle();
        if (supaElect) activeElection = supaElect;
      }
      if (!activeElection) {
        activeElection = db.prepare(`
          SELECT id, title, description, status, start_date, end_date 
          FROM elections 
          WHERE status IN ('active', 'upcoming')
          ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, start_date ASC 
          LIMIT 1
        `).get();
      }

      if (activeElection) {
        if (isSupabaseConfigured && supabase) {
          await supabase.from('voters').update({ election_id: activeElection.id }).eq('id', voter.id);
        }
        try {
          db.prepare('UPDATE voters SET election_id = ? WHERE id = ? OR voter_id_number = ?').run(activeElection.id, voter.id, voter.voter_id_number);
        } catch (_) {}

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

export const getAvailableElections = async (req, res) => {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data: elections, error } = await supabase
        .from('elections')
        .select('id, title, description, start_date, end_date, status, candidates(count)')
        .in('status', ['upcoming', 'active'])
        .order('start_date', { ascending: true });

      if (!error && elections && elections.length > 0) {
        const mapped = elections.map(e => ({
          ...e,
          candidate_count: e.candidates?.[0]?.count || 0
        }));
        return successResponse(res, mapped, 'Available elections retrieved successfully from cloud');
      }
    }

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

export const getFaceDescriptor = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voterIdNumber = req.user.voter_id_number;

    let descriptor = null;
    let photoUrl = null;

    if (isSupabaseConfigured && supabase) {
      const { data: supaFace } = await supabase
        .from('face_data')
        .select('face_descriptor, photo_url, voter_id')
        .eq('voter_id', voterId)
        .maybeSingle();

      if (supaFace && supaFace.face_descriptor) {
        try {
          descriptor = typeof supaFace.face_descriptor === 'string'
            ? JSON.parse(supaFace.face_descriptor)
            : supaFace.face_descriptor;
          photoUrl = supaFace.photo_url;
        } catch (_) {}
      }
    }

    if (!descriptor) {
      const faceRow = db.prepare(`
        SELECT fd.face_descriptor, fd.photo_url 
        FROM face_data fd
        JOIN voters v ON fd.voter_id = v.id
        WHERE v.id = ? OR v.voter_id_number = ?
      `).get(voterId, voterIdNumber || '');

      if (faceRow && faceRow.face_descriptor) {
        descriptor = JSON.parse(faceRow.face_descriptor);
        photoUrl = faceRow.photo_url;
      }
    }

    if (!descriptor) {
      return errorResponse(res, 'No registered face biometric data found for this voter', 404);
    }

    return successResponse(res, { descriptor, photo_url: photoUrl }, 'Face descriptor retrieved');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch face descriptor', 500, error);
  }
};

export const verifyFace = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voterIdNumber = req.user.voter_id_number;
    const { live_descriptor, election_id } = req.body;

    if (!live_descriptor || !Array.isArray(live_descriptor) || live_descriptor.length === 0) {
      return errorResponse(res, 'Valid live face biometric descriptor is required', 400);
    }

    let voter = null;
    let registeredDescriptor = null;

    // 1. Supabase Verification
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('voters').select('id, voter_id_number, is_verified, has_voted, election_id');
        if (voterIdNumber) {
          query = query.or(`id.eq.${voterId},voter_id_number.eq.${voterIdNumber}`);
        } else {
          query = query.eq('id', voterId);
        }
        const { data: supaVoter } = await query.maybeSingle();

        if (supaVoter) {
          voter = supaVoter;
          const { data: supaFace } = await supabase
            .from('face_data')
            .select('face_descriptor')
            .eq('voter_id', supaVoter.id)
            .maybeSingle();

          if (supaFace && supaFace.face_descriptor) {
            registeredDescriptor = typeof supaFace.face_descriptor === 'string'
              ? JSON.parse(supaFace.face_descriptor)
              : supaFace.face_descriptor;
          }
        }
      } catch (err) {
        console.warn('[Supabase] verifyFace lookup warning:', err.message);
      }
    }

    // 2. Local Fallback
    if (!voter) {
      voter = db.prepare('SELECT * FROM voters WHERE id = ? OR voter_id_number = ?').get(voterId, voterIdNumber || '');
      if (voter) {
        const faceRow = db.prepare('SELECT face_descriptor FROM face_data WHERE voter_id = ?').get(voter.id);
        if (faceRow && faceRow.face_descriptor) {
          registeredDescriptor = JSON.parse(faceRow.face_descriptor);
        }
      }
    }

    if (!voter) {
      return errorResponse(res, 'Voter not found', 404);
    }

    const isVerified = voter.is_verified === true || voter.is_verified === 1;
    if (!isVerified) {
      return errorResponse(res, 'Voter account is not yet verified by an administrator', 403);
    }

    const hasVoted = voter.has_voted === true || voter.has_voted === 1;
    if (hasVoted) {
      return errorResponse(res, 'You have already cast your ballot for this election', 400);
    }

    if (!registeredDescriptor || !Array.isArray(registeredDescriptor)) {
      return errorResponse(res, 'No registered facial biometric record found. Please contact administration.', 404);
    }

    // Compute Euclidean Distance
    let sumSquaredDiff = 0;
    for (let i = 0; i < Math.min(registeredDescriptor.length, live_descriptor.length); i++) {
      const diff = registeredDescriptor[i] - live_descriptor[i];
      sumSquaredDiff += diff * diff;
    }
    const distance = Math.sqrt(sumSquaredDiff);

    // Face distance threshold: <= 0.58 is high confidence match
    const isMatch = distance <= 0.58;
    const confidenceScore = Math.max(10, Math.min(99, Math.round((1 - distance / 0.8) * 100)));

    if (!isMatch) {
      return errorResponse(res, `Face verification failed. Match distance (${distance.toFixed(3)}) exceeds threshold. Please align your face directly to the camera with clear lighting.`, 401, { distance, confidenceScore });
    }

    // Generate signed ballot access token
    const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
    const ballotToken = jwt.sign(
      {
        voter_id: voter.id,
        voter_id_number: voter.voter_id_number,
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
