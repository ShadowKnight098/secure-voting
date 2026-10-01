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
  // Support both Admin token and Voter token
  const token = localStorage.getItem('token') || localStorage.getItem('voter_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If admin was logged in, redirect to login
      if (localStorage.getItem('token')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (localStorage.getItem('voter_token')) {
        localStorage.removeItem('voter_token');
        window.location.href = '/voter/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
