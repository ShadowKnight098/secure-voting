import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getAllParties = async (req, res) => {
  try {
    const { election_id } = req.query;

    let sql = `
      SELECT p.*, e.title as election_title,
             (SELECT COUNT(*) FROM candidates c WHERE c.party = p.name) as candidate_count
      FROM parties p
      LEFT JOIN elections e ON p.election_id = e.id
    `;
    const params = [];
    if (election_id) {
      sql += ` WHERE p.election_id = ? OR p.election_id IS NULL`;
      params.push(parseInt(election_id, 10));
    }
    sql += ` ORDER BY p.name ASC`;

    const parties = db.prepare(sql).all(...params);

    return successResponse(res, parties, 'Parties retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch political parties', 500, error);
  }
};

export const createParty = async (req, res) => {
  try {
    const { name, code, description, logo_url, election_id } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Party name is required', 400);
    }

    const trimmedName = name.trim();
    const cleanCode = code?.trim() || null;
    const cleanDesc = description?.trim() || null;

    const existing = db.prepare('SELECT id FROM parties WHERE LOWER(name) = LOWER(?)').get(trimmedName);
    if (existing) {
      return errorResponse(res, `Party "${trimmedName}" already exists`, 409);
    }

    const targetElectionId = election_id ? parseInt(election_id, 10) : null;

    // 1. Insert Party into SQLite
    const result = db.prepare(`
      INSERT INTO parties (name, code, description, logo_url, election_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(trimmedName, cleanCode, cleanDesc, logo_url?.trim() || null, targetElectionId);

    // 2. Auto-attach as candidate to active/upcoming elections
    const partyLabel = cleanCode ? `${trimmedName} (${cleanCode.toUpperCase()})` : trimmedName;
    const activeElections = db.prepare("SELECT id FROM elections WHERE status IN ('upcoming', 'active')").all();
    
    for (const el of activeElections) {
      const alreadyCand = db.prepare('SELECT id FROM candidates WHERE election_id = ? AND LOWER(name) = LOWER(?)').get(el.id, trimmedName);
      if (!alreadyCand) {
        db.prepare(`
          INSERT INTO candidates (name, party, bio, photo_url, election_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(trimmedName, partyLabel, cleanDesc || '', logo_url?.trim() || null, el.id);
      }
    }

    const createdParty = db.prepare(`
      SELECT p.*, e.title as election_title 
      FROM parties p 
      LEFT JOIN elections e ON p.election_id = e.id 
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    return successResponse(res, createdParty, 'Political party created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create political party', 500, error);
  }
};

export const updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, logo_url, election_id } = req.body;

    const existing = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
    if (!existing) {
      return errorResponse(res, 'Party not found', 404);
    }

    const trimmedName = name ? name.trim() : existing.name;
    const cleanCode = code !== undefined ? (code?.trim() || '') : (existing?.code || '');
    const cleanDesc = description !== undefined ? (description?.trim() || '') : (existing?.description || '');

    const localElect = election_id ? db.prepare('SELECT id FROM elections WHERE id = ?').get(parseInt(election_id, 10)) : null;
    const safeElectionId = localElect ? parseInt(election_id, 10) : (existing.election_id || null);

    db.prepare(`
      UPDATE parties
      SET name = ?, code = ?, description = ?, logo_url = ?, election_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      trimmedName,
      cleanCode || null,
      cleanDesc || null,
      logo_url !== undefined ? (logo_url?.trim() || null) : existing.logo_url,
      safeElectionId,
      id
    );

    if (trimmedName !== existing.name) {
      db.prepare('UPDATE candidates SET party = ? WHERE party = ?').run(trimmedName, existing.name);
    }

    const updated = db.prepare(`
      SELECT p.*, e.title as election_title 
      FROM parties p 
      LEFT JOIN elections e ON p.election_id = e.id 
      WHERE p.id = ?
    `).get(id);

    return successResponse(res, updated, 'Party updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update political party', 500, error);
  }
};

export const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;

    db.prepare('DELETE FROM parties WHERE id = ?').run(id);

    return successResponse(res, { deletedId: id }, 'Party removed successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete political party', 500, error);
  }
};

export const syncPartiesToElections = async (req, res) => {
  try {
    const parties = db.prepare('SELECT * FROM parties').all();
    if (parties.length === 0) {
      return successResponse(res, { syncedCount: 0 }, 'No parties available to sync');
    }

    const elections = db.prepare("SELECT * FROM elections WHERE status IN ('upcoming', 'active')").all();
    let syncedCount = 0;

    for (const el of elections) {
      for (const p of parties) {
        const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
        try {
          db.prepare(`
            INSERT OR IGNORE INTO candidates (name, party, bio, photo_url, election_id)
            VALUES (?, ?, ?, ?, ?)
          `).run(p.name, partyLabel, p.description || '', p.logo_url || null, el.id);
          syncedCount++;
        } catch (_) {}
      }
    }

    return successResponse(res, { syncedCount, electionsCount: elections.length }, `Successfully synced parties across all active elections`);
  } catch (error) {
    return errorResponse(res, 'Failed to sync parties to elections', 500, error);
  }
};
