import React, { useState, useEffect, useMemo } from 'react';
import type { Language } from '../../utils/translations';
import { API_BASE } from '../../config/apiConfig';

export type DateFilterMode = 'TODAY' | 'YESTERDAY' | 'MONTH' | 'DATE' | 'CUSTOM' | 'ALL';

interface LoadingEntry {
  id: string;
  load_type: 'GOLD' | 'SILVER' | 'CASH';
  item_id?: string;
  item_name: string;
  item_category: string;
  loaded_weight_grams: number;
  loaded_cash_amount: number;
  previous_balance: number;
  new_balance: number;
  notes: string;
  created_at: string;
}

interface LoadingMetrics {
  currentGoldStock: number;
  currentSilverStock: number;
  currentCashBalance: number;
  totalLoadedGold: number;
  totalLoadedGoldCount: number;
  totalLoadedSilver: number;
  totalLoadedSilverCount: number;
  totalLoadedCash: number;
  totalLoadedCashCount: number;
  totalEntriesCount: number;
}

interface LoadingHistoryViewProps {
  onBack: () => void;
  lang?: Language;
}

// Format timestamp to DD-MM-YYYY hh:mm:ss AM/PM (12-hour IST format)
const formatISTDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      let hours = d.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hh = String(hours).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss} ${ampm}`;
    }
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr || '—';
  }
};

export const LoadingHistoryView: React.FC<LoadingHistoryViewProps> = ({
  onBack,
  lang = 'EN',
}) => {
  const [loadings, setLoadings] = useState<LoadingEntry[]>([]);
  const [metrics, setMetrics] = useState<LoadingMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'CASH'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Standard App-Wide Date Filter State
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [startDate, setStartDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [endDate, setEndDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  const handleDateModeChange = (mode: DateFilterMode) => {
    setDateFilterMode(mode);
    if (mode === 'TODAY') {
      setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    } else if (mode === 'YESTERDAY') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    } else if (mode === 'MONTH') {
      const d = new Date();
      d.setDate(1);
      setStartDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      setEndDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    }
  };

  const fetchLoadingHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (dateFilterMode === 'ALL') {
        params.append('date', 'all');
      } else if (dateFilterMode === 'CUSTOM' && startDate && endDate) {
        params.append('date', 'range');
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else if (dateFilterMode === 'MONTH') {
        const d = new Date();
        d.setDate(1);
        params.append('date', 'range');
        params.append('startDate', d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
        params.append('endDate', new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      } else if (dateFilterMode === 'YESTERDAY') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        params.append('date', d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      } else if (selectedDate) {
        params.append('date', selectedDate);
      }

      const res = await fetch(`${API_BASE}/inventory/loading-history?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLoadings(data.loadings || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Failed to fetch loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadingHistory();
  }, [dateFilterMode, selectedDate, startDate, endDate]);

  // Filtered Items by Type & Search Term
  const filteredList = useMemo(() => {
    return loadings.filter((item) => {
      // 1. Type filter
      if (typeFilter !== 'ALL' && item.load_type !== typeFilter) {
        return false;
      }

      // 2. Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = (item.item_name || '').toLowerCase().includes(term);
        const matchCategory = (item.item_category || '').toLowerCase().includes(term);
        const matchNotes = (item.notes || '').toLowerCase().includes(term);
        const matchType = (item.load_type || '').toLowerCase().includes(term);
        if (!matchName && !matchCategory && !matchNotes && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [loadings, typeFilter, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', padding: '0 2px', fontFamily: "'Inter', 'Source Sans 3', sans-serif" }}>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER WITH BACK BUTTON, TITLE & APP-WIDE DATE SELECTOR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
          >
            <i className="fa-solid fa-arrow-left" /> {lang === 'TE' ? 'వెనుకకు' : 'Back to Inventory'}
          </button>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#0284c7' }} />
              {lang === 'TE' ? 'సరుకు & నగదు లోడింగ్ చరిత్ర' : 'Loading History Ledger'}
            </h2>
            <p style={{ margin: '1px 0 0 0', fontSize: '0.70rem', color: '#64748b' }}>
              {lang === 'TE'
                ? 'బంగారం, వెండి సరుకు మరియు నగదు డ్రాయర్ లోడింగ్ పూర్తి లాగ్‌లు'
                : 'Complete ledger of every gold stock, silver stock, and cash drawer loading entry'}
            </p>
          </div>
        </div>

        {/* Standard App-Wide Date Filter Controls on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <select
            value={dateFilterMode}
            onChange={(e) => handleDateModeChange(e.target.value as DateFilterMode)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.72rem',
              fontWeight: 700,
              outline: 'none',
              background: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="MONTH">This Month</option>
            <option value="CUSTOM">Custom Range</option>
            <option value="ALL">All Time</option>
          </select>

          {(dateFilterMode === 'DATE' || dateFilterMode === 'TODAY' || dateFilterMode === 'YESTERDAY') && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode('DATE');
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.72rem',
                fontWeight: 700,
                outline: 'none',
                background: '#ffffff',
              }}
            />
          )}

          {dateFilterMode === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '4px 6px',
                  borderRadius: '5px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '4px 6px',
                  borderRadius: '5px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={fetchLoadingHistory}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #0284c7',
              background: '#f0f9ff',
              color: '#0284c7',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-solid fa-rotate-right" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. KPI CARDS: CURRENT TOTALS WITH SMALL TOTAL LOADED SUBTEXT */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>

        {/* GOLD KPI CARD */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1.5px solid #fde68a',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🥇</span> {lang === 'TE' ? 'ప్రస్తుత బంగారం స్టాక్' : 'Total Current Gold Stock'}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#fde68a', color: '#78350f', padding: '1px 6px', borderRadius: '4px' }}>
                LIVE STOCK
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#78350f', marginTop: '4px' }}>
              {metrics?.currentGoldStock?.toFixed(3) || '0.000'} <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>g</span>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #fcd34d', fontSize: '0.70rem', color: '#b45309', fontWeight: 700 }}>
            📥 Total Gold Loaded: <strong>+{metrics?.totalLoadedGold?.toFixed(3) || '0.000'} g</strong>{' '}
            <span style={{ fontSize: '0.65rem', color: '#92400e', fontWeight: 600 }}>({metrics?.totalLoadedGoldCount || 0} entries)</span>
          </div>
        </div>

        {/* SILVER KPI CARD */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1.5px solid #bae6fd',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🥈</span> {lang === 'TE' ? 'ప్రస్తుత వెండి స్టాక్' : 'Total Current Silver Stock'}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#bae6fd', color: '#0c4a6e', padding: '1px 6px', borderRadius: '4px' }}>
                LIVE STOCK
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0c4a6e', marginTop: '4px' }}>
              {metrics?.currentSilverStock?.toFixed(3) || '0.000'} <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>g</span>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #7dd3fc', fontSize: '0.70rem', color: '#0284c7', fontWeight: 700 }}>
            📥 Total Silver Loaded: <strong>+{metrics?.totalLoadedSilver?.toFixed(3) || '0.000'} g</strong>{' '}
            <span style={{ fontSize: '0.65rem', color: '#0369a1', fontWeight: 600 }}>({metrics?.totalLoadedSilverCount || 0} entries)</span>
          </div>
        </div>

        {/* CASH KPI CARD */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1.5px solid #bbf7d0',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>💵</span> {lang === 'TE' ? 'ప్రస్తుత డ్రాయర్ నగదు' : 'Total Current Cash in Drawer'}
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#bbf7d0', color: '#14532d', padding: '1px 6px', borderRadius: '4px' }}>
                DRAWER CASH
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#14532d', marginTop: '4px' }}>
              ₹{(metrics?.currentCashBalance || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #86efac', fontSize: '0.70rem', color: '#16a34a', fontWeight: 700 }}>
            📥 Total Cash Loaded: <strong>+₹{(metrics?.totalLoadedCash || 0).toLocaleString('en-IN')}</strong>{' '}
            <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 600 }}>({metrics?.totalLoadedCashCount || 0} entries)</span>
          </div>
        </div>

        {/* TOTAL ENTRIES SUMMARY CARD */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>📊</span> Total Loading Records
              </span>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, background: '#e2e8f0', color: '#1e293b', padding: '1px 6px', borderRadius: '4px' }}>
                ALL LOGS
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
              {metrics?.totalEntriesCount || 0} <span style={{ fontSize: '0.80rem', fontWeight: 600, color: '#64748b' }}>Records</span>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
            All-time Gold, Silver & Cash load logs
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MAIN TABLE CARD WITH FILTER CONTROLS                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '0.75rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
        }}
      >
        {/* Top Control Bar: Search & Type Pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.75rem' }}>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.72rem' }}
            />
            <input
              type="text"
              placeholder={lang === 'TE' ? 'శోధించండి...' : 'Search item, category, remarks...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                borderRadius: '6px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.75rem',
                outline: 'none',
                background: '#ffffff',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.55rem',
                  color: '#475569',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter Pills on Right */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              style={{
                padding: '5px 12px',
                borderRadius: '5px',
                border: 'none',
                background: typeFilter === 'ALL' ? '#0f172a' : 'transparent',
                color: typeFilter === 'ALL' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              📋 All ({loadings.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('GOLD')}
              style={{
                padding: '5px 12px',
                borderRadius: '5px',
                border: 'none',
                background: typeFilter === 'GOLD' ? '#d97706' : 'transparent',
                color: typeFilter === 'GOLD' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              🥇 Gold ({metrics?.totalLoadedGoldCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('SILVER')}
              style={{
                padding: '5px 12px',
                borderRadius: '5px',
                border: 'none',
                background: typeFilter === 'SILVER' ? '#0284c7' : 'transparent',
                color: typeFilter === 'SILVER' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              🥈 Silver ({metrics?.totalLoadedSilverCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('CASH')}
              style={{
                padding: '5px 12px',
                borderRadius: '5px',
                border: 'none',
                background: typeFilter === 'CASH' ? '#16a34a' : 'transparent',
                color: typeFilter === 'CASH' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              💵 Cash ({metrics?.totalLoadedCashCount || 0})
            </button>
          </div>

        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. LOADING TABLE                                             */}
        {/* ───────────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.6rem', color: '#0284c7', marginBottom: '8px' }} />
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Loading history records...</div>
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '2.2rem', color: '#cbd5e1', marginBottom: '10px' }} />
            <div style={{ fontWeight: 800, fontSize: '0.90rem', color: '#475569' }}>No Loading History Found</div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
              There are no stock or cash loading records matching your search or filters.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', width: '5%', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', width: '18%', textAlign: 'center' }}>Date & Time</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', width: '13%', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', width: '20%', textAlign: 'center' }}>Item / Source</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', width: '13%', textAlign: 'center' }}>Category</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', width: '15%', textAlign: 'center' }}>Loaded Quantity / Amount</th>
                  <th style={{ padding: '10px 14px', fontWeight: 800, color: '#334155', width: '16%', textAlign: 'center' }}>Notes & Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((entry, idx) => {
                  const isGold = entry.load_type === 'GOLD';
                  const isSilver = entry.load_type === 'SILVER';
                  const isCash = entry.load_type === 'CASH';

                  return (
                    <tr
                      key={entry.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa')}
                    >
                      {/* S.No */}
                      <td style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>
                        {idx + 1}
                      </td>

                      {/* Date & Time (IST) */}
                      <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className="fa-regular fa-clock" style={{ color: '#94a3b8', fontSize: '0.70rem' }} />
                          {formatISTDateTime(entry.created_at)}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {isGold && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              background: '#fef3c7',
                              color: '#92400e',
                              fontWeight: 800,
                              fontSize: '0.70rem',
                              border: '1px solid #fde68a',
                            }}
                          >
                            🥇 Gold Stock
                          </span>
                        )}
                        {isSilver && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 800,
                              fontSize: '0.70rem',
                              border: '1px solid #bae6fd',
                            }}
                          >
                            🥈 Silver Stock
                          </span>
                        )}
                        {isCash && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              background: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 800,
                              fontSize: '0.70rem',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            💵 Cash Inflow
                          </span>
                        )}
                      </td>

                      {/* Item / Source */}
                      <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 800, textAlign: 'center' }}>
                        {entry.item_name}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>
                        <span style={{ padding: '3px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.70rem', display: 'inline-block' }}>
                          {entry.item_category}
                        </span>
                      </td>

                      {/* Loaded Amount / Weight */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {isCash ? (
                          <span style={{ color: '#15803d', fontWeight: 900, fontSize: '0.82rem' }}>
                            +₹{entry.loaded_cash_amount.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: isGold ? '#b45309' : '#0369a1',
                              fontWeight: 900,
                              fontSize: '0.82rem',
                            }}
                          >
                            +{entry.loaded_weight_grams.toFixed(3)} g
                          </span>
                        )}
                      </td>

                      {/* Notes / Remarks */}
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: '0.72rem', textAlign: 'center' }}>
                        {entry.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
          <div>
            Showing <strong>{filteredList.length}</strong> of <strong>{loadings.length}</strong> total loading records
          </div>

        </div>

      </div>

    </div>
  );
};
