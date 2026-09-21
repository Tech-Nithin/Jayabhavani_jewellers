import { useState, useEffect, useRef } from 'react';
import { verifySessionApi, logoutUserApi } from './services/api';
import AdminDashboard from './components/AdminDashboard';
import AdminLoginPage from './components/AdminLoginPage';
import IntroLoader from './components/IntroLoader';
import { initNativeNotifications } from './utils/nativeNotification';

const STORAGE_KEY_TOKEN = 'jbj_session_token';

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [checking, setChecking] = useState(true);

  const isSessionCheckedRef = useRef(false);

  // Check saved admin session token on mount
  useEffect(() => {
    if (isSessionCheckedRef.current) return;
    isSessionCheckedRef.current = true;
    initNativeNotifications();
    async function checkSession() {
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);

      if (savedToken) {
        const res = await verifySessionApi(savedToken);
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          sessionStorage.removeItem(STORAGE_KEY_TOKEN);
          setUser(null);
        }
      }
      // Done verifying — now safe to show login or dashboard
      setChecking(false);
    }

    checkSession();
  }, []);

  // Global Protection: Disable mouse wheel increment/decrement on all number input fields across the entire app
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement as HTMLInputElement | null;
      const targetEl = e.target as HTMLInputElement | null;

      const isNumberInput = (el: HTMLInputElement | null) =>
        Boolean(el && el.tagName === 'INPUT' && (el.type === 'number' || el.getAttribute('type') === 'number'));

      if (isNumberInput(activeEl)) {
        activeEl?.blur();
      }
      if (isNumberInput(targetEl)) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Handle Logout (Notifies backend, wipes all local & session storage, cookies, browser caches, and URL state)
  const handleLogout = async () => {
    const currentToken = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN) || '';
    try {
      if (currentToken) {
        await logoutUserApi(currentToken);
      }
    } catch (e) {
      console.warn('Backend logout warning:', e);
    }

    try {
      // 1. Wipe all local and session storage
      localStorage.clear();
      sessionStorage.clear();

      // 2. Wipe all accessible browser cookies across paths and domains
      if (typeof document !== 'undefined' && document.cookie) {
        const cookies = document.cookie.split(';');
        const host = window.location.hostname;
        const hostParts = host.split('.');
        
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          if (name) {
            // Expire for standard root path
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${host};`;
            
            // If subdomains exist, expire on root domain
            if (hostParts.length > 1) {
              const rootDomain = '.' + hostParts.slice(-2).join('.');
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${rootDomain};`;
            }
          }
        }
      }

      // 3. Clear Service Worker & Browser Cache Storage
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.warn('Storage & cookie cleanup warning:', e);
    }

    setUser(null);
    window.location.replace(window.location.pathname);
  };

  // Handle Successful Login
  const handleLoginSuccess = (loggedUser: { name: string; email: string }, token?: string) => {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    }
    setUser(loggedUser);
  };

  return (
    <>
      <IntroLoader />
      {/* Render nothing while session token is being verified to prevent login screen flash */}
      {!checking && (
        user ? (
          <AdminDashboard
            user={user}
            onLogout={handleLogout}
            onBackToStore={handleLogout}
          />
        ) : (
          <AdminLoginPage onSuccess={handleLoginSuccess} />
        )
      )}
    </>
  );
}
