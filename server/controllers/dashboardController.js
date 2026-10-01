import db from '../config/db.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getStats = (req, res) => {
  try {
    const totalElections = db.prepare('SELECT COUNT(*) as count FROM elections').get().count;
    const activeElections = db.prepare("SELECT COUNT(*) as count FROM elections WHERE status = 'active'").get().count;
    const upcomingElections = db.prepare("SELECT COUNT(*) as count FROM elections WHERE status = 'upcoming'").get().count;
    const completedElections = db.prepare("SELECT COUNT(*) as count FROM elections WHERE status = 'completed'").get().count;
    
    const totalCandidates = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;
    const totalVoters = db.prepare('SELECT COUNT(*) as count FROM voters').get().count;
    const verifiedVoters = db.prepare('SELECT COUNT(*) as count FROM voters WHERE is_verified = 1').get().count;
    const pendingVoters = db.prepare('SELECT COUNT(*) as count FROM voters WHERE is_verified = 0').get().count;
    const votedCount = db.prepare('SELECT COUNT(*) as count FROM voters WHERE has_voted = 1').get().count;

    const recentElectionsSql = `
      SELECT e.id, e.title, e.status, e.start_date, e.end_date, 
             (SELECT COUNT(*) FROM candidates c WHERE c.election_id = e.id) as candidate_count 
      FROM elections e 
      ORDER BY e.created_at DESC 
      LIMIT 5
    `;
    const recentElections = db.prepare(recentElectionsSql).all();

    const stats = {
      totalElections,
      activeElections,
      upcomingElections,
      completedElections,
      totalCandidates,
      totalVoters,
      verifiedVoters,
      pendingVoters,
      votedCount,
      recentElections
    };

    return successResponse(res, stats, 'Dashboard stats retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to fetch dashboard stats', 500, error);
  }
};
