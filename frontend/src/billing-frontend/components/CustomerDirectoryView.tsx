import React, { useState, useEffect } from 'react';
import type { CustomerDirectoryRecord, GlobalRates } from '../types';
import { SeeBillModal } from './SeeBillModal';
import { CustomCalendarPicker } from './CustomCalendarPicker';

interface CustomerDirectoryViewProps {
  customers: CustomerDirectoryRecord[];
  rates: GlobalRates | null;
  formatDate: (date?: string) => string;
  onBackToPOS?: () => void;
  onSelectCustomerForBill: (name: string, phone: string) => void;
  onEditCustomerRecord?: (cust: CustomerDirectoryRecord) => void;
  onViewInvoiceDetails?: (cust: CustomerDirectoryRecord) => void;
}

export const CustomerDirectoryView: React.FC<CustomerDirectoryViewProps> = ({
  customers,
  rates,
  formatDate,
  onBackToPOS,
  onSelectCustomerForBill,
  onEditCustomerRecord,
  onViewInvoiceDetails,
}) => {
  const [search, setSearch] = useState(() => {
    return new URLSearchParams(window.location.search).get('search') || '';
  });

  const [historyTab, setHistoryTab] = useState<'ALL' | 'SELL' | 'BUY' | 'EXCHANGE'>(() => {
    const params = new URLSearchParams(window.location.search);
    const histParam = (params.get('history') || params.get('tab') || '').toUpperCase();
    if (histParam === 'SELL' || histParam === 'BUY' || histParam === 'EXCHANGE') return histParam;
    return 'ALL';
  });

  const [startDate, setStartDate] = useState(() => {
    return new URLSearchParams(window.location.search).get('from') || '';
  });

  const [endDate, setEndDate] = useState(() => {
    return new URLSearchParams(window.location.search).get('to') || '';
  });

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDirectoryRecord | null>(null);
  const [openCalendarTarget, setOpenCalendarTarget] = useState<'FROM' | 'TO' | null>(null);
  const [activeKpiFilter, setActiveKpiFilter] = useState<null | 'GOLD_SELL' | 'GOLD_BUY' | 'SILVER_SELL' | 'SILVER_BUY'>(null);

  // Sync state changes to URL query parameters in real-time
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('module', 'billing');
    params.delete('mode');

    params.set('history', historyTab.toLowerCase());

    if (search.trim()) params.set('search', search.trim());
    else params.delete('search');

    if (startDate) params.set('from', startDate);
    else params.delete('from');

    if (endDate) params.set('to', endDate);
    else params.delete('to');

    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [historyTab, search, startDate, endDate]);

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const formatDateTimeStacked = (isoString?: string) => {
    if (!isoString) return { dateStr: '-', timeStr: '' };
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { dateStr: formatDate(isoString) || isoString, timeStr: '' };

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return { dateStr, timeStr };
  };

  const getCustomerMode = (cust: CustomerDirectoryRecord): 'SELL' | 'BUY' | 'EXCHANGE' => {
    const inv = cust.latestInvoice;
    const jsonMode = inv?.receipt_json_data?.transaction_type;
    const invMode = inv?.transaction_type;
    const rawMode = (jsonMode || invMode || 'SELL').toUpperCase();

    const items = inv?.receipt_json_data?.items || [];
    const hasBuy = items.some((i: any) => i.item_type === 'BUY');
    const hasSell = items.some((i: any) => i.item_type === 'SELL');

    if (rawMode === 'EXCHANGE' || (hasBuy && hasSell)) return 'EXCHANGE';
    if (rawMode === 'BUY' || (hasBuy && !hasSell)) return 'BUY';
    return 'SELL';
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (historyTab !== 'ALL' && getCustomerMode(c) !== historyTab) return false;

    if (startDate || endDate) {
      const dateStr = c.lastDate || c.latestInvoice?.created_at;
      if (!dateStr) return false;
      const recordDate = new Date(dateStr).toISOString().split('T')[0];
      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
    }

    // KPI card filter: check for matching metal + item_type in receipt items
    if (activeKpiFilter) {
      const [kpiMetal, kpiType] = activeKpiFilter.split('_'); // e.g. ['GOLD','SELL']
      const invItems: any[] = c.latestInvoice?.receipt_json_data?.items || [];
      if (invItems.length > 0) {
        const hasMatch = invItems.some((i: any) =>
          (i.metal_type || '').toUpperCase() === kpiMetal &&
          (i.item_type || '').toUpperCase() === kpiType
        );
        if (!hasMatch) return false;
      } else if (c.latestInvoice) {
        const inv = c.latestInvoice;
        const metal = (inv.metal_type || '').toUpperCase();
        const txn = (inv.transaction_type || '').toUpperCase();
        // Include exchange bills that contain the matching metal
        if (metal !== kpiMetal) return false;
        if (txn !== kpiType && txn !== 'EXCHANGE') return false;
      } else {
        return false;
      }
    }

    return true;
  });

  // ── Reactive KPI Aggregation (derived from filtered records) ──
  const kpi = filtered.reduce(
    (acc, c) => {
      const items: any[] = c.latestInvoice?.receipt_json_data?.items || [];
      const finalAmt = Number(c.latestInvoice?.final_amount || 0);

      if (items.length > 0) {
        items.forEach((item: any) => {
          const w = Number(item.weight_grams) || 0;
          const metal = (item.metal_type || '').toUpperCase();
          const type = (item.item_type || '').toUpperCase();
          const purity = Number(item.purity_percentage) || 0;
          const pureW = Number(item.pureWeight || item.pure_weight_grams || (w * (purity / 100))) || 0;

          // Compute or fallback amount
          let amt = Number(item.lineTotal || item.line_total || 0);
          if (!amt && rates) {
            const isGold = metal === 'GOLD';
            const isSell = type === 'SELL';
            const rate = isGold
              ? (isSell ? rates.gold_sell_value : rates.gold_buy_value)
              : (isSell ? rates.silver_sell_value : rates.silver_buy_value);
            const wUsed = isSell ? w : pureW;
            const mVal = wUsed * rate;
            const mChg = isSell ? Number(item.making_charges_per_gram || 0) : 0;
            const sub = mVal + mChg;
            const gst = isSell ? (sub * (Number(item.gst_percent || 0) / 100)) : 0;
            amt = Number((sub + gst).toFixed(2));
          }
          if (!amt && items.length === 1) {
            amt = finalAmt;
          }

          if (metal === 'GOLD' && type === 'SELL') {
            acc.goldSoldWeight += w;
            acc.goldSoldAmount += amt;
          } else if (metal === 'GOLD' && type === 'BUY') {
            acc.goldBoughtWeight += w;
            acc.goldBoughtAmount += amt;
            acc.goldBoughtPurityWeightedSum += purity * w;
          } else if (metal === 'SILVER' && type === 'SELL') {
            acc.silverSoldWeight += w;
            acc.silverSoldAmount += amt;
          } else if (metal === 'SILVER' && type === 'BUY') {
            acc.silverBoughtWeight += w;
            acc.silverBoughtAmount += amt;
            acc.silverBoughtPurityWeightedSum += purity * w;
          }
        });
      } else if (c.latestInvoice) {
        const inv = c.latestInvoice;
        const w = Number(inv.weight_grams) || 0;
        const metal = (inv.metal_type || '').toUpperCase();
        const txn = (inv.transaction_type || '').toUpperCase();
        const purity = Number(inv.purity_percentage) || 0;

        if (metal === 'GOLD' && txn === 'SELL') {
          acc.goldSoldWeight += w; acc.goldSoldAmount += finalAmt;
        } else if (metal === 'GOLD' && txn === 'BUY') {
          acc.goldBoughtWeight += w; acc.goldBoughtAmount += finalAmt;
          acc.goldBoughtPurityWeightedSum += purity * w;
        } else if (metal === 'SILVER' && txn === 'SELL') {
          acc.silverSoldWeight += w; acc.silverSoldAmount += finalAmt;
        } else if (metal === 'SILVER' && txn === 'BUY') {
          acc.silverBoughtWeight += w; acc.silverBoughtAmount += finalAmt;
          acc.silverBoughtPurityWeightedSum += purity * w;
        }
      }
      return acc;
    },
    {
      goldSoldWeight: 0, goldSoldAmount: 0,
      goldBoughtWeight: 0, goldBoughtAmount: 0, goldBoughtPurityWeightedSum: 0,
      silverSoldWeight: 0, silverSoldAmount: 0,
      silverBoughtWeight: 0, silverBoughtAmount: 0, silverBoughtPurityWeightedSum: 0,
    }
  );

  const goldBoughtAvgPurity = kpi.goldBoughtWeight > 0 ? kpi.goldBoughtPurityWeightedSum / kpi.goldBoughtWeight : 0;
  const silverBoughtAvgPurity = kpi.silverBoughtWeight > 0 ? kpi.silverBoughtPurityWeightedSum / kpi.silverBoughtWeight : 0;

  const fmtW = (w: number) => w > 0 ? `${w.toFixed(1)}g` : '0g';
  const fmtAmt = (a: number) => a > 0 ? `₹${a.toLocaleString('en-IN')}` : '₹0';
  const fmtPurity = (p: number) => p > 0 ? `${p.toFixed(1)}%` : '—';

  return (
    <div style={{ background: '#ffffff', borderRadius: '0px', padding: '1.25rem', border: '1px solid #e6decb', boxShadow: '0 6px 20px rgba(24,19,16,0.03)', marginBottom: '1.25rem' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBackToPOS && (
            <button
              type="button"
              onClick={onBackToPOS}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '0px',
                border: '1px solid #cbd5e1', background: '#f8fafc',
                color: '#475569', fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-arrow-left"></i> Billing
            </button>
          )}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-address-book" style={{ color: '#0284c7' }}></i>Purchase History ({filtered.length})
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '280px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8' }}></i>
          <input
            type="text"
            placeholder="Search customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#0f172a', borderRadius: '6px' }}
          />
        </div>
      </div>

      {/* ── Reactive KPI Summary Cards ── */}
      <style>{`
        @keyframes kpiShimmer {
          0%   { left: -140%; opacity: 0; }
          4%   { opacity: 1; }
          22%  { left: 160%; opacity: 0; }
          100% { left: 160%; opacity: 0; }
        }
        .kpi-grid-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }
        @media (max-width: 640px) {
          .kpi-grid-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .kpi-shine {
          position: absolute;
          top: -60%;
          left: -140%;
          width: 50%;
          height: 240%;
          background: linear-gradient(
            105deg,
            transparent 5%,
            rgba(255,255,255,0.08) 25%,
            rgba(255,255,255,0.95) 50%,
            rgba(255,255,255,0.08) 75%,
            transparent 95%
          );
          transform: skewX(-16deg);
          animation: kpiShimmer 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
          mix-blend-mode: overlay;
        }
        .kpi-shine-silver {
          position: absolute;
          top: -60%;
          left: -140%;
          width: 50%;
          height: 240%;
          background: linear-gradient(
            105deg,
            transparent 5%,
            rgba(255,255,255,0.1) 25%,
            rgba(255,255,255,0.98) 50%,
            rgba(255,255,255,0.1) 75%,
            transparent 95%
          );
          transform: skewX(-16deg);
          animation: kpiShimmer 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
          mix-blend-mode: overlay;
        }
        .history-table-row {
          transition: background 0.15s ease;
        }
        .history-table-row:hover {
          background: #fcf0c5 !important;
        }
      `}</style>
      <div className="kpi-grid-container" style={{ marginBottom: activeKpiFilter ? '0.5rem' : '1.25rem' }}>

        {/* GOLD SOLD */}
        <div
          onClick={() => { setActiveKpiFilter(activeKpiFilter === 'GOLD_SELL' ? null : 'GOLD_SELL'); setHistoryTab('ALL'); }}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: activeKpiFilter === 'GOLD_SELL' ? '2px solid #b45309' : '1px solid #d99b26',
            borderRadius: '12px', padding: '0.9rem 1rem',
            boxShadow: activeKpiFilter === 'GOLD_SELL' ? '0 0 0 3px rgba(180,83,9,0.25), 0 4px 14px rgba(180,83,9,0.15)' : '0 4px 14px rgba(180,83,9,0.1)',
            cursor: 'pointer', transition: 'box-shadow 0.2s, border 0.2s',
          }}
        >
          <span className="kpi-shine" />
          {activeKpiFilter === 'GOLD_SELL' && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveKpiFilter(null); }}
              style={{ position: 'absolute', top: '5px', right: '6px', zIndex: 10, background: '#b45309', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              title="Remove filter"
            ><i className="fa-solid fa-xmark" /></button>
          )}
          <div style={{ position: 'relative', zIndex: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.85rem' }}>🥇</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gold Sold</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{fmtW(kpi.goldSoldWeight)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>{fmtAmt(kpi.goldSoldAmount)}</div>
          </div>
        </div>

        {/* GOLD BOUGHT */}
        <div
          onClick={() => { setActiveKpiFilter(activeKpiFilter === 'GOLD_BUY' ? null : 'GOLD_BUY'); setHistoryTab('ALL'); }}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: activeKpiFilter === 'GOLD_BUY' ? '2px solid #b45309' : '1px solid #d99b26',
            borderRadius: '12px', padding: '0.75rem 0.85rem',
            boxShadow: activeKpiFilter === 'GOLD_BUY' ? '0 0 0 3px rgba(180,83,9,0.25), 0 4px 14px rgba(180,83,9,0.15)' : '0 4px 14px rgba(180,83,9,0.1)',
            cursor: 'pointer', transition: 'box-shadow 0.2s, border 0.2s',
          }}
        >
          <span className="kpi-shine" />
          {activeKpiFilter === 'GOLD_BUY' && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveKpiFilter(null); }}
              style={{ position: 'absolute', top: '5px', right: '6px', zIndex: 10, background: '#b45309', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              title="Remove filter"
            ><i className="fa-solid fa-xmark" /></button>
          )}
          <div style={{ position: 'relative', zIndex: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.85rem' }}>🥇</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gold Bought</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{fmtW(kpi.goldBoughtWeight)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#78350f', marginTop: '2px' }}>{fmtAmt(kpi.goldBoughtAmount)}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 400, color: '#78350f', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-flask" style={{ fontSize: '0.6rem' }}></i>
              Avg Purity: {fmtPurity(goldBoughtAvgPurity)}
            </div>
          </div>
        </div>

        {/* SILVER SOLD */}
        <div
          onClick={() => { setActiveKpiFilter(activeKpiFilter === 'SILVER_SELL' ? null : 'SILVER_SELL'); setHistoryTab('ALL'); }}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            border: activeKpiFilter === 'SILVER_SELL' ? '2px solid #475569' : '1px solid #94a3b8',
            borderRadius: '12px', padding: '0.75rem 0.85rem',
            boxShadow: activeKpiFilter === 'SILVER_SELL' ? '0 0 0 3px rgba(71,85,105,0.2), 0 4px 14px rgba(0,0,0,0.1)' : '0 4px 14px rgba(0,0,0,0.06)',
            cursor: 'pointer', transition: 'box-shadow 0.2s, border 0.2s',
          }}
        >
          <span className="kpi-shine-silver" />
          {activeKpiFilter === 'SILVER_SELL' && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveKpiFilter(null); }}
              style={{ position: 'absolute', top: '5px', right: '6px', zIndex: 10, background: '#475569', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              title="Remove filter"
            ><i className="fa-solid fa-xmark" /></button>
          )}
          <div style={{ position: 'relative', zIndex: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.85rem' }}>🥈</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Silver Sold</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{fmtW(kpi.silverSoldWeight)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>{fmtAmt(kpi.silverSoldAmount)}</div>
          </div>
        </div>

        {/* SILVER BOUGHT */}
        <div
          onClick={() => { setActiveKpiFilter(activeKpiFilter === 'SILVER_BUY' ? null : 'SILVER_BUY'); setHistoryTab('ALL'); }}
          style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            border: activeKpiFilter === 'SILVER_BUY' ? '2px solid #475569' : '1px solid #94a3b8',
            borderRadius: '12px', padding: '0.75rem 0.85rem',
            boxShadow: activeKpiFilter === 'SILVER_BUY' ? '0 0 0 3px rgba(71,85,105,0.2), 0 4px 14px rgba(0,0,0,0.1)' : '0 4px 14px rgba(0,0,0,0.06)',
            cursor: 'pointer', transition: 'box-shadow 0.2s, border 0.2s',
          }}
        >
          <span className="kpi-shine-silver" />
          {activeKpiFilter === 'SILVER_BUY' && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveKpiFilter(null); }}
              style={{ position: 'absolute', top: '5px', right: '6px', zIndex: 10, background: '#475569', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              title="Remove filter"
            ><i className="fa-solid fa-xmark" /></button>
          )}
          <div style={{ position: 'relative', zIndex: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.85rem' }}>🥈</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Silver Bought</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{fmtW(kpi.silverBoughtWeight)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>{fmtAmt(kpi.silverBoughtAmount)}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 400, color: '#334155', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-flask" style={{ fontSize: '0.6rem' }}></i>
              Avg Purity: {fmtPurity(silverBoughtAvgPurity)}
            </div>
          </div>
        </div>

      </div>


      {/* Date Range Selection Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
          <i className="fa-solid fa-calendar-days" style={{ color: '#6366f1' }}></i>
          <span>Filter Date Range:</span>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>From:</span>
          <button
            type="button"
            onClick={() => setOpenCalendarTarget(openCalendarTarget === 'FROM' ? null : 'FROM')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: startDate ? '#0f172a' : '#94a3b8',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-regular fa-calendar" style={{ color: '#d97706' }}></i>
            {startDate || 'YYYY-MM-DD'}
          </button>
          {openCalendarTarget === 'FROM' && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999 }}>
              <CustomCalendarPicker
                selectedDate={startDate}
                onSelectDate={(d) => setStartDate(d)}
                onClose={() => setOpenCalendarTarget(null)}
              />
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
          <button
            type="button"
            onClick={() => setOpenCalendarTarget(openCalendarTarget === 'TO' ? null : 'TO')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: endDate ? '#0f172a' : '#94a3b8',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-regular fa-calendar" style={{ color: '#d97706' }}></i>
            {endDate || 'YYYY-MM-DD'}
          </button>
          {openCalendarTarget === 'TO' && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999 }}>
              <CustomCalendarPicker
                selectedDate={endDate}
                onSelectDate={(d) => setEndDate(d)}
                onClose={() => setOpenCalendarTarget(null)}
              />
            </div>
          )}
        </div>

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={handleClearDates}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-solid fa-xmark"></i> Clear Filter
          </button>
        )}
      </div>


      {/* 3 Interactive History Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setHistoryTab('ALL')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'ALL' ? '1px solid #0f172a' : '1px solid #cbd5e1',
            background: historyTab === 'ALL' ? '#0f172a' : '#f8fafc',
            color: historyTab === 'ALL' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'ALL' ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
          }}
        >
          <i className="fa-solid fa-list-ul"></i> All History
        </button>

        <button
          onClick={() => setHistoryTab('SELL')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'SELL' ? '1px solid #b45309' : '1px solid #fde68a',
            background: historyTab === 'SELL' ? '#b45309' : '#fef3c7',
            color: historyTab === 'SELL' ? '#ffffff' : '#92400e',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'SELL' ? '0 4px 12px rgba(180, 83, 9, 0.25)' : 'none',
          }}
        >
          <i className="fa-solid fa-cart-shopping"></i> Sell History
        </button>

        <button
          onClick={() => setHistoryTab('BUY')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'BUY' ? '1px solid #0369a1' : '1px solid #bae6fd',
            background: historyTab === 'BUY' ? '#0369a1' : '#e0f2fe',
            color: historyTab === 'BUY' ? '#ffffff' : '#075985',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'BUY' ? '0 4px 12px rgba(3, 105, 161, 0.25)' : 'none',
          }}
        >
          <i className="fa-solid fa-hand-holding-dollar"></i> Buy History
        </button>

        <button
          onClick={() => setHistoryTab('EXCHANGE')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'EXCHANGE' ? '1px solid #6d28d9' : '1px solid #e9d5ff',
            background: historyTab === 'EXCHANGE' ? '#6d28d9' : '#f3e8ff',
            color: historyTab === 'EXCHANGE' ? '#ffffff' : '#5b21b6',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'EXCHANGE' ? '0 4px 12px rgba(109, 40, 217, 0.25)' : 'none',
          }}
        >
          <i className="fa-solid fa-right-left"></i> Exchange History
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e6decb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', background: '#ffffff' }}>
          <thead>
            <tr style={{ background: '#f4ede4', borderBottom: '1px solid #e6decb', color: '#4a3e35', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '75px' }}># / MODE</th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>CUSTOMER DETAILS</th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}>PRODUCT &amp; WEIGHT</th>
              <th style={{ padding: '0.65rem 0.65rem', textAlign: 'center', width: '90px' }}>PURITY</th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>FINAL AMOUNT</th>
              <th style={{ padding: '0.65rem 0.4rem', textAlign: 'center', width: '95px' }}>DATE &amp; TIME</th>
              <th style={{ padding: '0.65rem 0.65rem', textAlign: 'center', width: '90px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fa-solid fa-user-slash" style={{ fontSize: '1.3rem', marginBottom: '6px', display: 'block', color: '#cbd5e1' }}></i>
                  No customer records found in {historyTab} history.
                </td>
              </tr>
            ) : (
              filtered.map((cust, idx) => {
                const mode = getCustomerMode(cust);
                const addressStr = cust.address || cust.latestInvoice?.customer_address || cust.latestInvoice?.receipt_json_data?.customer_address || 'Patelpura, Siddipet';

                return (
                  <tr
                    key={idx}
                    className="history-table-row"
                    onClick={() => {
                      if (onViewInvoiceDetails) onViewInvoiceDetails(cust);
                    }}
                    style={{
                      cursor: 'pointer',
                      background: idx % 2 === 0 ? '#ffffff' : '#e6e8eb',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    {/* 1. Index & MODE Badge */}
                    <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400, marginBottom: '2px' }}>#{idx + 1}</div>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '5px',
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          background: mode === 'SELL' ? '#fef3c7' : mode === 'BUY' ? '#e0f2fe' : '#f3e8ff',
                          color: mode === 'SELL' ? '#b45309' : mode === 'BUY' ? '#0369a1' : '#6d28d9',
                          border: mode === 'SELL' ? '1px solid #fde68a' : mode === 'BUY' ? '1px solid #bae6fd' : '1px solid #e9d5ff',
                          display: 'inline-block',
                        }}
                      >
                        {mode}
                      </span>
                    </td>

                    {/* 2. Customer Details (ONLY Customer Name is BOLD) */}
                    <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem', letterSpacing: '-0.2px' }}>
                        {cust.name}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px', fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>
                        <span><i className="fa-solid fa-phone" style={{ color: '#0284c7', fontSize: '0.62rem', marginRight: '2px' }}></i>{cust.phone}</span>
                        <span style={{ color: '#64748b' }}><i className="fa-solid fa-location-dot" style={{ color: '#ef4444', fontSize: '0.62rem', marginRight: '2px' }}></i>{addressStr}</span>
                      </div>
                    </td>

                    {/* 3. Product & Weight (Shows Gross Weight → Pure Weight for each item) */}
                    {(() => {
                      const items: any[] = cust.latestInvoice?.receipt_json_data?.items || [];

                      if (items.length > 0) {
                        return (
                          <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'left' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {items.map((item: any, i: number) => {
                                const grossW = Number(item.weight_grams) || 0;
                                const purity = Number(item.purity_percentage) || 0;
                                const pureW = Number(item.pureWeight || item.pure_weight_grams || (grossW * (purity / 100))) || 0;
                                const pName = item.product_name || `${item.metal_type || 'Jewellery'} Item`;
                                const itemType = (item.item_type || mode).toUpperCase();

                                const itemMetal = (item.metal_type || 'GOLD').toUpperCase();
                                const itemTxn = (item.item_type || mode).toUpperCase();
                                const isGoldSell = itemMetal === 'GOLD' && itemTxn === 'SELL';

                                return (
                                  <div key={i} style={{ fontSize: '0.74rem', color: '#334155' }}>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{pName}</span>
                                    {mode === 'EXCHANGE' && (
                                      <span
                                        style={{
                                          marginLeft: '4px',
                                          padding: '1px 4px',
                                          borderRadius: '3px',
                                          fontSize: '0.6rem',
                                          fontWeight: 700,
                                          background: itemType === 'SELL' ? '#fef3c7' : '#e0f2fe',
                                          color: itemType === 'SELL' ? '#b45309' : '#0369a1',
                                          border: itemType === 'SELL' ? '1px solid #fde68a' : '1px solid #bae6fd',
                                        }}
                                      >
                                        {itemType}
                                      </span>
                                    )}
                                    <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: '1px' }}>
                                      <span
                                        style={{
                                          fontSize: '0.60rem',
                                          fontWeight: 700,
                                          padding: '1px 4px',
                                          borderRadius: '3px',
                                          background: itemMetal === 'GOLD' ? '#fffbeb' : '#f1f5f9',
                                          color: itemMetal === 'GOLD' ? '#b45309' : '#475569',
                                          border: itemMetal === 'GOLD' ? '1px solid #fde68a' : '1px solid #cbd5e1',
                                          marginRight: '4px',
                                        }}
                                      >
                                        {itemMetal}
                                      </span>
                                      <i className="fa-solid fa-scale-balanced" style={{ fontSize: '0.62rem', color: '#d97706', marginRight: '3px' }}></i>
                                      <strong>{grossW.toFixed(1)}g</strong>
                                      {/* {(() => {
                                        const itemRate = Number(item.custom_rate_per_gram || item.applied_rate_per_gram || item.appliedRate || item.customRate || 0);
                                        return itemRate > 0 ? (
                                          <span style={{ color: '#4338ca', fontWeight: 700, marginLeft: '6px' }}>
                                            @ ₹{itemRate.toLocaleString('en-IN')}/g
                                          </span>
                                        ) : null;
                                      })()} */}
                                      {!isGoldSell && purity > 0 && (
                                        <span style={{ color: '#047857', fontWeight: 600 }}>
                                          {' → '}{pureW.toFixed(1)}g Pure
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      }

                      // Fallback for single legacy records
                      const singlePurity = Number(cust.latestInvoice?.purity_percentage) || 0;
                      const singlePureW = Number((cust.latestInvoice as any)?.pure_metal_weight || (cust.totalWeight * (singlePurity / 100))) || 0;
                      const singleMetal = (cust.latestInvoice?.metal_type || 'GOLD').toUpperCase();
                      const singleTxn = (cust.latestInvoice?.transaction_type || mode).toUpperCase();
                      const isSingleGoldSell = singleMetal === 'GOLD' && singleTxn === 'SELL';

                      return (
                        <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.76rem' }}>
                            {cust.products.join(', ')}
                          </div>
                          <div style={{ marginTop: '2px', fontSize: '0.69rem', color: '#64748b' }}>
                            <i className="fa-solid fa-scale-balanced" style={{ fontSize: '0.62rem', color: '#d97706', marginRight: '3px' }}></i>
                            <strong>{cust.totalWeight.toFixed(1)}g</strong>
                            {!isSingleGoldSell && singlePurity > 0 && (
                              <span style={{ color: '#047857', fontWeight: 600 }}>
                                {' → '}{singlePureW.toFixed(1)}g Pure
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })()}

                    {/* 4. Purity column */}
                    {(() => {
                      const items: any[] = cust.latestInvoice?.receipt_json_data?.items || [];
                      let purityDisplay: React.ReactNode;

                      if (items.length > 1) {
                        // Multi-item: show each item's purity on its own line
                        purityDisplay = (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {items.map((item: any, i: number) => {
                              const p = Number(item.purity_percentage);
                              return (
                                <div key={i} style={{ fontSize: '0.7rem', fontWeight: 500, color: '#334155' }}>
                                  {p > 0 ? `${p.toFixed(1)}%` : '—'}
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '3px' }}>
                                    ({(item.item_type || '').toUpperCase()})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else if (items.length === 1) {
                        const p = Number(items[0].purity_percentage);
                        purityDisplay = <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155' }}>{p > 0 ? `${p.toFixed(1)}%` : '—'}</span>;
                      } else {
                        const p = Number(cust.latestInvoice?.purity_percentage);
                        purityDisplay = <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155' }}>{p > 0 ? `${p.toFixed(1)}%` : '—'}</span>;
                      }

                      return (
                        <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          {purityDisplay}
                        </td>
                      );
                    })()}

                    {/* 5. Final Amount (Normal font weight) */}
                    {(() => {
                      const inv = cust.latestInvoice;
                      const txnType = (inv?.transaction_type || mode).toUpperCase();
                      const storedPayload = inv?.receipt_json_data;
                      const sellVal = Number(storedPayload?.totalSellValue ?? 0);
                      const buyVal = Number(storedPayload?.totalBuyCredit ?? 0);
                      const isJbjPaid = txnType === 'BUY' || (txnType === 'EXCHANGE' && buyVal > sellVal);
                      const netPay = storedPayload?.netPayable ?? inv?.final_amount;
                      const displayAmt = netPay !== undefined && Number(netPay) >= 0 ? Number(netPay) : (cust.totalSpent || 0);

                      return (
                        <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ fontWeight: 500, color: isJbjPaid ? '#0369a1' : '#0f172a', fontSize: '0.85rem' }}>
                            ₹{displayAmt.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.60rem', color: isJbjPaid ? '#0284c7' : '#64748b', fontWeight: 400, marginTop: '1px' }}>
                            {isJbjPaid ? '(JBJ paid)' : '(Customer paid)'}
                          </div>
                        </td>
                      );
                    })()}

                    {/* 5. Date & Time (Stacked Layout: DD-MM-YYYY & Time) */}
                    <td style={{ padding: '0.55rem 0.4rem', textAlign: 'center', verticalAlign: 'middle', width: '95px' }}>
                      {(() => {
                        const { dateStr, timeStr } = formatDateTimeStacked(cust.lastDate);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {dateStr}
                            </div>
                            {timeStr && (
                              <div style={{ fontSize: '0.65rem', fontWeight: 500, color: '#6366f1', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <i className="fa-regular fa-clock" style={{ fontSize: '0.58rem' }}></i>
                                {timeStr}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* 6. Vertical Stacked Action Buttons */}
                    <td style={{ padding: '0.55rem 0.55rem', textAlign: 'center', verticalAlign: 'middle', width: '90px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'stretch' }}>
                        {/* <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewInvoiceDetails) onViewInvoiceDetails(cust);
                          }}
                          title="View Full Invoice Details & Audit Trail"
                          style={{
                            padding: '3px 6px',
                            background: '#eef2ff',
                            color: '#4338ca',
                            border: '1px solid #c7d2fe',
                            borderRadius: '5px',
                            fontWeight: 500,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          <i className="fa-solid fa-eye"></i> Details
                        </button> */}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditCustomerRecord) {
                              onEditCustomerRecord(cust);
                            } else {
                              onSelectCustomerForBill(cust.name, cust.phone);
                            }
                          }}
                          title="Edit Record in POS Terminal"
                          style={{
                            padding: '3px 6px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: '5px',
                            fontWeight: 500,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> Edit
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(cust);
                          }}
                          title="View Thermal Receipt Modal"
                          style={{
                            padding: '3px 6px',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            borderRadius: '5px',
                            fontWeight: 500,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          <i className="fa-solid fa-eye"></i> Bill
                        </button>

                        <button
                          onClick={() => onSelectCustomerForBill(cust.name, cust.phone)}
                          title="Create New Bill with Customer Pre-filled"
                          style={{
                            padding: '3px 6px',
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            fontWeight: 500,
                            fontSize: '0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          <i className="fa-solid fa-plus"></i> New
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SEE BILL POPUP MODAL */}
      {selectedCustomer && (
        <SeeBillModal
          customer={selectedCustomer}
          rates={rates}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};
