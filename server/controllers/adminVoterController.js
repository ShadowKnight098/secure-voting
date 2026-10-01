import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { successResponse, errorResponse, getPagination, getSearchFilter } from '../utils/helpers.js';

export const getAll = (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const searchFilter = getSearchFilter(req.query, ['v.full_name', 'v.email', 'v.voter_id_number', 'v.phone']);
    const election_id = req.query.election_id;
    const is_verified = req.query.is_verified;
    const has_voted = req.query.has_voted;

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
             e.title as election_title, e.status as election_status
      FROM voters v
      LEFT JOIN elections e ON v.election_id = e.id
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

export const getById = (req, res) => {
  try {
    const id = req.params.id;
    const sql = `
      SELECT v.id, v.full_name, v.email, v.phone, v.voter_id_number, v.has_voted, v.is_verified, v.election_id, v.created_at,
             e.title as election_title, e.status as election_status
      FROM voters v
      LEFT JOIN elections e ON v.election_id = e.id
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

    const existingEmail = db.prepare('SELECT id FROM voters WHERE email = ?').get(email);
    if (existingEmail) {
      return errorResponse(res, 'A voter with this email already exists', 409);
    }

    const existingVoterId = db.prepare('SELECT id FROM voters WHERE voter_id_number = ?').get(voter_id_number);
    if (existingVoterId) {
      return errorResponse(res, 'A voter with this Voter ID number already exists', 409);
    }

    const defaultPassword = password || 'voter123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    const stmt = db.prepare(`
      INSERT INTO voters (full_name, email, phone, voter_id_number, password_hash, has_voted, is_verified, election_id)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const result = stmt.run(
      full_name,
      email,
      phone || null,
      voter_id_number,
      passwordHash,
      is_verified ? 1 : 0,
      election_id
    );

    return successResponse(res, { id: result.lastInsertRowid }, 'Voter created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create voter', 500, error);
  }
};

export const toggleVerify = (req, res) => {
  try {
    const id = req.params.id;
    const { is_verified } = req.body;

    const existing = db.prepare('SELECT * FROM voters WHERE id = ?').get(id);
    if (!existing) {
      return errorResponse(res, 'Voter not found', 404);
    }

    // Toggle if is_verified not explicitly supplied
    const newStatus = is_verified !== undefined ? (is_verified ? 1 : 0) : (existing.is_verified ? 0 : 1);

    db.prepare(`
      UPDATE voters 
      SET is_verified = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(newStatus, id);

    return successResponse(res, { id, is_verified: newStatus }, `Voter ${newStatus ? 'verified' : 'unverified'} successfully`);
  } catch (error) {
    return errorResponse(res, 'Failed to update verification status', 500, error);
  }
};

export const remove = (req, res) => {
  try {
    const id = req.params.id;
    const result = db.prepare('DELETE FROM voters WHERE id = ?').run(id);

    if (result.changes === 0) {
      return errorResponse(res, 'Voter not found', 404);
    }

    return successResponse(res, null, 'Voter deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete voter', 500, error);
  }
};
