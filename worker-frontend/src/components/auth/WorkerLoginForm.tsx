import React, { useState } from 'react';
import { loginWorker } from '../../services/workerApi';
import { WorkerProfile } from '../../types/worker';

interface Props {
  onLoginSuccess: (profile: WorkerProfile) => void;
}

export const WorkerLoginForm: React.FC<Props> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
          <img src="/JB_logo_mobile.png" alt="JBJ Logo" className="wa-login-logo" />
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPasscode ? 'text' : 'password'}
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="wa-input"
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={showPasscode ? 'Hide passcode' : 'Show passcode'}
              >
                <i className={`fa-solid ${showPasscode ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="wa-login-btn"
          >
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
