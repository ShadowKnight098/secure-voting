import api from './api';

const getVoterHeaders = () => {
  const token = localStorage.getItem('voter_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
    const res = await api.get('/voter/profile', { headers: getVoterHeaders() });
    return res.data.data;
  },
  getFaceDescriptor: async () => {
    const res = await api.get('/voter/face-descriptor', { headers: getVoterHeaders() });
    return res.data.data;
  },
  verifyFace: async (payload) => {
    const res = await api.post('/voter/verify-face', payload, { headers: getVoterHeaders() });
    return res.data;
  }
};

export default voterService;
