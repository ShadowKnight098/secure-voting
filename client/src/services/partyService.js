import api from './api';

export const partyService = {
  getAll: async (params = {}) => {
    const res = await api.get('/parties', { params });
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/parties', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/parties/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/parties/${id}`);
    return res.data;
  }
};

export default partyService;
