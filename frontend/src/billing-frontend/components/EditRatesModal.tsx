import React, { useState } from 'react';
import type { GlobalRates } from '../types';
import { translations } from '../../utils/translations';
import type { Language } from '../../utils/translations';

interface EditRatesModalProps {
  rates: GlobalRates | null;
  activeMetalTab: 'GOLD' | 'SILVER';
  onClose: () => void;
  onUpdateRates: (tab: 'GOLD' | 'SILVER', goldBuy: number, goldSell: number, silverBuy: number, silverSell: number) => Promise<void>;
  formatDate: (date?: string) => string;
  lang?: Language;
}

export const EditRatesModal: React.FC<EditRatesModalProps> = ({
  rates,
  activeMetalTab,
  onClose,
  onUpdateRates,
  formatDate,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;
  const [rateTab, setRateTab] = useState<'GOLD' | 'SILVER'>(activeMetalTab);
  const [goldBuyInput, setGoldBuyInput] = useState<number | string>(rates?.gold_buy_value || '');
  const [goldSellInput, setGoldSellInput] = useState<number | string>(rates?.gold_sell_value || '');
  const [silverBuyInput, setSilverBuyInput] = useState<number | string>(rates?.silver_buy_value || '');
  const [silverSellInput, setSilverSellInput] = useState<number | string>(rates?.silver_sell_value || '');
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await onUpdateRates(
        rateTab,
        Number(goldBuyInput),
        Number(goldSellInput),
        Number(silverBuyInput),
        Number(silverSellInput)
      );
      onClose();
    } catch (err) {
      console.error('Error updating rates:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Cover Header */}
        <div
          style={{
            position: 'relative',
            height: '140px',
            backgroundImage:
              rateTab === 'GOLD'
                ? "url('/gold_bisucit.png')"
                : "url('/silver_biscuit.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.35)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '14px',
              padding: '0.65rem 1.25rem',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            }}
          >
            <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.15rem' }}>
              {t.editRatesTitle}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#1e293b', fontWeight: 700 }}>
              {t.storeName}
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '4px' }}>
          <button
            type="button"
            onClick={() => setRateTab('GOLD')}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              borderRadius: '10px',
              background: rateTab === 'GOLD' ? '#ffffff' : 'transparent',
              color: rateTab === 'GOLD' ? '#b45309' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: rateTab === 'GOLD' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            🥇 {t.goldMetal} {t.editMarketRatesBtn}
          </button>
          <button
            type="button"
            onClick={() => setRateTab('SILVER')}
            style={{
              flex: 1,
              padding: '0.6rem',
              border: 'none',
              borderRadius: '10px',
              background: rateTab === 'SILVER' ? '#ffffff' : 'transparent',
              color: rateTab === 'SILVER' ? '#0369a1' : '#64748b',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: rateTab === 'SILVER' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            🥈 {t.silverMetal} {t.editMarketRatesBtn}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
          {rateTab === 'GOLD' ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {t.goldBuyRateLabel}
                </label>
                <input
                  type="number"
                  step="1"
                  value={goldBuyInput}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setGoldBuyInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
                <small style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {t.lastUpdated} {formatDate(rates?.gold_buy_value_updated_at)}
                </small>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {t.goldSellRateLabel}
                </label>
                <input
                  type="number"
                  step="1"
                  value={goldSellInput}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setGoldSellInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
                <small style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {t.lastUpdated} {formatDate(rates?.gold_sell_value_updated_at)}
                </small>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {t.silverBuyRateLabel}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={silverBuyInput}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setSilverBuyInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
                <small style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {t.lastUpdated} {formatDate(rates?.silver_buy_value_updated_at)}
                </small>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {t.silverSellRateLabel}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={silverSellInput}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setSilverSellInput(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
                <small style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {t.lastUpdated} {formatDate(rates?.silver_sell_value_updated_at)}
                </small>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.6rem 1.15rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={updating}
              style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#ffffff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
            >
              {updating ? t.updatingRatesBtn : t.saveRatesBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
