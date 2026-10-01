import api from './api';

export const voterService = {
  getAvailableElections: async () => {
    const res = await api.get('/voter/elections');
    return res.data.data;
  },
  register: async (formData) => {
    const res = await api.post('/voter/register', formData);
    return res.data.data;
  },
  login: async (credentials) => {
    const res = await api.post('/voter/login', credentials);
    return res.data.data;
  },
  getProfile: async () => {
    const token = localStorage.getItem('voter_token');
    const res = await api.get('/voter/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return res.data.data;
  }
};
