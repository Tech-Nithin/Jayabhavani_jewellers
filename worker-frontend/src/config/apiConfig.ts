// Dynamic API Base URL configuration for local dev and production
const getApiBase = (): string => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  // Local network IP address fallback
  return `http://${host}:5000/api`;
};

export const API_BASE = getApiBase();
