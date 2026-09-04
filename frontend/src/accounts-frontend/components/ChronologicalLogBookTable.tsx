import React from 'react';

interface ChronologicalLogBookTableProps {
  filteredTimeline: any[];
  kpiDrillFilter: string | null;
  setKpiDrillFilter: (filter: any) => void;
  logSearchTerm: string;
  setLogSearchTerm: (term: string) => void;
  selectedDate: string;
  dateFilterMode: string;
  getISTDateOnly: (dateStr: string) => string;
  formatISTDateTime: (dateStr?: string, fallbackTime?: string) => string;
  setSelectedBillModalItem: (item: any) => void;
}

export const ChronologicalLogBookTable: React.FC<ChronologicalLogBookTableProps> = ({
  filteredTimeline,
  kpiDrillFilter,
  setKpiDrillFilter,
  logSearchTerm,
  setLogSearchTerm,
  selectedDate,
  dateFilterMode,
  getISTDateOnly,
  formatISTDateTime,
  setSelectedBillModalItem,
}) => {
  const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.trim().split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '0.9rem 1.1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      {/* Log Book Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <i className="fa-solid fa-clock-rotate-left" style={{ color: '#0284c7' }}></i>
          Chronological Daily Entry Log ({filteredTimeline.length} Entries)
          {kpiDrillFilter && (
            <span
              onClick={() => setKpiDrillFilter(null)}
              title="Click to clear filter"
              style={{
                fontSize: '0.60rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '5px',
                background: kpiDrillFilter === 'ORDER' ? '#fef3c7' : kpiDrillFilter === 'SELL' ? '#dcfce7' : kpiDrillFilter === 'BUY' ? '#dbeafe' : '#ede9fe',
                color: kpiDrillFilter === 'ORDER' ? '#b45309' : kpiDrillFilter === 'SELL' ? '#15803d' : kpiDrillFilter === 'BUY' ? '#1d4ed8' : '#7e22ce',
                border: '1px solid currentColor',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              Filter: {kpiDrillFilter === 'ORDER' ? '🛍️ Orders' : kpiDrillFilter === 'SELL' ? '🟢 Sells' : kpiDrillFilter === 'BUY' ? '🔵 Buys' : '🟣 Trade-ins'} ✕
            </span>
          )}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Live Search Bar for Chronological Log Book */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by Name..."
              value={logSearchTerm}
              onChange={(e) => setLogSearchTerm(e.target.value)}
              style={{
                padding: '5px 10px 5px 26px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '0.70rem',
                fontWeight: 700,
                outline: 'none',
                width: '220px',
                background: '#ffffff',
              }}
            />
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.65rem' }} />
            {logSearchTerm && (
              <button
                type="button"
                onClick={() => setLogSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>Date: {formatDateDDMMYYYY(selectedDate)}</span>
        </div>
      </div>

      {filteredTimeline.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No transaction entries found for the active search/date filter.</p>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <table className="table-responsive-font" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '8px 8px', fontWeight: 800 }}>S.No</th>
                <th style={{ padding: '8px 8px', fontWeight: 800 }}>Date & Time (IST)</th>
                <th style={{ padding: '8px 8px', fontWeight: 800 }}>JBJ-Type</th>
                <th style={{ padding: '8px 8px', fontWeight: 800 }}>Customer / Details</th>
                <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'right' }}>Net Weight</th>
                <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'right', color: '#15803d' }}>In Hand (₹)</th>
                <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'right' }}>Total Amount (₹)</th>
                <th style={{ padding: '8px 8px', fontWeight: 800, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTimeline.map((item, idx) => {
                const itemDateStr = getISTDateOnly(item.created_at);
                const isMultiDateRangeMode = dateFilterMode === 'ALL' || dateFilterMode === 'CUSTOM';
                const showDateDivider = isMultiDateRangeMode && Boolean(itemDateStr && (idx === 0 || getISTDateOnly(filteredTimeline[idx - 1]?.created_at) !== itemDateStr));

                const rawItemType = (item.type || '').toUpperCase();
                const isOrder = rawItemType === 'ORDER';
                const isSell = rawItemType === 'SELL';
                const isBuy = rawItemType === 'BUY';
                const isExchange = rawItemType === 'EXCHANGE';
                const isSettlement = rawItemType === 'SETTLEMENT' || rawItemType === 'DUE PAYMENT' || rawItemType === 'INSTALLMENT';
                const isInventory = rawItemType === 'INVENTORY';
                const isFinance = rawItemType === 'FINANCE';
                const isKarigar = rawItemType === 'KARIGAR' || rawItemType === 'WORK ASSIGN' || rawItemType === 'WORKER TX';
                const isWorkAssign = rawItemType === 'WORK ASSIGN' || (isKarigar && (item.category === 'ORDER' || item.raw_worker_txn?.order_id || (item.details && item.details.includes('Order #'))));
                const isWorkerTx = isKarigar && !isWorkAssign;

                const displayItemType = isWorkAssign ? 'WORK ASSIGN' : isWorkerTx ? 'WORKER TX' : rawItemType;

                let typeBg = '#f8fafc';
                let typeColor = '#475569';

                if (isOrder) { typeBg = '#fffbe6'; typeColor = '#b45309'; }
                else if (isSell) { typeBg = '#f0fdf4'; typeColor = '#15803d'; }
                else if (isBuy) { typeBg = '#eff6ff'; typeColor = '#1d4ed8'; }
                else if (isExchange) { typeBg = '#faf5ff'; typeColor = '#7e22ce'; }
                else if (isSettlement) { typeBg = '#e0f2fe'; typeColor = '#0369a1'; }
                else if (isInventory) { typeBg = '#fff7ed'; typeColor = '#c2410c'; }
                else if (isFinance) { typeBg = '#ccfbf1'; typeColor = '#0f766e'; }
                else if (isWorkAssign) { typeBg = '#ecfdf5'; typeColor = '#047857'; }
                else if (isWorkerTx) { typeBg = '#f1f5f9'; typeColor = '#334155'; }

                const inHandCash = Number(item.paid_amount || (isFinance ? item.amount : 0));
                const totalBillVal = Number(item.amount || item.paid_amount || 0);

                const isClickableBill = isOrder || isSell || isBuy || isExchange;
                const isDueRemaining = Number(item.due_amount || 0) > 0.01 && (inHandCash < totalBillVal) && item.payment_status !== 'FULL' && item.payment_status !== 'PAID';

                return (
                  <React.Fragment key={item.id || idx}>
                    {showDateDivider && (
                      <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                        <td colSpan={8} style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 800, color: '#334155', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                          📅 {formatDateDDMMYYYY(itemDateStr)}
                        </td>
                      </tr>
                    )}
                    <tr
                      onClick={() => {
                        if (isClickableBill) {
                          setSelectedBillModalItem(item);
                        }
                      }}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: isClickableBill ? 'pointer' : 'default',
                        background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                      }}
                    >
                      <td style={{ padding: '6px 8px', fontWeight: 800, color: '#64748b' }}>#{item.originalSNo || idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '0.7rem', color: '#b45309', whiteSpace: 'nowrap' }}>{formatISTDateTime(item.created_at, item.time)}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ fontSize: '0.54rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: typeBg, color: typeColor, whiteSpace: 'nowrap' }}>
                          {displayItemType}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {item.title}
                          {isKarigar && item.category && (() => {
                            const cat = (item.category || '').toUpperCase();
                            const isGold = cat.includes('GOLD');
                            const isSilver = cat.includes('SILVER');
                            const isCash = cat.includes('CASH');
                            const isCatOrder = cat.includes('ORDER');
                            const cashLink = (item.cash_metal_link || '').toUpperCase();
                            const label = isGold ? '🥇 Gold' : isSilver ? '🥈 Silver'
                              : isCash ? `💵 Cash${cashLink === 'FOR_GOLD' ? ' · For Gold' : cashLink === 'FOR_SILVER' ? ' · For Silver' : cashLink === 'GENERAL_CASH' ? ' · General' : ''}`
                                : isCatOrder ? 'Order Assigned' : cat;
                            const bg = isGold ? '#fffbe6' : isSilver ? '#f8fafc' : isCatOrder ? '#dcfce7' : '#f0fdf4';
                            const color = isGold ? '#b45309' : isSilver ? '#334155' : isCatOrder ? '#15803d' : '#15803d';
                            const border = isGold ? '#fde68a' : isSilver ? '#cbd5e1' : isCatOrder ? '#bbf7d0' : '#bbf7d0';
                            return (
                              <span style={{ fontSize: '0.52rem', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: bg, color, border: `1px solid ${border}` }}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>{item.details}</div>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                        {item.weight_grams > 0 ? `${Number(item.weight_grams).toFixed(3)}g` : '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: isBuy || isFinance ? '#b91c1c' : '#15803d', whiteSpace: 'nowrap' }}>
                        {inHandCash > 0 ? `${isBuy || isFinance ? '-' : ''}₹${inHandCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {totalBillVal > 0 ? `₹${totalBillVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {isInventory ? null : isFinance ? (
                          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', padding: '1px 5px', borderRadius: '4px' }}>
                            DEBT
                          </span>
                        ) : isKarigar ? (
                          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>
                            WEIGHT ACC
                          </span>
                        ) : isSettlement ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <span style={{ fontSize: '0.52rem', fontWeight: 800, color: Number(item.due_amount || 0) <= 0.01 ? '#15803d' : '#0369a1', background: Number(item.due_amount || 0) <= 0.01 ? '#dcfce7' : '#e0f2fe', border: `1px solid ${Number(item.due_amount || 0) <= 0.01 ? '#bbf7d0' : '#bae6fd'}`, padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              {Number(item.due_amount || 0) <= 0.01 ? '✅ DUE CLEARED' : '💵 DUE RECEIVED'}
                            </span>
                            {Number(item.due_amount || 0) > 0.01 && (
                              <span style={{ fontSize: '0.48rem', fontWeight: 700, color: '#b91c1c' }}>
                                DUE: ₹{Number(item.due_amount).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : isOrder ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <span style={{ fontSize: '0.52rem', fontWeight: 800, color: item.submitted === 'yes' ? '#15803d' : '#b45309', background: item.submitted === 'yes' ? '#dcfce7' : '#fef3c7', border: `1px solid ${item.submitted === 'yes' ? '#bbf7d0' : '#fde68a'}`, padding: '1px 5px', borderRadius: '4px' }}>
                              {item.submitted === 'yes' ? '✅ DELIVERED' : '⏳ ORDER TAKEN'}
                            </span>
                            {isDueRemaining && (
                              <span style={{ fontSize: '0.48rem', fontWeight: 700, color: '#b91c1c' }}>
                                DUE: ₹{Number(item.due_amount).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : isDueRemaining ? (
                          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 5px', borderRadius: '4px' }}>
                            PARTIAL PAID
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 5px', borderRadius: '4px' }}>
                            FULL PAID
                          </span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
