import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getAllParties = (req, res) => {
  try {
    const parties = db.prepare(`
      SELECT p.*, 
             (SELECT COUNT(*) FROM candidates c WHERE c.party = p.name) as candidate_count
      FROM parties p
      ORDER BY p.name ASC
    `).all();

    return successResponse(res, parties, 'Parties retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch political parties', 500, error);
  }
};

export const createParty = (req, res) => {
  try {
    const { name, code, description, logo_url } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Party name is required', 400);
    }

    const trimmedName = name.trim();
    const existing = db.prepare('SELECT id FROM parties WHERE LOWER(name) = LOWER(?)').get(trimmedName);
    if (existing) {
      return errorResponse(res, `Party "${trimmedName}" already exists`, 409);
    }

    const result = db.prepare(`
      INSERT INTO parties (name, code, description, logo_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(trimmedName, code?.trim() || null, description?.trim() || null, logo_url?.trim() || null);

    const newParty = db.prepare('SELECT * FROM parties WHERE id = ?').get(result.lastInsertRowid);
    return successResponse(res, newParty, 'Political party created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create political party', 500, error);
  }
};

export const updateParty = (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, logo_url } = req.body;

    const existing = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
    if (!existing) {
      return errorResponse(res, 'Party not found', 404);
    }

    const trimmedName = name ? name.trim() : existing.name;

    // Check duplicate name on another party
    if (name && trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = db.prepare('SELECT id FROM parties WHERE LOWER(name) = LOWER(?) AND id != ?').get(trimmedName, id);
      if (duplicate) {
        return errorResponse(res, `Another party with name "${trimmedName}" already exists`, 409);
      }
    }

    db.prepare(`
      UPDATE parties
      SET name = ?, code = ?, description = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      trimmedName,
      code !== undefined ? (code?.trim() || null) : existing.code,
      description !== undefined ? (description?.trim() || null) : existing.description,
      logo_url !== undefined ? (logo_url?.trim() || null) : existing.logo_url,
      id
    );

    // If party name changed, update existing candidates that were assigned the old party name
    if (trimmedName !== existing.name) {
      db.prepare('UPDATE candidates SET party = ? WHERE party = ?').run(trimmedName, existing.name);
    }

    const updated = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
    return successResponse(res, updated, 'Party updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update political party', 500, error);
  }
};

export const deleteParty = (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
    if (!existing) {
      return errorResponse(res, 'Party not found', 404);
    }

    // Check candidate count
    const candidateCount = db.prepare('SELECT COUNT(*) as count FROM candidates WHERE party = ?').get(existing.name).count;

    db.prepare('DELETE FROM parties WHERE id = ?').run(id);

    return successResponse(res, { deletedId: id, candidateCount }, 'Party removed successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete political party', 500, error);
  }
};
