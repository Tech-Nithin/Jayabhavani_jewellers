import React, { useState, useEffect } from 'react';
import type { CustomerDirectoryRecord, GlobalRates } from '../types';
import { SeeBillModal } from './SeeBillModal';

interface CustomerDirectoryViewProps {
  customers: CustomerDirectoryRecord[];
  rates: GlobalRates | null;
  formatDate: (date?: string) => string;
  onBackToPOS?: () => void;
  onSelectCustomerForBill?: (name: string, phone: string) => void;
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
  void onSelectCustomerForBill;
  void onEditCustomerRecord;
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

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDirectoryRecord | null>(null);
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

  const totalBillsCount = filtered.length;
  const sellBillsCount = filtered.filter(c => (c.latestInvoice?.transaction_type || '').toUpperCase() === 'SELL').length;
  const buyBillsCount = filtered.filter(c => (c.latestInvoice?.transaction_type || '').toUpperCase() === 'BUY').length;
  const exchangeBillsCount = filtered.filter(c => (c.latestInvoice?.transaction_type || '').toUpperCase() === 'EXCHANGE').length;

  const fmtW = (w: number) => w > 0 ? `${w.toFixed(1)}g` : '0g';
  const fmtAmt = (a: number) => a > 0 ? `₹${a.toLocaleString('en-IN')}` : '₹0';
  const fmtPurity = (p: number) => p > 0 ? `${p.toFixed(1)}%` : '—';

  return (
    <div className="history-main-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e6decb', boxShadow: '0 6px 20px rgba(24,19,16,0.03)', marginBottom: '0.85rem' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBackToPOS && (
            <button
              type="button"
              onClick={onBackToPOS}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '8px',
                border: '1px solid #cbd5e1', background: '#f8fafc',
                color: '#475569', fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-arrow-left"></i> Billing
            </button>
          )}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-address-book" style={{ color: '#0284c7' }}></i>Purchase History ({filtered.length})
          </h3>
        </div>
      </div>

      {/* ── Reactive KPI Summary Cards ── */}
      <style>{`
        .history-main-card {
          padding: 0.75rem 0.85rem;
        }
        @media (max-width: 1024px) {
          .history-main-card {
            padding: 0.4rem 0.5rem !important;
          }
        }
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
        @media (max-width: 1024px) {
          .kpi-grid-container {
            grid-template-columns: repeat(2, 1fr);
          }
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
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gold Sold</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{fmtW(kpi.goldSoldWeight)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#78350f', marginTop: '2px' }}>{fmtAmt(kpi.goldSoldAmount)}</div>
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




      {/* ── Responsive Purchase History Toolbar Controls ── */}
      <style>{`
        .history-controls-toolbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.65rem;
        }
        .history-search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #ffffff;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          width: 250px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .history-pills-bar {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 4px;
        }

        @media (max-width: 1024px) {
          .history-controls-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.65rem;
          }
          .history-row-1 {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            width: 100%;
          }
          .history-search-box {
            flex: 1 !important;
            width: auto !important;
          }
          .history-date-btn {
            flex: 1 !important;
            justify-content: center !important;
          }
          .history-pills-bar {
            display: flex !important;
            width: 100% !important;
            justify-content: space-between !important;
          }
          .history-pills-bar button {
            flex: 1 !important;
            justify-content: center !important;
            text-align: center !important;
          }
        }
      `}</style>

      <div className="history-controls-toolbar">
        {/* Row 1 Group on Tablet: Search & Date Range */}
        <div className="history-row-1" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Search Bar */}
          <div className="history-search-box">
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', fontSize: '0.78rem' }}></i>
            <input
              type="text"
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.80rem', color: '#0f172a' }}
            />
          </div>

          {/* Dropdown Date Range Filter Pop over */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="history-date-btn"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: (startDate || endDate) ? '1px solid #6366f1' : '1px solid #cbd5e1',
                background: (startDate || endDate) ? '#eef2ff' : '#ffffff',
                color: (startDate || endDate) ? '#4338ca' : '#334155',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                whiteSpace: 'nowrap',
              }}
            >
              <i className="fa-solid fa-calendar-days" style={{ color: (startDate || endDate) ? '#4338ca' : '#6366f1' }}></i>
              {startDate || endDate ? (
                <span>{startDate || 'Start'} → {endDate || 'End'}</span>
              ) : (
                <span>Filter Date Range</span>
              )}
              <i className={`fa-solid fa-chevron-${showDateDropdown ? 'up' : 'down'}`} style={{ fontSize: '0.68rem', marginLeft: '4px' }}></i>
            </button>

            {showDateDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 100,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18)',
                  width: '260px',
                  display: 'grid',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Select Date Range</span>
                  <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowDateDropdown(false)}></i>
                </div>

                {/* Row 1: From Date */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    From Date:
                  </label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: '#0f172a', fontWeight: 600, background: '#f8fafc' }}
                  />
                </div>

                {/* Row 2: To Date */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    To Date:
                  </label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: '#0f172a', fontWeight: 600, background: '#f8fafc' }}
                  />
                </div>

                {/* Row 3: Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTempStartDate('');
                      setTempEndDate('');
                      handleClearDates();
                      setShowDateDropdown(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      borderRadius: '6px',
                      border: '1px solid #fca5a5',
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(tempStartDate);
                      setEndDate(tempEndDate);
                      setShowDateDropdown(false);
                    }}
                    style={{
                      flex: 1.2,
                      padding: '0.4rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                    }}
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Pill Bar */}
        <div className="history-pills-bar">
          <button
            type="button"
            onClick={() => setHistoryTab('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: historyTab === 'ALL' ? '#ffffff' : 'transparent',
              color: historyTab === 'ALL' ? '#4f46e5' : '#64748b',
              fontWeight: historyTab === 'ALL' ? 700 : 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: historyTab === 'ALL' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-layer-group" style={{ fontSize: '0.74rem' }}></i>
            All ({totalBillsCount})
          </button>

          <button
            type="button"
            onClick={() => setHistoryTab('SELL')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: historyTab === 'SELL' ? '#ffffff' : 'transparent',
              color: historyTab === 'SELL' ? '#b45309' : '#64748b',
              fontWeight: historyTab === 'SELL' ? 700 : 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: historyTab === 'SELL' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-cart-shopping" style={{ fontSize: '0.74rem' }}></i>
            Sell ({sellBillsCount})
          </button>

          <button
            type="button"
            onClick={() => setHistoryTab('BUY')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: historyTab === 'BUY' ? '#ffffff' : 'transparent',
              color: historyTab === 'BUY' ? '#0369a1' : '#64748b',
              fontWeight: historyTab === 'BUY' ? 700 : 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: historyTab === 'BUY' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: '0.74rem' }}></i>
            Buy ({buyBillsCount})
          </button>

          <button
            type="button"
            onClick={() => setHistoryTab('EXCHANGE')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: historyTab === 'EXCHANGE' ? '#ffffff' : 'transparent',
              color: historyTab === 'EXCHANGE' ? '#7c3aed' : '#64748b',
              fontWeight: historyTab === 'EXCHANGE' ? 700 : 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: historyTab === 'EXCHANGE' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-rotate" style={{ fontSize: '0.74rem' }}></i>
            Exchange ({exchangeBillsCount})
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .customer-history-table {
            font-size: 0.65rem !important;
          }
          .customer-history-table th,
          .customer-history-table td {
            padding: 0.45rem 0.25rem !important;
            font-size: 0.65rem !important;
          }
          .customer-history-table th {
            font-size: 0.58rem !important;
          }
          .customer-history-table th:first-child,
          .customer-history-table td:first-child {
            padding-left: 0.6rem !important;
          }
          .customer-history-table th:last-child,
          .customer-history-table td:last-child {
            padding-right: 0.6rem !important;
          }
          .customer-history-name {
            font-size: 0.74rem !important;
          }
          .customer-history-amt {
            font-size: 0.74rem !important;
          }
          .col-customer {
            min-width: 100px !important;
            width: 170px !important;
          }
          .col-product {
            min-width: 150px !important;
            width: 180px !important;
          }
        }
      `}</style>

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e6decb' }}>
        <table className="customer-history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', background: '#ffffff' }}>
          <thead>
            <tr style={{ background: '#f4ede4', borderBottom: '1px solid #e6decb', color: '#4a3e35', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '10%' }}># / MODE</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '14%' }}>DATE &amp; TIME</th>
              <th className="col-customer" style={{ padding: '0.65rem 0.75rem', textAlign: 'left', width: '24%' }}>CUSTOMER</th>
              <th className="col-product" style={{ padding: '0.65rem 0.75rem', textAlign: 'left', width: '28%' }}>PRODUCT (JBJ Sell/BUY)</th>
              <th style={{ padding: '0.65rem 0.65rem', textAlign: 'center', width: '11%' }}>WEIGHT</th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', width: '13%' }}>FINAL AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
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

                    {/* 2. Date & Time (Stacked Layout: DD-MM-YYYY & Time) */}
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

                    {/* 2. Customer Details (ONLY Customer Name is BOLD) */}
                    <td className="col-customer" style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'left' }}>
                      <div className="customer-history-name" style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem', letterSpacing: '-0.2px' }}>
                        {cust.name}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px', fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>
                        <span><i className="fa-solid fa-phone" style={{ color: '#0284c7', fontSize: '0.62rem', marginRight: '2px' }}></i>{cust.phone}</span>
                        <span style={{ color: '#64748b' }}><i className="fa-solid fa-location-dot" style={{ color: '#ef4444', fontSize: '0.62rem', marginRight: '2px' }}></i>{addressStr}</span>
                      </div>
                    </td>

                    {/* 3. PRODUCT Column */}
                    <td className="col-product" style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'left' }}>
                      {(() => {
                        const items: any[] = cust.latestInvoice?.receipt_json_data?.items || [];

                        if (items.length > 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {items.map((item: any, i: number) => {
                                const pName = item.product_name || `${item.metal_type || 'Jewellery'} Item`;
                                const itemType = (item.item_type || mode).toUpperCase();
                                const itemMetal = (item.metal_type || 'GOLD').toUpperCase();

                                return (
                                  <div key={i} style={{ fontSize: '0.74rem', color: '#334155' }}>
                                    <span
                                      style={{
                                        fontSize: '0.60rem',
                                        fontWeight: 700,
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        background: itemMetal === 'GOLD' ? '#fffbeb' : '#f1f5f9',
                                        color: itemMetal === 'GOLD' ? '#b45309' : '#475569',
                                        border: itemMetal === 'GOLD' ? '1px solid #fde68a' : '1px solid #cbd5e1',
                                      }}
                                    >
                                      {itemMetal}
                                    </span>&nbsp;
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
                                        JBJ-{itemType}
                                      </span>

                                    )}

                                    {/* <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: '1px' }}>
                                      <span
                                        style={{
                                          fontSize: '0.60rem',
                                          fontWeight: 700,
                                          padding: '1px 4px',
                                          borderRadius: '3px',
                                          background: itemMetal === 'GOLD' ? '#fffbeb' : '#f1f5f9',
                                          color: itemMetal === 'GOLD' ? '#b45309' : '#475569',
                                          border: itemMetal === 'GOLD' ? '1px solid #fde68a' : '1px solid #cbd5e1',
                                        }}
                                      >
                                        {itemMetal}
                                      </span>
                                    </div> */}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        // Fallback for single legacy records
                        return (
                          <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.76rem' }}>
                            {cust.products.join(', ')}
                          </div>
                        );
                      })()}
                    </td>

                    {/* 4. WEIGHT Column */}
                    <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      {(() => {
                        const items: any[] = cust.latestInvoice?.receipt_json_data?.items || [];

                        if (items.length > 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {items.map((item: any, i: number) => {
                                const grossW = Number(item.weight_grams) || 0;
                                // const dedW = Number(item.deduction_weight_grams) || 0;
                                // const netW = Math.max(0, grossW - dedW);

                                return (
                                  <div key={i} style={{ fontSize: '0.73rem', color: '#334155' }}>
                                    {/* <div style={{ fontWeight: 700, color: '#0369a1' }}>
                                      {netW.toFixed(3)}g Net
                                    </div> */}
                                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
                                      {/* <i className="fa-solid fa-scale-balanced" style={{ fontSize: '0.60rem', color: '#d97706', marginRight: '3px' }}></i> */}
                                      <span>{grossW.toFixed(1)}g </span>
                                      {/* {dedW > 0 && (
                                        <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: '3px' }}>
                                          (-{dedW.toFixed(1)}g)
                                        </span>
                                      )} */}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        return <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369a1' }}>{cust.totalWeight.toFixed(3)}g</span>;
                      })()}
                    </td>

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
                          <div className="customer-history-amt" style={{ fontWeight: 500, color: isJbjPaid ? '#0369a1' : '#0f172a', fontSize: '0.85rem' }}>
                            ₹{displayAmt.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.60rem', color: isJbjPaid ? '#0284c7' : '#64748b', fontWeight: 400, marginTop: '1px' }}>
                            {isJbjPaid ? '(JBJ paid)' : '(Customer paid)'}
                          </div>
                        </td>
                      );
                    })()}




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
