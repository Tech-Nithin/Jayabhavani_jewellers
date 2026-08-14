import React, { useState, useEffect } from 'react';
import type { LoanRecord } from '../types';
import { getFinanceTranslation, type Language } from '../financeTranslations';

interface SettlementDialogProps {
  isOpen: boolean;
  record: LoanRecord | null;
  lang?: Language;
  onClose: () => void;
  onConfirm: (interest: number) => Promise<void>;
  submitting: boolean;
}

export const SettlementDialog: React.FC<SettlementDialogProps> = ({
  isOpen,
  record,
  lang = 'EN',
  onClose,
  onConfirm,
  submitting,
}) => {
  const t = getFinanceTranslation(lang);
  const [editableInterest, setEditableInterest] = useState<number | string>(0);

  useEffect(() => {
    if (isOpen && record) {
      setEditableInterest(Number(record.month_wise_interest || 0));
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  return (
    <div
      onClick={() => !submitting && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#ffffff', borderRadius: '24px', padding: '1.5rem', maxWidth: '440px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1', textAlign: 'center', position: 'relative' }}
      >
        {/* Top-Right Cross Close Button */}
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          style={{ position: 'absolute', top: '14px', right: '14px', background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', transition: 'all 0.2s' }}
        >
          <i className="fa-solid fa-xmark" />
        </button>
        {/* Modal Icon & Header */}
        <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem auto' }}>
          <i className="fa-solid fa-circle-check" />
        </div>

        <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 800 }}>
          {t.settlementModalTitle}
        </h3>

        <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.82rem', lineHeight: 1.4 }}>
          {t.settlementDesc} <strong style={{ color: '#0f172a' }}>{record.customer_name} {record.customer_surname}</strong> (<span style={{ color: '#6366f1' }}>{record.item_name}</span>):
        </p>

        {/* Editable Month-Wise (Rounded) Interest Card */}
        <div style={{ background: '#f5f3ff', borderRadius: '16px', padding: '1rem 1.15rem', border: '2px solid #6366f1', marginBottom: '1.15rem', textAlign: 'left', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="fa-solid fa-pen-to-square" style={{ color: '#6366f1' }} /> {t.monthWiseInterestTitle}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 700 }}>
              {record.month_wise_count || 1} {lang === 'TE' ? 'నెల్లు' : 'Months'} ({record.interest_rate_percent}% / mo)
            </span>
          </div>
          <div style={{ position: 'relative', marginTop: '4px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#4338ca', fontSize: '1.15rem' }}>₹</span>
            <input
              type="number"
              value={editableInterest}
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setEditableInterest('');
                } else {
                  setEditableInterest(Number(val));
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 30px',
                borderRadius: '10px',
                border: '1.5px solid #818cf8',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#312e81',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#334155' }}>
          <span>{t.settlementClosingDate} <strong>{new Date().toISOString().split('T')[0]}</strong></span>
          <span>{t.finalInterestLabel} <strong style={{ color: '#059669' }}>₹{Number(editableInterest).toLocaleString('en-IN')}</strong></span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}
          >
            <i className="fa-solid fa-xmark" /> {t.cancelBtn}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onConfirm(Number(editableInterest) || 0)}
            style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
          >
            {submitting ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
            {t.confirmCompleteBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
