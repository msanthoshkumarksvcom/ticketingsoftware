// Central API and Socket configuration for local development and live production
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const SOCKET_URL = API_BASE;

export default {
  API_BASE,
  SOCKET_URL
};

