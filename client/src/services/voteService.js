import api from './api';

export const voteService = {
  getBallot: async (electionId) => {
    const res = await api.get(`/votes/ballot/${electionId}`);
    return res.data.data;
  },
  castVote: async (payload) => {
    const res = await api.post('/votes/cast', payload);
    return res.data;
  },
  getReceipt: async (electionId) => {
    const res = await api.get(`/votes/receipt/${electionId}`);
    return res.data.data;
  },
  getResults: async (electionId) => {
    const res = await api.get(`/votes/results/${electionId}`);
    return res.data.data;
  },
  getAuditLedger: async (electionId) => {
    const res = await api.get(`/votes/audit/${electionId}`);
    return res.data.data;
  },
  verifyReceipt: async (receiptCode) => {
    const res = await api.get(`/votes/verify-receipt/${encodeURIComponent(receiptCode)}`);
    return res.data.data;
  }
};

export default voteService;
