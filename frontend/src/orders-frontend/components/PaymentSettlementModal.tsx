import React from 'react';
import type { OrderItem } from '../types';
import { translations, type Language } from '../../utils/translations';
import { getOrdersTranslation } from '../ordersTranslations';

interface PaymentSettlementModalProps {
  open: boolean;
  order: OrderItem | null;
  payingNow: string;
  paymentDate: string;
  isSubmitting: boolean;
  lang?: Language;
  onPayingNowChange: (val: string) => void;
  onPaymentDateChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const PaymentSettlementModal: React.FC<PaymentSettlementModalProps> = ({
  open,
  order,
  payingNow,
  paymentDate,
  isSubmitting,
  lang = 'EN',
  onPayingNowChange,
  onPaymentDateChange,
  onClose,
  onConfirm,
}) => {
  const t = getOrdersTranslation(lang);
  if (!open || !order) return null;

  const currentDue = Number(order.due_amount || 0);
  const cleanVal = String(payingNow || '').replace(/,/g, '');
  const payNowNum = Math.max(0, Number(cleanVal) || 0);
  const remainingDue = Math.max(0, Number((currentDue - payNowNum).toFixed(2)));
  const isFullPayment = payNowNum >= currentDue && currentDue > 0;
  const isOverPaying = payNowNum > currentDue && currentDue > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="tablet-dense-view" style={{ background: '#ffffff', borderRadius: '18px', maxWidth: '460px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-money-bill-wave" style={{ color: '#16a34a' }}></i>
            {t.paymentSettlementTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Order Info Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.85rem', fontSize: '0.76rem' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>{order.customer_name}</div>
          <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '2px' }}>
            📞 {order.customer_phone || 'N/A'} · 💍 {order.item_name}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.45rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.76rem' }}>
            <span>Already Paid: <strong style={{ color: '#16a34a' }}>₹{(order.paid_amount || 0).toLocaleString('en-IN')}</strong></span>
            <span>Current Due: <strong style={{ color: '#dc2626', fontSize: '0.85rem' }}>₹{currentDue.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Payment Date Selection */}
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            📅 Payment Date (which date on customer paid):
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => onPaymentDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid #0284c7',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#0f172a',
              background: '#f0f9ff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Paying Now Input */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
              {translations[lang]?.customerPayingNowLabel || 'How much payment is customer paying now? (₹)'}
            </label>
            {currentDue > 0 && (
              <button
                type="button"
                onClick={() => onPayingNowChange(String(currentDue))}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#0284c7',
                  cursor: 'pointer',
                }}
              >
                Pay Full Due (₹{currentDue.toLocaleString('en-IN')})
              </button>
            )}
          </div>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder="e.g. 6,000"
            value={payingNow}
            onChange={(e) => onPayingNowChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              border: '2px solid #16a34a',
              fontSize: '1rem',
              fontWeight: 800,
              color: '#15803d',
              background: '#f0fdf4',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Live Remaining Due Calculation Card */}
        <div
          style={{
            background: isFullPayment ? '#ecfdf5' : '#fffbeb',
            border: `1.5px solid ${isFullPayment ? '#86efac' : '#fde68a'}`,
            borderRadius: '10px',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            fontSize: '0.76rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Paying Now:</span>
            <strong style={{ color: '#16a34a', fontSize: '0.85rem' }}>
              ₹{payNowNum.toLocaleString('en-IN')}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px dashed #cbd5e1' }}>
            <span style={{ color: '#334155', fontWeight: 700 }}>Remaining Balance After Payment:</span>
            <strong
              style={{
                color: remainingDue > 0 ? '#b45309' : '#16a34a',
                fontSize: '0.95rem',
                fontWeight: 900,
              }}
            >
              ₹{remainingDue.toLocaleString('en-IN')}
            </strong>
          </div>

          <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
            {isOverPaying ? (
              <span style={{ color: '#b45309' }}>
                ⚠️ Notice: Payment exceeds current due by ₹{(payNowNum - currentDue).toLocaleString('en-IN')}.
              </span>
            ) : isFullPayment ? (
              <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-circle-check"></i> Full Settlement — Bill will be marked as <strong>PAID / SOLD</strong>.
              </span>
            ) : payNowNum > 0 ? (
              <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* <i className="fa-solid fa-clock"></i> Partial Payment — Remaining balance of <strong>₹{remainingDue.toLocaleString('en-IN')}</strong> will stay active in Due Register. */}
              </span>
            ) : (
              <span style={{ color: '#64748b' }}>
                Enter an amount above to see the updated remaining balance.
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '0.55rem 0.9rem', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}
          >
            {translations[lang]?.cancelBtn || 'Cancel'}
          </button>

          <button
            type="button"
            disabled={isSubmitting || payNowNum <= 0}
            onClick={onConfirm}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '7px',
              border: 'none',
              background: payNowNum <= 0 ? '#94a3b8' : 'linear-gradient(135deg, #228B22 0%, #33B249 100%)',
              color: '#ffffff',
              fontWeight: 800,
              cursor: payNowNum <= 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.76rem',
              boxShadow: payNowNum <= 0 ? 'none' : '0 3px 10px rgba(34, 139, 34, 0.3)',
            }}
          >
            {isSubmitting
              ? (translations[lang]?.updatingStatusBtn || 'Updating...')
              : (translations[lang]?.confirmPaymentBtn || 'Confirm Payment & Update')}
          </button>
        </div>
      </div>
    </div>
  );
};
