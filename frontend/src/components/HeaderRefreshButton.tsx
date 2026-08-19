import React, { useState } from 'react';
import { API_BASE } from '../config/apiConfig';

interface HeaderRefreshButtonProps {
  onRefresh?: () => Promise<any> | void;
  title?: string;
  size?: 'sm' | 'md';
}

export const HeaderRefreshButton: React.FC<HeaderRefreshButtonProps> = ({
  onRefresh,
  title = 'Hard Refresh Data from Server',
  size = 'sm',
}) => {
  const [spinning, setSpinning] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spinning) return;
    setSpinning(true);

    try {
      // 1. Purge backend RAM cache instantly
      await fetch(`${API_BASE}/health/purge-cache`, { method: 'POST' }).catch(() => {});

      // 2. Execute fresh data fetch callback
      if (onRefresh) {
        await onRefresh();
      }

      // 3. Show success toast notice
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.warn('⚠️ Manual refresh notice:', err);
    } finally {
      setTimeout(() => setSpinning(false), 600);
    }
  };

  const iconFontSize = size === 'sm' ? '0.78rem' : '0.88rem';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleRefresh}
        title={title}
        aria-label={title}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '2px 4px',
          color: '#94a3b8',
          fontSize: iconFontSize,
          cursor: spinning ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s ease',
          outline: 'none',
          opacity: spinning ? 0.6 : 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#d97706')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
      >
        <i
          className="fa-solid fa-rotate-right"
          style={{
            transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)',
            transition: spinning ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          }}
        />
      </button>

      {/* Floating Refresh Toast Notice */}
      {showToast && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#064e3b',
            color: '#a7f3d0',
            border: '1px solid #059669',
            padding: '3px 8px',
            borderRadius: '5px',
            fontSize: '0.68rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            zIndex: 999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        >
          <i className="fa-solid fa-check-circle" style={{ marginRight: '4px' }}></i>
          Refreshed!
        </div>
      )}
    </div>
  );
};
