import React, { useState, useEffect } from 'react';
import type { Language } from '../../utils/translations';

interface CashHistoryRow {
  cash_history_uuid: string;
  date: string;
  no_of_transactions: number;
  current_cash: number;
  loaded_cash: number;
  total_cash: number;
  created_at: string;
}

interface CashLedgerItem {
  uuid: string;
  cash_history_uuid: string;
  transaction_id: string | null;
  transaction_type: string;
  flow_type: 'IN' | 'OUT';
  transaction_cash_total: number;
  metal_type: string;
  item_type: string;
  notes: string | null;
  created_at: string;
}

interface CashHistoryTableViewProps {
  onOpenLoadCash: () => void;
  lang?: Language;
}

// Format timestamp to DD-MM-YYYY hh:mm:ss AM/PM (12-hour format)
const formatDateTime = (dateStr: string | null | undefined, fallbackDate?: string): string => {
  if (!dateStr && !fallbackDate) return '—';
  try {
    const targetStr = dateStr || fallbackDate || '';
    const d = new Date(targetStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      let hours = d.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // '0' becomes '12'
      const hh = String(hours).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss} ${ampm}`;
    }
    // If pure YYYY-MM-DD
    const parts = targetStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return targetStr;
  } catch {
    return dateStr || fallbackDate || '—';
  }
};

export const CashHistoryTableView: React.FC<CashHistoryTableViewProps> = ({
  onOpenLoadCash,
}) => {
  const [historyList, setHistoryList] = useState<CashHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCash, setCurrentCash] = useState<number>(0);
  const [todayLoadedCash, setTodayLoadedCash] = useState<number>(0);
  const [todayTransactions, setTodayTransactions] = useState<number>(0);

  // Drilldown state: expanded cash_history_uuid
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);
  const [transactionsMap, setTransactionsMap] = useState<Record<string, CashLedgerItem[]>>({});
  const [loadingTxns, setLoadingTxns] = useState<Record<string, boolean>>({});

  const API_BASE = (window as any).__JBJ_API_BASE__ || '/api';

  const fetchStatus = async () => {
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

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/cash/history`);
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistoryList(data.history);
      }
    } catch (err) {
      console.error('Error fetching cash history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHistory();
  }, []);

  const toggleDrilldown = async (uuid: string) => {
    if (expandedUuid === uuid) {
      setExpandedUuid(null);
      return;
    }

    setExpandedUuid(uuid);

    if (!transactionsMap[uuid]) {
      setLoadingTxns((prev) => ({ ...prev, [uuid]: true }));
      try {
        const res = await fetch(`${API_BASE}/inventory/cash/transactions/${uuid}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactionsMap((prev) => ({ ...prev, [uuid]: data.transactions }));
        }
      } catch (err) {
        console.error('Error fetching transactions for cash history row:', err);
      } finally {
        setLoadingTxns((prev) => ({ ...prev, [uuid]: false }));
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Cash KPI Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #bbf7d0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            💵 Live Cash in Drawer
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
            ₹{currentCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>
            Real-time active drawer balance
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #bfdbfe', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📥 Today's Loaded Cash
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1d4ed8', marginTop: '4px' }}>
            +₹{todayLoadedCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#1e40af', marginTop: '2px' }}>
            {todayTransactions} total transactions recorded today
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📜 Recorded Ledger Days
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {historyList.length} {historyList.length === 1 ? 'Day' : 'Days'}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLoadCash}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
            }}
          >
            <i className="fa-solid fa-plus-circle"></i> Load Cash
          </button>
        </div>
      </div>

      {/* Daily Cash History Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: '#16a34a' }}></i>
              Daily Cash Flow & Historical Ledger
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Click on any day's row to drill down into its individual transactions (Sales, Scrap Buys, Orders, Loans, Loads).
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchStatus();
              fetchHistory();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#16a34a', marginBottom: '8px' }}></i>
            <div>Loading cash history...</div>
          </div>
        ) : historyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
            <i className="fa-solid fa-receipt" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '10px' }}></i>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>No cash history records yet</div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              Click "Load Cash" above to initialize today's cash drawer balance.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Total Transactions</th>
                  <th style={{ padding: '12px 16px' }}>Current Cash</th>
                  <th style={{ padding: '12px 16px' }}>Loaded Cash</th>
                  <th style={{ padding: '12px 16px' }}>Total Cash (Closing)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((row) => {
                  const isExpanded = expandedUuid === row.cash_history_uuid;
                  const txns = transactionsMap[row.cash_history_uuid] || [];
                  const isTxnLoading = loadingTxns[row.cash_history_uuid];

                  return (
                    <React.Fragment key={row.cash_history_uuid}>
                      <tr
                        onClick={() => toggleDrilldown(row.cash_history_uuid)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          background: isExpanded ? '#f0fdf4' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* 1. Date */}
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a' }}>
                          📅 {formatDateTime(row.created_at, row.date)}
                        </td>

                        {/* 2. Total Transactions */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>
                            {row.no_of_transactions} {row.no_of_transactions === 1 ? 'txn' : 'txns'}
                          </span>
                        </td>

                        {/* 3. Current Cash */}
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#334155' }}>
                          ₹{row.current_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* 4. Loaded Cash */}
                        <td style={{ padding: '12px 16px' }}>
                          {row.loaded_cash > 0 ? (
                            <span style={{ color: '#16a34a', fontWeight: 800, background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                              +₹{row.loaded_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>₹0.00</span>
                          )}
                        </td>

                        {/* 5. Total Cash */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', background: '#fef3c7', padding: '3px 10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                            ₹{row.total_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* 6. Drilldown toggle */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDrilldown(row.cash_history_uuid);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: isExpanded ? '#15803d' : '#ffffff',
                              color: isExpanded ? '#ffffff' : '#334155',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-list-ul'}`}></i>
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Transactions Drilldown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: '0 16px 16px 16px', background: '#f0fdf4', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1.5px solid #86efac', padding: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-solid fa-list-check"></i>
                                Individual Transactions ({txns.length} records)
                              </div>

                              {isTxnLoading ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
                                  <i className="fa-solid fa-spinner fa-spin"></i> Loading transactions...
                                </div>
                              ) : txns.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.8rem' }}>
                                  No transaction details logged for this day yet.
                                </div>
                              ) : (
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                                        <th style={{ padding: '6px 10px' }}>#</th>
                                        <th style={{ padding: '6px 10px' }}>Date & Time</th>
                                        <th style={{ padding: '6px 10px' }}>Type</th>
                                        <th style={{ padding: '6px 10px' }}>Flow</th>
                                        <th style={{ padding: '6px 10px' }}>Amount</th>
                                        <th style={{ padding: '6px 10px' }}>Item / Description</th>
                                        <th style={{ padding: '6px 10px' }}>Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {txns.map((t, idx) => (
                                        <tr key={t.uuid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                                          <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            📅 {formatDateTime(t.created_at)}
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <span style={{ fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                                              {t.transaction_type}
                                            </span>
                                          </td>
                                          <td style={{ padding: '6px 10px' }}>
                                            <span style={{ fontWeight: 800, color: t.flow_type === 'IN' ? '#16a34a' : '#dc2626' }}>
                                              {t.flow_type === 'IN' ? '➕ IN' : '➖ OUT'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '6px 10px', fontWeight: 800, color: t.flow_type === 'IN' ? '#15803d' : '#b91c1c' }}>
                                            {t.flow_type === 'IN' ? '+' : '-'}₹{Number(t.transaction_cash_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </td>
                                          <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600 }}>
                                            {t.item_type || t.transaction_type}
                                          </td>
                                          <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                            {t.notes || '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
