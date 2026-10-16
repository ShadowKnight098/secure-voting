import api from './api';

const getVoterHeaders = () => {
  const voterToken = localStorage.getItem('voter_token');
  return voterToken ? { Authorization: `Bearer ${voterToken}` } : {};
};

const getAdminHeaders = () => {
  const adminToken = localStorage.getItem('token');
  return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
};

export const voteService = {
  getBallot: async (electionId) => {
    const res = await api.get(`/votes/ballot/${electionId}`, { headers: getVoterHeaders() });
    return res.data.data;
  },
  castVote: async (payload) => {
    const res = await api.post('/votes/cast', payload, { headers: getVoterHeaders() });
    return res.data;
  },
  getReceipt: async (electionId) => {
    const res = await api.get(`/votes/receipt/${electionId}`, { headers: getVoterHeaders() });
    return res.data.data;
  },
  getResults: async (electionId) => {
    const res = await api.get(`/votes/results/${electionId}`);
    return res.data.data;
  },
  getAuditLedger: async (electionId) => {
    const res = await api.get(`/votes/audit/${electionId}`, { headers: getAdminHeaders() });
    return res.data.data;
  },
  verifyReceipt: async (receiptCode) => {
    const res = await api.get(`/votes/verify-receipt/${encodeURIComponent(receiptCode)}`);
    return res.data.data;
  }
};

export default voteService;
