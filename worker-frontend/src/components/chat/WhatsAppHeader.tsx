import React, { useState } from 'react';
import { WorkerProfile } from '../../types/worker';

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
  const [showMenu, setShowMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const triggerSearch = () => {
    if (onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSearch();
    }
  };

  const closeSearch = () => {
    setShowSearchInput(false);
    setSearchQuery('');
    if (onSearch) onSearch('');
  };

  return (
    <header className="wa-header" style={{ position: 'relative' }}>
      {/* ── FULL HEADER SEARCH OVERLAY (100% FULL WIDTH) ── */}
      {showSearchInput ? (
        <div
          className="wa-full-header-search"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            gap: '10px',
            zIndex: 50,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <button
            type="button"
            onClick={closeSearch}
            title="Close search"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: '#475569',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <i className="fa-solid fa-arrow-left" />
          </button>

          <input
            type="text"
            placeholder="Search chat transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.92rem',
              color: '#0f172a',
              background: 'transparent',
            }}
            autoFocus
          />

          <button
            type="button"
            onClick={triggerSearch}
            title="Perform search"
            style={{
              background: '#d97706',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
            }}
          >
            <i className="fa-solid fa-magnifying-glass" />
          </button>
        </div>
      ) : (
        <>
          {/* Left side: Official JBJ Shop Admin Branding */}
          <div className="wa-header-left">
            <div className="wa-jbj-logo-box">
              <img src="/JB_logo_mobile.png" alt="JBJ Admin" className="wa-jbj-logo-img" />
            </div>
            <div className="wa-user-info">
              <div className="wa-user-name">Jaya Bhavani Jewellers</div>
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

          {/* Right side: 3 Vertical Dots Menu Button */}
          <div className="wa-header-right" style={{ position: 'relative' }}>
            <button
              type="button"
              className="wa-header-menu-dots-btn"
              onClick={() => setShowMenu(!showMenu)}
              title="Menu options"
              style={{
                background: '#f1f5f9',
                border: 'none',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-ellipsis-vertical" />
            </button>

            {/* 3 Vertical Dots Dropdown Menu */}
            {showMenu && (
              <div
                className="wa-header-dropdown"
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  width: '210px',
                  zIndex: 100,
                  padding: '6px 0',
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Worker Profile Info Header */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#f8fafc',
                  }}
                >
                  <img
                    src={worker.photo_url || '/JB_logo_mobile.png'}
                    alt={worker.name}
                    style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #d97706' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{worker.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Goldsmith Worker</div>
                  </div>
                </div>

                {/* Menu Option 1: Search Chat */}
                <button
                  type="button"
                  className="wa-header-dropdown-item"
                  onClick={() => {
                    setShowMenu(false);
                    setShowSearchInput(true);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <i className="fa-solid fa-magnifying-glass" style={{ color: '#d97706', width: '16px' }} /> Search Chat
                </button>

                {/* Menu Option 2: My Profile */}
                <button
                  type="button"
                  className="wa-header-dropdown-item"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <i className="fa-solid fa-user" style={{ color: '#2563eb', width: '16px' }} /> My Profile
                </button>

                {/* Menu Option 3: Logout */}
                <button
                  type="button"
                  className="wa-header-dropdown-item text-danger"
                  onClick={() => {
                    setShowMenu(false);
                    onLogout();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#dc2626',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <i className="fa-solid fa-right-from-bracket" style={{ color: '#dc2626', width: '16px' }} /> Logout
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
};
