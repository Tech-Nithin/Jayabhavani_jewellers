import { useState, useEffect } from 'react';
import { verifySessionApi } from './services/api';
import AdminDashboard from './components/AdminDashboard';
import AdminLoginPage from './components/AdminLoginPage';
import IntroLoader from './components/IntroLoader';
import { initNativeNotifications } from './utils/nativeNotification';

const STORAGE_KEY_TOKEN = 'jbj_session_token';
const STORAGE_KEY_TAB = 'jbj_active_tab';

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Check saved admin session token on mount
  useEffect(() => {
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
      {user ? (
        <AdminDashboard
          user={user}
          onLogout={handleLogout}
          onBackToStore={handleLogout}
        />
      ) : (
        <AdminLoginPage onSuccess={handleLoginSuccess} />
      )}
    </>
  );
}
