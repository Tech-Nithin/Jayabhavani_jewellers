import React, { useState } from 'react';
import { loginUser } from '../services/api';

interface AdminLoginPageProps {
  onSuccess: (user: { name: string; email: string }, token?: string) => void;
}

export default function AdminLoginPage({ onSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginUser(email, password);

      if (res.success && res.user && res.token) {
        onSuccess(res.user, res.token);
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
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        background: '#0d0805',
        fontFamily: "'Outfit', 'Cinzel', sans-serif",
      }}
    >
      {/* Background Image & Ambient Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at center, rgba(13, 8, 5, 0.4), rgba(5, 3, 2, 0.95)), url("/signin_bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.7) contrast(1.1)',
        }}
      />

      {/* Ambient Glow Effects */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(0,0,0,0) 70%)',
          top: '20%',
          left: '30%',
          pointerEvents: 'none',
        }}
      />

      {/* Glassmorphism Card */}
      <div
        className="auth-card animate-scale-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          margin: '0 20px',
          background: 'rgba(14, 10, 7, 0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(232, 212, 192, 0.35)',
          borderRadius: '28px',
          padding: '3rem 2.5rem',
          boxShadow: '0 35px 80px rgba(0, 0, 0, 0.92), inset 0 1px 1px rgba(255, 235, 205, 0.3), 0 0 60px rgba(212, 184, 160, 0.2)',
          zIndex: 100000,
          color: '#f8f4ee',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div
            style={{
              width: '88px',
              height: '88px',
              margin: '0 auto 1.25rem auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(14, 10, 7, 0.95) 100%)',
              border: '2px solid rgba(212, 175, 55, 0.75)',
              boxShadow: '0 8px 32px rgba(212, 175, 55, 0.4), inset 0 0 20px rgba(212, 175, 55, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '6px',
            }}
          >
            <img
              src="/jb_logo-symmetric.png"
              alt="Jaya Bhavani Jewellers Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#f8f4ee',
              letterSpacing: '0.05em',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #fff 0%, #e8d4c0 60%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Admin Portal Access
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#d4af37',
              margin: 0,
              letterSpacing: '0.02em',
            }}
          >
            Jaya Bhavani Jewellers Management App
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
              lineHeight: '1.4',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#d4af37',
                marginBottom: '0.5rem',
              }}
            >
              Admin Email / Username
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jayabhavanijewellers.com"
              style={{
                width: '100%',
                padding: '0.9rem 1.1rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(212, 184, 160, 0.25)',
                borderRadius: '14px',
                color: '#f8f4ee',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.25s ease',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#d4af37',
                marginBottom: '0.5rem',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '0.9rem 3rem 0.9rem 1.1rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(212, 184, 160, 0.25)',
                  borderRadius: '14px',
                  color: '#f8f4ee',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.25s ease',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#d4af37',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              marginTop: '0.75rem',
              background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
              border: 'none',
              borderRadius: '14px',
              color: '#0d0805',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35)',
              transition: 'all 0.25s ease',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: '#a09080' }}>
        </div>
      </div>
    </div>
  );
}
