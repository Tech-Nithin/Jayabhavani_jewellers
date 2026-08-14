import React from 'react';
import type { OrderItem } from '../types';
import { translations, type Language } from '../../utils/translations';
import { getOrdersTranslation } from '../ordersTranslations';

interface PaymentSettlementModalProps {
  open: boolean;
  order: OrderItem | null;
  payingNow: string;
  isSubmitting: boolean;
  lang?: Language;
  onPayingNowChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const PaymentSettlementModal: React.FC<PaymentSettlementModalProps> = ({
  open,
  order,
  payingNow,
  isSubmitting,
  lang = 'EN',
  onPayingNowChange,
  onClose,
  onConfirm,
}) => {
  const t = getOrdersTranslation(lang);
  if (!open || !order) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="tablet-dense-view" style={{ background: '#ffffff', borderRadius: '18px', maxWidth: '440px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1' }}>
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
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.65rem 0.75rem', marginBottom: '1rem', fontSize: '0.76rem' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>{order.customer_name}</div>
          <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '2px' }}>
            📞 {order.customer_phone || 'N/A'} · 💍 {order.item_name}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.74rem' }}>
            <span>Already Paid: <strong style={{ color: '#16a34a' }}>₹{(order.paid_amount || 0).toLocaleString('en-IN')}</strong></span>
            <span>Current Due: <strong style={{ color: '#dc2626' }}>₹{(order.due_amount || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Paying Now Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {translations[lang]?.customerPayingNowLabel || 'How much payment is customer paying now? (₹)'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder="e.g. 1,00,000"
            value={payingNow}
            onChange={(e) => onPayingNowChange(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '2px solid #16a34a', fontSize: '0.95rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem 0.9rem', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}
          >
            {translations[lang]?.cancelBtn || 'Cancel'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg, #228B22 0%, #33B249 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.76rem', boxShadow: '0 3px 10px rgba(34, 139, 34, 0.3)' }}
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
