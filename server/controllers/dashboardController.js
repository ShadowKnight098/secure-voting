import db from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getStats = async (req, res) => {
  try {
    // Try Supabase first for accurate centralized stats
    if (isSupabaseConfigured && supabase) {
      try {
        const [
          { count: totalElections },
          { count: activeElections },
          { count: upcomingElections },
          { count: completedElections },
          { count: totalCandidates },
          { count: totalParties },
          { count: totalVoters },
          { count: verifiedVoters },
          { count: pendingVoters },
          { count: votedCount }
        ] = await Promise.all([
          supabase.from('elections').select('*', { count: 'exact', head: true }),
          supabase.from('elections').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('elections').select('*', { count: 'exact', head: true }).eq('status', 'upcoming'),
          supabase.from('elections').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('candidates').select('*', { count: 'exact', head: true }),
          supabase.from('parties').select('*', { count: 'exact', head: true }),
          supabase.from('voters').select('*', { count: 'exact', head: true }),
          supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_verified', true),
          supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_verified', false),
          supabase.from('voters').select('*', { count: 'exact', head: true }).eq('has_voted', true),
        ]);

        const { data: recentElections } = await supabase
          .from('elections')
          .select('id, title, status, start_date, end_date, candidates(count)')
          .order('created_at', { ascending: false })
          .limit(5);

        const mappedRecent = (recentElections || []).map(e => ({
          id: e.id,
          title: e.title,
          status: e.status,
          start_date: e.start_date,
          end_date: e.end_date,
          candidate_count: e.candidates?.[0]?.count || 0
        }));

        return successResponse(res, {
          totalElections: totalElections || 0,
          activeElections: activeElections || 0,
          upcomingElections: upcomingElections || 0,
          completedElections: completedElections || 0,
          totalCandidates: totalCandidates || 0,
          totalParties: totalParties || 0,
          totalVoters: totalVoters || 0,
          verifiedVoters: verifiedVoters || 0,
          pendingVoters: pendingVoters || 0,
          votedCount: votedCount || 0,
          recentElections: mappedRecent
        }, 'Dashboard stats retrieved from cloud database');
      } catch (sbErr) {
        console.warn('[Supabase] Dashboard stats warning, falling back to SQLite:', sbErr.message);
      }
    }

    // SQLite fallback
    const totalElections = db.prepare('SELECT COUNT(*) as count FROM elections').get().count;
    const activeElections = db.prepare("SELECT COUNT(*) as count FROM elections WHERE status = 'active'").get().count;
    const upcomingElections = db.prepare("SELECT COUNT(*) as count FROM elections WHERE status = 'upcoming'").get().count;
    const completedElections = db.prepare("SELECT COUNT(*) as count FROM elections WHERE status = 'completed'").get().count;
    const totalCandidates = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;
    const totalParties = db.prepare('SELECT COUNT(*) as count FROM parties').get().count;
    const totalVoters = db.prepare('SELECT COUNT(*) as count FROM voters').get().count;
    const verifiedVoters = db.prepare('SELECT COUNT(*) as count FROM voters WHERE is_verified = 1').get().count;
    const pendingVoters = db.prepare('SELECT COUNT(*) as count FROM voters WHERE is_verified = 0').get().count;
    const votedCount = db.prepare('SELECT COUNT(*) as count FROM voters WHERE has_voted = 1').get().count;

    const recentElections = db.prepare(`
      SELECT e.id, e.title, e.status, e.start_date, e.end_date,
             (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidate_count 
      FROM elections e 
      ORDER BY e.created_at DESC 
      LIMIT 5
    `).all();

    return successResponse(res, {
      totalElections, activeElections, upcomingElections, completedElections,
      totalCandidates, totalParties, totalVoters, verifiedVoters, pendingVoters,
      votedCount, recentElections
    }, 'Dashboard stats retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch dashboard stats', 500, error);
  }
};
