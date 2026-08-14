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

const isAdminRoute = (params: URLSearchParams, pathname: string): boolean => {
  const viewParam = (params.get('view') || '').toLowerCase();
  const lowerPath = pathname.toLowerCase();
  return (
    params.has('module') ||
    params.has('history') ||
    viewParam === 'admin' ||
    viewParam === 'dashboard' ||
    viewParam === 'signin' ||
    viewParam === 'login' ||
    lowerPath === '/signin' ||
    lowerPath === '/login' ||
    lowerPath === '/admin'
  );
};

function AppContent() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [currentView, setCurrentView] = useState<'store' | 'dashboard' | 'gold' | 'silver'>('store');
  const [goldCategory, setGoldCategory] = useState<string>('all');
  const [verifyingSession, setVerifyingSession] = useState(true);

  // Handle Chrome Swipe Back/Forward Gestures & Browser Back/Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      const viewParam = (params.get('view') || '').toLowerCase();

      if (isAdminRoute(params, pathname)) {
        const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);
        if (user || savedToken) {
          setCurrentView('dashboard');
          setAuthOpen(false);
        } else {
          setCurrentView('store');
          window.history.replaceState(null, '', '/');
          setAuthOpen(true);
        }
      } else if (viewParam === 'gold' || viewParam === 'silver') {
        setCurrentView(viewParam);
        if (viewParam === 'gold') {
          setGoldCategory('all');
        }
        setAuthOpen(false);
      } else {
        setCurrentView('store');
        setAuthOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Secure Backend Token Session Verification on Mount/Refresh
  useEffect(() => {
    async function checkSession() {
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN);
      const params = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;

      if (savedToken) {
        // Send token to backend for HMAC signature verification
        const res = await verifySessionApi(savedToken);
        if (res.success && res.user) {
          setUser(res.user);
          if (isAdminRoute(params, pathname)) {
            setCurrentView('dashboard');
            setAuthOpen(false);
          }
        } else {
          // Token tampered, stolen, or expired - clear invalid token immediately
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          sessionStorage.removeItem(STORAGE_KEY_TOKEN);
          setUser(null);
          if (isAdminRoute(params, pathname)) {
            setCurrentView('store');
            window.history.replaceState(null, '', '/');
            setAuthOpen(true);
          }
        }
      } else {
        if (isAdminRoute(params, pathname)) {
          setCurrentView('store');
          window.history.replaceState(null, '', '/');
          setAuthOpen(true);
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

  const mapSectionOrColToCategory = (id: string): string => {
    const clean = id.replace('col-', '');
    switch (clean) {
      case 'rings': return 'ring';
      case 'necklaces': return 'necklace';
      case 'earrings': return 'earrings';
      case 'nosepins': return 'nosepin';
      default: return 'all';
    }
  };

  const handleViewAllSection = (sectionId: string) => {
    const category = mapSectionOrColToCategory(sectionId);
    handleNavigateView('gold', category);
  };

  const handleNavigateView = (view: 'store' | 'gold' | 'silver', category: string = 'all') => {
    setCurrentView(view);
    if (view === 'store') {
      window.history.pushState(null, '', window.location.pathname);
    } else {
      window.history.pushState(null, '', `?view=${view}`);
    }
    if (view === 'gold') {
      setGoldCategory(category);
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
            window.history.replaceState(null, '', '?view=admin');
          } else {
            setAuthOpen(true);
            const params = new URLSearchParams(window.location.search);
            params.set('view', 'signin');
            window.history.replaceState(null, '', `?${params.toString()}`);
          }
        }}
        onNavigate={handleNavigateView}
        currentView={currentView}
        user={user}
      />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <SignInModal 
        isOpen={authOpen} 
        onClose={() => {
          setAuthOpen(false);
          const params = new URLSearchParams(window.location.search);
          if (params.get('view') === 'signin' || params.get('view') === 'login') {
            params.delete('view');
            const newSearch = params.toString();
            window.history.replaceState(null, '', newSearch ? `?${newSearch}` : window.location.pathname);
          }
        }}
        onSuccess={handleLoginSuccess}
      />

      {currentView === 'gold' ? (
        <GoldPage onBackToStore={() => handleNavigateView('store')} initialCategory={goldCategory} />
      ) : currentView === 'silver' ? (
        <SilverPage onBackToStore={() => handleNavigateView('store')} />
      ) : (
        <main>
          <Hero />
          <TrustStrip />
          <CollectionsGrid onExplore={(colId) => {
            const category = mapSectionOrColToCategory(colId);
            handleNavigateView('gold', category);
          }} />

          {/* Rings */}
          <ProductSection
            id="rings"
            tag="Rings"
            title="Finest Ring Collection"
            desc="From solitaire to eternity bands — every ring is a promise"
            products={rings}
            viewAllLabel="View All Rings"
            onViewAll={handleViewAllSection}
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
            onViewAll={handleViewAllSection}
          />

          {/* Earrings */}
          <ProductSection
            id="earrings"
            tag="Earrings"
            title="Earrings That Speak"
            desc="From subtle studs to grand chandeliers"
            products={earrings}
            viewAllLabel="View All Earrings"
            onViewAll={handleViewAllSection}
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
            onViewAll={handleViewAllSection}
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
