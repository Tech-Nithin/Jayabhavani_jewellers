import React, { useState, useEffect } from 'react';
import type { CustomerDirectoryRecord } from '../types';
import { API_BASE } from '../../config/apiConfig';
import { parseIndianCurrencyNumber } from './modes/modeUtils';

interface InvoiceSettlementModalProps {
  customer: CustomerDirectoryRecord | null;
  onClose: () => void;
  onSettlementSuccess?: (result: {
    invoiceId: string;
    paidAmount: number;
    dueAmount: number;
    discountAmount: number;
    paidNow: number;
    paymentHistory: any[];
    fullInvoice?: any;
  }) => void;
}

export const InvoiceSettlementModal: React.FC<InvoiceSettlementModalProps> = ({
  customer,
  onClose,
  onSettlementSuccess,
}) => {
  if (!customer || !customer.latestInvoice) return null;

  const inv = customer.latestInvoice;

  // Helper to extract receipt json data safely
  let receiptData: any = {};
  if (inv.receipt_json_data) {
    if (typeof inv.receipt_json_data === 'string') {
      try {
        receiptData = JSON.parse(inv.receipt_json_data);
      } catch {
        receiptData = {};
      }
    } else {
      receiptData = inv.receipt_json_data;
    }
  }

  const totalGrand = Number(inv?.final_amount ?? inv?.total_amount ?? customer.totalSpent ?? 0);
  const currentDue = Number(inv?.due_amount ?? 0);
  const currentPaid = Number(inv?.paid_amount ?? (totalGrand - currentDue));

  const [payingNow, setPayingNow] = useState<string>(
    currentDue > 0 ? currentDue.toLocaleString('en-IN') : ''
  );
  const [discount, setDiscount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [customPaidAt, setCustomPaidAt] = useState<string>(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [livePaymentHistory, setLivePaymentHistory] = useState<any[]>(
    Array.isArray(receiptData?.payment_history) ? receiptData.payment_history : []
  );

  // If receipt_json_data or payment history is empty, fetch single invoice on demand
  useEffect(() => {
    const rawId = inv?.id || (customer as any)?.id;
    const cleanId = rawId ? String(rawId).replace(/^log-inv-/, '') : null;
    if (cleanId && (!receiptData?.payment_history || receiptData.payment_history.length === 0)) {
      fetch(`${API_BASE}/billing/invoices/${cleanId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.invoice) {
            let fetchedReceipt = data.invoice.receipt_json_data;
            if (typeof fetchedReceipt === 'string') {
              try {
                fetchedReceipt = JSON.parse(fetchedReceipt);
              } catch {
                fetchedReceipt = {};
              }
            }
            if (Array.isArray(fetchedReceipt?.payment_history)) {
              setLivePaymentHistory(fetchedReceipt.payment_history);
            }
          }
        })
        .catch((err) => console.warn('Could not fetch latest invoice history:', err));
    }
  }, [inv?.id]);

  const paidNowNum = parseIndianCurrencyNumber(payingNow);
  const discountNum = parseIndianCurrencyNumber(discount);
  const newRemainingDue = Math.max(0, currentDue - paidNowNum - discountNum);
  const newTotalPaid = currentPaid + paidNowNum;

  const handleConfirm = async () => {
    if (paidNowNum <= 0 && discountNum <= 0) {
      alert('Please enter a payment amount or discount');
      return;
    }

    const rawId = inv?.id || (customer as any)?.id || 'INV';
    const cleanInvId = String(rawId).replace(/^log-inv-/, '');

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/billing/invoices/${cleanInvId}/settlement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid_now: paidNowNum,
          discount_amount: discountNum,
          custom_paid_at: customPaidAt ? new Date(customPaidAt).toISOString() : new Date().toISOString(),
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onSettlementSuccess) {
          onSettlementSuccess({
            invoiceId: cleanInvId,
            paidAmount: data.paid_amount,
            dueAmount: data.due_amount,
            discountAmount: data.discount_amount,
            paidNow: paidNowNum,
            paymentHistory: data.payment_history || livePaymentHistory,
            fullInvoice: data.invoice,
          });
        }
        alert(
          data.due_amount === 0
            ? `✅ Invoice ${cleanInvId} full payment of ₹${paidNowNum.toLocaleString('en-IN')} received & marked as PAID!`
            : `ℹ️ Payment installment of ₹${paidNowNum.toLocaleString('en-IN')} recorded successfully! Remaining Due: ₹${Number(data.due_amount).toLocaleString('en-IN')}`
        );
        onClose();
      } else {
        alert('Failed to record payment: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      alert('Request error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #fcd34d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 800,
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fa-solid fa-credit-card"></i> Record Installment Payment
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
              Customer: <strong>{customer.name}</strong>{customer.phone ? ` (${customer.phone})` : ''}
            </span>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: '#92400e',
              cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              background: '#f8fafc',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, display: 'block' }}>
                TOTAL BILL
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 800 }}>
                ₹{totalGrand.toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 700, display: 'block' }}>
                PAID SO FAR
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800 }}>
                ₹{currentPaid.toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 700, display: 'block' }}>
                BALANCE DUE
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 800 }}>
                ₹{currentDue.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          {/* Payment Inputs Grid: Amount Paying Today + Settlement Discount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '4px',
                }}
              >
                Paying Today (₹):
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 10,000"
                value={payingNow}
                onChange={(e) => {
                  const raw = e.target.value;
                  const num = parseIndianCurrencyNumber(raw);
                  setPayingNow(num > 0 ? num.toLocaleString('en-IN') : raw);
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid #d97706',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: '#b45309',
                  outline: 'none',
                  background: '#fffbeb',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#047857',
                  marginBottom: '4px',
                }}
              >
                Discount / తగ్గింపు (₹):
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 500 (Optional)"
                value={discount}
                onChange={(e) => {
                  const raw = e.target.value;
                  const num = parseIndianCurrencyNumber(raw);
                  setDiscount(num > 0 ? num.toLocaleString('en-IN') : raw);
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid #10b981',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: '#047857',
                  outline: 'none',
                  background: '#ecfdf5',
                }}
              />
            </div>
          </div>

          {/* Payment Date & Time Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '3px',
              }}
            >
              Payment Date & Time:
            </label>
            <input
              type="datetime-local"
              value={customPaidAt}
              onChange={(e) => setCustomPaidAt(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          {/* Note Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '3px',
              }}
            >
              Note / Remarks (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Cash received by admin / GPay"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          {/* Calculation Real-Time Summary */}
          <div
            style={{
              background: newRemainingDue === 0 ? '#dcfce7' : '#fef3c7',
              border: newRemainingDue === 0 ? '1px solid #86efac' : '1px solid #fde68a',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
              <span>New Paid Total:</span>
              <span style={{ color: '#16a34a' }}>₹{newTotalPaid.toLocaleString('en-IN')}</span>
            </div>
            {discountNum > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#047857',
                  fontWeight: 700,
                  marginTop: '2px',
                }}
              >
                <span>Discount Deducted:</span>
                <span>- ₹{discountNum.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: newRemainingDue === 0 ? '#15803d' : '#b45309',
                fontWeight: 800,
                marginTop: '2px',
              }}
            >
              <span>Remaining Balance Due:</span>
              <span>₹{newRemainingDue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Installments Timeline History */}
          {livePaymentHistory.length > 0 && (
            <div style={{ marginTop: '0.2rem', paddingTop: '0.6rem', borderTop: '1px dashed #cbd5e1' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#475569',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <i className="fa-solid fa-clock-rotate-left" style={{ color: '#0284c7' }}></i>
                Payment Installments History ({livePaymentHistory.length}):
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {livePaymentHistory.map((ph: any, pIdx: number) => {
                  const pDate = ph.paid_at
                    ? new Date(ph.paid_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '-';
                  const discOnInst = Number(ph.discount_amount || 0);
                  return (
                    <div
                      key={pIdx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.70rem',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#334155' }}>
                        #{ph.installment || pIdx + 1} ({ph.note || 'Payment'}):
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{pDate}</span>
                        <strong style={{ color: '#16a34a' }}>
                          + ₹{Number(ph.amount || 0).toLocaleString('en-IN')}
                        </strong>
                        {discOnInst > 0 && (
                          <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.65rem' }}>
                            (Disc: -₹{discOnInst.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modal Buttons */}
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.4rem' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                isSubmitting ||
                (paidNowNum <= 0 && discountNum <= 0)
              }
              onClick={handleConfirm}
              style={{
                flex: 1.5,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor:
                  isSubmitting || (paidNowNum <= 0 && discountNum <= 0)
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  isSubmitting || (paidNowNum <= 0 && discountNum <= 0) ? 0.6 : 1,
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Recording...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> Confirm & Record Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
