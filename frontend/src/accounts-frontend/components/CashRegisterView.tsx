import React from 'react';

interface CashRegisterProps {
  cashSummary: {
    openingCash: number;
    salesCashCollected: number;
    oldDuesCollected: number;
    scrapPayout: number;
    dailyExpenses: number;
    expectedClosingCash: number;
    upiCollected: number;
    cardCollected: number;
  };
  cashLedgerRecords?: any[];
}

export const CashRegisterView: React.FC<CashRegisterProps> = ({ cashSummary, cashLedgerRecords = [] }) => {
  if (!cashSummary) return null;

  // 1. Sort records chronologically in ASCENDING ORDER (earliest first, latest at bottom)
  const sortedAscendingRecords = [...cashLedgerRecords].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  // 2. Calculate running cash balance and totals for IN / OUT
  let runningCash = Number(cashSummary.openingCash || 0);
  let totalCashIn = 0;
  let totalCashOut = 0;

  const processedRows = sortedAscendingRecords.map((tx) => {
    const flow = (tx.flow_type || 'IN').toUpperCase();
    const isOut = flow === 'OUT';
    const totalAmt = Number(tx.transaction_cash_total || tx.amount || 0);

    if (isOut) {
      runningCash -= totalAmt;
      totalCashOut += totalAmt;
    } else {
      runningCash += totalAmt;
      totalCashIn += totalAmt;
    }

    return {
      ...tx,
      flow,
      isOut,
      totalAmt,
      afterTxCash: runningCash,
    };
  });

  const finalAvailableCash = runningCash;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Physical Cash Counter Balance */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <h4 style={{ margin: '0 0 0.85rem 0', color: '#0f172a', fontWeight: 800 }}>💵 Physical Cash Counter Balance</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Opening Cash (9 AM):</span>
              <strong>₹{cashSummary.openingCash.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
              <span>(+) Sales Cash Collected:</span>
              <strong>+₹{cashSummary.salesCashCollected.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
              <span>(+) Old Dues Collected:</span>
              <strong>+₹{cashSummary.oldDuesCollected.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
              <span>(-) Old Metal Purchases Paid:</span>
              <strong>-₹{cashSummary.scrapPayout.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
              <span>(-) Daily Shop Expenses:</span>
              <strong>-₹{cashSummary.dailyExpenses.toLocaleString('en-IN')}</strong>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#0f172a' }}>
              <strong>Expected Closing Cash in Drawer:</strong>
              <strong style={{ color: '#d97706' }}>₹{cashSummary.expectedClosingCash.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Digital & Bank Collections */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <h4 style={{ margin: '0 0 0.85rem 0', color: '#0f172a', fontWeight: 800 }}>💳 Digital & Bank Collection Summary</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
            <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>PhonePe / UPI Collections:</span>
              <strong>₹{cashSummary.upiCollected.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Card POS Terminal Swipes:</span>
              <strong>₹{cashSummary.cardCollected.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Cash Transaction Ledger Table (Chronological Ascending Order) */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-receipt" style={{ color: '#166534' }}></i>
          Cash Counter Register Ledger ({cashLedgerRecords.length} records)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>S.No</th>
                <th style={{ padding: '10px 12px' }}>Date / Time</th>
                <th style={{ padding: '10px 12px' }}>Customer / Party Name</th>
                <th style={{ padding: '10px 12px' }}>Transaction Type</th>
                <th style={{ padding: '10px 12px' }}>Flow Type</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', background: '#f0fdf4', color: '#166534' }}>After Transaction (₹)</th>
                <th style={{ padding: '10px 12px' }}>Metal Type</th>
                <th style={{ padding: '10px 12px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {/* Daily Opening Cash Row at Top */}
              <tr style={{ background: '#f0f9ff', borderBottom: '2px solid #bafdc2ff' }}>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#006d12ff' }}>#0</td>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#006d12ff' }}>Opening (9:00 AM)</td>
                <td style={{ padding: '10px 12px', fontWeight: 800, color: '#006d12ff' }}>Shop Opening Balance</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#006d12ff', border: '1px solid #bae6fd' }}>
                    OPENING BALANCE
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: '#ffffff', color: '#006d12ff', border: '1px solid #bae6fd' }}>
                    START
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#94a3b8' }}>
                  ₹{cashSummary.openingCash.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#006d12ff', fontSize: '0.9rem' }}>
                  ₹{cashSummary.openingCash.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#94a3b8' }}>-</td>
                <td style={{ padding: '10px 12px', color: '#006d12ff', fontWeight: 700 }}>Day Opening Cash Balance in Drawer</td>
              </tr>

              {/* Transactions in Ascending Order with Running Balance */}
              {processedRows.map((tx: any, idx: number) => {
                const txType = (tx.transaction_type || 'GENERAL').toUpperCase();
                const createdStr = tx.created_at
                  ? new Date(tx.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })
                  : '-';

                const partyName = tx.customer_name || tx.notes?.split('·')[0] || tx.item_type || 'Walk-in Customer';

                // Dynamic color styling for Transaction Type
                let typeBg = '#f1f5f9', typeColor = '#475569', typeBorder = '#cbd5e1';
                if (txType === 'ORDER') { typeBg = '#fffbe6'; typeColor = '#b45309'; typeBorder = '#fde68a'; }
                else if (txType === 'SELL') { typeBg = '#f0fdf4'; typeColor = '#15803d'; typeBorder = '#bbf7d0'; }
                else if (txType === 'BUY') { typeBg = '#eff6ff'; typeColor = '#1d4ed8'; typeBorder = '#bfdbfe'; }
                else if (txType === 'EXCHANGE' || txType === 'TRADE_IN') { typeBg = '#faf5ff'; typeColor = '#7e22ce'; typeBorder = '#e9d5ff'; }
                else if (txType === 'FINANCE') { typeBg = '#ccfbf1'; typeColor = '#0f766e'; typeBorder = '#99f6e4'; }
                else if (txType === 'LOADING') { typeBg = '#d1fae5'; typeColor = '#047857'; typeBorder = '#a7f3d0'; }
                else if (txType === 'EXPENSE') { typeBg = '#ffe4e6'; typeColor = '#e11d48'; typeBorder = '#fecdd3'; }

                return (
                  <tr key={tx.uuid || tx.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>{createdStr}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>{partyName}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: typeBg, color: typeColor, border: `1px solid ${typeBorder}` }}>
                        {txType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: tx.isOut ? '#fef2f2' : '#f0fdf4', color: tx.isOut ? '#b91c1c' : '#15803d', border: `1px solid ${tx.isOut ? '#fecaca' : '#bbf7d0'}` }}>
                        {tx.isOut ? '⬆ OUT' : '⬇ IN'}
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: tx.isOut ? '#b91c1c' : '#15803d', whiteSpace: 'nowrap' }}>
                      {tx.isOut ? '-' : '+'}₹{tx.totalAmt.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0f172a', background: '#f8fafc', whiteSpace: 'nowrap' }}>
                      ₹{tx.afterTxCash.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: (tx.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? '#0369a1' : '#b45309' }}>
                      {(tx.metal_type || 'GOLD').toUpperCase()}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>
                      <div style={{ fontWeight: 700 }}>{tx.notes || tx.item_type || '-'}</div>
                      {tx.item_type && tx.notes && tx.item_type !== tx.notes && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{tx.item_type}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer with Whole Transactions Total and Available Balance */}
            <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
              <tr>
                <td colSpan={5} style={{ padding: '12px', textAlign: 'right', fontSize: '0.88rem', color: '#0f172a' }}>
                  📊 TOTAL TRANSACTIONS SUMMARY:
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '0.88rem' }}>
                  <div style={{ color: '#15803d' }}>+₹{totalCashIn.toLocaleString('en-IN')} (⬇ IN)</div>
                  <div style={{ color: '#b91c1c' }}>-₹{totalCashOut.toLocaleString('en-IN')} (⬆ OUT)</div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: '#166534', fontSize: '1.05rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  ₹{finalAvailableCash.toLocaleString('en-IN')}
                </td>
                <td colSpan={2} style={{ padding: '12px', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                  ← FINAL AVAILABLE CASH IN DRAWER
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* EOD Cash Reconciliation Card */}
        <div style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>💵 REGISTER EOD CASH RECONCILIATION</div>
            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', marginTop: '4px' }}>
              Opening Cash: <strong>₹{cashSummary.openingCash.toLocaleString('en-IN')}</strong> · Total Cash IN: <strong style={{ color: '#4ade80' }}>+₹{totalCashIn.toLocaleString('en-IN')}</strong> · Total Cash OUT: <strong style={{ color: '#f87171' }}>-₹{totalCashOut.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700 }}>FINAL AVAILABLE CASH IN DRAWER</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fbbf24' }}>
              ₹{finalAvailableCash.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
