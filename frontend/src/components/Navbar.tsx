import { useState, useEffect } from 'react';

interface NavbarProps {
  onSearchOpen: () => void;
  onAuthOpen: () => void;
  onNavigate?: (view: 'store' | 'gold' | 'silver') => void;
  currentView?: 'store' | 'gold' | 'silver' | 'dashboard';
  user?: { name: string; email: string } | null;
}

export default function Navbar({ onSearchOpen: _onSearchOpen, onAuthOpen, onNavigate, currentView: _currentView, user }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (view: 'store' | 'gold' | 'silver', href: string, e: React.MouseEvent) => {
    if (onNavigate && (view === 'gold' || view === 'silver' || view === 'store')) {
      e.preventDefault();
      onNavigate(view);

      if (view === 'store' && href.startsWith('#')) {
        const targetId = href.substring(1);
        const delay = (_currentView || 'store') === 'store' ? 0 : 300;
        setTimeout(() => {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, delay);
      }
    }
  };

  const navLinks = [
    { label: 'Collections', href: '#collections', view: 'store' as const },
    { label: 'Gold', href: '?view=gold', view: 'gold' as const },
    { label: 'Silver', href: '?view=silver', view: 'silver' as const },
    { label: 'Our Story', href: '#about', view: 'store' as const },
  ];

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`} id="header">
      <div className="nav-container">

        {/* ── 1. Brand Logo — leftmost ── */}
        <a
          href="#"
          className="logo"
          aria-label="Jaya Bhavani Jewellers Home"
          onClick={(e) => handleNavClick('store', '#', e)}
        >
          <img src="/JB_logo.png" alt="Jaya Bhavani Logo" className="logo-img" />
          <div className="logo-text">
            <span className="logo-main">JAYA BHAVANI</span>
            <span className="logo-sub"> Jewellery</span>
          </div>
        </a>

        {/* ── 2. Desktop Nav Links — middle ── */}
        <nav className="nav-links" id="nav-links">
          {navLinks.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="nav-link"
              onClick={(e) => handleNavClick(l.view, l.href, e)}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* ── 3. Action icons + hamburger (mobile) — rightmost ── */}
        <div className="nav-actions">
          {/* Hamburger — only visible on mobile */}
          <button
            className="hamburger"
            id="hamburger"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(v => !v)}
          >
            <span /><span /><span />
          </button>



          {/* Sign In / Account */}
          <button
            className={`nav-icon ${user ? 'user-logged-in' : ''}`}
            id="login-btn"
            aria-label={user ? `Logged in as ${user.name}` : "Sign In"}
            onClick={onAuthOpen}
            style={user ? { color: '#d4b8a0' } : undefined}
            title={user ? `Logged in as ${user.email}` : "Sign In"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-nav open" id="mobile-nav">
          {navLinks.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="mobile-nav-link"
              onClick={(e) => {
                setMobileOpen(false);
                handleNavClick(l.view, l.href, e);
              }}
            >
              {l.label}
            </a>
          ))}
          <button
            className="mobile-nav-link"
            style={{ background: 'none', border: 'none', textAlign: 'left', color: '#d4b8a0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            onClick={() => {
              setMobileOpen(false);
              onAuthOpen();
            }}
          >
            {user ? `Account (${user.name})` : 'Sign In'}
          </button>
        </div>
      )}
    </header>
  );
}
