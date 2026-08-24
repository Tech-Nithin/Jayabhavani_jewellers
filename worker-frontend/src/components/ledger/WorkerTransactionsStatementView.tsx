import React, { useState } from 'react';
import { WorkerProfile, WorkerTransaction } from '../../types/worker';

interface Props {
  worker: WorkerProfile;
  transactions: WorkerTransaction[];
  onBack: () => void;
  onPreviewImage: (url: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const WorkerTransactionsStatementView: React.FC<Props> = ({
  transactions,
  onBack,
  onPreviewImage,
  onRefresh,
  isRefreshing = false,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'CASH'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'OUTGOING' | 'INCOMING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Net Balances
  let netGoldPure = 0;
  let netSilverPure = 0;
  let netCash = 0;

  for (const t of transactions) {
    if (t.is_deleted) continue;
    const isOut = t.direction === 'OUTGOING'; // Store gave to worker
    const factor = isOut ? 1 : -1;

    if (t.category === 'GOLD' && t.weight_grams) {
      const pure = (Number(t.weight_grams) * (Number(t.touch_percentage) || 100)) / 100;
      netGoldPure += pure * factor;
    } else if (t.category === 'SILVER' && t.weight_grams) {
      const pure = (Number(t.weight_grams) * (Number(t.touch_percentage) || 100)) / 100;
      netSilverPure += pure * factor;
    } else if (t.category === 'CASH' && t.amount_cash) {
      netCash += Number(t.amount_cash) * factor;
    }
  }

  // Filter transactions strictly for real Metal (Gold/Silver) and Cash entries
  const filteredTx = transactions.filter((t) => {
    if (t.is_deleted) return false;

    // Strict ledger check: Must be GOLD, SILVER, or CASH with valid weight or cash amount
    const isGoldOrSilver = (t.category === 'GOLD' || t.category === 'SILVER') && Number(t.weight_grams) > 0;
    const isCash = t.category === 'CASH' && Number(t.amount_cash) > 0;
    if (!isGoldOrSilver && !isCash) return false;

    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (directionFilter !== 'ALL' && t.direction !== directionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNotes = (t.notes || '').toLowerCase().includes(q);
      const matchItem = (t.item_name || '').toLowerCase().includes(q);
      const matchId = (t.id || '').toLowerCase().includes(q);
      return matchNotes || matchItem || matchId;
    }
    return true;
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden', fontSize: '0.74rem' }}>
      {/* Top Header Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: '#ffffff',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>📊 Transaction Statement</h2>
            <p style={{ margin: 0, fontSize: '0.60rem', color: '#bfdbfe' }}>
              Ledger Table ({filteredTx.length} Metal & Cash Records)
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh transactions from database"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className={`fa-solid fa-rotate-right ${isRefreshing ? 'fa-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Net Balance Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', padding: '8px 12px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ background: '#fffbe8', padding: '6px 8px', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <span style={{ fontSize: '0.50rem', fontWeight: 800, color: '#92400e', display: 'block' }}>PURE GOLD</span>
          <strong style={{ fontSize: '0.74rem', color: '#b45309' }}>{netGoldPure.toFixed(3)} g</strong>
          <span style={{ fontSize: '0.50rem', color: '#78350f', display: 'block', marginTop: '1px' }}>
            {netGoldPure >= 0 ? '(With Worker)' : '(Due)'}
          </span>
        </div>

        <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <span style={{ fontSize: '0.50rem', fontWeight: 800, color: '#475569', display: 'block' }}>PURE SILVER</span>
          <strong style={{ fontSize: '0.74rem', color: '#334155' }}>{netSilverPure.toFixed(3)} g</strong>
          <span style={{ fontSize: '0.50rem', color: '#475569', display: 'block', marginTop: '1px' }}>
            {netSilverPure >= 0 ? '(With Worker)' : '(Due)'}
          </span>
        </div>

        <div style={{ background: '#f0fdf4', padding: '6px 8px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.50rem', fontWeight: 800, color: '#166534', display: 'block' }}>CASH</span>
          <strong style={{ fontSize: '0.74rem', color: '#15803d' }}>₹{netCash.toLocaleString('en-IN')}</strong>
          <span style={{ fontSize: '0.50rem', color: '#166534', display: 'block', marginTop: '1px' }}>
            {netCash >= 0 ? '(With Worker)' : '(Due)'}
          </span>
        </div>
      </div>

      {/* Filter Controls & Search */}
      <div style={{ background: '#ffffff', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <i
            className="fa-solid fa-magnifying-glass"
            style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.68rem' }}
          />
          <input
            type="text"
            placeholder="Search transactions by item or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px 5px 26px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.72rem',
              outline: 'none',
              background: '#f8fafc',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(['ALL', 'GOLD', 'SILVER', 'CASH'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '3px 8px',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '5px',
                border: categoryFilter === cat ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: categoryFilter === cat ? '#eff6ff' : '#ffffff',
                color: categoryFilter === cat ? '#1d4ed8' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat === 'ALL' ? 'All' : cat === 'GOLD' ? 'Gold' : cat === 'SILVER' ? 'Silver' : 'Cash'}
            </button>
          ))}

          <span style={{ borderRight: '1px solid #e2e8f0', margin: '0 2px' }} />

          {(['ALL', 'OUTGOING', 'INCOMING'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => setDirectionFilter(dir)}
              style={{
                padding: '3px 8px',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '5px',
                border: directionFilter === dir ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: directionFilter === dir ? '#0f172a' : '#ffffff',
                color: directionFilter === dir ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {dir === 'ALL' ? 'All' : dir === 'OUTGOING' ? '↑ Given' : '↓ Returned'}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABULAR TRANSACTIONS LEDGER ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {filteredTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 12px', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📋</div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem' }}>No transactions found</div>
            <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
              No entries match the active filter.
            </div>
          </div>
        ) : (
          <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem', textAlign: 'left', minWidth: '580px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontSize: '0.60rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Time</th>
                    <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Metal / Cash</th>
                    <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Purpose</th>
                    <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Weight</th>
                    <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Tounch</th>
                    <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Pure</th>
                    <th style={{ padding: '6px 8px', minWidth: '110px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((t, idx) => {
                    const isOut = t.direction === 'OUTGOING';
                    const isCash = t.category === 'CASH';
                    const isGold = t.category === 'GOLD';
                    const isSilver = t.category === 'SILVER';

                    const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                    const timeStr = t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    const grossWt = Number(t.weight_grams || 0);
                    const touch = Number(t.touch_percentage || 100);
                    const pureWt = (grossWt * touch) / 100;
                    const cashAmount = Number(t.amount_cash || 0);
                    const rate = Number(t.applied_rate_per_gram || 0);
                    const eqPure = isCash && rate > 0 ? cashAmount / rate : 0;

                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

                    return (
                      <tr
                        key={t.id}
                        style={{
                          background: rowBg,
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.12s ease',
                        }}
                      >
                        {/* 1. Time */}
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{dateStr}</div>
                          <div style={{ fontSize: '0.58rem', color: '#64748b' }}>{timeStr}</div>
                        </td>

                        {/* 2. Metal / Cash & Direction */}
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span
                              style={{
                                fontSize: '0.54rem',
                                fontWeight: 800,
                                padding: '1px 4px',
                                borderRadius: '3px',
                                background: isOut ? '#fef3c7' : '#dcfce7',
                                color: isOut ? '#92400e' : '#15803d',
                                border: isOut ? '1px solid #fde68a' : '1px solid #bbf7d0',
                              }}
                            >
                              {isOut ? '↑ Given' : '↓ Returned'}
                            </span>
                            <strong style={{ color: isGold ? '#b45309' : isSilver ? '#475569' : '#15803d' }}>
                              {isGold ? 'Gold' : isSilver ? 'Silver' : 'Cash'}
                            </strong>
                          </div>
                        </td>

                        {/* 3. Purpose */}
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.item_name
                              ? isOut
                                ? t.item_name.toLowerCase().startsWith('for ')
                                  ? t.item_name
                                  : `For ${t.item_name}`
                                : t.item_name.toLowerCase().startsWith('for ')
                                ? t.item_name.slice(4)
                                : t.item_name
                              : '-'}
                          </div>
                          {isCash && t.cash_metal_link && (
                            <div style={{ fontSize: '0.56rem', color: '#166534', fontWeight: 600 }}>
                              {t.cash_metal_link === 'FOR_GOLD' ? 'For Gold' : t.cash_metal_link === 'FOR_SILVER' ? 'For Silver' : 'General'}
                            </div>
                          )}
                        </td>

                        {/* 4. Weight */}
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          {isCash ? (
                            <strong style={{ color: '#15803d' }}>
                              ₹{cashAmount.toLocaleString('en-IN')}
                            </strong>
                          ) : (
                            <strong style={{ color: '#0f172a' }}>
                              {grossWt.toFixed(3)}g
                            </strong>
                          )}
                        </td>

                        {/* 5. Tounch */}
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          {isCash ? (
                            rate > 0 ? (
                              <span style={{ fontSize: '0.62rem', color: '#475569' }}>
                                @₹{rate}/g
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )
                          ) : (
                            <span style={{ fontWeight: 700, color: '#d97706' }}>
                              {touch}%
                            </span>
                          )}
                        </td>

                        {/* 6. Pure */}
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          {isCash ? (
                            eqPure > 0 ? (
                              <strong style={{ color: '#15803d' }}>
                                {eqPure.toFixed(3)}g
                              </strong>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )
                          ) : (
                            <strong style={{ color: '#15803d' }}>
                              {pureWt.toFixed(3)}g
                            </strong>
                          )}
                        </td>

                        {/* 7. Notes */}
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ color: '#475569', fontSize: '0.64rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.notes ? `"${t.notes}"` : '-'}
                            </span>

                            {t.photos && t.photos.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onPreviewImage(t.photos[0])}
                                style={{
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  fontSize: '0.56rem',
                                  fontWeight: 700,
                                  color: '#2563eb',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  flexShrink: 0,
                                }}
                              >
                                <i className="fa-solid fa-image" /> {t.photos.length}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
