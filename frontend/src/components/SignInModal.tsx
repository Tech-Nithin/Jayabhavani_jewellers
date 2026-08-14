import React, { useState } from 'react';
import { loginUser } from '../services/api';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string }, token?: string) => void;
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
      const res = await loginUser(email, password);

      if (res.success && res.user && res.token) {
        onSuccess(res.user, res.token);
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
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(212, 184, 160, 0.2)',
            color: '#e8d4c0',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.75rem', marginBottom: '0.5rem', color: '#d4af37', textAlign: 'center' }}>
          Admin Authentication
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#a1a1c0', textAlign: 'center', marginBottom: '1.5rem' }}>
          Sign in to access management modules
        </p>

        {error && (
          <div style={{ background: 'rgba(220, 38, 38, 0.2)', border: '1px solid #fecaca', color: '#f87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#e8d4c0', marginBottom: '0.35rem' }}>Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jayabhavani@gmail.com"
              required
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(20, 15, 10, 0.6)', border: '1px solid rgba(212, 184, 160, 0.3)', color: '#fff', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#e8d4c0', marginBottom: '0.35rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(20, 15, 10, 0.6)', border: '1px solid rgba(212, 184, 160, 0.3)', color: '#fff', fontSize: '0.9rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              letterSpacing: '0.5px'
            }}
          >
            {loading ? 'Authenticating with Server...' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
