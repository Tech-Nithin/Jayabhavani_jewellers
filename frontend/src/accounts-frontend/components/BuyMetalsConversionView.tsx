import React, { useState, useEffect, useMemo } from 'react';

interface BuyMetalItem {
  id: string;
  record_uuid: string;
  customer_billing_uuid: string;
  customer_name: string;
  customer_phone: string;
  bill_date: string;
  created_at: string;
  item_name: string;
  metal_type: string;
  gross_weight: number;
  only_metal_weight: number;
  purity_percentage: number;
  pure_weight: number;
  payout_amount: number;
  is_converted: 'yes' | 'no';
  converted_at: string | null;
}

interface ConversionMetrics {
  availableScrap: {
    goldGross: number;
    goldPure: number;
    silverGross: number;
    silverPure: number;
    count: number;
  };
  convertedScrap: {
    goldGross: number;
    goldPure: number;
    silverGross: number;
    silverPure: number;
    count: number;
  };
  inventoryPureStock: {
    goldGross: number;
    goldPure: number;
    silverGross: number;
    silverPure: number;
  };
  totalScrapPayout: number;
  totalItemsCount: number;
}

interface BuyMetalsConversionProps {
  selectedDate: string;
  dateFilterMode: string;
  startDate?: string;
  endDate?: string;
  apiUrl?: string;
}

export const BuyMetalsConversionView: React.FC<BuyMetalsConversionProps> = ({
  selectedDate,
  dateFilterMode,
  startDate,
  endDate,
  apiUrl = '',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<BuyMetalItem[]>([]);
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);

  // Filters
  const [metalFilter, setMetalFilter] = useState<'ALL' | 'GOLD' | 'SILVER'>('ALL');
  const [conversionFilter, setConversionFilter] = useState<'NON_CONVERTED' | 'CONVERTED' | 'ALL'>('NON_CONVERTED');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Checkboxes
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Date Picker Modal State
  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [conversionTargetUuids, setConversionTargetUuids] = useState<string[]>([]);
  const [pickedConversionDate, setPickedConversionDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );

  const getCleanApiBase = () => {
    const raw = (apiUrl || '').trim().replace(/\/+$/, '');
    if (!raw) return '/api';
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  };
  const base = getCleanApiBase();

  const fetchConversionData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFilterMode === 'ALL') {
        params.append('date', 'all');
      } else if (dateFilterMode === 'CUSTOM' && startDate && endDate) {
        params.append('date', 'range');
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      } else if (dateFilterMode === 'YESTERDAY') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        params.append('date', d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      } else if (dateFilterMode === 'MONTH') {
        const d = new Date();
        d.setDate(1);
        params.append('date', 'range');
        params.append('startDate', d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
        params.append('endDate', new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      } else if (selectedDate) {
        params.append('date', selectedDate);
      }

      const endpoint = `${base}/accounts/buy-metals-conversion?${params.toString()}`;
      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.success) {
        setItems(data.items || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Failed to fetch buy metals conversion data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversionData();
    setSelectedUuids([]);
  }, [selectedDate, startDate, endDate, dateFilterMode]);

  // Filtered & Descending-Sorted Items (Latest at Top)
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      // 1. Metal Filter
      const mType = (item.metal_type || '').toUpperCase();
      if (metalFilter === 'GOLD' && mType.includes('SILVER')) return false;
      if (metalFilter === 'SILVER' && !mType.includes('SILVER')) return false;

      // 2. Conversion Filter
      const isConv = item.is_converted === 'yes';
      if (conversionFilter === 'NON_CONVERTED' && isConv) return false;
      if (conversionFilter === 'CONVERTED' && !isConv) return false;

      // 3. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCust = (item.customer_name || '').toLowerCase().includes(term);
        const matchPhone = (item.customer_phone || '').includes(term);
        const matchItem = (item.item_name || '').toLowerCase().includes(term);
        if (!matchCust && !matchPhone && !matchItem) return false;
      }

      return true;
    });

    // Descending Sort: Latest records at top
    return [...list].sort((a, b) => {
      if (conversionFilter === 'CONVERTED') {
        const dateA = new Date(a.converted_at || a.bill_date || a.created_at || 0).getTime();
        const dateB = new Date(b.converted_at || b.bill_date || b.created_at || 0).getTime();
        return dateB - dateA;
      }
      const dateA = new Date(a.bill_date ? `${String(a.bill_date).split('T')[0]}T12:00:00` : (a.created_at || 0)).getTime();
      const dateB = new Date(b.bill_date ? `${String(b.bill_date).split('T')[0]}T12:00:00` : (b.created_at || 0)).getTime();
      return dateB - dateA;
    });
  }, [items, metalFilter, conversionFilter, searchTerm]);

  // Open Date Modal for conversion
  const promptConvertDate = (uuids: string[]) => {
    if (uuids.length === 0) return;
    setConversionTargetUuids(uuids);
    setPickedConversionDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    setIsDateModalOpen(true);
  };

  // Confirm Conversion with picked IST date
  const confirmConversion = async () => {
    if (conversionTargetUuids.length === 0) return;

    try {
      setProcessingBulk(true);
      const res = await fetch(`${base}/accounts/buy-metals-conversion/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_uuids: conversionTargetUuids,
          is_converted: 'yes',
          converted_date: pickedConversionDate,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setActionSuccessMsg(
          `✨ Successfully converted ${resData.updatedCount} item(s) on ${formatISTDateOnly(pickedConversionDate)}!`
        );
        setIsDateModalOpen(false);
        setConversionTargetUuids([]);
        setSelectedUuids([]);
        await fetchConversionData();
        setTimeout(() => setActionSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(`Failed to convert items: ${err.message}`);
    } finally {
      setProcessingBulk(false);
    }
  };

  // Handle Revert (No date needed)
  const handleRevert = async (uuids: string[]) => {
    if (uuids.length === 0) return;

    try {
      setProcessingBulk(true);
      const res = await fetch(`${base}/accounts/buy-metals-conversion/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_uuids: uuids,
          is_converted: 'no',
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setActionSuccessMsg(`↩️ Reverted ${resData.updatedCount} item(s) back to AVAILABLE STOCK.`);
        setSelectedUuids([]);
        await fetchConversionData();
        setTimeout(() => setActionSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(`Failed to revert items: ${err.message}`);
    } finally {
      setProcessingBulk(false);
    }
  };

  // Single Item Toggle
  const handleSingleAction = (item: BuyMetalItem) => {
    if (item.is_converted === 'yes') {
      handleRevert([item.record_uuid]);
    } else {
      promptConvertDate([item.record_uuid]);
    }
  };

  // Helpers for IST date display
  const formatISTDateOnly = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch {
      return dateStr;
    }
  };

  // Select / Deselect All
  const isAllSelected = filteredItems.length > 0 && filteredItems.every((it) => selectedUuids.includes(it.record_uuid));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUuids([]);
    } else {
      setSelectedUuids(filteredItems.map((it) => it.record_uuid));
    }
  };

  const toggleSelectOne = (uuid: string) => {
    setSelectedUuids((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP LIVE INVENTORY SHOWCASE PURE STOCK BANNER               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          border: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🏬</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.3px' }}>
                Live Inventory Showcase Pure Stock (Selected Date: {selectedDate})
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
              Real-time gold & silver pure fine weights currently present in shop inventory for billing
            </p>
          </div>

          <button
            type="button"
            onClick={fetchConversionData}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-rotate-right" /> Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Gold Inventory Pure Stock Card */}
          <div style={{ background: 'rgba(254, 243, 199, 0.08)', borderRadius: '12px', padding: '12px 14px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <div style={{ fontSize: '0.75rem', color: '#fde68a', fontWeight: 800 }}>🥇 Gold Inventory Showcase Stock</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
              {metrics?.inventoryPureStock?.goldGross?.toFixed(3) || '0.000'} g
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fef3c7', marginTop: '3px', fontWeight: 700 }}>
              🌟 Pure Fine Wt (22k / 91.6%): <strong>{metrics?.inventoryPureStock?.goldPure?.toFixed(3) || '0.000'} g</strong>
            </div>
          </div>

          {/* Silver Inventory Pure Stock Card */}
          <div style={{ background: 'rgba(224, 242, 254, 0.08)', borderRadius: '12px', padding: '12px 14px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ fontSize: '0.75rem', color: '#bae6fd', fontWeight: 800 }}>🥈 Silver Inventory Showcase Stock</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
              {metrics?.inventoryPureStock?.silverGross?.toFixed(3) || '0.000'} g
            </div>
            <div style={{ fontSize: '0.72rem', color: '#e0f2fe', marginTop: '3px', fontWeight: 700 }}>
              🌟 Pure Fine Wt (100%): <strong>{metrics?.inventoryPureStock?.silverPure?.toFixed(3) || '0.000'} g</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. BOUGHT METALS & CONVERSION SUMMARY KPIS                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Available Scrap Gold in Stock Card */}
        <div style={{ background: '#fffbeb', borderRadius: '14px', padding: '14px 16px', border: '1.5px solid #fef3c7', boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 800 }}>🥇 Available Scrap Gold (In Stock)</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px' }}>
              UNCONVERTED
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#78350f', marginTop: '6px' }}>
            {metrics?.availableScrap?.goldGross?.toFixed(3) || '0.000'} g
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '4px', fontWeight: 700 }}>
            ✨ Pure Metal Wt: <strong>{metrics?.availableScrap?.goldPure?.toFixed(3) || '0.000'} g</strong>
          </div>
        </div>

        {/* Available Scrap Silver in Stock Card */}
        <div style={{ background: '#f0f9ff', borderRadius: '14px', padding: '14px 16px', border: '1.5px solid #bae6fd', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 800 }}>🥈 Available Scrap Silver (In Stock)</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px' }}>
              UNCONVERTED
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0c4a6e', marginTop: '6px' }}>
            {metrics?.availableScrap?.silverGross?.toFixed(3) || '0.000'} g
          </div>
          <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: '4px', fontWeight: 700 }}>
            ✨ Pure Metal Wt: <strong>{metrics?.availableScrap?.silverPure?.toFixed(3) || '0.000'} g</strong>
          </div>
        </div>

        {/* Total Converted Scrap Card */}
        <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '14px 16px', border: '1.5px solid #bbf7d0', boxShadow: '0 2px 8px rgba(22, 101, 52, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 800 }}>🔄 Total Converted Metals</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>
              CONVERTED
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#14532d', marginTop: '6px' }}>
            {((metrics?.convertedScrap?.goldGross || 0) + (metrics?.convertedScrap?.silverGross || 0)).toFixed(3)} g
          </div>
          <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '4px', fontWeight: 700 }}>
            Gold: <strong>{metrics?.convertedScrap?.goldGross?.toFixed(3) || '0.000'}g</strong> · Silver: <strong>{metrics?.convertedScrap?.silverGross?.toFixed(3) || '0.000'}g</strong>
          </div>
        </div>

        {/* Total Payout to Customers Card */}
        <div style={{ background: '#fef2f2', borderRadius: '14px', padding: '14px 16px', border: '1.5px solid #fecaca', boxShadow: '0 2px 8px rgba(220, 38, 38, 0.05)' }}>
          <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 800 }}>💵 Total Customer Scrap Paid</span>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#991b1b', marginTop: '6px' }}>
            ₹{(metrics?.totalScrapPayout || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '4px', fontWeight: 700 }}>
            Total Items: <strong>{metrics?.totalItemsCount || 0} purchases</strong>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MAIN CONVERSION TABLE & CONTROLS CONTAINER                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        
        {/* 1. Header Line with Title & In-Stock/Converted/All Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-scale-balanced" style={{ color: '#d97706' }} />
              Bought Scrap Metal Stock & Conversion Ledger
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
              Select bought items and convert them into stock / refining batches
            </p>
          </div>

          {/* Conversion Switch Tabs (IN STOCK | CONVERTED | ALL ITEMS) in Heading Line */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setConversionFilter('NON_CONVERTED')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: conversionFilter === 'NON_CONVERTED' ? '#d97706' : 'transparent',
                color: conversionFilter === 'NON_CONVERTED' ? '#ffffff' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🟡</span> In Stock ({metrics?.availableScrap?.count || 0})
            </button>

            <button
              type="button"
              onClick={() => setConversionFilter('CONVERTED')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: conversionFilter === 'CONVERTED' ? '#15803d' : 'transparent',
                color: conversionFilter === 'CONVERTED' ? '#ffffff' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🟢</span> Converted ({metrics?.convertedScrap?.count || 0})
            </button>

            <button
              type="button"
              onClick={() => setConversionFilter('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: conversionFilter === 'ALL' ? '#0f172a' : 'transparent',
                color: conversionFilter === 'ALL' ? '#ffffff' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📋</span> All Items ({items.length})
            </button>
          </div>

          {/* Action Success Alert Notification */}
          {actionSuccessMsg && (
            <div style={{ padding: '6px 12px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '0.78rem', fontWeight: 800 }}>
              {actionSuccessMsg}
            </div>
          )}
        </div>

        {/* 2. Sub-Bar: Compact Search Bar on Left + Metal Filter Pills on Full Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Compact Search Input (Just above table) */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }} />
            <input
              type="text"
              placeholder="Search customer, item, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: '8px',
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
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.60rem',
                  color: '#475569',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Metal Filter Pills on Full Right Side */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setMetalFilter('ALL')}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                background: metalFilter === 'ALL' ? '#0f172a' : 'transparent',
                color: metalFilter === 'ALL' ? '#ffffff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-layer-group" style={{ marginRight: '4px' }} /> All Metals
            </button>
            <button
              type="button"
              onClick={() => setMetalFilter('GOLD')}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                background: metalFilter === 'GOLD' ? '#d97706' : 'transparent',
                color: metalFilter === 'GOLD' ? '#ffffff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              🥇 Gold
            </button>
            <button
              type="button"
              onClick={() => setMetalFilter('SILVER')}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: 'none',
                background: metalFilter === 'SILVER' ? '#0284c7' : 'transparent',
                color: metalFilter === 'SILVER' ? '#ffffff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              🥈 Silver
            </button>
          </div>
        </div>

        {/* Bulk Action Bar (When items are checked) */}
        {selectedUuids.length > 0 && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#fffbe6',
              border: '1.5px solid #fde68a',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '0.82rem', fontWeight: 800 }}>
              <span>☑️ {selectedUuids.length} item(s) selected</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {conversionFilter !== 'CONVERTED' && (
                <button
                  type="button"
                  disabled={processingBulk}
                  onClick={() => promptConvertDate(selectedUuids)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#15803d',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.80rem',
                    cursor: processingBulk ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                  }}
                >
                  <i className="fa-solid fa-calendar-check" />
                  Mark Selected as Converted
                </button>
              )}

              {conversionFilter === 'CONVERTED' && (
                <button
                  type="button"
                  disabled={processingBulk}
                  onClick={() => handleRevert(selectedUuids)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#d97706',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.80rem',
                    cursor: processingBulk ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fa-solid fa-rotate-left" />
                  {processingBulk ? 'Updating...' : 'Revert Selected to In-Stock'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedUuids([])}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#64748b',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4. DATA TABLE                                                */}
        {/* ───────────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '8px' }} />
            <div>Loading bought metals & conversion records...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', marginBottom: '8px', color: '#cbd5e1' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>No {conversionFilter === 'CONVERTED' ? 'converted' : 'available scrap'} items found for this selection.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-responsive-font" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 10px', width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '10px 10px' }}>S.No</th>
                  <th style={{ padding: '10px 10px' }}>Date (IST)</th>
                  <th style={{ padding: '10px 10px' }}>Customer Name</th>
                  <th style={{ padding: '10px 10px' }}>Metal</th>
                  <th style={{ padding: '10px 10px' }}>Scrap Item</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Gross Wt (g)</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Purity %</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', color: '#15803d' }}>Pure Wt (g)</th>
                  <th style={{ padding: '10px 10px', textAlign: 'right' }}>Payout (₹)</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center' }}>Conversion Status</th>
                  <th style={{ padding: '10px 10px', textAlign: 'center' }}>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isSelected = selectedUuids.includes(item.record_uuid);
                  const isConverted = item.is_converted === 'yes';
                  const metal = (item.metal_type || 'GOLD').toUpperCase();
                  const isSilver = metal.includes('SILVER');

                  const displayBillDate = formatISTDateOnly(item.bill_date || item.created_at);
                  const displayConvertedDate = item.converted_at ? formatISTDateOnly(item.converted_at) : null;

                  return (
                    <tr
                      key={item.record_uuid || item.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#fffbe6' : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.record_uuid)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* S.No */}
                      <td style={{ padding: '10px 10px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>

                      {/* Date */}
                      <td style={{ padding: '10px 10px', color: '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {displayBillDate}
                      </td>

                      {/* Customer Details */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.customer_name || 'Walk-in Customer'}</div>
                        {item.customer_phone && item.customer_phone !== '-' && (
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>📞 {item.customer_phone}</div>
                        )}
                      </td>

                      {/* Metal */}
                      <td style={{ padding: '10px 10px' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isSilver ? '#f0f9ff' : '#fffbe6',
                            color: isSilver ? '#0369a1' : '#b45309',
                            border: `1px solid ${isSilver ? '#bae6fd' : '#fde68a'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isSilver ? '🥈 SILVER' : '🥇 GOLD'}
                        </span>
                      </td>

                      {/* Scrap Item */}
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: '#334155' }}>
                        {item.item_name}
                      </td>

                      {/* Gross Weight */}
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {Number(item.gross_weight || 0).toFixed(3)} g
                      </td>

                      {/* Purity % */}
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#d97706', whiteSpace: 'nowrap' }}>
                        {Number(item.purity_percentage || 0).toFixed(1)}%
                      </td>

                      {/* Pure Weight */}
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 900, color: '#15803d', background: '#f0fdf4', whiteSpace: 'nowrap' }}>
                        {Number(item.pure_weight || 0).toFixed(3)} g
                      </td>

                      {/* Payout */}
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#991b1b', whiteSpace: 'nowrap' }}>
                        ₹{Number(item.payout_amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Conversion Status Badge with IST Date */}
                      <td style={{ padding: '10px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isConverted ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 900,
                                background: '#dcfce7',
                                color: '#15803d',
                                border: '1px solid #86efac',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>🟢</span> CONVERTED
                            </span>
                            {displayConvertedDate && (
                              <span style={{ fontSize: '0.60rem', color: '#166534', fontWeight: 700 }}>
                                on {displayConvertedDate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>🟡</span> IN STOCK
                          </span>
                        )}
                      </td>

                      {/* Quick 1-Click Action */}
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleSingleAction(item)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            background: isConverted ? '#fffbeb' : '#f0fdf4',
                            color: isConverted ? '#b45309' : '#15803d',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isConverted ? 'Revert' : 'Convert ➔'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900 }}>
                <tr>
                  <td colSpan={6} style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>
                    TOTAL ({filteredItems.length} items):
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>
                    {filteredItems.reduce((s, i) => s + Number(i.gross_weight || 0), 0).toFixed(3)} g
                  </td>
                  <td></td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#15803d' }}>
                    {filteredItems.reduce((s, i) => s + Number(i.pure_weight || 0), 0).toFixed(3)} g
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#991b1b' }}>
                    ₹{filteredItems.reduce((s, i) => s + Number(i.payout_amount || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. CONVERSION DATE PICKER MODAL (IST)                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isDateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
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
              maxWidth: '420px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📅</span> Select Conversion Date (IST)
              </h4>
              <button
                type="button"
                onClick={() => setIsDateModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.80rem', color: '#64748b', lineHeight: '1.4' }}>
              Choose the exact date when these <strong>{conversionTargetUuids.length}</strong> selected bought metal item(s) were melted or converted into stock:
            </p>

            {/* Date Input Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                Conversion Date (IST):
              </label>
              <input
                type="date"
                value={pickedConversionDate}
                onChange={(e) => setPickedConversionDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.90rem',
                  fontWeight: 700,
                  outline: 'none',
                  background: '#f8fafc',
                  color: '#0f172a',
                }}
              />
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsDateModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingBulk || !pickedConversionDate}
                onClick={confirmConversion}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#15803d',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: processingBulk ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(21, 128, 61, 0.3)',
                }}
              >
                <i className="fa-solid fa-check" />
                {processingBulk ? 'Converting...' : 'Confirm Conversion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
