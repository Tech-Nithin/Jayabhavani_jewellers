import { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { verifySessionApi } from './services/api';

import IntroLoader     from './components/IntroLoader';
import AnnouncementBar  from './components/AnnouncementBar';
import Navbar           from './components/Navbar';
import SearchOverlay    from './components/SearchOverlay';
import Hero             from './components/Hero';
import TrustStrip       from './components/TrustStrip';
import CollectionsGrid  from './components/CollectionsGrid';
import ProductSection   from './components/ProductSection';
import MarqueeStrip     from './components/MarqueeStrip';
import AboutSection     from './components/AboutSection';
import Testimonials     from './components/Testimonials';
import Newsletter       from './components/Newsletter';
import Footer           from './components/Footer';
import CartDrawer       from './components/CartDrawer';
import SignInModal      from './components/SignInModal';
import AdminDashboard   from './components/AdminDashboard';
import Toast            from './components/Toast';
import BackToTop        from './components/BackToTop';
import WhatsAppButton   from './components/WhatsAppButton';
import GoldPage         from './pages/GoldPage';
import SilverPage       from './pages/SilverPage';

import { rings, necklaces, earrings, nosepins } from './data/products';
import { setupReveal } from './utils';

const STORAGE_KEY_TOKEN = 'jbj_session_token';
const STORAGE_KEY_TAB = 'jbj_active_tab';

function AppContent() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [currentView, setCurrentView] = useState<'store' | 'dashboard' | 'gold' | 'silver'>('store');
  const [verifyingSession, setVerifyingSession] = useState(true);

  // Read URL query params on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'gold' || viewParam === 'silver') {
      setCurrentView(viewParam);
    }
  }, []);

  // Secure Backend Token Session Verification on Mount/Refresh
  useEffect(() => {
    async function checkSession() {
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);
      if (savedToken) {
        // Send token to backend for HMAC signature verification
        const res = await verifySessionApi(savedToken);
        if (res.success && res.user) {
          setUser(res.user);
          const params = new URLSearchParams(window.location.search);
          if (params.get('view') === 'admin' || params.get('tab') || localStorage.getItem(STORAGE_KEY_TAB)) {
            setCurrentView('dashboard');
          }
        } else {
          // Token tampered, stolen, or expired - clear invalid token immediately
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          sessionStorage.removeItem(STORAGE_KEY_TOKEN);
          setUser(null);
        }
      }
      setVerifyingSession(false);
    }

    checkSession();
  }, []);

  // Sync URL query params with active admin view
  useEffect(() => {
    if (currentView === 'dashboard' && user) {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('module') && !params.has('view')) {
        const currentTab = params.get('tab') || localStorage.getItem(STORAGE_KEY_TAB) || 'dashboard';
        params.set('view', 'admin');
        params.set('tab', currentTab);
        window.history.replaceState(null, '', `?${params.toString()}`);
      }
    }
  }, [currentView, user]);

  // Scroll-reveal observer — re-run on mount so newly rendered cards get picked up
  useEffect(() => {
    setupReveal();
  }, [currentView]);

  // Lock body scroll when search or auth modal is open
  useEffect(() => {
    document.body.style.overflow = (searchOpen || authOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen, authOpen]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TAB);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_TAB);
    setUser(null);
    setCurrentView('store');
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Handle successful login with server-issued token
  const handleLoginSuccess = (loggedUser: { name: string; email: string }, token?: string) => {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    }
    setUser(loggedUser);
    setCurrentView('dashboard');
    const targetTab = localStorage.getItem(STORAGE_KEY_TAB) || 'dashboard';
    window.history.replaceState(null, '', `?view=admin&tab=${targetTab}`);
  };

  if (verifyingSession) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d14', color: '#d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
        <span>Authenticating with server...</span>
      </div>
    );
  }

  // If logged in and in dashboard view, render AdminDashboard
  if (currentView === 'dashboard' && user) {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        onBackToStore={() => {
          setCurrentView('store');
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  const handleNavigateView = (view: 'store' | 'gold' | 'silver') => {
    setCurrentView(view);
    if (view === 'store') {
      window.history.pushState(null, '', window.location.pathname);
    } else {
      window.history.pushState(null, '', `?view=${view}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <IntroLoader />
      <AnnouncementBar />
      <Navbar 
        onSearchOpen={() => setSearchOpen(true)} 
        onAuthOpen={() => {
          if (user) {
            setCurrentView('dashboard');
          } else {
            setAuthOpen(true);
          }
        }}
        onNavigate={handleNavigateView}
        currentView={currentView}
        user={user}
      />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <SignInModal 
        isOpen={authOpen} 
        onClose={() => setAuthOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {currentView === 'gold' ? (
        <GoldPage onBackToStore={() => handleNavigateView('store')} />
      ) : currentView === 'silver' ? (
        <SilverPage onBackToStore={() => handleNavigateView('store')} />
      ) : (
        <main>
          <Hero />
          <TrustStrip />
          <CollectionsGrid />

          {/* Rings */}
          <ProductSection
            id="rings"
            tag="Rings"
            title="Finest Ring Collection"
            desc="From solitaire to eternity bands — every ring is a promise"
            products={rings}
            viewAllLabel="View All Rings"
          />

          <MarqueeStrip />

          {/* Necklaces */}
          <ProductSection
            id="necklaces"
            tag="Necklaces"
            title="Drape in Gold & Diamonds"
            desc="Statement necklaces for every occasion"
            products={necklaces}
            alt
            viewAllLabel="View All Necklaces"
          />

          {/* Earrings */}
          <ProductSection
            id="earrings"
            tag="Earrings"
            title="Earrings That Speak"
            desc="From subtle studs to grand chandeliers"
            products={earrings}
            viewAllLabel="View All Earrings"
          />

          {/* Nose Pins */}
          <ProductSection
            id="nosepins"
            tag="Nose Pins"
            title="Delicate Nose Pins"
            desc="Tiny treasures that make a bold statement"
            products={nosepins}
            alt
            viewAllLabel="View All Nose Pins"
          />

          <AboutSection />
          <Testimonials />
          <Newsletter />
        </main>
      )}

      <Footer />
      <CartDrawer />
      <Toast />
      <BackToTop />
      <WhatsAppButton />
    </>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
