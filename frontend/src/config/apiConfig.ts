export const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const cleaned = envUrl.trim().replace(/\/+$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }
  if ((window as any).Capacitor?.isNativePlatform()) {
    return 'https://jbj-backend.vercel.app/api';
  }
  return window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : 'https://jbj-backend.vercel.app/api';
};

export const API_BASE = getApiBase();
