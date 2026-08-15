import { useState, useEffect } from 'react';
import { formatPrice } from '../utils';

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

interface MetalRates {
  gold_buy_value: number;
  gold_sell_value: number;
  silver_buy_value: number;
  silver_sell_value: number;
}

import { API_BASE } from '../config/apiConfig';
import { translations } from '../utils/translations';

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
  const [rates, setRates] = useState<MetalRates>({
    gold_buy_value: 0,
    gold_sell_value: 0,
    silver_buy_value: 0,
    silver_sell_value: 0,
  });

  useEffect(() => {
    async function fetchMetalRates() {
      try {
        const res = await fetch(`${API_BASE}/billing/rates`);
        const data = await res.json();
        if (data.success && data.rates) {
          setRates((prev) => ({
            gold_buy_value: data.rates.gold_buy_value !== undefined ? Number(data.rates.gold_buy_value) : prev.gold_buy_value,
            gold_sell_value: data.rates.gold_sell_value !== undefined ? Number(data.rates.gold_sell_value) : prev.gold_sell_value,
            silver_buy_value: data.rates.silver_buy_value !== undefined ? Number(data.rates.silver_buy_value) : prev.silver_buy_value,
            silver_sell_value: data.rates.silver_sell_value !== undefined ? Number(data.rates.silver_sell_value) : prev.silver_sell_value,
          }));
        }
      } catch {
        // Fall back gracefully
      }
    }

    fetchMetalRates();

    // 1. Listen for local CustomEvent
    const handleLocalUpdate = (e: any) => {
      if (e.detail) {
        setRates((prev) => ({
          gold_buy_value: e.detail.gold_buy_value !== undefined ? Number(e.detail.gold_buy_value) : prev.gold_buy_value,
          gold_sell_value: e.detail.gold_sell_value !== undefined ? Number(e.detail.gold_sell_value) : prev.gold_sell_value,
          silver_buy_value: e.detail.silver_buy_value !== undefined ? Number(e.detail.silver_buy_value) : prev.silver_buy_value,
          silver_sell_value: e.detail.silver_sell_value !== undefined ? Number(e.detail.silver_sell_value) : prev.silver_sell_value,
        }));
      } else {
        fetchMetalRates();
      }
    };
    window.addEventListener('jbj_metal_rates_updated', handleLocalUpdate);

    // 2. Listen for cross-tab BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('jbj_rates_channel');
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'RATES_UPDATED' && msg.data?.rates) {
          const r = msg.data.rates;
          setRates((prev) => ({
            gold_buy_value: r.gold_buy_value !== undefined ? Number(r.gold_buy_value) : prev.gold_buy_value,
            gold_sell_value: r.gold_sell_value !== undefined ? Number(r.gold_sell_value) : prev.gold_sell_value,
            silver_buy_value: r.silver_buy_value !== undefined ? Number(r.silver_buy_value) : prev.silver_buy_value,
            silver_sell_value: r.silver_sell_value !== undefined ? Number(r.silver_sell_value) : prev.silver_sell_value,
          }));
        }
      };
    } catch {}

    return () => {
      window.removeEventListener('jbj_metal_rates_updated', handleLocalUpdate);
      if (channel) channel.close();
    };
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
              padding: 7px 12px !important;
            }
            .announcement-bar-ticker {
              font-size: 0.7rem !important;
              gap: 0.4rem !important;
              letter-spacing: 0.02em !important;
            }
            .announcement-bar-avatar {
              width: 22px !important;
              height: 22px !important;
              font-size: 0.58rem !important;
            }
            .announcement-bar-name {
              font-size: 0.65rem !important;
            }
          }
        `}</style>
        <header
          className="announcement-bar announcement-bar-admin"
          style={{
            background: 'linear-gradient(90deg, var(--rose-deep), var(--rose-gold), var(--gold-deep))',
            color: '#ffffff',
            padding: isMobileScreen ? '8px 16px' : '10px 24px',
            fontSize: '0.78rem',
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
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

          {/* Right: Language Toggle & User Profile Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
