import api from './api';

export const adminVoterService = {
  getAll: async (params) => {
    const res = await api.get('/voters', { params });
    return res.data.data;
  },
  getById: async (id) => {
    const res = await api.get(`/voters/${id}`);
    return res.data.data;
  },
  create: async (data) => {
    const res = await api.post('/voters', data);
    return res.data.data;
  },
  toggleVerify: async (id, is_verified) => {
    const res = await api.put(`/voters/${id}/verify`, { is_verified });
    return res.data.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/voters/${id}`);
    return res.data.data;
  }
};
