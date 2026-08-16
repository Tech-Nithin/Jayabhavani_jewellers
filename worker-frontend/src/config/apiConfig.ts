// Dynamic API Base URL configuration for local dev and production
const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const cleaned = envUrl.trim().replace(/\/+$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }
  // Native Capacitor APK fallback
  if ((window as any).Capacitor?.isNativePlatform()) {
    return 'https://jayabhavani-jewellers-aa1p.vercel.app/api';
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return `http://${host}:5000/api`;
};

export const API_BASE = getApiBase();
