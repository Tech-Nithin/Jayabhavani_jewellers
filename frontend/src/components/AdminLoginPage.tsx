import React, { useState, useEffect } from 'react';
import { loginUser, sendForgotPasswordOtp, resetPasswordWithOtp } from '../services/api';

interface AdminLoginPageProps {
  onSuccess: (user: { name: string; email: string }, token?: string) => void;
}

export default function AdminLoginPage({ onSuccess }: AdminLoginPageProps) {
  // Main Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Attempt & Lockout State
  const [attemptCount, setAttemptCount] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Real-time Countdown Timer for 60s Lockout
  useEffect(() => {
    let interval: any = null;
    if (isLocked && lockCountdown > 0) {
      interval = setInterval(() => {
        setLockCountdown((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttemptCount(null);
            setIsUnauthorized(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocked, lockCountdown]);

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setGeneralError(null);
    setIsUnauthorized(false);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await loginUser(email, password);

      if (res.success && res.user && res.token) {
        setAttemptCount(null);
        setIsLocked(false);
        onSuccess(res.user, res.token);
        return;
      }

      // Check Unauthorized
      if (res.unauthorized) {
        setIsUnauthorized(true);
        setAttemptCount(null);
        return;
      }

      // Check Lockout
      if (res.locked || res.lockRemainingSeconds) {
        setIsLocked(true);
        setLockCountdown(res.lockRemainingSeconds || 60);
        setAttemptCount(null);
        return;
      }

      // Check Attempts
      if (res.attempts !== undefined) {
        setAttemptCount(res.attempts);
        return;
      }

      setGeneralError(res.message || 'Invalid email or password');
    } catch (err) {
      setGeneralError('An unexpected network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password - Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      const res = await sendForgotPasswordOtp(forgotEmail);
      if (res.success) {
        setForgotStep('OTP');
        setForgotSuccess(res.message || 'OTP has been dispatched to your email.');
      } else {
        setForgotError(res.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setForgotError('Network error while requesting OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Forgot Password - Step 2: Verify OTP & Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please recheck.');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await resetPasswordWithOtp(forgotEmail, forgotOtp, newPassword);
      if (res.success) {
        setShowForgotModal(false);
        setSuccessMessage('Password reset successfully! Please sign in with your new password.');
        setPassword('');
        setIsLocked(false);
        setLockCountdown(0);
        setAttemptCount(null);
        setIsUnauthorized(false);
        // Reset modal state
        setForgotStep('EMAIL');
        setForgotOtp('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setForgotError(res.message || 'Failed to reset password.');
      }
    } catch (err) {
      setForgotError('Network error while resetting password.');
    } finally {
      setForgotLoading(false);
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
          padding: '2.75rem 2.25rem',
          boxShadow: '0 35px 80px rgba(0, 0, 0, 0.92), inset 0 1px 1px rgba(255, 235, 205, 0.3), 0 0 60px rgba(212, 184, 160, 0.2)',
          zIndex: 100000,
          color: '#f8f4ee',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '82px',
              height: '82px',
              margin: '0 auto 1.15rem auto',
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
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#f8f4ee',
              letterSpacing: '0.05em',
              margin: '0 0 0.4rem 0',
              background: 'linear-gradient(135deg, #fff 0%, #e8d4c0 60%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Admin Portal Access
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#d4af37',
              margin: 0,
              letterSpacing: '0.02em',
            }}
          >
            Jaya Bhavani Jewellers Management App
          </p>
        </div>

        {/* ── SECURITY ALERT BANNERS ── */}

        {/* 1. Locked State Banner */}
        {isLocked && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.1rem', color: '#f87171' }}></i>
            <div>
              <strong style={{ display: 'block', color: '#fca5a5' }}>WAIT! Login attempts reached</strong>
              <span>Please wait {lockCountdown} seconds to try again.</span>
            </div>
          </div>
        )}

        {/* 2. Invalid Credentials Banner (Attempt X of 3) */}
        {!isLocked && attemptCount !== null && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '1.1rem', color: '#f87171' }}></i>
            <div>
              <strong style={{ display: 'block', color: '#fca5a5' }}>Invalid Credentials</strong>
              <span>Please check your email and password. (Attempt {attemptCount} of 3)</span>
            </div>
          </div>
        )}

        {/* 3. Unauthorised Access Banner */}
        {!isLocked && isUnauthorized && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: '#fde68a',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <i className="fa-solid fa-shield-halved" style={{ fontSize: '1.1rem', color: '#fbbf24' }}></i>
            <div>
              <strong style={{ display: 'block', color: '#fde68a' }}>Unauthorised access</strong>
              <span>This email is not registered for administrator access.</span>
            </div>
          </div>
        )}

        {/* 4. General Error Banner */}
        {!isLocked && generalError && !isUnauthorized && attemptCount === null && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
              lineHeight: '1.4',
            }}
          >
            ⚠️ {generalError}
          </div>
        )}

        {/* 5. Success Banner */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#6ee7b7',
              padding: '0.85rem 1rem',
              borderRadius: '14px',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
              lineHeight: '1.4',
            }}
          >
            <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
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
              disabled={isLocked}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@jayabhavanijewellers.com"
              style={{
                width: '100%',
                padding: '0.9rem 1.1rem',
                background: isLocked ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)',
                border: isLocked
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : isUnauthorized
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : '1px solid rgba(212, 184, 160, 0.25)',
                borderRadius: '14px',
                color: '#f8f4ee',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.25s ease',
                boxSizing: 'border-box',
                opacity: isLocked ? 0.6 : 1,
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#d4af37',
                }}
              >
                Password
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotStep('EMAIL');
                  setForgotError(null);
                  setForgotSuccess(null);
                  setShowForgotModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d4af37',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  opacity: 0.9,
                  textDecoration: 'underline',
                }}
              >
                Forgot password?
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '0.9rem 3rem 0.9rem 1.1rem',
                  background: isLocked ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)',
                  border: isLocked
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : attemptCount !== null
                    ? '1px solid rgba(239, 68, 68, 0.35)'
                    : '1px solid rgba(212, 184, 160, 0.25)',
                  borderRadius: '14px',
                  color: '#f8f4ee',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.25s ease',
                  boxSizing: 'border-box',
                  opacity: isLocked ? 0.6 : 1,
                }}
              />
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#d4af37',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  opacity: 0.8,
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Submit / Locked Button */}
          {isLocked ? (
            <button
              type="button"
              disabled
              style={{
                width: '100%',
                padding: '1rem',
                marginTop: '0.75rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '14px',
                color: '#f87171',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <i className="fa-solid fa-lock"></i> Locked: Wait {lockCountdown}s
            </button>
          ) : (
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
          )}
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: '#a09080' }}>
        </div>
      </div>

      {/* ── FORGOT PASSWORD / OTP RESET MODAL (DARK LUXURY THEME) ── */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 3, 2, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100005,
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              background: 'rgba(18, 13, 9, 0.95)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '24px',
              padding: '2.25rem 2rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(212, 175, 55, 0.2)',
              position: 'relative',
              boxSizing: 'border-box',
              color: '#f8f4ee',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4af37',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(14, 10, 7, 0.95) 100%)',
                  border: '1.5px solid #d4af37',
                  color: '#d4af37',
                  fontSize: '1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.85rem auto',
                }}
              >
                <i className={forgotStep === 'EMAIL' ? 'fa-solid fa-key' : 'fa-solid fa-shield-halved'}></i>
              </div>
              <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.25rem', fontWeight: 700, color: '#f8f4ee', margin: '0 0 0.35rem 0' }}>
                {forgotStep === 'EMAIL' ? 'Reset Admin Password' : 'Enter Verification OTP'}
              </h2>
              <p style={{ fontSize: '0.825rem', color: '#c5b4a0', margin: 0 }}>
                {forgotStep === 'EMAIL'
                  ? 'We will send a 6-digit OTP to your registered email.'
                  : `Enter the code sent to ${forgotEmail} and set your new password.`}
              </p>
            </div>

            {forgotError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  color: '#fca5a5',
                  fontSize: '0.825rem',
                  textAlign: 'center',
                }}
              >
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  color: '#6ee7b7',
                  fontSize: '0.825rem',
                  textAlign: 'center',
                }}
              >
                {forgotSuccess}
              </div>
            )}

            {/* Step 1: Send OTP */}
            {forgotStep === 'EMAIL' && (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#d4af37',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@jayabhavanijewellers.com"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(212, 184, 160, 0.3)',
                      borderRadius: '12px',
                      fontSize: '0.925rem',
                      color: '#f8f4ee',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    padding: '0.9rem',
                    background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#0d0805',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
                    marginTop: '0.5rem',
                  }}
                >
                  {forgotLoading ? 'Sending OTP via Resend...' : 'Send OTP Code'}
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP & New Password */}
            {forgotStep === 'OTP' && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#d4af37',
                      marginBottom: '0.4rem',
                    }}
                  >
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="123456"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid #d4af37',
                      borderRadius: '12px',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: '0.35em',
                      color: '#fbbf24',
                      outline: 'none',
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
                      letterSpacing: '0.08em',
                      color: '#d4af37',
                      marginBottom: '0.4rem',
                    }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(212, 184, 160, 0.3)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      color: '#f8f4ee',
                      outline: 'none',
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
                      letterSpacing: '0.08em',
                      color: '#d4af37',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(212, 184, 160, 0.3)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      color: '#f8f4ee',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep('EMAIL')}
                    style={{
                      flex: 1,
                      padding: '0.85rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#c5b4a0',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 2,
                      padding: '0.85rem',
                      background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#0d0805',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: forgotLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 6px 20px rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    {forgotLoading ? 'Updating...' : 'Set Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
