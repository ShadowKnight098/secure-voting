import api from './api';

const mapCandidate = (c) => {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    party: c.party,
    bio: c.bio,
    photoUrl: c.photo_url,
    electionId: c.election_id,
    electionTitle: c.election_title,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  };
};

export const candidateService = {
  getByElectionId: async (electionId, params) => {
    const res = await api.get('/candidates', { 
      params: { 
        ...params, 
        election_id: electionId 
      } 
    });
    const { candidates, pagination } = res.data.data;
    return {
      data: candidates.map(mapCandidate),
      pagination
    };
  },
  getById: async (electionId, candidateId) => {
    const res = await api.get(`/candidates/${candidateId}`);
    return mapCandidate(res.data.data);
  },
  create: async (electionId, formData) => {
    formData.append('election_id', electionId);
    const res = await api.post('/candidates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },
  update: async (electionId, candidateId, formData) => {
    formData.append('election_id', electionId);
    const res = await api.put(`/candidates/${candidateId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },
  delete: async (electionId, candidateId) => {
    const res = await api.delete(`/candidates/${candidateId}`);
    return res.data.data;
  }
};
