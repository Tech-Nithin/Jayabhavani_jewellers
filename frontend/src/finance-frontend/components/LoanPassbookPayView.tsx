import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/apiConfig';
import type { LoanRecord, LoanPayment, MetalRates } from '../types';
import { getFinanceTranslation, type Language } from '../financeTranslations';
import { FinanceReceiptView } from './FinanceReceiptView';

interface LoanPassbookPayViewProps {
  loan: LoanRecord;
  metalRates: MetalRates;
  lang?: Language;
  onBack: () => void;
  onPaymentSuccess: () => void;
}

export const LoanPassbookPayView: React.FC<LoanPassbookPayViewProps> = ({
  loan,
  metalRates,
  lang = 'EN',
  onBack,
  onPaymentSuccess,
}) => {
  const t = getFinanceTranslation(lang);
  const [liveLoan, setLiveLoan] = useState<LoanRecord>(loan);
  const [paymentHistory, setPaymentHistory] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State — Default pre-fills: Principal = currentPrincipal, Interest = calculated interest
  const [interestPayingInput, setInterestPayingInput] = useState<string>('');
  const [principalPayingInput, setPrincipalPayingInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loanUuid = loan.finance_uuid || loan.id;

  const fetchDetails = async () => {
    if (!loanUuid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/finance/${loanUuid}`);
      const data = await res.json();
      if (data.success && data.loan) {
        setLiveLoan(data.loan);
        setPaymentHistory(data.payment_history || []);
        const curP = Number(data.loan.current_principal ?? data.loan.amount ?? 0);
        const intD = Number(data.loan.current_interest_due ?? data.loan.month_wise_interest ?? 0);
        setInterestPayingInput(String(intD));
        setPrincipalPayingInput(String(curP));
      }
    } catch (err) {
      console.error('Failed to fetch loan details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [loanUuid]);

  // Derived Financials
  const isCash = (liveLoan.debt_category || liveLoan.item_metal_type || '').toUpperCase() === 'CASH';
  const originalPrincipal = Number(liveLoan.customer_debt_money ?? liveLoan.amount ?? 0);
  const currentPrincipal = Number(liveLoan.current_principal ?? liveLoan.amount ?? 0);
  const interestRate = Number(liveLoan.interest_rate_percent || 1.5);
  const interestDue = Number(liveLoan.current_interest_due ?? liveLoan.month_wise_interest ?? 0);
  const totalPayableNow = Number((currentPrincipal + interestDue).toFixed(2));

  // Live Auto-Detection of Payment Mode & Total Amount
  const numInterestPaying = Number(interestPayingInput) || 0;
  const numPrincipalPaying = Number(principalPayingInput) || 0;
  const totalTransactionPay = Number((numInterestPaying + numPrincipalPaying).toFixed(2));

  let autoPaymentMode: 'FULL_CLOSE' | 'INTEREST_ONLY' | 'PARTIAL_SETTLEMENT' = 'PARTIAL_SETTLEMENT';
  if (numPrincipalPaying >= currentPrincipal && currentPrincipal > 0) {
    autoPaymentMode = 'FULL_CLOSE';
  } else if (numPrincipalPaying === 0) {
    autoPaymentMode = 'INTEREST_ONLY';
  } else {
    autoPaymentMode = 'PARTIAL_SETTLEMENT';
  }

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalTransactionPay || totalTransactionPay <= 0) {
      alert('⚠️ Please enter a valid payment amount (greater than ₹0).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/finance/${loanUuid}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_transaction_amount: totalTransactionPay,
          paying_amount: totalTransactionPay,
          interest_paying_amount: numInterestPaying,
          principal_paying_amount: numPrincipalPaying,
          payment_type: autoPaymentMode,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Payment of ₹${totalTransactionPay.toLocaleString('en-IN')} recorded successfully!`);
        setNotes('');
        await fetchDetails();
        onPaymentSuccess();
      } else {
        alert('❌ Payment failed: ' + (data.message || 'Error recording payment'));
      }
    } catch (err: any) {
      alert('❌ Server error recording payment: ' + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1rem 1.25rem', fontFamily: "'Inter', sans-serif" }}>
      {/* ── TOP HEADER ACTION BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <i className="fa-solid fa-arrow-left"></i> {t.backToLoansBtn}
          </button>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t.passbookScreenTitle}
              <span style={{ fontSize: '0.72rem', background: isCash ? '#ecfdf5' : '#fffbeb', color: isCash ? '#047857' : '#b45309', border: isCash ? '1px solid #a7f3d0' : '1px solid #fde68a', padding: '3px 9px', borderRadius: '6px', fontWeight: 800 }}>
                {isCash ? t.cashLoanBadge : (liveLoan.item_metal_type?.toUpperCase() === 'SILVER' ? t.silverLoanBadge : t.goldLoanBadge)}
              </span>
            </h2>
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
              {liveLoan.customer_name} {liveLoan.customer_surname} ({liveLoan.customer_phone})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDetails}
          style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i> {t.refreshBtn}
        </button>
      </div>

      {/* ── TWO-COLUMN DUAL GRID: LEFT 70% PASSBOOK HUB | RIGHT 30% LIVE RECEIPT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '1.25rem', alignItems: 'start' }}>

        {/* LEFT COLUMN (70%): FINANCIAL CARDS, PAYMENT FORM, PASSBOOK TABLE */}
        <div>
          {/* 1. KEY FINANCIAL SUMMARY CARDS (4 CARDS) */}
          {(() => {
            const totalPrincipalPaid = Number(liveLoan.total_principal_paid || Math.max(0, originalPrincipal - currentPrincipal));
            const totalInterestPaid = Number(liveLoan.total_interest_paid || 0);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.15rem' }}>
                {/* 1st Card: Total Payable Amount */}
                <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '10px', padding: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', display: 'block' }}>{t.totalPayableAmountCard}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#6d28d9' }}>₹{totalPayableNow.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: '0.65rem', color: '#6d28d9', fontWeight: 700, display: 'block', marginTop: '3px' }}>
                    ({t.principalAmountLabel.replace(/[\(₹\)\*]/g, '').trim()} ₹{currentPrincipal.toLocaleString('en-IN')} + {t.calculatedDueText.replace(':', '')} ₹{interestDue.toLocaleString('en-IN')})
                  </span>
                </div>

                {/* 2nd Card: Total Interest Paid Till Today */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', display: 'block' }}>{t.totalInterestPaidCard}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a' }}>₹{totalInterestPaid.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 700, display: 'block', marginTop: '3px' }}>
                    {t.ratePerMonthText} {interestRate}% (₹{Math.round(currentPrincipal * (interestRate / 100)).toLocaleString('en-IN')}/{t.perMonthText})
                  </span>
                </div>

                {/* 3rd Card: Total Principal Amount Paid */}
                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '10px', padding: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', display: 'block' }}>{t.totalPrincipalPaidCard}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0284c7' }}>₹{totalPrincipalPaid.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: '0.65rem', color: '#0369a1', fontWeight: 700, display: 'block', marginTop: '3px' }}>
                    {t.initialPrincipalText} ₹{originalPrincipal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* 4th Card: Empty Card */}
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>{t.emptyCardText}</span>
                </div>
              </div>
            );
          })()}

          {/* 2. MAKE INSTALLMENT PAYMENT FORM CARD */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.15rem', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-cash-register" style={{ color: '#10b981' }}></i> {t.receiveInstallmentTitle}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#6366f1', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                {t.estimatedMonthlyInterest} ₹{Math.round(currentPrincipal * (interestRate / 100)).toLocaleString('en-IN')} ({interestRate}%)
              </span>
            </div>

            <form onSubmit={handlePaySubmit}>
              {/* THREE COLUMNS: 1. PRINCIPAL AMOUNT PAYING | 2. INTEREST AMOUNT PAYING | 3. TOTAL AGGREGATION AMOUNT */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1rem' }}>
                {/* Field 1 (FIRST): Principal Amount Paying — ORANGE THEME */}
                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#b45309', marginBottom: '4px' }}>
                    {t.principalPayingField}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000 or 0"
                    value={principalPayingInput}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={e => setPrincipalPayingInput(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '2px solid #f59e0b', fontSize: '1.1rem', fontWeight: 900, color: '#d97706', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setPrincipalPayingInput(String(currentPrincipal))}
                      style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a', background: '#ffffff', color: '#b45309', fontSize: '0.64rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {t.fullPrincipalBtn} (₹{currentPrincipal.toLocaleString('en-IN')})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrincipalPayingInput('0')}
                      style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', fontSize: '0.64rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {t.zeroBtn}
                    </button>
                  </div>
                </div>

                {/* Field 2 (SECOND): Interest Amount Paying */}
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#15803d', marginBottom: '4px' }}>
                    {t.interestPayingField}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 300"
                    value={interestPayingInput}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={e => setInterestPayingInput(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '2px solid #16a34a', fontSize: '1.1rem', fontWeight: 900, color: '#15803d', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                    <span>{t.calculatedDueText} <strong>₹{interestDue.toLocaleString('en-IN')}</strong></span>
                    <button
                      type="button"
                      onClick={() => setInterestPayingInput(String(interestDue))}
                      style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', background: '#ffffff', color: '#16a34a', fontSize: '0.64rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {t.fillDueBtn}
                    </button>
                  </div>
                </div>

                {/* Field 3 (THIRD - BESIDE): Total Aggregation Amount */}
                <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '10px', padding: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', display: 'block' }}>
                      {t.totalAggregationField}
                    </span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#6d28d9', display: 'block', marginTop: '4px' }}>
                      ₹{totalTransactionPay.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 700, display: 'block', marginTop: '4px' }}>
                    ({t.principalAmountLabel.replace(/[\(₹\)\*]/g, '').trim()} ₹{numPrincipalPaying.toLocaleString('en-IN')} + {t.monthlyRateCol} ₹{numInterestPaying.toLocaleString('en-IN')})
                  </span>
                </div>
              </div>

              {/* ROW 2: NOTES & SAVE BUTTON */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    {t.notesField}
                  </label>
                  <input
                    type="text"
                    placeholder={t.notesPlaceholder}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', fontWeight: 900, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)', marginTop: '18px' }}
                  >
                    {submitting ? t.recordingPaymentBtn : `✅ ${t.recordPaymentBtn} (₹${totalTransactionPay.toLocaleString('en-IN')})`}
                  </button>
                </div>
              </div>

              {/* LIVE FINANCIAL IMPACT SUMMARY */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem', marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.78rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-calculator"></i> {t.liveFinancialImpactTitle}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: '#475569', display: 'block', fontSize: '0.68rem' }}>{t.totalPayingNowText}</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>₹{totalTransactionPay.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#475569', display: 'block', fontSize: '0.68rem' }}>{t.interestPortionText}</span>
                    <strong style={{ color: '#16a34a', fontSize: '0.88rem' }}>₹{numInterestPaying.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#475569', display: 'block', fontSize: '0.68rem' }}>{t.principalPortionText}</span>
                    <strong style={{ color: '#0284c7', fontSize: '0.88rem' }}>₹{numPrincipalPaying.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#475569', display: 'block', fontSize: '0.68rem' }}>{t.newOutstandingPrincipalText}</span>
                    <strong style={{ color: '#b45309', fontSize: '0.88rem' }}>
                      ₹{Math.max(0, currentPrincipal - numPrincipalPaying).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
                {Math.max(0, interestDue - numInterestPaying) > 0 && (
                  <div style={{ fontSize: '0.70rem', color: '#c2410c', marginTop: '6px', fontWeight: 700, borderTop: '1px dotted #fdba74', paddingTop: '4px' }}>
                    ⚠️ Remaining unpaid interest shortfall of <strong>₹{Math.max(0, interestDue - numInterestPaying).toLocaleString('en-IN')}</strong> will carry over in <code>any_balance</code>.
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* 3. FULL PASSBOOK PAYMENT HISTORY LOG TABLE */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.15rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
              📜 {t.passbookHistoryTitle} ({paymentHistory.length})
            </h4>

            {paymentHistory.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.82rem' }}>
                {t.noInstallmentsText}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 800, textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>#</th>
                      <th style={{ padding: '8px 10px' }}>{t.paidDateCol}</th>
                      <th style={{ padding: '8px 10px' }}>{t.paymentModeCol}</th>
                      <th style={{ padding: '8px 10px' }}>{t.totalPayingCol}</th>
                      <th style={{ padding: '8px 10px' }}>{t.interestPayingCol}</th>
                      <th style={{ padding: '8px 10px' }}>{t.principalPayingCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((p, idx) => {
                      const totPay = Number(p.payment_transaction_amount ?? p.paying_amount ?? p.amount ?? 0);
                      const intPay = Number(p.interest_paying_amount ?? p.interest_component ?? 0);
                      const prinPay = Number(p.principal_paying_amount ?? p.principal_component ?? 0);

                      return (
                        <tr key={p.payment_uuid || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 800, color: '#4f46e5' }}>#{p.installment_number || idx + 1}</td>
                          <td style={{ padding: '8px 10px', color: '#334155', fontWeight: 600 }}>
                            {new Date(p.paid_at || (p as any).created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: p.payment_type === 'FULL_CLOSE' ? '#f3e8ff' : (p.payment_type === 'INTEREST_ONLY' ? '#ecfdf5' : '#e0e7ff'), color: p.payment_type === 'FULL_CLOSE' ? '#6b21a8' : (p.payment_type === 'INTEREST_ONLY' ? '#047857' : '#3730a3'), fontSize: '0.66rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                              {p.payment_type}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 900, color: '#0f172a' }}>₹{totPay.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 800, color: '#059669' }}>₹{intPay.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 800, color: '#0369a1' }}>₹{prinPay.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (30% STICKY): REAL-TIME LIVE THERMAL RECEIPT */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <FinanceReceiptView
            lang={lang}
            data={{
              customer_name: liveLoan.customer_name || '',
              customer_phone: liveLoan.customer_phone || '',
              customer_address: liveLoan.customer_address,
              item_metal_type: (liveLoan.debt_category || liveLoan.item_metal_type || 'GOLD').toUpperCase() as any,
              item_name: liveLoan.item_name || 'Ornament',
              item_weight_grams: Number(liveLoan.item_weight_grams ?? liveLoan.item_weight ?? 0),
              item_deduction_name: liveLoan.item_deduction_name,
              item_deduction_weight: Number(liveLoan.item_deduction_weight_grams ?? liveLoan.item_deduction_weight ?? 0),
              item_purity_percent: Number(liveLoan.item_purity_percent ?? liveLoan.touch ?? 91.6),
              pure_metal_weight: Number(liveLoan.pure_metal_weight ?? 0),
              metal_value_per_gram: Number(liveLoan.metal_value_per_gram ?? (liveLoan.item_metal_type?.toUpperCase() === 'SILVER' ? (metalRates.silver_rate_per_gram || 250) : (metalRates.gold_rate_per_gram || 15000))),
              total_value_of_item: Number(liveLoan.total_value_of_item ?? 0),
              item_image_url: liveLoan.item_image_url,
              amount: Number(liveLoan.customer_debt_money ?? liveLoan.amount ?? 0),
              interest_rate_percent: Number(liveLoan.interest_rate_percent || 1.5),
              timeline_months: Number(liveLoan.timeline_months || 3),
              loan_date: liveLoan.debt_date || liveLoan.loan_date || new Date().toISOString().split('T')[0],
              current_principal: Number(liveLoan.current_principal ?? liveLoan.amount ?? 0),
              total_interest_paid: Number(liveLoan.total_interest_paid || 0),
              total_principal_paid: Number(liveLoan.total_principal_paid || 0),
              payment_history: paymentHistory,
              receipt_json: liveLoan.receipt_json,
            }}
          />
        </div>
      </div>
    </div>
  );
};
