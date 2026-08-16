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
import Toast            from './components/Toast';
import BackToTop        from './components/BackToTop';
import WhatsAppButton   from './components/WhatsAppButton';
import GoldPage         from './pages/GoldPage';
import SilverPage       from './pages/SilverPage';

import { rings, necklaces, earrings, nosepins } from './data/products';
import { setupReveal } from './utils';

function AppContent() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'store' | 'gold' | 'silver'>('store');
  const [goldCategory, setGoldCategory] = useState<string>('all');

  // Handle Chrome Swipe Back/Forward Gestures & Browser Back/Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = (params.get('view') || '').toLowerCase();

      if (viewParam === 'gold' || viewParam === 'silver') {
        setCurrentView(viewParam);
        if (viewParam === 'gold') {
          setGoldCategory('all');
        }
      } else {
        setCurrentView('store');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll-reveal observer — re-run on mount so newly rendered cards get picked up
  useEffect(() => {
    setupReveal();
  }, [currentView]);

  // Lock body scroll when search modal is open
  useEffect(() => {
    document.body.style.overflow = searchOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen]);

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
        onAuthOpen={() => {}}
        onNavigate={handleNavigateView}
        currentView={currentView}
        user={null}
      />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

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

      <Footer onNavigate={(view, href) => {
        handleNavigateView(view);
        if (href && href.startsWith('#')) {
          const targetId = href.substring(1);
          setTimeout(() => {
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: 'smooth' });
            }
          }, 300);
        }
      }} />
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
