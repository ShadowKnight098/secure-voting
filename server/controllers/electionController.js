import db from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { successResponse, errorResponse, getPagination, getSearchFilter } from '../utils/helpers.js';

const syncElectionStatuses = () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    // Automatically set status to active if today is between start_date and end_date
    db.prepare(`
      UPDATE elections 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP 
      WHERE status != 'cancelled' AND date(start_date) <= date(?) AND date(end_date) >= date(?)
    `).run(todayStr, todayStr);

    // Automatically set status to completed if end_date has passed
    db.prepare(`
      UPDATE elections 
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
      WHERE status != 'cancelled' AND date(end_date) < date(?)
    `).run(todayStr);

    // Automatically set status to upcoming if start_date is in the future
    db.prepare(`
      UPDATE elections 
      SET status = 'upcoming', updated_at = CURRENT_TIMESTAMP 
      WHERE status != 'cancelled' AND date(start_date) > date(?)
    `).run(todayStr);
  } catch (err) {
    console.error('Error synchronizing election statuses:', err);
  }
};

const getCalculatedStatus = (startDate, endDate, requestedStatus) => {
  if (requestedStatus === 'cancelled') return 'cancelled';
  if (!startDate || !endDate) return requestedStatus || 'upcoming';

  const todayStr = new Date().toISOString().split('T')[0];
  const startStr = startDate.includes('T') ? startDate.split('T')[0] : startDate;
  const endStr = endDate.includes('T') ? endDate.split('T')[0] : endDate;

  if (todayStr > endStr) return 'completed';
  if (todayStr >= startStr && todayStr <= endStr) return 'active';
  return 'upcoming';
};

export const getAll = (req, res) => {
  try {
    // Automatically sync statuses before listing
    syncElectionStatuses();

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
    syncElectionStatuses();
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

export const create = async (req, res) => {
  try {
    const { title, description, start_date, end_date, status, startDate, endDate } = req.body;
    const finalStart = start_date || startDate;
    const finalEnd = end_date || endDate;
    
    if (!title || !finalStart || !finalEnd) {
      return errorResponse(res, 'Title, start date, and end date are required', 400);
    }

    const calculatedStatus = getCalculatedStatus(finalStart, finalEnd, status);
    const created_by = req.user?.id || 1;
    
    const sql = `
      INSERT INTO elections (title, description, start_date, end_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = db.prepare(sql).run(
      title, 
      description || null, 
      finalStart, 
      finalEnd, 
      calculatedStatus, 
      created_by
    );

    const newElectionId = result.lastInsertRowid;

    // Sync to Supabase Cloud
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaElect, error: supaErr } = await supabase.from('elections').insert({
          title,
          description: description || null,
          start_date: new Date(finalStart).toISOString(),
          end_date: new Date(finalEnd).toISOString(),
          status: calculatedStatus,
          created_by: 1
        }).select().single();

        if (supaElect) {
          const { data: supaParties } = await supabase.from('parties').select('*');
          if (supaParties) {
            for (const p of supaParties) {
              const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
              await supabase.from('candidates').insert({
                name: p.name,
                party: partyLabel,
                bio: p.description || `Official ballot entry for ${p.name}`,
                election_id: supaElect.id
              });
            }
          }
        }
      } catch (sbErr) {
        console.warn('[Supabase] Election cloud insert warning:', sbErr.message);
      }
    }

    // Automatically attach all recognized political parties to the new election
    try {
      const allParties = db.prepare('SELECT * FROM parties').all();
      if (allParties.length > 0) {
        const insertCand = db.prepare(`
          INSERT INTO candidates (name, party, bio, photo_url, election_id)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const p of allParties) {
          const partyLabel = p.code ? `${p.name} (${p.code})` : p.name;
          insertCand.run(p.name, partyLabel, p.description || '', p.logo_url || null, newElectionId);
        }
      }
    } catch (partyAttachErr) {
      console.warn('Could not auto-attach parties to election:', partyAttachErr.message);
    }

    return successResponse(res, { id: newElectionId }, 'Election created and parties populated successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create election', 500, error);
  }
};

export const update = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, start_date, end_date, status, startDate, endDate } = req.body;
    const finalStart = start_date || startDate;
    const finalEnd = end_date || endDate;
    
    const existing = db.prepare('SELECT * FROM elections WHERE id = ?').get(id);
    if (!existing) {
       return errorResponse(res, 'Election not found', 404);
    }

    const updatedStart = finalStart || existing.start_date;
    const updatedEnd = finalEnd || existing.end_date;
    const calculatedStatus = (status === 'cancelled') 
      ? 'cancelled' 
      : (status ? status : getCalculatedStatus(updatedStart, updatedEnd, existing.status));

    const sql = `
      UPDATE elections 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.prepare(sql).run(title, description, finalStart, finalEnd, calculatedStatus, id);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('elections').update({
          title: title || existing.title,
          description: description !== undefined ? description : existing.description,
          start_date: finalStart ? new Date(finalStart).toISOString() : existing.start_date,
          end_date: finalEnd ? new Date(finalEnd).toISOString() : existing.end_date,
          status: calculatedStatus
        }).eq('id', id);
      } catch (_) {}
    }

    return successResponse(res, null, 'Election updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update election', 500, error);
  }
};

export const remove = async (req, res) => {
  try {
    const id = req.params.id;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('elections').delete().eq('id', id);
      } catch (_) {}
    }

    const result = db.prepare('DELETE FROM elections WHERE id = ?').run(id);

    if (result.changes === 0) {
      return errorResponse(res, 'Election not found', 404);
    }

    return successResponse(res, null, 'Election deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete election', 500, error);
  }
};
