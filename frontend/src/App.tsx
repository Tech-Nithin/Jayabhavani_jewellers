import { useState, useEffect, useRef } from 'react';
import { verifySessionApi } from './services/api';
import AdminDashboard from './components/AdminDashboard';
import AdminLoginPage from './components/AdminLoginPage';
import IntroLoader from './components/IntroLoader';
import { initNativeNotifications } from './utils/nativeNotification';

const STORAGE_KEY_TOKEN = 'jbj_session_token';
const STORAGE_KEY_TAB = 'jbj_active_tab';

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

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TAB);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_TAB);
    setUser(null);
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
