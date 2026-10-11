import api from './api';

const computeDynamicStatus = (startDate, endDate, currentStatus) => {
  if (currentStatus === 'cancelled') return 'cancelled';
  if (!startDate || !endDate) return currentStatus || 'upcoming';

  const todayStr = new Date().toISOString().split('T')[0];
  const startStr = startDate.includes('T') ? startDate.split('T')[0] : startDate;
  const endStr = endDate.includes('T') ? endDate.split('T')[0] : endDate;

  if (todayStr > endStr) {
    return 'completed';
  } else if (todayStr >= startStr && todayStr <= endStr) {
    return 'active';
  } else {
    return 'upcoming';
  }
};

const mapElection = (e) => {
  if (!e) return null;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startDate: e.start_date,
    endDate: e.end_date,
    status: computeDynamicStatus(e.start_date, e.end_date, e.status),
    candidateCount: e.candidate_count,
    createdBy: e.created_by,
    createdAt: e.created_at,
    updatedAt: e.updated_at
  };
};

export const electionService = {
  getAll: async (params) => {
    const res = await api.get('/elections', { params });
    const { elections, pagination } = res.data.data;
    return {
      data: elections.map(mapElection),
      pagination
    };
  },
  getById: async (id) => {
    const res = await api.get(`/elections/${id}`);
    return mapElection(res.data.data);
  },
  create: async (data) => {
    // Send standard snake_case fields matching DB expectations
    const payload = {
      title: data.title,
      description: data.description,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status
    };
    const res = await api.post('/elections', payload);
    return res.data.data;
  },
  update: async (id, data) => {
    const payload = {
      title: data.title,
      description: data.description,
      start_date: data.startDate,
      end_date: data.endDate,
      status: data.status
    };
    const res = await api.put(`/elections/${id}`, payload);
    return res.data.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/elections/${id}`);
    return res.data.data;
  }
};
