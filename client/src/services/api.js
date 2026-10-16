import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // If authorization header is already explicitly set, keep it
  if (config.headers.Authorization) {
    return config;
  }

  // Detect whether this is a voter action or admin action
  const isVoter = 
    window.location.pathname.startsWith('/voter') ||
    config.url?.startsWith('/voter') ||
    config.url?.startsWith('/votes/ballot') ||
    config.url?.startsWith('/votes/cast') ||
    config.url?.startsWith('/votes/receipt');

  if (isVoter) {
    const voterToken = localStorage.getItem('voter_token');
    if (voterToken) {
      config.headers.Authorization = `Bearer ${voterToken}`;
    }
  } else {
    const adminToken = localStorage.getItem('token');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isVoterContext = 
        window.location.pathname.startsWith('/voter') ||
        error.config?.url?.startsWith('/voter') ||
        error.config?.url?.startsWith('/votes/ballot') ||
        error.config?.url?.startsWith('/votes/cast') ||
        error.config?.url?.startsWith('/votes/receipt');

      if (isVoterContext) {
        localStorage.removeItem('voter_token');
        window.location.href = '/voter/login';
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
