import { useState, useEffect } from 'react';
import { formatPrice } from '../utils';
import { API_BASE } from '../config/apiConfig';
import { CURRENT_APP_VERSION_CODE } from '../utils/appVersion';
import { AppUpdateModal, type VersionInfo } from './AppUpdateModal';
import { useMetalRates, forceFetchMetalRates } from '../utils/metalRatesStore';
import { translations } from '../utils/translations';
import { HeaderRefreshButton } from './HeaderRefreshButton';

interface AnnouncementBarProps {
  message?: string;
  mode?: 'store' | 'admin';
  user?: { name: string; email: string } | null;
  isTabletOrMobile?: boolean;
  isMobileScreen?: boolean;
  onToggleMobileMenu?: () => void;
  lang?: 'EN' | 'TE';
  onToggleLang?: () => void;
}

export default function AnnouncementBar({
  message,
  mode = 'store',
  user: _user,
  isTabletOrMobile: _isTabletOrMobile = false,
  isMobileScreen = false,
  onToggleMobileMenu: _onToggleMobileMenu,
  lang = 'EN',
  onToggleLang,
}: AnnouncementBarProps) {
  const [visible, setVisible] = useState(
    mode === 'admin' ? true : !sessionStorage.getItem('jaya_bhavani_ann_closed')
  );
  const rates = useMetalRates();
  const SESSION_VERSION_KEY = 'jbj_app_version_session';
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_VERSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latestVersionCode === 'number' && parsed.latestVersionCode > CURRENT_APP_VERSION_CODE) {
          return parsed;
        }
      }
    } catch { }
    return null;
  });
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkVersion = async () => {
      // If version is already saved in sessionStorage for this RAM session, skip HTTP request
      try {
        const saved = sessionStorage.getItem(SESSION_VERSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && isMounted) {
            if (parsed.latestVersionCode > CURRENT_APP_VERSION_CODE && !updateInfo) {
              setUpdateInfo(parsed);
            }
            return;
          }
        }
      } catch { }

      try {
        const res = await fetch(`${API_BASE}/work-assignment/app-version?app=ADMIN`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) {
          try { sessionStorage.setItem(SESSION_VERSION_KEY, JSON.stringify(data)); } catch { }
          if (data.latestVersionCode > CURRENT_APP_VERSION_CODE) {
            setUpdateInfo(data);
          }
        }
      } catch (err) {
        console.warn('App version check notice:', err);
      }
    };

    checkVersion();
    return () => { isMounted = false; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem('jaya_bhavani_ann_closed', '1');
  };

  if (!visible) return null;

  const t = translations[lang] || translations.EN;
  const unit = t.perGramUnit || '/g';
  const displayMessage = message || `✦ ${t.goldBuyTicker}: ${formatPrice(rates.gold_buy_value)}${unit} \u00a0|\u00a0 ✦ ${t.goldSellTicker}: ${formatPrice(rates.gold_sell_value)}${unit} \u00a0|\u00a0 ✦ ${t.silverBuyTicker}: ${formatPrice(rates.silver_buy_value)}${unit} \u00a0|\u00a0 ✦ ${t.silverSellTicker}: ${formatPrice(rates.silver_sell_value)}${unit}`;

  if (mode === 'admin') {
    return (
      <>
        <style>{`
          @media (max-width: 1024px) {
            .announcement-bar-admin {
              padding: 6px 10px !important;
            }
            .announcement-bar-ticker {
              font-size: 0.68rem !important;
              gap: 0.4rem !important;
              letter-spacing: 0.02em !important;
            }
            .announcement-bar-name {
              display: none !important;
            }
          }
          @keyframes bellPulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
            50% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
          }
        `}</style>
        <header
          className="announcement-bar-admin"
          style={{
            background: 'linear-gradient(90deg, var(--rose-deep), var(--rose-gold), var(--gold-deep))',
            padding: isMobileScreen ? '6px 10px' : '7px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            border: 'none',
            borderRadius: '0px',
          }}
        >
          {/* Center: Live Gold & Silver Market Rates Ticker */}
          <div
            className="announcement-bar-ticker"
            style={{
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              flexWrap: 'wrap',
            }}
          >
            {displayMessage}
          </div>

          {/* Right: Hard Refresh Button, Notification Bell, Language Toggle & User Profile Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <HeaderRefreshButton onRefresh={forceFetchMetalRates} size="sm" title="Hard Refresh Live Metal Rates from Server" />
            {/* Pulsing Notification Bell Icon Button for App Updates */}
            <button
              type="button"
              onClick={() => {
                if (updateInfo) {
                  setIsUpdateModalOpen(true);
                }
              }}
              title={updateInfo ? `New App Update Available: v${updateInfo.latestVersionName} (Click to View & Download)` : 'App Up to Date'}
              style={{
                position: 'relative',
                background: updateInfo ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.18)',
                border: updateInfo ? '1.5px solid #fef08a' : '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: updateInfo ? '#fef08a' : '#ffffff',
                cursor: updateInfo ? 'pointer' : 'default',
                animation: updateInfo ? 'bellPulse 1.8s infinite ease-in-out' : 'none',
                boxShadow: updateInfo ? '0 0 12px rgba(245, 158, 11, 0.6)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <i className={`fa-solid ${updateInfo ? 'fa-bell' : 'fa-bell'}`} style={{ fontSize: '0.88rem' }}></i>
              {updateInfo && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.58rem',
                    fontWeight: 900,
                    borderRadius: '10px',
                    padding: '1px 5px',
                    border: '1.5px solid #713f12',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  1
                </span>
              )}
            </button>

            {onToggleLang && (
              <button
                type="button"
                onClick={onToggleLang}
                title="Switch Language (English / తెలుగు)"
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  border: '1.5px solid rgba(255, 255, 255, 0.6)',
                  borderRadius: '20px',
                  padding: '3px 12px',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="fa-solid fa-globe"></i>
                <span>{lang === 'TE' ? 'తెలుగు' : 'English'}</span>
              </button>
            )}

            <div className="announcement-bar-avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.22)', border: '1.5px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#ffffff', fontSize: '0.75rem' }}>
              JB
            </div>
            <span className="announcement-bar-name" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em' }}>
              JB Admin
            </span>
          </div>
        </header>

        {/* Update Available Popup Modal (Controlled by Bell Icon Click) */}
        <AppUpdateModal
          isOpen={isUpdateModalOpen}
          updateInfo={updateInfo}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="announcement-bar" id="announcement-bar">
      <p>{displayMessage}</p>
      <button
        className="close-announcement"
        id="close-announcement"
        aria-label="Close announcement"
        onClick={handleClose}
      >
        ✕
      </button>
    </div>
  );
}
