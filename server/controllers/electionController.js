import db from '../config/db.js';
import { successResponse, errorResponse, getPagination, getSearchFilter } from '../utils/helpers.js';

export const getAll = (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const searchFilter = getSearchFilter(req.query, ['title', 'description']);
    const status = req.query.status;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (searchFilter.sql) {
      whereClause += ` AND ${searchFilter.sql}`;
      queryParams.push(...searchFilter.params);
    }

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    const countSql = `SELECT COUNT(*) as total FROM elections ${whereClause}`;
    const total = db.prepare(countSql).get(...queryParams).total;
    const totalPages = Math.ceil(total / limit);

    const sql = `
      SELECT e.*, (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidate_count 
      FROM elections e 
      ${whereClause} 
      ORDER BY e.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const elections = db.prepare(sql).all(...queryParams, limit, offset);

    return successResponse(res, { 
      elections, 
      pagination: { page, limit, total, totalPages } 
    }, 'Elections retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch elections', 500, error);
  }
};

export const getById = (req, res) => {
  try {
    const id = req.params.id;
    const sql = `
      SELECT e.*, (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidate_count 
      FROM elections e 
      WHERE id = ?
    `;
    const election = db.prepare(sql).get(id);

    if (!election) {
      return errorResponse(res, 'Election not found', 404);
    }

    return successResponse(res, election, 'Election retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch election', 500, error);
  }
};

export const create = (req, res) => {
  try {
    const { title, description, start_date, end_date, status } = req.body;
    
    if (!title || !start_date || !end_date) {
      return errorResponse(res, 'Title, start_date, and end_date are required', 400);
    }

    const created_by = req.user.id;
    
    const sql = `
      INSERT INTO elections (title, description, start_date, end_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = db.prepare(sql).run(
      title, 
      description || null, 
      start_date, 
      end_date, 
      status || 'upcoming', 
      created_by
    );

    return successResponse(res, { id: result.lastInsertRowid }, 'Election created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create election', 500, error);
  }
};

export const update = (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, start_date, end_date, status } = req.body;
    
    const existing = db.prepare('SELECT * FROM elections WHERE id = ?').get(id);
    if (!existing) {
       return errorResponse(res, 'Election not found', 404);
    }

    const sql = `
      UPDATE elections 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.prepare(sql).run(title, description, start_date, end_date, status, id);

    return successResponse(res, null, 'Election updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update election', 500, error);
  }
};

export const remove = (req, res) => {
  try {
    const id = req.params.id;
    const result = db.prepare('DELETE FROM elections WHERE id = ?').run(id);

    if (result.changes === 0) {
      return errorResponse(res, 'Election not found', 404);
    }

    return successResponse(res, null, 'Election deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete election', 500, error);
  }
};
