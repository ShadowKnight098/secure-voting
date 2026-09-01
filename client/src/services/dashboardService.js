import api from './api';

export const dashboardService = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data.data;
  },
  getRecentElections: async () => {
    const res = await api.get('/dashboard/stats');
    const recent = res.data.data.recentElections || [];
    return recent.map(e => ({
      id: e.id,
      title: e.title,
      status: e.status,
      participants: e.candidate_count,
      startDate: e.start_date,
      endDate: e.end_date
    }));
  }
};
