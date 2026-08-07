import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  onSearchOpen: () => void;
  onAuthOpen: () => void;
  user?: { name: string; email: string } | null;
}

export default function Navbar({ onSearchOpen, onAuthOpen, user }: NavbarProps) {
  const { cartCount, wishlistCount, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Collections', href: '#collections' },
    { label: 'Rings', href: '#rings' },
    { label: 'Necklaces', href: '#necklaces' },
    { label: 'Earrings', href: '#earrings' },
    { label: 'Our Story', href: '#about' },
  ];

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`} id="header">
      <div className="nav-container">

        {/* ── 1. Brand Logo — leftmost ── */}
        <a href="#" className="logo" aria-label="Jaya Bhavani Jewellers Home">
          <img src="/JB_logo.png" alt="Jaya Bhavani Logo" className="logo-img" />
          <div className="logo-text">
            <span className="logo-main">JAYA BHAVANI</span>
            <span className="logo-sub">Fine Jewellery</span>
          </div>
        </a>

        {/* ── 2. Desktop Nav Links — middle ── */}
        <nav className="nav-links" id="nav-links">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
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

          {/* Search */}
          <button className="nav-icon" id="search-btn" aria-label="Search" onClick={onSearchOpen}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* Wishlist */}
          <button className="nav-icon" id="wishlist-btn" aria-label="Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {wishlistCount > 0 && <span className="badge" id="wishlist-badge">{wishlistCount}</span>}
          </button>

          {/* Cart */}
          <button className="nav-icon" id="cart-btn" aria-label="Cart" onClick={openCart}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && <span className="badge" id="cart-badge">{cartCount}</span>}
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
              key={l.href}
              href={l.href}
              className="mobile-nav-link"
              onClick={() => setMobileOpen(false)}
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
