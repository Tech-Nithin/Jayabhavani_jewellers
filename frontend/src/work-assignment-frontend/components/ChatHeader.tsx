import React from 'react';
import { type Language, translations } from '../../utils/translations';
import { getWorkAssignmentTranslation } from '../workAssignmentTranslations';

interface ChatHeaderProps {
  worker: any;
  lang: Language;
  netFineGoldBalance: number;
  netFineSilverBalance: number;
  netCashBalance: number;
  isSearchOpen: boolean;
  is3DotsOpen: boolean;
  setIs3DotsOpen: (v: boolean) => void;
  isMessagePreviewEnabled: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  matchedTxIds: string[];
  activeMatchIdx: number;
  setActiveMatchIdx: (v: number | ((prev: number) => number)) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onOpenWorkerModal: () => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onToggleMessagePreview: () => void;
  setPreviewImageData: (d: { url: string; title: string } | null) => void;
  setShowWorkerModal: (v: boolean) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  worker,
  lang,
  netFineGoldBalance,
  netFineSilverBalance,
  netCashBalance,
  isSearchOpen,
  is3DotsOpen,
  setIs3DotsOpen,
  isMessagePreviewEnabled,
  searchQuery,
  setSearchQuery,
  matchedTxIds,
  activeMatchIdx,
  setActiveMatchIdx,
  searchInputRef,
  onBack,
  onOpenWorkerModal,
  onOpenSearch,
  onCloseSearch,
  onToggleMessagePreview,
  setPreviewImageData,
  setShowWorkerModal,
}) => {
  const t = getWorkAssignmentTranslation(lang);

  return (
    <div style={{ background: '#ffffff', padding: '0.6rem 1rem', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>

      {/* Left Side: Back button + Clickable Worker Profile Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flexShrink: 1 }}>
        <button
          onClick={onBack}
          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', flexShrink: 0 }}
          title="Back to Workers"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>

        {/* Clickable Worker Profile Header */}
        <div
          onClick={() => {
            if (worker.photo_url) {
              setPreviewImageData({ url: worker.photo_url, title: `${worker.name} Profile Picture` });
            } else {
              setShowWorkerModal(true);
            }
          }}
          title="Click to view worker profile picture & information"
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', overflow: 'hidden' }}
        >
          {worker.photo_url ? (
            <img
              src={worker.photo_url}
              alt={worker.name}
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #d97706', boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}>
              {worker.name.charAt(0)}
            </div>
          )}

          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</span>
              <i className="fa-solid fa-circle-info" style={{ fontSize: '0.72rem', color: '#0284c7', flexShrink: 0 }}></i>
            </h3>
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {worker.specialization}&nbsp;·&nbsp;
              <strong style={{ color: '#d97706' }}>{worker.assigned_orders_count || 0} Orders</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Center & Right: Fine Metal Balances & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>

        {/* Strict 100% Fine Metal Balance summary pills */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {/* Pure Gold Pill */}
          <div
            title={netFineGoldBalance > 0.0001 ? t.workerNeedsToSendUs : netFineGoldBalance < -0.0001 ? t.needsToSendWorker : t.fullySettled}
            style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '6px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '65px' }}
          >
            <span style={{ fontSize: '0.55rem', color: '#b45309', fontWeight: 800, display: 'block' }}>{t.pureGoldLabel}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
              {netFineGoldBalance > 0.0001 ? (
                <i className="fa-solid fa-arrow-down" style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 900 }} />
              ) : netFineGoldBalance < -0.0001 ? (
                <i className="fa-solid fa-arrow-up" style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 900 }} />
              ) : null}
              <strong style={{ fontSize: '0.66rem', color: netFineGoldBalance < -0.0001 ? '#dc2626' : '#92400e', fontWeight: 800 }}>
                {Math.abs(netFineGoldBalance).toFixed(3)} g
              </strong>
            </div>
          </div>

          {/* Pure Silver Pill */}
          <div
            title={netFineSilverBalance > 0.0001 ? 'Worker needs to send to us' : netFineSilverBalance < -0.0001 ? 'Needs to send to worker' : 'Fully Settled'}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '6px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '65px' }}
          >
            <span style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 800, display: 'block' }}>Pure Silver</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
              {netFineSilverBalance > 0.0001 ? (
                <i className="fa-solid fa-arrow-down" style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 900 }} />
              ) : netFineSilverBalance < -0.0001 ? (
                <i className="fa-solid fa-arrow-up" style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 900 }} />
              ) : null}
              <strong style={{ fontSize: '0.66rem', color: netFineSilverBalance < -0.0001 ? '#dc2626' : '#334155', fontWeight: 800 }}>
                {Math.abs(netFineSilverBalance).toFixed(3)} g
              </strong>
            </div>
          </div>

          {/* Net Cash Pill */}
          <div
            title={netCashBalance > 0.01 ? 'Worker needs to send to us' : netCashBalance < -0.01 ? 'Needs to send to worker' : 'Fully Settled'}
            style={{ background: '#e0f2fe', border: '1px solid #bae6fd', padding: '2px 6px', borderRadius: '6px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '65px' }}
          >
            <span style={{ fontSize: '0.55rem', color: '#0369a1', fontWeight: 800, display: 'block' }}>Net Cash</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
              {netCashBalance > 0.01 ? (
                <i className="fa-solid fa-arrow-down" style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 900 }} />
              ) : netCashBalance < -0.01 ? (
                <i className="fa-solid fa-arrow-up" style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 900 }} />
              ) : null}
              <strong style={{ fontSize: '0.66rem', color: netCashBalance < -0.01 ? '#dc2626' : '#075985', fontWeight: 800 }}>
                ₹{Math.abs(Math.round(netCashBalance)).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* Simple Borderless Vertical 3-Dots Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIs3DotsOpen(!is3DotsOpen)}
            style={{ background: 'none', border: 'none', padding: '4px 6px', fontSize: '1.25rem', color: '#475569', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="More Options"
          >
            <i className="fa-solid fa-ellipsis-vertical"></i>
          </button>

          {is3DotsOpen && (
            <div style={{ position: 'absolute', right: 0, top: '120%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', minWidth: '180px', zIndex: 100, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => {
                  setIs3DotsOpen(false);
                  onOpenSearch();
                }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-magnifying-glass" style={{ color: '#0284c7' }}></i> Search Messages
              </button>

              <button
                type="button"
                onClick={() => {
                  setIs3DotsOpen(false);
                  onOpenWorkerModal();
                }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', borderTop: '1px solid #f1f5f9', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-user-gear" style={{ color: '#d97706' }}></i> Worker Information
              </button>

              <button
                type="button"
                onClick={() => {
                  setIs3DotsOpen(false);
                  onToggleMessagePreview();
                }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', borderTop: '1px solid #f1f5f9', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-eye" style={{ color: isMessagePreviewEnabled ? '#15803d' : '#64748b' }}></i> Message Preview
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: isMessagePreviewEnabled ? '#dcfce7' : '#f1f5f9', color: isMessagePreviewEnabled ? '#15803d' : '#64748b' }}>
                  {isMessagePreviewEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Search Input Overlay (When Search is Opened) */}
      {isSearchOpen && (
        <div style={{ position: 'absolute', top: 0, right: 0, left: 0, bottom: 0, background: '#ffffff', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', zIndex: 25, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#0284c7', fontSize: '0.9rem' }}></i>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={translations[lang]?.searchWorkerChatPlaceholder || 'Search in chat history...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveMatchIdx(0);
            }}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}
          />

          {searchQuery && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                {matchedTxIds.length > 0 ? `${activeMatchIdx + 1}/${matchedTxIds.length}` : '0 matches'}
              </span>
              <button
                type="button"
                onClick={() => setActiveMatchIdx((prev) => (prev - 1 + matchedTxIds.length) % (matchedTxIds.length || 1))}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                <i className="fa-solid fa-chevron-up"></i>
              </button>
              <button
                type="button"
                onClick={() => setActiveMatchIdx((prev) => (prev + 1) % (matchedTxIds.length || 1))}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                <i className="fa-solid fa-chevron-down"></i>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onCloseSearch}
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', color: '#64748b', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 700, flexShrink: 0 }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
