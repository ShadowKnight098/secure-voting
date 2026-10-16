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

  // Strictly distinguish between voter portal requests and admin portal requests
  // CRITICAL: '/voter/' and '/voter' are voter endpoints, while '/voters' is the ADMIN voter management endpoint!
  const isVoterEndpoint = 
    config.url === '/voter' ||
    config.url?.startsWith('/voter/') ||
    config.url?.startsWith('/votes/ballot') ||
    config.url?.startsWith('/votes/cast') ||
    config.url?.startsWith('/votes/receipt');

  const isVoterPage = window.location.pathname.startsWith('/voter');

  const isAdminEndpoint = 
    config.url === '/voters' ||
    config.url?.startsWith('/voters/') ||
    config.url?.startsWith('/elections') ||
    config.url?.startsWith('/candidates') ||
    config.url?.startsWith('/parties') ||
    config.url?.startsWith('/dashboard') ||
    config.url?.startsWith('/auth');

  const isAdminPage = window.location.pathname.startsWith('/admin') || window.location.pathname === '/login';

  if (isAdminEndpoint || isAdminPage) {
    const adminToken = localStorage.getItem('token');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else if (isVoterEndpoint || isVoterPage) {
    const voterToken = localStorage.getItem('voter_token');
    if (voterToken) {
      config.headers.Authorization = `Bearer ${voterToken}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAdminContext = 
        window.location.pathname.startsWith('/admin') ||
        error.config?.url === '/voters' ||
        error.config?.url?.startsWith('/voters/') ||
        error.config?.url?.startsWith('/auth') ||
        error.config?.url?.startsWith('/elections') ||
        error.config?.url?.startsWith('/candidates') ||
        error.config?.url?.startsWith('/parties') ||
        error.config?.url?.startsWith('/dashboard');

      if (isAdminContext) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        localStorage.removeItem('voter_token');
        window.location.href = '/voter/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
