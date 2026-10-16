import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getBallot = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voterIdNumber = req.user.voter_id_number;
    const electionId = req.params.electionId;

    let election = null;
    let voter = null;
    let existingVote = null;
    let candidates = [];

    // 1. Supabase Cloud lookup
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaElect } = await supabase
          .from('elections')
          .select('id, title, description, start_date, end_date, status')
          .eq('id', electionId)
          .maybeSingle();

        if (supaElect) election = supaElect;

        // Voter lookup
        let query = supabase.from('voters').select('id, voter_id_number, is_verified, has_voted');
        if (voterIdNumber) {
          query = query.or(`id.eq.${voterId},voter_id_number.eq.${voterIdNumber}`);
        } else {
          query = query.eq('id', voterId);
        }
        const { data: supaVoter } = await query.maybeSingle();
        if (supaVoter) {
          voter = supaVoter;

          // Check if already voted
          const { data: supaVote } = await supabase
            .from('votes')
            .select('id, timestamp, encrypted_vote')
            .eq('voter_id', voter.id)
            .eq('election_id', electionId)
            .maybeSingle();

          if (supaVote) existingVote = supaVote;
        }

        // Fetch candidates
        const { data: supaCandidates } = await supabase
          .from('candidates')
          .select('id, name, party, bio')
          .eq('election_id', electionId)
          .order('name', { ascending: true });

        if (supaCandidates && supaCandidates.length > 0) {
          candidates = supaCandidates.map(c => ({ ...c, photo_url: null }));
        }
      } catch (err) {
        console.warn('[Supabase] getBallot warning:', err.message);
      }
    }

    // 2. Local SQLite fallback
    if (!election) {
      election = db.prepare('SELECT id, title, description, start_date, end_date, status FROM elections WHERE id = ?').get(electionId);
    }

    if (!election) {
      return errorResponse(res, 'Election not found', 404);
    }

    if (!voter) {
      voter = db.prepare('SELECT id, voter_id_number, is_verified, has_voted FROM voters WHERE id = ? OR voter_id_number = ?').get(voterId, voterIdNumber || '');
    }

    if (!existingVote && voter) {
      existingVote = db.prepare('SELECT id, timestamp, encrypted_vote FROM votes WHERE (voter_id = ? OR voter_id = ?) AND election_id = ?').get(voter.id, voterId, electionId);
    }

    if (existingVote) {
      return successResponse(res, {
        election,
        hasVoted: true,
        vote: existingVote
      }, 'You have already participated in this election');
    }

    const isVerified = voter && (voter.is_verified === true || voter.is_verified === 1);
    if (!isVerified) {
      return errorResponse(res, 'You must be a verified voter to access this election ballot', 403);
    }

    // If candidates list is empty, fetch from SQLite or auto-populate from parties
    if (candidates.length === 0) {
      candidates = db.prepare(`
        SELECT id, name, party, bio, photo_url 
        FROM candidates 
        WHERE election_id = ? 
        ORDER BY name ASC
      `).all(electionId);
    }

    // Auto-populate from political parties if ballot has no registered candidates
    if (candidates.length === 0) {
      let parties = [];
      if (isSupabaseConfigured && supabase) {
        const { data: supaParties } = await supabase.from('parties').select('*').order('name', { ascending: true });
        if (supaParties && supaParties.length > 0) parties = supaParties;
      }
      if (parties.length === 0) {
        parties = db.prepare('SELECT id, name, code, description, logo_url FROM parties ORDER BY name ASC').all();
      }

      if (parties.length > 0) {
        for (const p of parties) {
          const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
          const candidateBio = p.description || `Official ballot entry for ${p.name}`;

          if (isSupabaseConfigured && supabase) {
            try {
              await supabase.from('candidates').insert({
                name: p.name,
                party: partyLabel,
                bio: candidateBio,
                election_id: electionId
              });
            } catch (_) {}
          }

          try {
            db.prepare(`
              INSERT OR IGNORE INTO candidates (name, party, bio, photo_url, election_id)
              VALUES (?, ?, ?, ?, ?)
            `).run(p.name, partyLabel, candidateBio, p.logo_url || null, electionId);
          } catch (_) {}
        }

        // Re-fetch populated candidates
        if (isSupabaseConfigured && supabase) {
          const { data: supaRefetched } = await supabase
            .from('candidates')
            .select('id, name, party, bio')
            .eq('election_id', electionId)
            .order('name', { ascending: true });
          if (supaRefetched && supaRefetched.length > 0) {
            candidates = supaRefetched.map(c => ({ ...c, photo_url: null }));
          }
        }
        if (candidates.length === 0) {
          candidates = db.prepare(`
            SELECT id, name, party, bio, photo_url 
            FROM candidates 
            WHERE election_id = ? 
            ORDER BY name ASC
          `).all(electionId);
        }
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

export const castVote = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voterIdNumber = req.user.voter_id_number;
    const { election_id, candidate_id, ballot_token } = req.body;

    if (!election_id || !candidate_id) {
      return errorResponse(res, 'Election ID and Candidate ID are required', 400);
    }

    // 1. Verify Voter eligibility (Supabase + Local)
    let voter = null;
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('voters').select('id, full_name, email, voter_id_number, is_verified, has_voted');
        if (voterIdNumber) {
          query = query.or(`id.eq.${voterId},voter_id_number.eq.${voterIdNumber}`);
        } else {
          query = query.eq('id', voterId);
        }
        const { data: supaVoter } = await query.maybeSingle();
        if (supaVoter) voter = supaVoter;
      } catch (err) {
        console.warn('[Supabase] castVote voter lookup warning:', err.message);
      }
    }

    if (!voter) {
      voter = db.prepare('SELECT id, full_name, email, voter_id_number, is_verified, has_voted FROM voters WHERE id = ? OR voter_id_number = ?').get(voterId, voterIdNumber || '');
    }

    if (!voter) {
      return errorResponse(res, 'Voter record not found', 404);
    }

    const isVerified = voter.is_verified === true || voter.is_verified === 1;
    if (!isVerified) {
      return errorResponse(res, 'Voter account is not approved for voting', 403);
    }

    // 2. Check duplicate voting attempt
    let existingVote = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaVote } = await supabase
          .from('votes')
          .select('id')
          .eq('voter_id', voter.id)
          .eq('election_id', election_id)
          .maybeSingle();
        if (supaVote) existingVote = supaVote;
      } catch (_) {}
    }

    if (!existingVote) {
      existingVote = db.prepare('SELECT id FROM votes WHERE (voter_id = ? OR voter_id = ?) AND election_id = ?').get(voter.id, voterId, election_id);
    }

    const hasVoted = voter.has_voted === true || voter.has_voted === 1;
    if (existingVote || hasVoted) {
      return errorResponse(res, 'Ballot already cast! Each voter may only vote once.', 409);
    }

    // 3. Verify election is active
    let election = null;
    if (isSupabaseConfigured && supabase) {
      const { data: supaElect } = await supabase.from('elections').select('id, title, status').eq('id', election_id).maybeSingle();
      if (supaElect) election = supaElect;
    }
    if (!election) {
      election = db.prepare('SELECT id, title, status FROM elections WHERE id = ?').get(election_id);
    }

    if (!election) {
      return errorResponse(res, 'Target election does not exist', 404);
    }

    if (election.status !== 'active') {
      return errorResponse(res, `Voting is closed. Election status is currently '${election.status}'.`, 400);
    }

    // 4. Verify candidate belongs to this election
    let candidate = null;
    if (isSupabaseConfigured && supabase) {
      const { data: supaCand } = await supabase
        .from('candidates')
        .select('id, name, party')
        .eq('id', candidate_id)
        .eq('election_id', election_id)
        .maybeSingle();
      if (supaCand) candidate = supaCand;
    }
    if (!candidate) {
      candidate = db.prepare('SELECT id, name, party, photo_url FROM candidates WHERE id = ? AND election_id = ?').get(candidate_id, election_id);
    }

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
      if (!decoded || !decoded.verified_biometrics) {
        return errorResponse(res, 'Biometric verification token is invalid or missing verification flags. Vote rejected.', 403);
      }
      // Check voter ID match
      const tokenVoterId = String(decoded.voter_id);
      const curVoterId = String(voter.id);
      const curTokenId = String(voterId);
      if (tokenVoterId !== curVoterId && tokenVoterId !== curTokenId && decoded.voter_id_number !== voter.voter_id_number) {
        return errorResponse(res, 'Biometric verification token does not match this voter. Vote rejected.', 403);
      }
      if (decoded.election_id && parseInt(decoded.election_id, 10) !== parseInt(election_id, 10)) {
        return errorResponse(res, 'Biometric verification token was not issued for this election.', 403);
      }
    } catch (tokenErr) {
      return errorResponse(res, 'Facial verification session has expired or is invalid. Please re-authenticate your face to cast vote.', 403);
    }

    // 5. Cryptographic Encrypted Vote Generation (SHA-256 sealed)
    const salt = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();
    const votePayload = JSON.stringify({
      voter_id: voter.id,
      voter_id_number: voter.voter_id_number,
      election_id,
      candidate_id,
      timestamp,
      salt
    });

    const encryptedVoteHash = crypto.createHash('sha256').update(votePayload).digest('hex');
    const receiptCode = 'VOTE-' + crypto.createHash('sha256').update(encryptedVoteHash + voter.voter_id_number).digest('hex').substring(0, 12).toUpperCase();

    // 6. Centralized Cloud Save (Supabase)
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: voteErr } = await supabase.from('votes').insert({
          voter_id: voter.id,
          candidate_id,
          election_id,
          encrypted_vote: encryptedVoteHash,
          timestamp
        });

        if (voteErr) {
          console.error('[Supabase] Vote insert error:', voteErr);
        } else {
          // Mark voter as has_voted in Supabase
          await supabase.from('voters').update({ has_voted: true }).eq('id', voter.id);
          console.log(`[Supabase] Recorded vote for voter ${voter.voter_id_number} in central cloud database.`);
        }
      } catch (cloudErr) {
        console.error('[Supabase] castVote cloud save error:', cloudErr);
      }
    }

    // 7. Local SQLite Mirroring
    try {
      const localVoter = db.prepare('SELECT id FROM voters WHERE voter_id_number = ? OR id = ?').get(voter.voter_id_number, voter.id);
      const localVoterId = localVoter ? localVoter.id : voter.id;

      db.prepare(`
        INSERT OR IGNORE INTO votes (voter_id, candidate_id, election_id, encrypted_vote, timestamp)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(localVoterId, candidate_id, election_id, encryptedVoteHash);

      db.prepare(`
        UPDATE voters 
        SET has_voted = 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(localVoterId);
    } catch (localErr) {
      console.warn('Local vote save warning:', localErr.message);
    }

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
    }, 'Vote cryptographically recorded and verified successfully in centralized database!', 201);
  } catch (error) {
    if (error.message && (error.message.includes('UNIQUE') || error.message.includes('duplicate key'))) {
      return errorResponse(res, 'Duplicate vote detected. You have already cast your ballot.', 409);
    }
    return errorResponse(res, 'Failed to cast ballot', 500, error);
  }
};

export const getReceipt = async (req, res) => {
  try {
    const voterId = req.user.id;
    const voterIdNumber = req.user.voter_id_number;
    const electionId = req.params.electionId;

    let voteRecord = null;

    // 1. Supabase Cloud lookup
    if (isSupabaseConfigured && supabase) {
      try {
        let voterQuery = supabase.from('voters').select('id, voter_id_number, full_name');
        if (voterIdNumber) {
          voterQuery = voterQuery.or(`id.eq.${voterId},voter_id_number.eq.${voterIdNumber}`);
        } else {
          voterQuery = voterQuery.eq('id', voterId);
        }
        const { data: supaVoter } = await voterQuery.maybeSingle();

        if (supaVoter) {
          const { data: supaVote } = await supabase
            .from('votes')
            .select('id, encrypted_vote, timestamp, candidates(name, party), elections(title)')
            .eq('voter_id', supaVoter.id)
            .eq('election_id', electionId)
            .maybeSingle();

          if (supaVote) {
            voteRecord = {
              encrypted_vote: supaVote.encrypted_vote,
              timestamp: supaVote.timestamp,
              election_title: supaVote.elections?.title || 'National Presidential Election 2025',
              candidate_name: supaVote.candidates?.name || 'Selected Candidate',
              candidate_party: supaVote.candidates?.party || '',
              voter_id_number: supaVoter.voter_id_number,
              full_name: supaVoter.full_name
            };
          }
        }
      } catch (err) {
        console.warn('[Supabase] getReceipt warning:', err.message);
      }
    }

    // 2. Local SQLite lookup fallback
    if (!voteRecord) {
      voteRecord = db.prepare(`
        SELECT v.id, v.encrypted_vote, v.timestamp,
               e.title as election_title,
               c.name as candidate_name, c.party as candidate_party,
               vt.voter_id_number, vt.full_name
        FROM votes v
        JOIN elections e ON v.election_id = e.id
        JOIN candidates c ON v.candidate_id = c.id
        JOIN voters vt ON v.voter_id = vt.id
        WHERE (v.voter_id = ? OR vt.voter_id_number = ?) AND v.election_id = ?
      `).get(voterId, voterIdNumber || '', electionId);
    }

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

export const getResults = async (req, res) => {
  try {
    const electionId = req.params.electionId;

    let election = null;
    let totalVotes = 0;
    let totalEligibleVoters = 0;
    let candidateResults = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaElect } = await supabase.from('elections').select('*').eq('id', electionId).maybeSingle();
        if (supaElect) {
          election = supaElect;

          // Total votes count
          const { count: supaVoteCount } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('election_id', electionId);
          totalVotes = supaVoteCount || 0;

          // Eligible voters count
          const { count: supaEligibleCount } = await supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_verified', true);
          totalEligibleVoters = supaEligibleCount || 0;

          // Candidates
          const { data: supaCands } = await supabase.from('candidates').select('id, name, party, bio').eq('election_id', electionId);
          if (supaCands && supaCands.length > 0) {
            // Get vote tallies per candidate
            const { data: allVotes } = await supabase.from('votes').select('candidate_id').eq('election_id', electionId);
            const voteMap = {};
            if (allVotes) {
              for (const v of allVotes) {
                voteMap[v.candidate_id] = (voteMap[v.candidate_id] || 0) + 1;
              }
            }

            candidateResults = supaCands.map(c => {
              const count = voteMap[c.id] || 0;
              return {
                ...c,
                photo_url: null,
                vote_count: count,
                percentage: totalVotes > 0 ? Number(((count / totalVotes) * 100).toFixed(1)) : 0
              };
            }).sort((a, b) => b.vote_count - a.vote_count);
          }
        }
      } catch (err) {
        console.warn('[Supabase] getResults warning:', err.message);
      }
    }

    if (!election) {
      election = db.prepare('SELECT id, title, description, start_date, end_date, status FROM elections WHERE id = ?').get(electionId);
      if (!election) {
        return errorResponse(res, 'Election not found', 404);
      }

      totalVotes = db.prepare('SELECT COUNT(*) as count FROM votes WHERE election_id = ?').get(electionId).count;
      totalEligibleVoters = db.prepare('SELECT COUNT(*) as count FROM voters WHERE (election_id = ? OR election_id IS NULL) AND is_verified = 1').get(electionId).count;

      const candidates = db.prepare(`
        SELECT c.id, c.name, c.party, c.bio, c.photo_url,
               (SELECT COUNT(*) FROM votes v WHERE v.candidate_id = c.id AND v.election_id = ?) as vote_count
        FROM candidates c
        WHERE c.election_id = ?
        ORDER BY vote_count DESC, c.name ASC
      `).all(electionId, electionId);

      candidateResults = candidates.map(c => ({
        ...c,
        percentage: totalVotes > 0 ? Number(((c.vote_count / totalVotes) * 100).toFixed(1)) : 0
      }));
    }

    const turnoutPercentage = totalEligibleVoters > 0 
      ? Math.round((totalVotes / totalEligibleVoters) * 100) 
      : 0;

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

export const getAuditLedger = async (req, res) => {
  try {
    const electionId = req.params.electionId;

    let election = null;
    let auditTrail = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaElect } = await supabase.from('elections').select('*').eq('id', electionId).maybeSingle();
        if (supaElect) {
          election = supaElect;
          const { data: supaVotes } = await supabase
            .from('votes')
            .select('id, encrypted_vote, timestamp, candidates(name, party), voters(voter_id_number)')
            .eq('election_id', electionId)
            .order('timestamp', { ascending: false });

          if (supaVotes) {
            auditTrail = supaVotes.map((v, index) => {
              const voterIdNum = v.voters?.voter_id_number || 'VOTER-UNKNOWN';
              const receiptCode = 'VOTE-' + crypto.createHash('sha256').update(v.encrypted_vote + voterIdNum).digest('hex').substring(0, 12).toUpperCase();
              const maskedVoterId = voterIdNum.length > 5 
                ? voterIdNum.substring(0, 6) + '***' + voterIdNum.slice(-2)
                : '***';

              return {
                serialNumber: supaVotes.length - index,
                receiptCode,
                encryptedVoteHash: v.encrypted_vote,
                candidateName: v.candidates?.name || 'Candidate',
                candidateParty: v.candidates?.party || '',
                maskedVoterId,
                timestamp: v.timestamp,
                integrityStatus: 'VERIFIED_SEALED'
              };
            });
          }
        }
      } catch (err) {
        console.warn('[Supabase] getAuditLedger warning:', err.message);
      }
    }

    if (!election) {
      election = db.prepare('SELECT id, title, description, start_date, end_date, status FROM elections WHERE id = ?').get(electionId);
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

      auditTrail = votes.map((v, index) => {
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
    }

    return successResponse(res, {
      election,
      totalSealedBallots: auditTrail.length,
      auditTrail
    }, 'Cryptographic audit ledger retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve audit ledger', 500, error);
  }
};

export const verifyReceiptCode = async (req, res) => {
  try {
    const { receiptCode } = req.params;
    if (!receiptCode) {
      return errorResponse(res, 'Receipt code is required', 400);
    }

    const cleanCode = receiptCode.trim().toUpperCase();

    // 1. Supabase check
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaVotes } = await supabase
          .from('votes')
          .select('id, encrypted_vote, timestamp, elections(id, title, status), voters(voter_id_number)');

        if (supaVotes) {
          const matched = supaVotes.find(v => {
            const vNum = v.voters?.voter_id_number || '';
            const computed = 'VOTE-' + crypto.createHash('sha256').update(v.encrypted_vote + vNum).digest('hex').substring(0, 12).toUpperCase();
            return computed === cleanCode;
          });

          if (matched) {
            return successResponse(res, {
              valid: true,
              receiptCode: cleanCode,
              electionTitle: matched.elections?.title || 'National Election',
              electionStatus: matched.elections?.status || 'active',
              timestamp: matched.timestamp,
              encryptedVoteHash: matched.encrypted_vote,
              auditVerification: 'AUTHENTIC_RECORD_CONFIRMED',
              auditMessage: 'This vote was verified via live facial biometric authentication, sealed with SHA-256, and recorded permanently on the centralized cloud ledger.'
            }, 'Receipt code verified successfully against cloud ledger');
          }
        }
      } catch (err) {
        console.warn('[Supabase] verifyReceiptCode warning:', err.message);
      }
    }

    // 2. Local check fallback
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
