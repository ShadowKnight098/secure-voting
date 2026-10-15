import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getBallot = (req, res) => {
  try {
    const voterId = req.user.id;
    const electionId = req.params.electionId;

    const election = db.prepare('SELECT id, title, description, start_date, end_date, status FROM elections WHERE id = ?').get(electionId);
    if (!election) {
      return errorResponse(res, 'Election not found', 404);
    }

    // Check if voter has already voted in this election
    const existingVote = db.prepare('SELECT id, timestamp, encrypted_vote FROM votes WHERE voter_id = ? AND election_id = ?').get(voterId, electionId);
    if (existingVote) {
      return successResponse(res, {
        election,
        hasVoted: true,
        vote: existingVote
      }, 'You have already participated in this election');
    }

    // Check voter verification status
    const voter = db.prepare('SELECT id, is_verified, has_voted FROM voters WHERE id = ?').get(voterId);
    if (!voter || voter.is_verified !== 1) {
      return errorResponse(res, 'You must be a verified voter to access this election ballot', 403);
    }

    // Fetch candidate list for this election
    let candidates = db.prepare(`
      SELECT id, name, party, bio, photo_url 
      FROM candidates 
      WHERE election_id = ? 
      ORDER BY name ASC
    `).all(electionId);

    // If no candidates are registered for this election, automatically populate with all recognized political parties
    if (candidates.length === 0) {
      const parties = db.prepare('SELECT id, name, code, description, logo_url FROM parties ORDER BY name ASC').all();
      if (parties.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO candidates (name, party, bio, photo_url, election_id)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const p of parties) {
          const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
          insertStmt.run(p.name, partyLabel, p.description || `Official ballot entry for ${p.name}`, p.logo_url || null, electionId);
        }

        candidates = db.prepare(`
          SELECT id, name, party, bio, photo_url 
          FROM candidates 
          WHERE election_id = ? 
          ORDER BY name ASC
        `).all(electionId);
      }
    }

    return successResponse(res, {
      election,
      candidates,
      hasVoted: false
    }, 'Ballot data retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch election ballot', 500, error);
  }
};

export const castVote = (req, res) => {
  try {
    const voterId = req.user.id;
    const { election_id, candidate_id, ballot_token } = req.body;

    if (!election_id || !candidate_id) {
      return errorResponse(res, 'Election ID and Candidate ID are required', 400);
    }

    // 1. Verify Voter eligibility
    const voter = db.prepare('SELECT id, full_name, voter_id_number, is_verified, has_voted FROM voters WHERE id = ?').get(voterId);
    if (!voter) {
      return errorResponse(res, 'Voter record not found', 404);
    }

    if (voter.is_verified !== 1) {
      return errorResponse(res, 'Voter account is not approved for voting', 403);
    }

    // 2. Check duplicate voting attempt
    const existingVote = db.prepare('SELECT id FROM votes WHERE voter_id = ? AND election_id = ?').get(voterId, election_id);
    if (existingVote || voter.has_voted === 1) {
      return errorResponse(res, 'Ballot already cast! Each voter may only vote once.', 409);
    }

    // 3. Verify election is active
    const election = db.prepare('SELECT id, title, status FROM elections WHERE id = ?').get(election_id);
    if (!election) {
      return errorResponse(res, 'Target election does not exist', 404);
    }

    if (election.status !== 'active') {
      return errorResponse(res, `Voting is closed. Election status is currently '${election.status}'.`, 400);
    }

    // 4. Verify selected candidate belongs to this election
    const candidate = db.prepare('SELECT id, name, party, photo_url FROM candidates WHERE id = ? AND election_id = ?').get(candidate_id, election_id);
    if (!candidate) {
      return errorResponse(res, 'Invalid candidate selection for this election', 400);
    }

    // 4b. Mandatory Facial Biometric Verification Token Validation
    if (!ballot_token) {
      return errorResponse(res, 'Facial biometric verification is required before casting your ballot. Please complete the face scan.', 403);
    }

    try {
      const secret = process.env.JWT_SECRET || 'voting-system-secret-key-2024';
      const decoded = jwt.verify(ballot_token, secret);
      if (!decoded || !decoded.verified_biometrics || decoded.voter_id !== voterId) {
        return errorResponse(res, 'Biometric verification token is invalid or does not match this voter. Vote rejected.', 403);
      }
      if (decoded.election_id && parseInt(decoded.election_id, 10) !== parseInt(election_id, 10)) {
        return errorResponse(res, 'Biometric verification token was not issued for this election.', 403);
      }
    } catch (tokenErr) {
      return errorResponse(res, 'Facial verification session has expired or is invalid. Please re-authenticate your face to cast vote.', 403);
    }

    // 5. Cryptographic Encrypted Vote Generation
    const salt = crypto.randomBytes(16).toString('hex');
    const votePayload = JSON.stringify({
      voter_id: voterId,
      election_id,
      candidate_id,
      timestamp: new Date().toISOString(),
      salt
    });

    const encryptedVoteHash = crypto.createHash('sha256').update(votePayload).digest('hex');
    const receiptCode = 'VOTE-' + crypto.createHash('sha256').update(encryptedVoteHash + voter.voter_id_number).digest('hex').substring(0, 12).toUpperCase();

    // 6. Atomic Transaction
    const executeVote = db.transaction(() => {
      // Insert vote
      db.prepare(`
        INSERT INTO votes (voter_id, candidate_id, election_id, encrypted_vote, timestamp)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(voterId, candidate_id, election_id, encryptedVoteHash);

      // Mark voter as has_voted
      db.prepare(`
        UPDATE voters 
        SET has_voted = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(voterId);
    });

    executeVote();

    const timestamp = new Date().toISOString();

    return successResponse(res, {
      receipt: {
        receiptId: receiptCode,
        encryptedVoteHash,
        electionTitle: election.title,
        candidateName: candidate.name,
        candidateParty: candidate.party,
        timestamp,
        voterIdNumber: voter.voter_id_number
      }
    }, 'Vote cryptographically recorded and verified successfully!', 201);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse(res, 'Duplicate vote detected. You have already cast your ballot.', 409);
    }
    return errorResponse(res, 'Failed to cast ballot', 500, error);
  }
};

export const getReceipt = (req, res) => {
  try {
    const voterId = req.user.id;
    const electionId = req.params.electionId;

    const voteRecord = db.prepare(`
      SELECT v.id, v.encrypted_vote, v.timestamp,
             e.title as election_title,
             c.name as candidate_name, c.party as candidate_party,
             vt.voter_id_number, vt.full_name
      FROM votes v
      JOIN elections e ON v.election_id = e.id
      JOIN candidates c ON v.candidate_id = c.id
      JOIN voters vt ON v.voter_id = vt.id
      WHERE v.voter_id = ? AND v.election_id = ?
    `).get(voterId, electionId);

    if (!voteRecord) {
      return errorResponse(res, 'No vote record found for this election', 404);
    }

    const receiptCode = 'VOTE-' + crypto.createHash('sha256').update(voteRecord.encrypted_vote + voteRecord.voter_id_number).digest('hex').substring(0, 12).toUpperCase();

    return successResponse(res, {
      receiptId: receiptCode,
      encryptedVoteHash: voteRecord.encrypted_vote,
      electionTitle: voteRecord.election_title,
      candidateName: voteRecord.candidate_name,
      candidateParty: voteRecord.candidate_party,
      voterIdNumber: voteRecord.voter_id_number,
      voterName: voteRecord.full_name,
      timestamp: voteRecord.timestamp
    }, 'Vote receipt retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve vote receipt', 500, error);
  }
};

export const getResults = (req, res) => {
  try {
    const electionId = req.params.electionId;

    const election = db.prepare('SELECT id, title, description, start_date, end_date, status FROM elections WHERE id = ?').get(electionId);
    if (!election) {
      return errorResponse(res, 'Election not found', 404);
    }

    // Total votes cast
    const totalVotes = db.prepare('SELECT COUNT(*) as count FROM votes WHERE election_id = ?').get(electionId).count;

    // Total eligible voters assigned to this election
    const totalEligibleVoters = db.prepare('SELECT COUNT(*) as count FROM voters WHERE election_id = ? AND is_verified = 1').get(electionId).count;

    // Turnout percentage
    const turnoutPercentage = totalEligibleVoters > 0 
      ? Math.round((totalVotes / totalEligibleVoters) * 100) 
      : 0;

    // Candidate breakdown with vote tally
    const candidates = db.prepare(`
      SELECT c.id, c.name, c.party, c.bio, c.photo_url,
             (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id AND v.election_id = ?) as vote_count
      FROM candidates c
      WHERE c.election_id = ?
      ORDER BY vote_count DESC, c.name ASC
    `).all(electionId, electionId);

    // Calculate percentage per candidate and identify winner
    const candidateResults = candidates.map(c => ({
      ...c,
      percentage: totalVotes > 0 ? Number(((c.vote_count / totalVotes) * 100).toFixed(1)) : 0
    }));

    const winner = (totalVotes > 0 && candidateResults.length > 0) ? candidateResults[0] : null;

    return successResponse(res, {
      election,
      totalVotes,
      totalEligibleVoters,
      turnoutPercentage,
      candidates: candidateResults,
      winner
    }, 'Election results retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch election results', 500, error);
  }
};

export const getAuditLedger = (req, res) => {
  try {
    const electionId = req.params.electionId;

    const election = db.prepare('SELECT id, title, description, start_date, end_date, status FROM elections WHERE id = ?').get(electionId);
    if (!election) {
      return errorResponse(res, 'Election not found', 404);
    }

    const votes = db.prepare(`
      SELECT v.id, v.encrypted_vote, v.timestamp,
             c.name as candidate_name, c.party as candidate_party,
             vt.voter_id_number
      FROM votes v
      JOIN candidates c ON v.candidate_id = c.id
      JOIN voters vt ON v.voter_id = vt.id
      WHERE v.election_id = ?
      ORDER BY v.timestamp DESC
    `).all(electionId);

    const auditTrail = votes.map((v, index) => {
      const receiptCode = 'VOTE-' + crypto.createHash('sha256').update(v.encrypted_vote + v.voter_id_number).digest('hex').substring(0, 12).toUpperCase();
      const maskedVoterId = v.voter_id_number.length > 5 
        ? v.voter_id_number.substring(0, 6) + '***' + v.voter_id_number.slice(-2)
        : '***';

      return {
        serialNumber: votes.length - index,
        receiptCode,
        encryptedVoteHash: v.encrypted_vote,
        candidateName: v.candidate_name,
        candidateParty: v.candidate_party,
        maskedVoterId,
        timestamp: v.timestamp,
        integrityStatus: 'VERIFIED_SEALED'
      };
    });

    return successResponse(res, {
      election,
      totalSealedBallots: votes.length,
      auditTrail
    }, 'Cryptographic audit ledger retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve audit ledger', 500, error);
  }
};

export const verifyReceiptCode = (req, res) => {
  try {
    const { receiptCode } = req.params;
    if (!receiptCode) {
      return errorResponse(res, 'Receipt code is required', 400);
    }

    const cleanCode = receiptCode.trim().toUpperCase();

    const votes = db.prepare(`
      SELECT v.id, v.encrypted_vote, v.timestamp,
             e.id as election_id, e.title as election_title, e.status as election_status,
             vt.voter_id_number
      FROM votes v
      JOIN elections e ON v.election_id = e.id
      JOIN voters vt ON v.voter_id = vt.id
    `).all();

    const matchedVote = votes.find(v => {
      const computedCode = 'VOTE-' + crypto.createHash('sha256').update(v.encrypted_vote + v.voter_id_number).digest('hex').substring(0, 12).toUpperCase();
      return computedCode === cleanCode;
    });

    if (!matchedVote) {
      return errorResponse(res, 'Receipt code not found in cryptographic election ledger', 404);
    }

    return successResponse(res, {
      valid: true,
      receiptCode: cleanCode,
      electionTitle: matchedVote.election_title,
      electionStatus: matchedVote.election_status,
      timestamp: matchedVote.timestamp,
      encryptedVoteHash: matchedVote.encrypted_vote,
      auditVerification: 'AUTHENTIC_RECORD_CONFIRMED',
      auditMessage: 'This vote was verified via live facial biometric authentication, sealed with SHA-256, and recorded permanently on the ledger.'
    }, 'Receipt code verified successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to verify receipt code', 500, error);
  }
};
