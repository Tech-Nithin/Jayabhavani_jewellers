import React, { useState } from 'react';
import { loginWorker } from '../../services/workerApi';
import { WorkerProfile } from '../../types/worker';

interface Props {
  onLoginSuccess: (profile: WorkerProfile) => void;
}

export const WorkerLoginForm: React.FC<Props> = ({ onLoginSuccess }) => {
  const testId = (import.meta as any).env?.VITE_TEST_WORKER_ID || '';
  const testPass = (import.meta as any).env?.VITE_TEST_WORKER_PASSCODE || '';

  const [identifier, setIdentifier] = useState(testId);
  const [passcode, setPasscode] = useState(testPass);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleQuickFill = () => {
    setIdentifier(testId || '9876543210');
    setPasscode(testPass || '1234');
    setLoginError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !passcode.trim()) {
      setLoginError('Please enter Worker ID / Phone and Passcode');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const data = await loginWorker(identifier, passcode);
      if (data.success && data.worker) {
        onLoginSuccess(data.worker);
      } else {
        setLoginError(data.message || 'Login failed. Please check with Admin.');
      }
    } catch (err: any) {
      setLoginError('Cannot connect to server. Please check internet connection.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="wa-login-container">
      <div className="wa-login-card">
        <div className="wa-login-logo-ring">
          <img src="/JB_logo.png" alt="JBJ Logo" className="wa-login-logo" />
        </div>
        <h2 className="wa-login-title">Jaya Bhavani Jewellers</h2>
        <p className="wa-login-subtitle">Goldsmith & Worker Portal</p>

        {loginError && (
          <div className="wa-login-error">
            <i className="fa-solid fa-triangle-exclamation" /> {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="wa-login-form">
          <div className="wa-input-group">
            <label className="wa-label">Worker Phone / ID:</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="wa-input"
            />
          </div>

          <div className="wa-input-group">
            <label className="wa-label">Passcode:</label>
            <input
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="wa-input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="wa-login-btn"
          >
            {isLoggingIn ? 'Signing in...' : 'Sign In to WhatsApp Portal'}
          </button>

          <button
            type="button"
            onClick={handleQuickFill}
            style={{
              background: 'transparent',
              border: '1px dashed var(--wa-amber-accent)',
              color: 'var(--wa-amber-accent)',
              borderRadius: '10px',
              padding: '0.55rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '0.25rem',
            }}
          >
            <i className="fa-solid fa-bolt" /> Auto-Fill Test Credentials
          </button>
        </form>
      </div>
    </div>
  );
};
