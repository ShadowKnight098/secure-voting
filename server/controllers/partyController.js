import db from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getAllParties = async (req, res) => {
  try {
    const { election_id } = req.query;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaParties, error } = await supabase
          .from('parties')
          .select('*')
          .order('name', { ascending: true });

        if (!error && supaParties && supaParties.length > 0) {
          return successResponse(res, supaParties, 'Parties retrieved successfully from cloud database');
        }
      } catch (err) {
        console.warn('[Supabase] getAllParties warning:', err.message);
      }
    }

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

    // Check duplicate in Supabase
    if (isSupabaseConfigured && supabase) {
      const { data: existingSupa } = await supabase
        .from('parties')
        .select('id')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existingSupa) {
        return errorResponse(res, `Party "${trimmedName}" already exists in cloud database`, 409);
      }
    }

    const existing = db.prepare('SELECT id FROM parties WHERE LOWER(name) = LOWER(?)').get(trimmedName);
    if (existing) {
      return errorResponse(res, `Party "${trimmedName}" already exists`, 409);
    }

    const targetElectionId = election_id ? parseInt(election_id, 10) : null;

    let createdParty = null;

    // 1. Supabase Cloud Insert
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaNew, error: supaErr } = await supabase
          .from('parties')
          .insert({
            name: trimmedName,
            code: cleanCode || '',
            description: cleanDesc || ''
          })
          .select()
          .single();

        if (supaNew) {
          createdParty = supaNew;
        } else if (supaErr) {
          console.error('[Supabase] Insert party error:', supaErr);
        }
      } catch (err) {
        console.error('[Supabase] Party insert exception:', err);
      }
    }

    // 2. Local SQLite Mirror
    const result = db.prepare(`
      INSERT INTO parties (name, code, description, logo_url, election_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(trimmedName, cleanCode, cleanDesc, logo_url?.trim() || null, targetElectionId);

    // Auto-attach as candidate to active elections in Supabase & SQLite
    const partyLabel = cleanCode ? `${trimmedName} (${cleanCode.toUpperCase()})` : trimmedName;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: activeElections } = await supabase.from('elections').select('id').in('status', ['upcoming', 'active']);
        if (activeElections) {
          for (const el of activeElections) {
            await supabase.from('candidates').insert({
              name: trimmedName,
              party: partyLabel,
              bio: cleanDesc || `Official ballot entry for ${trimmedName}`,
              election_id: el.id
            });
          }
        }
      } catch (_) {}
    }

    const localActive = db.prepare("SELECT id FROM elections WHERE status IN ('upcoming', 'active')").all();
    for (const el of localActive) {
      const alreadyCand = db.prepare('SELECT id FROM candidates WHERE election_id = ? AND LOWER(name) = LOWER(?)').get(el.id, trimmedName);
      if (!alreadyCand) {
        db.prepare(`
          INSERT INTO candidates (name, party, bio, photo_url, election_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(trimmedName, partyLabel, cleanDesc || '', logo_url?.trim() || null, el.id);
      }
    }

    if (!createdParty) {
      createdParty = db.prepare(`
        SELECT p.*, e.title as election_title 
        FROM parties p 
        LEFT JOIN elections e ON p.election_id = e.id 
        WHERE p.id = ?
      `).get(result.lastInsertRowid);
    }

    return successResponse(res, createdParty, 'Political party created and synchronized to cloud database successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create political party', 500, error);
  }
};

export const updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, logo_url, election_id } = req.body;

    const existing = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);

    const trimmedName = name ? name.trim() : (existing ? existing.name : '');
    const cleanCode = code !== undefined ? (code?.trim() || '') : (existing?.code || '');
    const cleanDesc = description !== undefined ? (description?.trim() || '') : (existing?.description || '');

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('parties')
          .update({ name: trimmedName, code: cleanCode, description: cleanDesc })
          .eq('id', id);
      } catch (_) {}
    }

    if (existing) {
      db.prepare(`
        UPDATE parties
        SET name = ?, code = ?, description = ?, logo_url = ?, election_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        trimmedName,
        cleanCode || null,
        cleanDesc || null,
        logo_url !== undefined ? (logo_url?.trim() || null) : existing.logo_url,
        election_id !== undefined ? (election_id ? parseInt(election_id, 10) : null) : existing.election_id,
        id
      );

      if (trimmedName !== existing.name) {
        db.prepare('UPDATE candidates SET party = ? WHERE party = ?').run(trimmedName, existing.name);
      }
    }

    return successResponse(res, { id, name: trimmedName, code: cleanCode, description: cleanDesc }, 'Party updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update political party', 500, error);
  }
};

export const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('parties').delete().eq('id', id);
      } catch (_) {}
    }

    db.prepare('DELETE FROM parties WHERE id = ?').run(id);

    return successResponse(res, { deletedId: id }, 'Party removed successfully from cloud and local storage');
  } catch (error) {
    return errorResponse(res, 'Failed to delete political party', 500, error);
  }
};

export const syncPartiesToElections = async (req, res) => {
  try {
    let parties = [];
    if (isSupabaseConfigured && supabase) {
      const { data: supaP } = await supabase.from('parties').select('*');
      if (supaP && supaP.length > 0) parties = supaP;
    }
    if (parties.length === 0) {
      parties = db.prepare('SELECT * FROM parties').all();
    }

    if (parties.length === 0) {
      return successResponse(res, { syncedCount: 0 }, 'No parties available to sync');
    }

    let elections = [];
    if (isSupabaseConfigured && supabase) {
      const { data: supaE } = await supabase.from('elections').select('*').in('status', ['upcoming', 'active']);
      if (supaE) elections = supaE;
    }
    if (elections.length === 0) {
      elections = db.prepare("SELECT * FROM elections WHERE status IN ('upcoming', 'active')").all();
    }

    let syncedCount = 0;

    for (const el of elections) {
      for (const p of parties) {
        const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('candidates').upsert({
              name: p.name,
              party: partyLabel,
              bio: p.description || '',
              election_id: el.id
            }, { onConflict: 'election_id, name' });
          } catch (_) {}
        }

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
