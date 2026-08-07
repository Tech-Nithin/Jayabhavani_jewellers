import React, { useState } from 'react';
import { loginUser } from '../services/api';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string }) => void;
}

export default function SignInModal({ isOpen, onClose, onSuccess }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // loginUser normalizes email case-insensitively
      const res = await loginUser(email, password);

      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
        setEmail('');
        setPassword('');
      } else {
        setError(res.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="search-overlay active" 
      style={{ 
        position: 'fixed',
        inset: 0,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 10000,
        opacity: 1,
        pointerEvents: 'all'
      }}
    >
      {/* Background Image & Overlay */}
      <div 
        onClick={onClose} 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.15), rgba(10, 8, 6, 0.45)), url("/signin_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }} 
      />

      {/* Glassmorphism Modal Card */}
      <div 
        className="auth-card animate-scale-up" 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          margin: '0 20px',
          background: 'rgba(14, 10, 7, 0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(232, 212, 192, 0.35)',
          borderRadius: '24px',
          padding: '2.75rem 2.25rem',
          boxShadow: '0 35px 80px rgba(0, 0, 0, 0.88), inset 0 1px 1px rgba(255, 235, 205, 0.3), 0 0 50px rgba(212, 184, 160, 0.15)',
          zIndex: 10001,
          color: '#f8f4ee'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(212, 184, 160, 0.2)',
            color: '#a09080',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'rgba(212, 184, 160, 0.6)';
            e.currentTarget.style.background = 'rgba(212, 184, 160, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a09080';
            e.currentTarget.style.borderColor = 'rgba(212, 184, 160, 0.2)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header with Royal Emblem */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* Emblem Icon */}
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(212, 184, 160, 0.1)', border: '1px solid rgba(212, 184, 160, 0.3)', marginBottom: '12px', color: '#d4b8a0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          <h2 
            style={{ 
              fontFamily: "'Cinzel', serif", 
              fontSize: '1.65rem', 
              fontWeight: 600, 
              background: 'linear-gradient(135deg, #fff5eb 0%, #e8d4c0 50%, #c8a88c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '1.5px',
              margin: '0 0 4px 0'
            }}
          >
            Welcome Back
          </h2>
          
          <p style={{ fontSize: '0.85rem', color: '#b0a090', marginTop: '4px', letterSpacing: '0.3px' }}>
            Sign in to access your Jaya Bhavani account
          </p>

          <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #d4b8a0, transparent)', margin: '14px auto 0 auto' }} />
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(220, 38, 38, 0.18)',
              border: '1px solid rgba(220, 38, 38, 0.45)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backdropFilter: 'blur(8px)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: "'Cinzel', serif", color: '#d4b8a0', marginBottom: '8px', fontWeight: 600 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                placeholder="jayabhavani@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(212, 184, 160, 0.35)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.25s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d4b8a0';
                  e.target.style.boxShadow = '0 0 16px rgba(212, 184, 160, 0.3)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.09)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(212, 184, 160, 0.35)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
              />
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#d4b8a0" 
                strokeWidth="1.5"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: "'Cinzel', serif", color: '#d4b8a0', marginBottom: '8px', fontWeight: 600 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 44px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(212, 184, 160, 0.35)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.25s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d4b8a0';
                  e.target.style.boxShadow = '0 0 16px rgba(212, 184, 160, 0.3)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.09)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(212, 184, 160, 0.35)';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
              />
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#d4b8a0" 
                strokeWidth="1.5"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {/* Show / Hide Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#a09080',
                  cursor: 'pointer',
                  padding: '2px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#e8d4c0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a09080')}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.75rem',
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f5e7d8 0%, #d4b8a0 50%, #b39171 100%)',
              border: 'none',
              color: '#1a1612',
              fontWeight: 700,
              fontFamily: "'Cinzel', serif",
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              boxShadow: '0 8px 25px rgba(212, 184, 160, 0.35)',
              transition: 'all 0.25s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(212, 184, 160, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(212, 184, 160, 0.35)';
              }
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
