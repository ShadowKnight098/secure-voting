import fs from 'fs';
import path from 'path';
import db from '../config/db.js';
import { successResponse, errorResponse, getPagination, getSearchFilter } from '../utils/helpers.js';

export const getAll = (req, res) => {
  try {
    const election_id = req.query.election_id;
    if (!election_id) {
        return errorResponse(res, 'election_id query parameter is required', 400);
    }

    const { page, limit, offset } = getPagination(req.query);
    const searchFilter = getSearchFilter(req.query, ['c.name', 'c.party']);
    
    let whereClause = 'WHERE c.election_id = ?';
    let queryParams = [election_id];

    if (searchFilter.sql) {
      whereClause += ` AND ${searchFilter.sql}`;
      queryParams.push(...searchFilter.params);
    }

    const countSql = `SELECT COUNT(*) as total FROM candidates c ${whereClause}`;
    const total = db.prepare(countSql).get(...queryParams).total;
    const totalPages = Math.ceil(total / limit);

    const sql = `
      SELECT c.*, e.title as election_title 
      FROM candidates c 
      JOIN elections e ON c.election_id = e.id 
      ${whereClause} 
      ORDER BY c.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const candidates = db.prepare(sql).all(...queryParams, limit, offset);

    return successResponse(res, { 
      candidates, 
      pagination: { page, limit, total, totalPages } 
    }, 'Candidates retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch candidates', 500, error);
  }
};

export const getById = (req, res) => {
  try {
    const id = req.params.id;
    const sql = `
      SELECT c.*, e.title as election_title 
      FROM candidates c 
      JOIN elections e ON c.election_id = e.id 
      WHERE c.id = ?
    `;
    const candidate = db.prepare(sql).get(id);

    if (!candidate) {
      return errorResponse(res, 'Candidate not found', 404);
    }

    return successResponse(res, candidate, 'Candidate retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch candidate', 500, error);
  }
};

export const create = (req, res) => {
  try {
    const { name, party, bio, election_id } = req.body;
    
    if (!name || !election_id) {
      return errorResponse(res, 'Name and election_id are required', 400);
    }

    let photo_url = null;
    if (req.file) {
      photo_url = `/uploads/candidates/${req.file.filename}`;
    }
    
    const sql = `
      INSERT INTO candidates (name, party, bio, photo_url, election_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = db.prepare(sql).run(
      name, 
      party || null, 
      bio || null, 
      photo_url, 
      election_id
    );

    return successResponse(res, { id: result.lastInsertRowid }, 'Candidate created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create candidate', 500, error);
  }
};

export const update = (req, res) => {
  try {
    const id = req.params.id;
    const { name, party, bio, election_id } = req.body;
    
    const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    if (!existing) {
       return errorResponse(res, 'Candidate not found', 404);
    }

    let photo_url = existing.photo_url;
    if (req.file) {
      photo_url = `/uploads/candidates/${req.file.filename}`;
      // Remove old photo
      if (existing.photo_url) {
          const oldPath = path.join(process.cwd(), existing.photo_url);
          if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
          }
      }
    }

    const sql = `
      UPDATE candidates 
      SET name = COALESCE(?, name),
          party = COALESCE(?, party),
          bio = COALESCE(?, bio),
          photo_url = COALESCE(?, photo_url),
          election_id = COALESCE(?, election_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.prepare(sql).run(name, party, bio, photo_url, election_id, id);

    return successResponse(res, null, 'Candidate updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update candidate', 500, error);
  }
};

export const remove = (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    
    if (!existing) {
      return errorResponse(res, 'Candidate not found', 404);
    }

    db.prepare('DELETE FROM candidates WHERE id = ?').run(id);

    if (existing.photo_url) {
        const oldPath = path.join(process.cwd(), existing.photo_url);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    return successResponse(res, null, 'Candidate deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete candidate', 500, error);
  }
};
