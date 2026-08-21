import React, { useState, useEffect } from 'react';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';

interface LoadCashViewProps {
  onClose: () => void;
  onCashUpdated?: () => void;
  lang?: Language;
}

export const LoadCashView: React.FC<LoadCashViewProps> = ({
  onClose,
  onCashUpdated,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;
  const [currentCash, setCurrentCash] = useState<number>(0);
  const [todayLoadedCash, setTodayLoadedCash] = useState<number>(0);
  const [todayTransactions, setTodayTransactions] = useState<number>(0);
  const [loadAmount, setLoadAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE = (window as any).__JBJ_API_BASE__ || '/api';

  const fetchCashStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/cash/status`);
      const data = await res.json();
      if (data.success) {
        setCurrentCash(Number(data.current_cash || 0));
        setTodayLoadedCash(Number(data.today_loaded_cash || 0));
        setTodayTransactions(Number(data.today_transactions_count || 0));
      }
    } catch (err) {
      console.error('Error fetching cash status:', err);
    }
  };

  useEffect(() => {
    fetchCashStatus();
  }, []);

  const loadAmountNum = Number(loadAmount) || 0;
  const calculatedTotalCash = Number((currentCash + loadAmountNum).toFixed(2));

  const handleLoadCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loadAmountNum <= 0) {
      alert('Please enter a valid cash amount greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/cash/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: loadAmountNum,
          notes: notes.trim() || 'Loaded cash into shop drawer',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLoadAmount('');
        setNotes('');
        await fetchCashStatus();
        if (onCashUpdated) onCashUpdated();
        alert(data.message || 'Cash loaded successfully!');
      } else {
        alert(data.message || 'Failed to load cash');
      }
    } catch (err) {
      console.error('Error submitting cash load:', err);
      alert('Network error while loading cash');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* 1. TOP CARD: LOAD CASH FORM */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #cbd5e1',
        }}
      >
        <form onSubmit={handleLoadCashSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', marginBottom: '1.5rem' }}>

            {/* LEFT: Existing Cash & Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Current Existing Cash Display */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Current Cash in Drawer
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    ₹{currentCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Today's Loaded ({todayTransactions} txns)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    +₹{todayLoadedCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Amount to Load Input */}
              <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #bbf7d0' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                  💵 Cash Amount to Load (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 50000"
                    value={loadAmount}
                    onChange={(e) => setLoadAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem 0.85rem 2rem',
                      borderRadius: '10px',
                      border: '2px solid #22c55e',
                      fontSize: '1.3rem',
                      fontWeight: 800,
                      color: '#166534',
                      background: '#ffffff',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

            </div>

            {/* RIGHT: Live Calculation & Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Calculation Summary Preview */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  📊 Cash Balance Preview
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#ffffff', padding: '10px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Current Cash</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>₹{currentCash.toLocaleString('en-IN')}</div>
                  </div>

                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#94a3b8' }}>+</div>

                  <div style={{ background: '#dcfce7', padding: '10px 8px', borderRadius: '10px', border: '1px solid #86efac' }}>
                    <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>Loaded Cash</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#166534', marginTop: '2px' }}>+₹{loadAmountNum.toLocaleString('en-IN')}</div>
                  </div>

                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#94a3b8' }}>=</div>

                  <div style={{ background: '#eff6ff', padding: '10px 8px', borderRadius: '10px', border: '1.5px solid #93c5fd' }}>
                    <div style={{ fontSize: '0.68rem', color: '#1d4ed8', fontWeight: 700 }}>Total Cash</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e40af', marginTop: '2px' }}>₹{calculatedTotalCash.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  📝 Notes / Source (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank ATM withdrawal, Owner Capital"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a' }}
                />
              </div>

            </div>
          </div>

          {/* Action Buttons Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ minWidth: '120px', padding: '10px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadAmountNum <= 0}
              style={{
                minWidth: '220px',
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                background: loadAmountNum <= 0 ? '#94a3b8' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: loadAmountNum <= 0 ? 'not-allowed' : 'pointer',
                boxShadow: loadAmountNum <= 0 ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading Cash...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check-circle"></i> Confirm & Load Cash (+₹{loadAmountNum.toLocaleString('en-IN')})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
