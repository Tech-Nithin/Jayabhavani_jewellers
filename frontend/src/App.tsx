import { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';

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

import { rings, necklaces, earrings, nosepins } from './data/products';
import { setupReveal } from './utils';

function AppContent() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [currentView, setCurrentView] = useState<'store' | 'dashboard'>('store');

  // Scroll-reveal observer — re-run on mount so newly rendered cards get picked up
  useEffect(() => {
    setupReveal();
  }, [currentView]);

  // Lock body scroll when search or auth modal is open
  useEffect(() => {
    document.body.style.overflow = (searchOpen || authOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen, authOpen]);

  // If logged in and in dashboard view, render AdminDashboard
  if (currentView === 'dashboard' && user) {
    return (
      <AdminDashboard
        user={user}
        onLogout={() => {
          setUser(null);
          setCurrentView('store');
        }}
        onBackToStore={() => setCurrentView('store')}
      />
    );
  }

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
        user={user}
      />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <SignInModal 
        isOpen={authOpen} 
        onClose={() => setAuthOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setCurrentView('dashboard');
        }}
      />

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
