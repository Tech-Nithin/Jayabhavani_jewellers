import React, { useState } from 'react';
import { WorkerProfile } from '../../types/worker';
import { playJbjNotificationSound } from '../../utils/soundUtils';

interface Props {
  worker: WorkerProfile;
  isOnline?: boolean;
  onLogout: () => void;
  onOpenProfile: () => void;
  onSearch?: (query: string) => void;
}

export const WhatsAppHeader: React.FC<Props> = ({
  worker,
  isOnline = true,
  onLogout,
  onOpenProfile,
  onSearch,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (onSearch) {
      onSearch(q);
    }
  };

  return (
    <header className="wa-header">
      {/* Left side: Official JBJ Shop Admin Branding */}
      <div className="wa-header-left">
        <div className="wa-jbj-logo-box">
          <img src="/JB_logo.png" alt="JBJ Admin" className="wa-jbj-logo-img" />
        </div>
        <div className="wa-user-info">
          <div className="wa-user-name">Jaya Bhavani Jewellers Admin</div>
          <div className="wa-user-status">
            {isOnline ? (
              <>
                <span className="wa-online-dot" /> online
              </>
            ) : (
              <>
                <span className="wa-offline-dot" /> offline
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Overall Search Trigger & Worker Profile Menu */}
      <div className="wa-header-right" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Test Notification Chime Sound Button */}
        <button
          type="button"
          className="wa-header-search-btn"
          onClick={() => playJbjNotificationSound()}
          title="Click to test notification chime sound"
          style={{ background: '#fffbe8', color: '#b45309', border: '1px solid #fde68a' }}
        >
          <i className="fa-solid fa-volume-high" />
        </button>

        {showSearchInput ? (
          <div className="wa-header-search-box">
            <input
              type="text"
              placeholder="Search overall chat..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="wa-header-search-input"
              autoFocus
            />
            <button
              type="button"
              className="wa-search-close-btn"
              onClick={() => {
                setShowSearchInput(false);
                setSearchQuery('');
                if (onSearch) onSearch('');
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="wa-header-search-btn"
            onClick={() => setShowSearchInput(true)}
            title="Search overall chat history"
          >
            <i className="fa-solid fa-magnifying-glass" />
          </button>
        )}

        <div
          className="wa-worker-profile-pill"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          title="Click profile menu"
        >
          <img
            src={worker.photo_url || '/JB_logo.png'}
            alt={worker.name}
            className="wa-worker-avatar-thumb"
          />
          <div className="wa-worker-name-label">
            <span>{worker.name}</span>
            <small style={{ fontSize: '0.62rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
              Menu <i className="fa-solid fa-caret-down" />
            </small>
          </div>
        </div>

        {/* Profile Action Dropdown Menu */}
        {showProfileMenu && (
          <div className="wa-header-dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="wa-header-dropdown-item"
              onClick={() => {
                setShowProfileMenu(false);
                onOpenProfile();
              }}
            >
              <i className="fa-solid fa-user" /> My Profile (Full Details)
            </button>
            <button
              type="button"
              className="wa-header-dropdown-item text-danger"
              onClick={() => {
                setShowProfileMenu(false);
                onLogout();
              }}
            >
              <i className="fa-solid fa-right-from-bracket" /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
