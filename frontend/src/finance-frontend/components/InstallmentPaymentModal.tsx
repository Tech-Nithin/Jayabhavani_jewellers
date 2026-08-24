import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/apiConfig';
import type { LoanRecord, LoanPayment } from '../types';
import type { Language } from '../financeTranslations';

interface InstallmentPaymentModalProps {
  isOpen: boolean;
  loan: LoanRecord | null;
  lang?: Language;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const InstallmentPaymentModal: React.FC<InstallmentPaymentModalProps> = ({
  isOpen,
  loan,
  lang: _lang = 'EN',
  onClose,
  onPaymentSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'pay' | 'history' | 'receipt'>('pay');
  const [payingAmount, setPayingAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'PARTIAL_SETTLEMENT' | 'INTEREST_ONLY' | 'FULL_CLOSE'>('PARTIAL_SETTLEMENT');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<LoanPayment[]>([]);
  const [liveLoan, setLiveLoan] = useState<LoanRecord | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sync loan data and fetch history when modal opens
  useEffect(() => {
    if (isOpen && loan) {
      const loanUuid = loan.finance_uuid || loan.id;
      if (loanUuid) {
        fetchLoanDetails(loanUuid);
      } else {
        setLiveLoan(loan);
      }
      setPayingAmount('');
      setNotes('');
      setActiveTab('pay');
    }
  }, [isOpen, loan]);

  const fetchLoanDetails = async (uuid: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/finance/${uuid}`);
      const data = await res.json();
      if (data.success) {
        setLiveLoan(data.loan);
        setPaymentHistory(data.payment_history || []);
        // Default paying amount to month-wise interest or total payable
        if (data.loan) {
          const interestDue = Number(data.loan.current_interest_due || 0);
          setPayingAmount(String(interestDue > 0 ? interestDue : ''));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen || !loan) return null;

  const currentLoan = liveLoan || loan;
  const originalPrincipal = Number(currentLoan.customer_debt_money || currentLoan.amount || 0);
  const currentPrincipal = Number(currentLoan.current_principal ?? currentLoan.amount ?? 0);
  const ratePercent = Number(currentLoan.interest_rate_percent || 1.5);
  const interestDue = Number(currentLoan.current_interest_due ?? currentLoan.month_wise_interest ?? 0);
  const totalPayableNow = Number((currentPrincipal + interestDue).toFixed(2));

  // Live breakdown calculation for input payingAmount
  const numPay = Number(payingAmount) || 0;
  const calcInterestComp = Math.min(numPay, interestDue);
  const calcPrincipalComp = paymentType === 'FULL_CLOSE'
    ? Math.max(0, numPay - calcInterestComp)
    : Math.max(0, numPay - calcInterestComp);
  const calcNewPrincipal = Math.max(0, Number((currentPrincipal - calcPrincipalComp).toFixed(2)));

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numPay || numPay <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    setSubmitting(true);
    const loanUuid = currentLoan.finance_uuid || currentLoan.id;
    try {
      const res = await fetch(`${API_BASE}/finance/${loanUuid}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paying_amount: numPay,
          payment_type: paymentType,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Payment Recorded!\n\nInstallment #${data.installment_number}\nPaid: ₹${numPay.toLocaleString('en-IN')}\nInterest Cleared: ₹${data.interest_cleared.toLocaleString('en-IN')}\nPrincipal Reduced: ₹${data.principal_reduced.toLocaleString('en-IN')}\nRemaining Principal: ₹${data.principal_after.toLocaleString('en-IN')}`);
        onPaymentSuccess();
        onClose();
      } else {
        alert('Failed to record payment: ' + data.message);
      }
    } catch {
      alert('Server error recording installment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
      <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '780px', maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>

        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', padding: '1.25rem 1.5rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#c7d2fe', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              💳 Girvi / Pledge Loan Passbook
            </div>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
              {currentLoan.customer_name} {currentLoan.customer_surname}
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#e0e7ff', marginTop: '2px' }}>
              📞 {currentLoan.customer_phone} | {currentLoan.item_name || 'Ornament'} ({currentLoan.debt_category || 'GOLD'})
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Header Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 1.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pay')}
            style={{ padding: '12px 18px', border: 'none', borderBottom: activeTab === 'pay' ? '3px solid #4f46e5' : '3px solid transparent', background: 'transparent', color: activeTab === 'pay' ? '#4f46e5' : '#64748b', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            💵 Pay Installment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{ padding: '12px 18px', border: 'none', borderBottom: activeTab === 'history' ? '3px solid #4f46e5' : '3px solid transparent', background: 'transparent', color: activeTab === 'history' ? '#4f46e5' : '#64748b', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📜 Payment History ({paymentHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            style={{ padding: '12px 18px', border: 'none', borderBottom: activeTab === 'receipt' ? '3px solid #4f46e5' : '3px solid transparent', background: 'transparent', color: activeTab === 'receipt' ? '#4f46e5' : '#64748b', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📋 Loan Snapshot & Receipt
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* KPI Summary Cards Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.25rem' }}>
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#4338ca', fontWeight: 700 }}>Original Principal</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#312e81' }}>₹{originalPrincipal.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700 }}>Current Principal</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#78350f' }}>₹{currentPrincipal.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#6d28d9', fontWeight: 700 }}>Interest Accrued</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#4c1d95' }}>₹{interestDue.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: '0.62rem', color: '#7c3aed' }}>({ratePercent}% / mo)</div>
            </div>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 700 }}>Total Due Today</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#064e3b' }}>₹{totalPayableNow.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* TAB 1: PAY INSTALLMENT */}
          {activeTab === 'pay' && (
            <form onSubmit={handlePaySubmit}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>
                  💰 Record Customer Payment
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Payment Type:
                    </label>
                    <select
                      value={paymentType}
                      onChange={e => setPaymentType(e.target.value as any)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', outline: 'none', background: '#fff' }}
                    >
                      <option value="PARTIAL_SETTLEMENT">✨ Interest + Partial Principal (Resets Interest Clock)</option>
                      <option value="INTEREST_ONLY">📅 Interest Only Payment</option>
                      <option value="FULL_CLOSE">🏆 Full Loan Settlement & Closure</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Paying Amount Received (₹):
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 24500"
                      value={payingAmount}
                      onChange={e => setPayingAmount(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #4f46e5', fontSize: '1.1rem', fontWeight: 800, color: '#312e81', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Quick amount suggestion chips */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Quick Select:</span>
                  <button type="button" onClick={() => setPayingAmount(String(interestDue))} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    Only Interest (₹{interestDue})
                  </button>
                  <button type="button" onClick={() => setPayingAmount(String(totalPayableNow))} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    Full Settlement (₹{totalPayableNow})
                  </button>
                </div>

                {/* Live Breakdown Box */}
                {numPay > 0 && (
                  <div style={{ background: '#ffffff', border: '1.5px solid #818cf8', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#4338ca', marginBottom: '0.5rem' }}>
                      📊 Live Payment Breakdown
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span>Interest Cleared:</span>
                      <strong style={{ color: '#059669' }}>-₹{calcInterestComp.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span>Principal Reduced:</span>
                      <strong style={{ color: '#0369a1' }}>-₹{calcPrincipalComp.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '6px 0', color: '#b45309', fontWeight: 800 }}>
                      <span>New Outstanding Principal:</span>
                      <span>₹{calcNewPrincipal.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                      ℹ️ From today onwards, monthly interest of {ratePercent}% will apply on ₹{calcNewPrincipal.toLocaleString('en-IN')} (₹{Math.round(calcNewPrincipal * (ratePercent / 100)).toLocaleString('en-IN')}/month).
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Payment Notes / Remarks (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid in cash at counter, 5 months interest settled"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                >
                  {submitting ? 'Recording...' : '✅ Save Payment & Update Ledger'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PAYMENT HISTORY PASSBOOK */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>
                  📜 Installment Payment Passbook
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Total Interest Paid: <strong style={{ color: '#059669' }}>₹{Number(currentLoan.total_interest_paid || 0).toLocaleString('en-IN')}</strong> | Total Principal Paid: <strong style={{ color: '#0369a1' }}>₹{Number(currentLoan.total_principal_paid || 0).toLocaleString('en-IN')}</strong>
                </span>
              </div>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading history...</div>
              ) : paymentHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  No installment payments recorded yet for this loan.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {paymentHistory.map((p, idx) => (
                    <div key={p.payment_uuid || idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#4f46e5', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                            #{p.installment_number || idx + 1}
                          </span>
                          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>₹{Number(p.payment_transaction_amount ?? p.paying_amount ?? 0).toLocaleString('en-IN')}</strong>
                          <span style={{ fontSize: '0.68rem', background: '#e0e7ff', color: '#3730a3', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                            {p.payment_type}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                          Paid at: {new Date(p.paid_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </div>
                        {p.notes && <div style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>"{p.notes}"</div>}
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.78rem' }}>
                        <div style={{ color: '#059669', fontWeight: 700 }}>
                          Interest Cleared: ₹{Number(p.interest_paying_amount ?? p.interest_component ?? 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ color: '#0369a1', fontWeight: 700 }}>
                          Principal Reduced: ₹{Number(p.principal_paying_amount ?? p.principal_component ?? 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECEIPT SNAPSHOT */}
          {activeTab === 'receipt' && (
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>
                📋 Loan Master Snapshot (receipt_json)
              </h4>
              <div style={{ background: '#0f172a', color: '#38bdf8', borderRadius: '12px', padding: '1rem', fontSize: '0.75rem', fontFamily: 'monospace', maxHeight: '350px', overflowY: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(currentLoan.receipt_json || currentLoan, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
