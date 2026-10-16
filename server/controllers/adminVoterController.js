import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { successResponse, errorResponse, getPagination, getSearchFilter } from '../utils/helpers.js';

export const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search?.trim();
    const election_id = req.query.election_id;
    const is_verified = req.query.is_verified;
    const has_voted = req.query.has_voted;

    // 1. Supabase Cloud lookup
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('voters')
          .select('id, full_name, email, phone, voter_id_number, has_voted, is_verified, election_id, created_at, elections(title, status), face_data(photo_url)', { count: 'exact' });

        if (election_id) {
          query = query.eq('election_id', election_id);
        }
        if (is_verified !== undefined && is_verified !== '') {
          query = query.eq('is_verified', is_verified === '1' || is_verified === true);
        }
        if (has_voted !== undefined && has_voted !== '') {
          query = query.eq('has_voted', has_voted === '1' || has_voted === true);
        }
        if (search) {
          query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,voter_id_number.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data: supaVoters, count: totalCount, error: supaErr } = await query;

        if (!supaErr && supaVoters) {
          const mapped = supaVoters.map(v => ({
            id: v.id,
            full_name: v.full_name,
            email: v.email,
            phone: v.phone,
            voter_id_number: v.voter_id_number,
            has_voted: v.has_voted ? 1 : 0,
            is_verified: v.is_verified ? 1 : 0,
            election_id: v.election_id,
            created_at: v.created_at,
            election_title: v.elections?.title || null,
            election_status: v.elections?.status || null,
            face_photo_url: v.face_data?.[0]?.photo_url || null,
            has_face_data: v.face_data?.length > 0 ? 1 : 0
          }));

          return successResponse(res, {
            voters: mapped,
            pagination: {
              page,
              limit,
              total: totalCount || mapped.length,
              totalPages: Math.ceil((totalCount || mapped.length) / limit)
            }
          }, 'Voters retrieved successfully from cloud database');
        }
      } catch (err) {
        console.warn('[Supabase] admin getAll voters warning:', err.message);
      }
    }

    // 2. Local SQLite fallback
    const searchFilter = getSearchFilter(req.query, ['v.full_name', 'v.email', 'v.voter_id_number', 'v.phone']);
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (searchFilter.sql) {
      whereClause += ` AND ${searchFilter.sql}`;
      queryParams.push(...searchFilter.params);
    }

    if (election_id) {
      whereClause += ' AND v.election_id = ?';
      queryParams.push(election_id);
    }

    if (is_verified !== undefined && is_verified !== '') {
      whereClause += ' AND v.is_verified = ?';
      queryParams.push(parseInt(is_verified, 10));
    }

    if (has_voted !== undefined && has_voted !== '') {
      whereClause += ' AND v.has_voted = ?';
      queryParams.push(parseInt(has_voted, 10));
    }

    const countSql = `SELECT COUNT(*) as total FROM voters v ${whereClause}`;
    const total = db.prepare(countSql).get(...queryParams).total;
    const totalPages = Math.ceil(total / limit);

    const sql = `
      SELECT v.id, v.full_name, v.email, v.phone, v.voter_id_number, v.has_voted, v.is_verified, v.election_id, v.created_at,
             e.title as election_title, e.status as election_status,
             fd.photo_url as face_photo_url,
             CASE WHEN fd.id IS NOT NULL THEN 1 ELSE 0 END as has_face_data
      FROM voters v
      LEFT JOIN elections e ON v.election_id = e.id
      LEFT JOIN face_data fd ON fd.voter_id = v.id
      ${whereClause} 
      ORDER BY v.created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const voters = db.prepare(sql).all(...queryParams, limit, offset);

    return successResponse(res, {
      voters,
      pagination: { page, limit, total, totalPages }
    }, 'Voters retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch voters', 500, error);
  }
};

export const getById = async (req, res) => {
  try {
    const id = req.params.id;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: v } = await supabase
          .from('voters')
          .select('id, full_name, email, phone, voter_id_number, has_voted, is_verified, election_id, created_at, elections(title, status), face_data(photo_url)')
          .eq('id', id)
          .maybeSingle();

        if (v) {
          return successResponse(res, {
            id: v.id,
            full_name: v.full_name,
            email: v.email,
            phone: v.phone,
            voter_id_number: v.voter_id_number,
            has_voted: v.has_voted ? 1 : 0,
            is_verified: v.is_verified ? 1 : 0,
            election_id: v.election_id,
            created_at: v.created_at,
            election_title: v.elections?.title || null,
            election_status: v.elections?.status || null,
            face_photo_url: v.face_data?.[0]?.photo_url || null,
            has_face_data: v.face_data?.length > 0 ? 1 : 0
          }, 'Voter retrieved successfully from cloud');
        }
      } catch (_) {}
    }

    const sql = `
      SELECT v.id, v.full_name, v.email, v.phone, v.voter_id_number, v.has_voted, v.is_verified, v.election_id, v.created_at,
             e.title as election_title, e.status as election_status,
             fd.photo_url as face_photo_url,
             CASE WHEN fd.id IS NOT NULL THEN 1 ELSE 0 END as has_face_data
      FROM voters v
      LEFT JOIN elections e ON v.election_id = e.id
      LEFT JOIN face_data fd ON fd.voter_id = v.id
      WHERE v.id = ?
    `;
    const voter = db.prepare(sql).get(id);

    if (!voter) {
      return errorResponse(res, 'Voter not found', 404);
    }

    return successResponse(res, voter, 'Voter retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch voter', 500, error);
  }
};

export const create = async (req, res) => {
  try {
    const { full_name, email, phone, voter_id_number, password, election_id, is_verified } = req.body;

    if (!full_name || !email || !voter_id_number || !election_id) {
      return errorResponse(res, 'Full name, email, voter ID number, and election are required', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanVoterId = voter_id_number.trim();

    if (isSupabaseConfigured && supabase) {
      const { data: supaEmail } = await supabase.from('voters').select('id').ilike('email', cleanEmail).maybeSingle();
      if (supaEmail) {
        return errorResponse(res, 'A voter with this email already exists in the central database', 409);
      }
      const { data: supaId } = await supabase.from('voters').select('id').eq('voter_id_number', cleanVoterId).maybeSingle();
      if (supaId) {
        return errorResponse(res, 'A voter with this Voter ID number already exists in the central database', 409);
      }
    }

    const existingEmail = db.prepare('SELECT id FROM voters WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingEmail) {
      return errorResponse(res, 'A voter with this email already exists', 409);
    }

    const existingVoterId = db.prepare('SELECT id FROM voters WHERE voter_id_number = ?').get(cleanVoterId);
    if (existingVoterId) {
      return errorResponse(res, 'A voter with this Voter ID number already exists', 409);
    }

    const defaultPassword = password || 'voter123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    let createdId = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaNew, error: supaErr } = await supabase.from('voters').insert({
          full_name,
          email: cleanEmail,
          phone: phone || null,
          voter_id_number: cleanVoterId,
          password_hash: passwordHash,
          has_voted: false,
          is_verified: is_verified ? true : false,
          election_id: parseInt(election_id, 10)
        }).select().single();

        if (supaNew) createdId = supaNew.id;
        if (supaErr) console.error('[Supabase] Admin insert voter error:', supaErr);
      } catch (err) {
        console.error('[Supabase] Admin insert exception:', err);
      }
    }

    const stmt = db.prepare(`
      INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const result = stmt.run(
      full_name,
      cleanEmail,
      phone || null,
      cleanVoterId,
      passwordHash,
      is_verified ? 1 : 0,
      parseInt(election_id, 10)
    );

    if (!createdId) createdId = result.lastInsertRowid;

    return successResponse(res, { id: createdId }, 'Voter created and synchronized successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create voter', 500, error);
  }
};

export const toggleVerify = async (req, res) => {
  try {
    const id = req.params.id;
    const { is_verified } = req.body;

    let currentStatus = 0;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaV } = await supabase.from('voters').select('id, is_verified').eq('id', id).maybeSingle();
        if (supaV) {
          const newBool = is_verified !== undefined ? Boolean(is_verified) : !supaV.is_verified;
          await supabase.from('voters').update({ is_verified: newBool }).eq('id', id);
          currentStatus = newBool ? 1 : 0;
        }
      } catch (_) {}
    }

    const existing = db.prepare('SELECT * FROM voters WHERE id = ?').get(id);
    if (existing) {
      const newStatus = is_verified !== undefined ? (is_verified ? 1 : 0) : (existing.is_verified ? 0 : 1);
      db.prepare(`
        UPDATE voters 
        SET is_verified = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newStatus, id);
      currentStatus = newStatus;
    }

    return successResponse(res, { id, is_verified: currentStatus }, `Voter ${currentStatus ? 'verified' : 'unverified'} successfully`);
  } catch (error) {
    return errorResponse(res, 'Failed to update verification status', 500, error);
  }
};

export const remove = async (req, res) => {
  try {
    const id = req.params.id;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('face_data').delete().eq('voter_id', id);
        await supabase.from('votes').delete().eq('voter_id', id);
        await supabase.from('voters').delete().eq('id', id);
      } catch (_) {}
    }

    db.prepare('DELETE FROM face_data WHERE voter_id = ?').run(id);
    db.prepare('DELETE FROM votes WHERE voter_id = ?').run(id);
    db.prepare('DELETE FROM voters WHERE id = ?').run(id);

    return successResponse(res, null, 'Voter deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete voter', 500, error);
  }
};
