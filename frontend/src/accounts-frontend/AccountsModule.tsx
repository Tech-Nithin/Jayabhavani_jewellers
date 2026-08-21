import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { HeaderRefreshButton } from '../components/HeaderRefreshButton';
import type { Language } from '../utils/translations';
import { InvoiceDetailsView } from '../billing-frontend/components/InvoiceDetailsView';
import { useMetalRates } from '../utils/metalRatesStore';

interface AccountsModuleProps {
  lang?: Language;
  onNavigateToBilling?: (item?: any) => void;
}

type AccountTab = 'logbook' | 'stock' | 'cash' | 'scrap' | 'udhaari' | 'profit';

const getTodayIST = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export const AccountsModule: React.FC<AccountsModuleProps> = ({ lang = 'EN', onNavigateToBilling: _onNavigateToBilling }) => {
  const rates = useMetalRates() as any;
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST);
  const [dateFilterMode, setDateFilterMode] = useState<'TODAY' | 'ALL' | 'CUSTOM' | 'DATE'>('TODAY');
  const [startDate, setStartDate] = useState<string>(getTodayIST);
  const [endDate, setEndDate] = useState<string>(getTodayIST);
  const [activeSubTab, setActiveSubTab] = useState<AccountTab>('logbook');
  const [loading, setLoading] = useState(false);
  const [selectedBillModalItem, setSelectedBillModalItem] = useState<any | null>(null);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [logBookViewMode, setLogBookViewMode] = useState<'TABLE' | 'CARD'>('TABLE');
  const [kpiDrillFilter, setKpiDrillFilter] = useState<null | 'ORDER' | 'SELL' | 'BUY' | 'EXCHANGE'>(null);
  const [kpiDrillFilter2, setKpiDrillFilter2] = useState<null | 'GOLD_STOCK' | 'SILVER_STOCK' | 'CASH_BALANCE'>(null);
  const [kpiDrillFilter3, setKpiDrillFilter3] = useState<null | 'PERIOD_GOLD' | 'PERIOD_SILVER' | 'PERIOD_CASH' | 'PERIOD_FINANCE'>(null);

  const [stockViewMode, setStockViewMode] = useState<'TOTAL' | 'TODAY'>('TOTAL');
  const [metalCategoryFilter, setMetalCategoryFilter] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [oldMetalVaultItems, setOldMetalVaultItems] = useState<any[]>([]);

  // Day Book Data State
  const [logBookTimeline, setLogBookTimeline] = useState<any[]>([]);
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [scrapSummary, setScrapSummary] = useState<any>(null);
  const [udhaariSummary, setUdhaariSummary] = useState<any>(null);
  const [profitSummary, setProfitSummary] = useState<any>(null);

  const sortedTimeline = [...logBookTimeline].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return sortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
  });

  const kpiMetrics = React.useMemo(() => {
    let orderCount = 0;
    let sellCount = 0;
    let buyCount = 0;
    let exchangeCount = 0;
    let goldWtAdded = 0;
    let silverWtAdded = 0;
    let goldPcsAdded = 0;
    let silverPcsAdded = 0;
    let totalCashCollected = 0;
    let totalFinanceIssued = 0;

    logBookTimeline.forEach((item: any) => {
      const type = (item.type || '').toUpperCase();
      const hasScrapBought = (item.details || '').includes('Bought:') || type === 'BUY';

      if (type === 'ORDER') orderCount++;
      if (type === 'SELL') sellCount++;
      if (type === 'EXCHANGE') exchangeCount++;
      if (hasScrapBought) buyCount++;

      if (type === 'INVENTORY') {
        const isGold = (item.category || '').toUpperCase().includes('GOLD');
        const wt = Number(item.weight_grams || 0);
        const pcs = Number(item.raw_product?.initial_quantity || item.raw_product?.stock_quantity || 1);
        if (isGold) {
          goldWtAdded += wt;
          goldPcsAdded += pcs;
        } else {
          silverWtAdded += wt;
          silverPcsAdded += pcs;
        }
      }

      if (type === 'KARIGAR') {
        const isAdminToWorker = (item.direction || '').toUpperCase().includes('ADMIN_TO_WORKER') || (item.title || '').startsWith('Admin');
        const metalType = (item.transfer_item_mode || item.category || 'GOLD').toUpperCase();
        const wt = Number(item.weight_grams || 0);
        const amt = Number(item.amount || 0);

        if (isAdminToWorker) {
          // Admin sent to worker -> Deduct from shop stock & cash
          if (metalType.includes('GOLD')) goldWtAdded -= wt;
          else if (metalType.includes('SILVER')) silverWtAdded -= wt;
          if (metalType.includes('CASH') || amt > 0) totalCashCollected -= amt;
        } else {
          // Worker delivered to admin -> Add to shop stock & cash
          if (metalType.includes('GOLD')) goldWtAdded += wt;
          else if (metalType.includes('SILVER')) silverWtAdded += wt;
          if (metalType.includes('CASH') || amt > 0) totalCashCollected += amt;
        }
      }

      if (item.paid_amount > 0 && type !== 'FINANCE' && type !== 'BUY' && type !== 'INVENTORY' && type !== 'KARIGAR') {
        totalCashCollected += Number(item.paid_amount || 0);
      }
    });

    return {
      orderCount,
      sellCount,
      buyCount,
      exchangeCount,
      goldWtAdded: Number(goldWtAdded.toFixed(3)),
      silverWtAdded: Number(silverWtAdded.toFixed(3)),
      goldPcsAdded,
      silverPcsAdded,
      totalCashCollected,
      totalFinanceIssued,
    };
  }, [logBookTimeline]);

  // KPI Drill-Down filtered entries
  const kpiDrillItems = React.useMemo(() => {
    if (!kpiDrillFilter) return [];
    return logBookTimeline.filter((item: any) => {
      const type = (item.type || '').toUpperCase();
      const details = (item.details || '');
      if (kpiDrillFilter === 'ORDER') return type === 'ORDER';
      if (kpiDrillFilter === 'SELL') return type === 'SELL' || type === 'EXCHANGE';
      if (kpiDrillFilter === 'BUY') return type === 'BUY' || details.includes('Bought:') || type === 'EXCHANGE';
      if (kpiDrillFilter === 'EXCHANGE') return type === 'EXCHANGE';
      return false;
    });
  }, [logBookTimeline, kpiDrillFilter]);

  // Card 2 — Cumulative stock balance from all inventory products
  const stockBalance = React.useMemo(() => {
    let goldGrams = 0; let goldPcs = 0;
    let silverGrams = 0; let silverPcs = 0;
    (inventoryProducts || []).forEach((p: any) => {
      const metal = (p.item_type || p.metal_type || '').toUpperCase();
      const wt = Number(p.stock_quantity || p.weight_grams || p.net_weight || 0);
      const pcs = Number(p.current_quantity || p.initial_quantity || 0);
      if (metal.includes('GOLD')) { goldGrams += wt; goldPcs += pcs; }
      else if (metal.includes('SILVER')) { silverGrams += wt; silverPcs += pcs; }
    });
    const cashInHand = cashSummary?.expectedClosingCash ?? 0;
    return {
      goldGrams: Number(goldGrams.toFixed(3)), goldPcs,
      silverGrams: Number(silverGrams.toFixed(3)), silverPcs,
      cashInHand,
    };
  }, [inventoryProducts, cashSummary]);



  // Ref Guard to prevent duplicate network calls
  const isFetchingRef = useRef(false);

  const fetchDayBookData = async (force: boolean = false) => {
    if (isFetchingRef.current && !force) return;
    setLoading(true);
    try {
      let queryUrl = `${API_BASE}/billing/accounts/day-book?section=all`;
      if (dateFilterMode === 'ALL') {
        queryUrl += `&date=all`;
      } else if (dateFilterMode === 'CUSTOM' && startDate && endDate) {
        queryUrl += `&date=range&startDate=${startDate}&endDate=${endDate}`;
      } else {
        queryUrl += `&date=${selectedDate}`;
      }

      const [resBook, resProd] = await Promise.all([
        fetch(queryUrl),
        fetch(`${API_BASE}/inventory/products`),
      ]);

      const dataBook = await resBook.json();
      const dataProd = await resProd.json();

      if (dataBook.success) {
        setLogBookTimeline(dataBook.logBookTimeline || []);
        setCashSummary(dataBook.cashSummary || null);
        setScrapSummary(dataBook.scrapSummary || null);
        setOldMetalVaultItems(dataBook.oldMetalVaultItems || []);
        setUdhaariSummary(dataBook.udhaariSummary || null);
        setProfitSummary(dataBook.profitSummary || null);
      }

      if (dataProd.success && Array.isArray(dataProd.products)) {
        setInventoryProducts(dataProd.products);
      }
    } catch (err) {
      console.error('Failed to fetch Day Book Accounts or Inventory:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  React.useEffect(() => {
    fetchDayBookData(true);
  }, [selectedDate, dateFilterMode]);

  // Calculate ornament-wise stock grouped by Category & Metal (GOLD vs SILVER)
  const ornamentsStockList = React.useMemo(() => {
    const list = inventoryProducts.filter((p) => {
      const metalMatch = (p.item_type || 'GOLD').toUpperCase() === metalCategoryFilter;
      if (stockViewMode === 'TODAY') {
        const prodDate = p.created_at ? p.created_at.split('T')[0] : '';
        return metalMatch && prodDate === selectedDate;
      }
      return metalMatch;
    });

    const categoryMap: Record<string, { category: string; totalWeight: number; totalPcs: number; hasPcs: boolean; metalType: string; dateAdded: string }> = {};

    list.forEach((prod) => {
      const catName = prod.category || prod.name || 'General Ornaments';
      const key = `${prod.item_type || 'GOLD'}_${catName}`.toUpperCase();
      const weight = Number(prod.weight_from_grams || prod.weight_grams || 0);
      const stockQty = Number(prod.stock_quantity || prod.initial_quantity || 0);
      const createdDate = prod.created_at ? prod.created_at.split('T')[0] : selectedDate;

      if (!categoryMap[key]) {
        categoryMap[key] = {
          category: catName,
          metalType: (prod.item_type || 'GOLD').toUpperCase(),
          totalWeight: 0,
          totalPcs: 0,
          hasPcs: stockQty > 0,
          dateAdded: createdDate,
        };
      }

      categoryMap[key].totalWeight += weight * Math.max(1, stockQty);
      if (stockQty > 0) {
        categoryMap[key].totalPcs += stockQty;
        categoryMap[key].hasPcs = true;
      }
    });

    return Object.values(categoryMap).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [inventoryProducts, stockViewMode, metalCategoryFilter, selectedDate]);

  // EOD Reorder Restock List: Sold Items Today
  const eodReorderList = React.useMemo(() => {
    const soldItems: any[] = [];
    logBookTimeline.forEach((entry) => {
      if (entry.type === 'SELL' || entry.type === 'ORDER') {
        const rawInv = entry.raw_invoice;
        if (rawInv?.receipt_json_data?.items) {
          rawInv.receipt_json_data.items.forEach((it: any) => {
            if (it.item_type === 'SELL') {
              soldItems.push({
                product_name: it.product_name || entry.details,
                weight_grams: Number(it.weight_grams || 0),
                metal_type: (it.metal_type || entry.category || 'GOLD').toUpperCase(),
              });
            }
          });
        } else {
          soldItems.push({
            product_name: entry.title || 'Jewellery Item',
            weight_grams: entry.weight_grams || 0,
            metal_type: entry.category || 'GOLD',
          });
        }
      }
    });
    return soldItems;
  }, [logBookTimeline]);

  useEffect(() => {
    fetchDayBookData();
  }, [selectedDate]);

  const handleTabChange = (tab: AccountTab) => {
    setActiveSubTab(tab);
  };

  // Full-Page Invoice Details View (Exact same component as Purchase History)
  if (selectedBillModalItem) {
    const rawInv = selectedBillModalItem.raw_invoice;
    const rawOrd = selectedBillModalItem.raw_order;
    const isOrderType = selectedBillModalItem.type === 'ORDER';

    // Parse stored JSON payload from backend DB
    let receiptPayload = rawInv?.receipt_json_data || rawOrd?.receipt_json_data;
    if (typeof receiptPayload === 'string') {
      try { receiptPayload = JSON.parse(receiptPayload); } catch (e) {}
    }

    const custRecord: any = {
      phone: rawInv?.customer_phone || rawOrd?.customer_phone || selectedBillModalItem.customer_phone || '9999999999',
      name: rawInv?.customer_name || rawOrd?.customer_name || selectedBillModalItem.title || 'Customer',
      address: rawInv?.customer_address || rawOrd?.customer_address || 'Siddipet, Telangana',
      totalGoldGrams: selectedBillModalItem.category === 'GOLD' ? selectedBillModalItem.weight_grams : 0,
      totalSilverGrams: selectedBillModalItem.category === 'SILVER' ? selectedBillModalItem.weight_grams : 0,
      totalAmountSpent: selectedBillModalItem.amount,
      invoiceCount: 1,
      lastTransactionDate: selectedBillModalItem.created_at,
      latestInvoice: rawInv || {
        id: String(selectedBillModalItem.id).replace('log-inv-', '').replace('log-ord-', ''),
        created_at: selectedBillModalItem.created_at,
        customer_name: rawOrd?.customer_name || selectedBillModalItem.title,
        customer_phone: rawOrd?.customer_phone || selectedBillModalItem.customer_phone || '',
        customer_address: rawOrd?.customer_address || 'Siddipet, Telangana',
        transaction_type: isOrderType ? 'ORDER' : selectedBillModalItem.type,
        final_amount: selectedBillModalItem.amount,
        paid_amount: selectedBillModalItem.paid_amount,
        due_amount: selectedBillModalItem.due_amount,
        receipt_json_data: receiptPayload,
      }
    };

    return (
      <div className="accounts-module" style={{ padding: '0.5rem', background: '#f8fafc', minHeight: '100vh' }}>
        <InvoiceDetailsView
          customerRecord={custRecord}
          rates={rates}
          lang={lang}
          onBack={() => setSelectedBillModalItem(null)}
          onEdit={() => {
            const itemToPass = selectedBillModalItem;
            setSelectedBillModalItem(null);
            if (_onNavigateToBilling) _onNavigateToBilling(itemToPass);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", color: '#181310' }}>
      {/* Top Controls & Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-book-bookmark" style={{ color: '#d97706' }}></i>
            {lang === 'TE' ? 'ఖాతా పుస్తకం & రోజువారీ ముగింపు (Accounts Day Book)' : 'Accounts & Daily EOD Day Book'}
            <HeaderRefreshButton onRefresh={() => fetchDayBookData(true)} size="sm" title="Hard Refresh Accounts Ledger" />
          </h1>
          <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
            {lang === 'TE' ? 'రోజువారీ నగదు రసీదులు, అమ్మకాలు, కొనుగోళ్లు మరియు ప్రాఫిట్ లెడ్జర్' : 'Daily sales, cash counter, scrap purchases, worker fine accounts & net profit'}
          </p>
        </div>

        {/* Date Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setDateFilterMode('TODAY');
              setSelectedDate(getTodayIST());
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: dateFilterMode === 'TODAY' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
              background: dateFilterMode === 'TODAY' ? '#fef3c7' : '#ffffff',
              color: dateFilterMode === 'TODAY' ? '#b45309' : '#475569',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => {
              setDateFilterMode('ALL');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: dateFilterMode === 'ALL' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              background: dateFilterMode === 'ALL' ? '#e0f2fe' : '#ffffff',
              color: dateFilterMode === 'ALL' ? '#0369a1' : '#475569',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            🌐 All Time (All Records)
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('CUSTOM')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: dateFilterMode === 'CUSTOM' ? '1.5px solid #7e22ce' : '1px solid #cbd5e1',
              background: dateFilterMode === 'CUSTOM' ? '#faf5ff' : '#ffffff',
              color: dateFilterMode === 'CUSTOM' ? '#7e22ce' : '#475569',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            📅 Date Range
          </button>

          {dateFilterMode === 'CUSTOM' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: 'none', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => fetchDayBookData(true)}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#7e22ce', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Apply
              </button>
            </div>
          ) : dateFilterMode === 'TODAY' || dateFilterMode === 'DATE' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setDateFilterMode('DATE');
                setSelectedDate(e.target.value);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none',
                background: '#ffffff',
              }}
            />
          ) : null}
        </div>
      </div>

      {/* Sub-Screen Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0' }}>
        {[
          { id: 'logbook', label: '📖 Daily Entry Log Book', desc: 'Live Minute-by-Minute Timeline' },
          { id: 'stock', label: '📦 Stock Movement', desc: 'Opening, Sold & Closing Weight' },
          { id: 'cash', label: '💵 Cash & Counter Register', desc: 'Cash Drawer Reconciliation' },
          { id: 'scrap', label: '⚖️ Old Metal Vault', desc: 'Scrap Gold & Silver Purchases' },
          { id: 'udhaari', label: '🤝 Udhaari & Karigar', desc: 'Credit Dues & Goldsmith Fine' },
          { id: 'profit', label: '📈 Daily Profit Engine', desc: 'Gross & Net Profit Breakdown' },
        ].map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as AccountTab)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: active ? '1.5px solid #d97706' : '1px solid #e2e8f0',
                background: active ? 'linear-gradient(135deg, #2b2019 0%, #181310 100%)' : '#ffffff',
                color: active ? '#fbbf24' : '#475569',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 4px 12px rgba(43, 32, 25, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading Overlay State */}
      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px', color: '#d97706' }}></i>
          Loading day book ledger for {selectedDate}...
        </div>
      )}

      {!loading && (
        <>
          {/* SUB-SCREEN 1: 📖 Daily Entry Log Book (Chronological Timeline) */}
          {activeSubTab === 'logbook' && (
            <div>
              {/* TOP KPI ANALYTICS DASHBOARD CARDS — 3 CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>

                {/* ── KPI CARD 1: Transaction Activity Counts ── */}
                <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '1.15rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-chart-pie" style={{ color: '#d97706' }} />
                    Transaction Activity
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'ORDER' ? null : 'ORDER')} style={{ background: kpiDrillFilter === 'ORDER' ? '#fef3c7' : '#fffbe6', border: `2px solid ${kpiDrillFilter === 'ORDER' ? '#f59e0b' : '#fde68a'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'ORDER' ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', display: 'flex', justifyContent: 'space-between' }}>🛍️ Orders {kpiDrillFilter === 'ORDER' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.62rem' }} />}</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#92400e', marginTop: '2px' }}>{kpiMetrics.orderCount}</div>
                    </div>
                    <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'SELL' ? null : 'SELL')} style={{ background: kpiDrillFilter === 'SELL' ? '#dcfce7' : '#f0fdf4', border: `2px solid ${kpiDrillFilter === 'SELL' ? '#22c55e' : '#bbf7d0'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'SELL' ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', display: 'flex', justifyContent: 'space-between' }}>🟢 Sells {kpiDrillFilter === 'SELL' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.62rem' }} />}</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#166534', marginTop: '2px' }}>{kpiMetrics.sellCount}</div>
                    </div>
                    <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'BUY' ? null : 'BUY')} style={{ background: kpiDrillFilter === 'BUY' ? '#dbeafe' : '#eff6ff', border: `2px solid ${kpiDrillFilter === 'BUY' ? '#3b82f6' : '#bfdbfe'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'BUY' ? '0 0 0 3px rgba(59,130,246,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', display: 'flex', justifyContent: 'space-between' }}>🔵 Scrap Buys {kpiDrillFilter === 'BUY' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.62rem' }} />}</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e40af', marginTop: '2px' }}>{kpiMetrics.buyCount}</div>
                    </div>
                    <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'EXCHANGE' ? null : 'EXCHANGE')} style={{ background: kpiDrillFilter === 'EXCHANGE' ? '#ede9fe' : '#faf5ff', border: `2px solid ${kpiDrillFilter === 'EXCHANGE' ? '#8b5cf6' : '#e9d5ff'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'EXCHANGE' ? '0 0 0 3px rgba(139,92,246,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7e22ce', display: 'flex', justifyContent: 'space-between' }}>🟣 Exchanges {kpiDrillFilter === 'EXCHANGE' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.62rem' }} />}</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#6b21a8', marginTop: '2px' }}>{kpiMetrics.exchangeCount}</div>
                    </div>
                  </div>
                </div>

                {/* ── KPI CARD 2: Cumulative Stock Balance (from Inventory) ── */}
                <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)', borderRadius: '16px', border: '1px solid #fed7aa', padding: '1.15rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-warehouse" style={{ color: '#ea580c' }} />
                    Current Stock Balance
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    {/* Gold Stock */}
                    <div onClick={() => setKpiDrillFilter2(kpiDrillFilter2 === 'GOLD_STOCK' ? null : 'GOLD_STOCK')} style={{ background: kpiDrillFilter2 === 'GOLD_STOCK' ? '#fef3c7' : '#fffbe6', border: `2px solid ${kpiDrillFilter2 === 'GOLD_STOCK' ? '#f59e0b' : '#fde68a'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', boxShadow: kpiDrillFilter2 === 'GOLD_STOCK' ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', display: 'flex', justifyContent: 'space-between' }}>🥇 Gold Stock {kpiDrillFilter2 === 'GOLD_STOCK' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.62rem' }} />}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#92400e', marginTop: '2px' }}>{stockBalance.goldGrams}g</div>
                      <div style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>{stockBalance.goldPcs} pcs in inventory</div>
                    </div>
                    {/* Silver Stock */}
                    <div onClick={() => setKpiDrillFilter2(kpiDrillFilter2 === 'SILVER_STOCK' ? null : 'SILVER_STOCK')} style={{ background: kpiDrillFilter2 === 'SILVER_STOCK' ? '#e0f2fe' : '#f0f9ff', border: `2px solid ${kpiDrillFilter2 === 'SILVER_STOCK' ? '#0284c7' : '#bae6fd'}`, borderRadius: '12px', padding: '10px 12px', cursor: 'pointer', boxShadow: kpiDrillFilter2 === 'SILVER_STOCK' ? '0 0 0 3px rgba(2,132,199,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', display: 'flex', justifyContent: 'space-between' }}>🥈 Silver Stock {kpiDrillFilter2 === 'SILVER_STOCK' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.62rem' }} />}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#075985', marginTop: '2px' }}>{stockBalance.silverGrams}g</div>
                      <div style={{ fontSize: '0.65rem', color: '#0369a1', fontWeight: 600 }}>{stockBalance.silverPcs} pcs in inventory</div>
                    </div>
                    {/* Cash Balance — spans full width */}
                    <div onClick={() => setKpiDrillFilter2(kpiDrillFilter2 === 'CASH_BALANCE' ? null : 'CASH_BALANCE')} style={{ gridColumn: '1 / -1', background: kpiDrillFilter2 === 'CASH_BALANCE' ? '#d1fae5' : '#ecfdf5', border: `2px solid ${kpiDrillFilter2 === 'CASH_BALANCE' ? '#10b981' : '#a7f3d0'}`, borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', boxShadow: kpiDrillFilter2 === 'CASH_BALANCE' ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857' }}>💵 Cash in Hand (Closing Balance)</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>₹{(cashSummary?.expectedClosingCash || 0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.62rem', color: '#047857', fontWeight: 600 }}>As of selected date · Click for breakdown</div>
                      </div>
                      {kpiDrillFilter2 === 'CASH_BALANCE' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: '#047857' }} />}
                    </div>
                  </div>
                </div>

                {/* ── KPI CARD 3: Period Flow (Today's/Range Transactions) ── */}
                <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: '16px', border: '1px solid #bae6fd', padding: '1.15rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c4a6e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-arrow-right-arrow-left" style={{ color: '#0284c7' }} />
                    Period Flow
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#0369a1', marginLeft: 'auto' }}>({dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'ALL' ? 'All Time' : 'Range'})</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    {/* Gold Flow */}
                    <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_GOLD' ? null : 'PERIOD_GOLD')} style={{ background: kpiDrillFilter3 === 'PERIOD_GOLD' ? '#fef3c7' : '#fffbe6', border: `2px solid ${kpiDrillFilter3 === 'PERIOD_GOLD' ? '#f59e0b' : '#fde68a'}`, borderRadius: '12px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_GOLD' ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b45309', display: 'flex', justifyContent: 'space-between' }}>🥇 Gold Flow {kpiDrillFilter3 === 'PERIOD_GOLD' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.6rem' }} />}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#92400e', marginTop: '2px' }}>{kpiMetrics.goldWtAdded > 0 ? '+' : ''}{kpiMetrics.goldWtAdded}g</div>
                      <div style={{ fontSize: '0.6rem', color: '#b45309', fontWeight: 600 }}>{kpiMetrics.goldPcsAdded} pcs</div>
                    </div>
                    {/* Silver Flow */}
                    <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_SILVER' ? null : 'PERIOD_SILVER')} style={{ background: kpiDrillFilter3 === 'PERIOD_SILVER' ? '#e0f2fe' : '#f0f9ff', border: `2px solid ${kpiDrillFilter3 === 'PERIOD_SILVER' ? '#0284c7' : '#bae6fd'}`, borderRadius: '12px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_SILVER' ? '0 0 0 3px rgba(2,132,199,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0369a1', display: 'flex', justifyContent: 'space-between' }}>🥈 Silver Flow {kpiDrillFilter3 === 'PERIOD_SILVER' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.6rem' }} />}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#075985', marginTop: '2px' }}>{kpiMetrics.silverWtAdded > 0 ? '+' : ''}{kpiMetrics.silverWtAdded}g</div>
                      <div style={{ fontSize: '0.6rem', color: '#0369a1', fontWeight: 600 }}>{kpiMetrics.silverPcsAdded} pcs</div>
                    </div>
                    {/* Cash Collected */}
                    <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_CASH' ? null : 'PERIOD_CASH')} style={{ background: kpiDrillFilter3 === 'PERIOD_CASH' ? '#d1fae5' : '#f0fdf4', border: `2px solid ${kpiDrillFilter3 === 'PERIOD_CASH' ? '#22c55e' : '#a7f3d0'}`, borderRadius: '12px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_CASH' ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857', display: 'flex', justifyContent: 'space-between' }}>💵 Cash Collected {kpiDrillFilter3 === 'PERIOD_CASH' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.6rem' }} />}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>₹{kpiMetrics.totalCashCollected.toLocaleString('en-IN')}</div>
                    </div>
                    {/* Finance Loans */}
                    <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_FINANCE' ? null : 'PERIOD_FINANCE')} style={{ background: kpiDrillFilter3 === 'PERIOD_FINANCE' ? '#ccfbf1' : '#f0fdfa', border: `2px solid ${kpiDrillFilter3 === 'PERIOD_FINANCE' ? '#14b8a6' : '#99f6e4'}`, borderRadius: '12px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_FINANCE' ? '0 0 0 3px rgba(20,184,166,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f766e', display: 'flex', justifyContent: 'space-between' }}>💰 Finance Loans {kpiDrillFilter3 === 'PERIOD_FINANCE' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.6rem' }} />}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#115e59', marginTop: '2px' }}>₹{kpiMetrics.totalFinanceIssued.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* KPI DRILL-DOWN PANEL */}
              {kpiDrillFilter && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: `2px solid ${
                    kpiDrillFilter === 'ORDER' ? '#fde68a' :
                    kpiDrillFilter === 'SELL' ? '#bbf7d0' :
                    kpiDrillFilter === 'BUY' ? '#bfdbfe' : '#e9d5ff'
                  }`,
                  padding: '1.15rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                  animation: 'slideDown 0.2s ease',
                }}>
                  {/* Panel Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px',
                        background: kpiDrillFilter === 'ORDER' ? '#fffbe6' : kpiDrillFilter === 'SELL' ? '#f0fdf4' : kpiDrillFilter === 'BUY' ? '#eff6ff' : '#faf5ff',
                        color: kpiDrillFilter === 'ORDER' ? '#b45309' : kpiDrillFilter === 'SELL' ? '#15803d' : kpiDrillFilter === 'BUY' ? '#1d4ed8' : '#7e22ce',
                        border: `1px solid ${ kpiDrillFilter === 'ORDER' ? '#fde68a' : kpiDrillFilter === 'SELL' ? '#bbf7d0' : kpiDrillFilter === 'BUY' ? '#bfdbfe' : '#e9d5ff' }`,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {
                          kpiDrillFilter === 'ORDER' ? '🛍️ Orders' :
                          kpiDrillFilter === 'SELL' ? '🟢 Sells & Trade-ins' :
                          kpiDrillFilter === 'BUY' ? '🔵 Scrap Buys (Orders + Buys + Trade-ins)' :
                          '🟣 Exchanges / Trade-ins'
                        }
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>
                        {kpiDrillItems.length} record{kpiDrillItems.length !== 1 ? 's' : ''} found
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKpiDrillFilter(null)}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <i className="fa-solid fa-xmark" /> Close
                    </button>
                  </div>

                  {/* Drill-down Table */}
                  {kpiDrillItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                      <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                      No records found for this filter in the selected date range.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>#</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Time</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Type</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Customer / Details</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Weight</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Amount</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...kpiDrillItems].sort((a,b) => new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime()).map((item: any, idx: number) => {
                            const itype = (item.type || '').toUpperCase();
                            let typeBg = '#f8fafc', typeColor = '#475569';
                            if (itype === 'ORDER') { typeBg = '#fffbe6'; typeColor = '#b45309'; }
                            else if (itype === 'SELL') { typeBg = '#f0fdf4'; typeColor = '#15803d'; }
                            else if (itype === 'BUY') { typeBg = '#eff6ff'; typeColor = '#1d4ed8'; }
                            else if (itype === 'EXCHANGE') { typeBg = '#faf5ff'; typeColor = '#7e22ce'; }
                            return (
                              <tr
                                key={item.id || idx}
                                onClick={() => setSelectedBillModalItem(item)}
                                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}
                              >
                                <td style={{ padding: '8px 10px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>{item.time}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', background: typeBg, color: typeColor }}>{itype}</span>
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                                  <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '1px' }}>{item.details}</div>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                                  {item.weight_grams > 0 ? `${item.weight_grams}g` : '-'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                  {item.amount > 0 ? `₹${Number(item.amount).toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
                                  {item.paid_amount > 0 ? `₹${Number(item.paid_amount).toLocaleString('en-IN')}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* CARD 2 DRILL-DOWN: Inventory Stock List */}
              {kpiDrillFilter2 && (() => {
                const isGold = kpiDrillFilter2 === 'GOLD_STOCK';
                const isSilver = kpiDrillFilter2 === 'SILVER_STOCK';
                const isCash = kpiDrillFilter2 === 'CASH_BALANCE';
                const borderColor = isGold ? '#fde68a' : isSilver ? '#bae6fd' : '#a7f3d0';
                const headerBg = isGold ? '#fffbe6' : isSilver ? '#f0f9ff' : '#ecfdf5';
                const headerColor = isGold ? '#b45309' : isSilver ? '#0369a1' : '#047857';
                const filteredProducts = (inventoryProducts || []).filter((p: any) => {
                  const m = (p.item_type || p.metal_type || '').toUpperCase();
                  if (isGold) return m.includes('GOLD');
                  if (isSilver) return m.includes('SILVER');
                  return true;
                });
                return (
                  <div style={{ background: '#ffffff', borderRadius: '16px', border: `2px solid ${borderColor}`, padding: '1.15rem', marginBottom: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', background: headerBg, color: headerColor, border: `1px solid ${borderColor}`, textTransform: 'uppercase' }}>
                          {isGold ? '🥇 Gold Stock' : isSilver ? '🥈 Silver Stock' : '💵 Cash Balance Breakdown'}
                        </span>
                        {!isCash && <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>{filteredProducts.length} items in inventory</span>}
                      </div>
                      <button type="button" onClick={() => setKpiDrillFilter2(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-xmark" /> Close
                      </button>
                    </div>
                    {isCash ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d' }}>💵 Period Cash Collected</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>₹{kpiMetrics.totalCashCollected.toLocaleString('en-IN')}</div>
                        </div>
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c' }}>🏦 Finance Issued</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#7f1d1d', marginTop: '4px' }}>₹{kpiMetrics.totalFinanceIssued.toLocaleString('en-IN')}</div>
                        </div>
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857' }}>🏁 Closing Cash Balance</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>₹{(cashSummary?.expectedClosingCash || 0).toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: '0.62rem', color: '#047857', fontWeight: 600, marginTop: '2px' }}>As of selected date</div>
                        </div>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                        <i className="fa-solid fa-box-open" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                        No {isGold ? 'Gold' : 'Silver'} items in inventory.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>#</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Item Name</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Type</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569' }}>Stock Qty</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569' }}>Net Wt (g)</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569' }}>Touch %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredProducts.map((p: any, idx: number) => (
                              <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{p.product_name || p.name || '—'}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', background: isGold ? '#fffbe6' : '#f0f9ff', color: isGold ? '#b45309' : '#0369a1', border: `1px solid ${isGold ? '#fde68a' : '#bae6fd'}` }}>
                                    {(p.item_type || p.metal_type || '').toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>{p.current_quantity ?? p.stock_quantity ?? p.initial_quantity ?? '—'}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{p.stock_quantity ?? p.weight_grams ?? p.net_weight ?? '—'}g</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{p.touch_percentage ?? p.touch ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* CARD 3 DRILL-DOWN: Period Flow entries */}
              {kpiDrillFilter3 && (() => {
                const isGold = kpiDrillFilter3 === 'PERIOD_GOLD';
                const isSilver = kpiDrillFilter3 === 'PERIOD_SILVER';
                const isCash = kpiDrillFilter3 === 'PERIOD_CASH';
                const isFinance = kpiDrillFilter3 === 'PERIOD_FINANCE';
                const borderColor = isGold ? '#fde68a' : isSilver ? '#bae6fd' : isCash ? '#a7f3d0' : '#99f6e4';
                const headerBg = isGold ? '#fffbe6' : isSilver ? '#f0f9ff' : isCash ? '#f0fdf4' : '#f0fdfa';
                const headerColor = isGold ? '#b45309' : isSilver ? '#0369a1' : isCash ? '#047857' : '#0f766e';
                const periodItems = logBookTimeline.filter((item: any) => {
                  const type = (item.type || '').toUpperCase();
                  if (isGold) return type === 'INVENTORY' && (item.category || '').toUpperCase().includes('GOLD');
                  if (isSilver) return type === 'INVENTORY' && (item.category || '').toUpperCase().includes('SILVER');
                  if (isCash) return item.paid_amount > 0 && type !== 'FINANCE' && type !== 'BUY' && type !== 'INVENTORY' && type !== 'KARIGAR';
                  if (isFinance) return type === 'FINANCE';
                  return false;
                });
                return (
                  <div style={{ background: '#ffffff', borderRadius: '16px', border: `2px solid ${borderColor}`, padding: '1.15rem', marginBottom: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', background: headerBg, color: headerColor, border: `1px solid ${borderColor}`, textTransform: 'uppercase' }}>
                          {isGold ? '🥇 Gold Flow' : isSilver ? '🥈 Silver Flow' : isCash ? '💵 Cash Collected' : '💰 Finance Loans'}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>{periodItems.length} entries</span>
                      </div>
                      <button type="button" onClick={() => setKpiDrillFilter3(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-xmark" /> Close
                      </button>
                    </div>
                    {periodItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                        <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }} />
                        No {isGold ? 'Gold' : isSilver ? 'Silver' : isCash ? 'Cash' : 'Finance'} entries for the selected period.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>#</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Time</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Type</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Details</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569' }}>Weight</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...periodItems].sort((a,b) => new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime()).map((item: any, idx: number) => {
                              const itype = (item.type || '').toUpperCase();
                              let typeBg = '#f8fafc', typeColor = '#475569';
                              if (itype === 'INVENTORY') { typeBg = '#fff7ed'; typeColor = '#c2410c'; }
                              else if (itype === 'FINANCE') { typeBg = '#ccfbf1'; typeColor = '#0f766e'; }
                              else if (itype === 'SELL') { typeBg = '#f0fdf4'; typeColor = '#15803d'; }
                              return (
                                <tr key={item.id || idx} onClick={() => setSelectedBillModalItem(item)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>{item.time}</td>
                                  <td style={{ padding: '8px 10px' }}><span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', background: typeBg, color: typeColor }}>{itype}</span></td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{item.details}</div>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>{item.weight_grams > 0 ? `${item.weight_grams}g` : '-'}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                    {(item.amount > 0 || item.paid_amount > 0) ? `₹${Number(item.amount || item.paid_amount).toLocaleString('en-IN')}` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                {/* Log Book Controls Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: '#0284c7', marginRight: '8px' }}></i>
                  Chronological Daily Entry Log ({logBookTimeline.length} Entries)
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* View Mode Toggle Switcher */}
                  <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <button
                      type="button"
                      onClick={() => setLogBookViewMode('TABLE')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: logBookViewMode === 'TABLE' ? '#ffffff' : 'transparent',
                        color: logBookViewMode === 'TABLE' ? '#0f172a' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        boxShadow: logBookViewMode === 'TABLE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <i className="fa-solid fa-table-list" style={{ marginRight: '5px', color: '#0284c7' }}></i>
                      Table View
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogBookViewMode('CARD')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: logBookViewMode === 'CARD' ? '#ffffff' : 'transparent',
                        color: logBookViewMode === 'CARD' ? '#0f172a' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        boxShadow: logBookViewMode === 'CARD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <i className="fa-solid fa-address-card" style={{ marginRight: '5px', color: '#d97706' }}></i>
                      Cards View
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <i className={`fa-solid ${sortOrder === 'ASC' ? 'fa-arrow-up-wide-short' : 'fa-arrow-down-wide-short'}`} style={{ color: '#d97706' }}></i>
                    {sortOrder === 'ASC' ? 'Oldest First ⬆️' : 'Newest First ⬇️'}
                  </button>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Date: {selectedDate}</span>
                </div>
              </div>

              {sortedTimeline.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No transaction entries recorded for this date yet.</p>
              ) : logBookViewMode === 'TABLE' ? (
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 800 }}>S.No</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800 }}>Time</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800 }}>Type</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800 }}>Customer / Details</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'right' }}>Net Weight</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'right', color: '#15803d' }}>In Hand (₹)</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'right' }}>Total Amount (₹)</th>
                        <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTimeline.map((item, idx) => {
                        const itemType = (item.type || '').toUpperCase();
                        const isOrder = itemType === 'ORDER';
                        const isSell = itemType === 'SELL';
                        const isBuy = itemType === 'BUY';
                        const isExchange = itemType === 'EXCHANGE';
                        const isInventory = itemType === 'INVENTORY';
                        const isFinance = itemType === 'FINANCE';
                        const isKarigar = itemType === 'KARIGAR';

                        let typeBg = '#f8fafc';
                        let typeColor = '#475569';

                        if (isOrder) { typeBg = '#fffbe6'; typeColor = '#b45309'; }
                        else if (isSell) { typeBg = '#f0fdf4'; typeColor = '#15803d'; }
                        else if (isBuy) { typeBg = '#eff6ff'; typeColor = '#1d4ed8'; }
                        else if (isExchange) { typeBg = '#faf5ff'; typeColor = '#7e22ce'; }
                        else if (isInventory) { typeBg = '#fff7ed'; typeColor = '#c2410c'; }
                        else if (isFinance) { typeBg = '#ccfbf1'; typeColor = '#0f766e'; }
                        else if (isKarigar) { typeBg = '#f1f5f9'; typeColor = '#334155'; }

                        const inHandCash = Number(item.paid_amount || (isFinance ? item.amount : 0));
                        const totalBillVal = Number(item.amount || item.paid_amount || 0);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedBillModalItem(item)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                            }}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#64748b' }}>#{idx + 1}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>{item.time}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: '5px', background: typeBg, color: typeColor }}>
                                {itemType}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {item.title}
                                {itemType === 'KARIGAR' && item.category && (() => {
                                  const cat = (item.category || '').toUpperCase();
                                  const isGold = cat.includes('GOLD');
                                  const isSilver = cat.includes('SILVER');
                                  const isCash = cat.includes('CASH');
                                  const cashLink = (item.cash_metal_link || '').toUpperCase();
                                  const label = isGold ? '🥇 Gold' : isSilver ? '🥈 Silver'
                                    : isCash ? `💵 Cash${cashLink === 'FOR_GOLD' ? ' · For Gold' : cashLink === 'FOR_SILVER' ? ' · For Silver' : cashLink === 'GENERAL_CASH' ? ' · General' : ''}` : cat;
                                  const bg = isGold ? '#fffbe6' : isSilver ? '#f8fafc' : '#f0fdf4';
                                  const color = isGold ? '#b45309' : isSilver ? '#334155' : '#15803d';
                                  const border = isGold ? '#fde68a' : isSilver ? '#cbd5e1' : '#bbf7d0';
                                  return (
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: '4px', background: bg, color, border: `1px solid ${border}` }}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.details}</div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                              {item.weight_grams > 0 ? `${item.weight_grams}g` : '-'}
                            </td>
                            {/* In Hand (₹) Column */}
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: isBuy || isFinance ? '#b91c1c' : '#15803d' }}>
                              {inHandCash > 0 ? `${isBuy || isFinance ? '-' : ''}₹${inHandCash.toLocaleString('en-IN')}` : '-'}
                            </td>
                            {/* Total Amount (₹) & Due Breakdown Column */}
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              {totalBillVal > 0 ? `₹${totalBillVal.toLocaleString('en-IN')}` : '-'}
                              {item.due_amount > 0 && (
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
                                  Due: ₹{item.due_amount.toLocaleString('en-IN')}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {isInventory ? null : isFinance ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', padding: '2px 8px', borderRadius: '4px' }}>
                                  DEBT
                                </span>
                              ) : isKarigar ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                  WEIGHT ACC
                                </span>
                              ) : item.due_amount > 0 ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '4px' }}>
                                  PARTIAL PAID
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px' }}>
                                  FULL PAID
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {sortedTimeline.map((item, idx) => {
                    const itemType = (item.type || '').toUpperCase();
                    const isOrder = itemType === 'ORDER';
                    const isSell = itemType === 'SELL';
                    const isBuy = itemType === 'BUY';
                    const isExchange = itemType === 'EXCHANGE';
                    const isInventory = itemType === 'INVENTORY';
                    const isFinance = itemType === 'FINANCE';
                    const isCashLoad = itemType === 'CASH LOAD' || itemType === 'CASH_LOAD';
                    const isKarigar = itemType === 'KARIGAR';

                    // Mode badge styling
                    let badgeBg = '#f8fafc';
                    let badgeColor = '#475569';
                    let badgeBorder = '#cbd5e1';

                    if (isOrder) {
                      badgeBg = '#fffbe6';
                      badgeColor = '#b45309';
                      badgeBorder = '#fde68a';
                    } else if (isSell) {
                      badgeBg = '#f0fdf4';
                      badgeColor = '#15803d';
                      badgeBorder = '#bbf7d0';
                    } else if (isBuy) {
                      badgeBg = '#eff6ff';
                      badgeColor = '#1d4ed8';
                      badgeBorder = '#bfdbfe';
                    } else if (isExchange) {
                      badgeBg = '#faf5ff';
                      badgeColor = '#7e22ce';
                      badgeBorder = '#e9d5ff';
                    } else if (isInventory) {
                      badgeBg = '#fff7ed';
                      badgeColor = '#c2410c';
                      badgeBorder = '#ffedd5';
                    } else if (isFinance) {
                      badgeBg = '#ccfbf1';
                      badgeColor = '#0f766e';
                      badgeBorder = '#99f6e4';
                    } else if (isCashLoad) {
                      badgeBg = '#d1fae5';
                      badgeColor = '#047857';
                      badgeBorder = '#a7f3d0';
                    } else if (isKarigar) {
                      badgeBg = '#f1f5f9';
                      badgeColor = '#334155';
                      badgeBorder = '#e2e8f0';
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedBillModalItem(item)}
                        title="Click to view Tax Invoice Bill Receipt"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: isOrder ? '#fffdf5' : isSell ? '#f0fdf4' : isBuy ? '#eff6ff' : '#f8fafc',
                          border: isOrder ? '1px solid #fef3c7' : isSell ? '1px solid #dcfce7' : isBuy ? '1px solid #dbeafe' : '1px solid #e2e8f0',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease, boxShadow 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* S.No Badge */}
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', minWidth: '32px', textAlign: 'center' }}>
                            #{idx + 1}
                          </span>

                          {/* Mode Badge (ORDER, SELL, BUY, EXCHANGE) */}
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: badgeColor, background: badgeBg, padding: '4px 10px', borderRadius: '6px', border: `1px solid ${badgeBorder}`, letterSpacing: '0.5px' }}>
                            {itemType}
                          </span>

                          {/* Time */}
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fef3c7', minWidth: '70px', textAlign: 'center' }}>
                            {item.time}
                          </span>

                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {item.title}
                              {itemType === 'KARIGAR' && item.category && (() => {
                                const cat = (item.category || '').toUpperCase();
                                const isGold = cat.includes('GOLD');
                                const isSilver = cat.includes('SILVER');
                                const isCash = cat.includes('CASH');
                                const cashLink = (item.cash_metal_link || '').toUpperCase();
                                const label = isGold ? '🥇 Gold' : isSilver ? '🥈 Silver'
                                  : isCash ? `💵 Cash${cashLink === 'FOR_GOLD' ? ' · For Gold' : cashLink === 'FOR_SILVER' ? ' · For Silver' : cashLink === 'GENERAL_CASH' ? ' · General' : ''}` : cat;
                                const bg = isGold ? '#fffbe6' : isSilver ? '#f8fafc' : '#f0fdf4';
                                const color = isGold ? '#b45309' : isSilver ? '#334155' : '#15803d';
                                const border = isGold ? '#fde68a' : isSilver ? '#cbd5e1' : '#bbf7d0';
                                return (
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: '4px', background: bg, color, border: `1px solid ${border}` }}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                              {item.details}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {item.amount > 0 && (
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isSell ? '#166534' : isBuy ? '#1e40af' : '#b45309' }}>
                              ₹{item.amount.toLocaleString('en-IN')}
                            </div>
                          )}
                          {item.paid_amount > 0 && item.amount === 0 && (
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
                              Paid: ₹{item.paid_amount.toLocaleString('en-IN')}
                            </div>
                          )}
                          {item.due_amount > 0 && (
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', marginBottom: '2px' }}>
                              Due: ₹{item.due_amount.toLocaleString('en-IN')}
                            </div>
                          )}
                          <div style={{ marginTop: '2px' }}>
                            {item.type === 'INVENTORY' ? null : item.type === 'FINANCE' ? (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', padding: '2px 8px', borderRadius: '4px' }}>
                                DEBT
                              </span>
                            ) : item.type === 'KARIGAR' ? (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                WEIGHT ACC
                              </span>
                            ) : item.due_amount > 0 ? (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '4px' }}>
                                PARTIAL PAID
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '4px' }}>
                                FULL PAID
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

          {/* SUB-SCREEN 2: 📦 Stock Movement Ledger */}
          {activeSubTab === 'stock' && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              {/* Category Switcher Bar: GOLD vs SILVER */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setMetalCategoryFilter('GOLD')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: metalCategoryFilter === 'GOLD' ? '2px solid #d97706' : '1px solid #cbd5e1',
                    background: metalCategoryFilter === 'GOLD' ? '#fffbe6' : '#ffffff',
                    color: metalCategoryFilter === 'GOLD' ? '#b45309' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🥇 GOLD Category Stock (1,000 g)
                </button>

                <button
                  type="button"
                  onClick={() => setMetalCategoryFilter('SILVER')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: metalCategoryFilter === 'SILVER' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: metalCategoryFilter === 'SILVER' ? '#f0f9ff' : '#ffffff',
                    color: metalCategoryFilter === 'SILVER' ? '#0369a1' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🥈 SILVER Category Stock (40,000 g)
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-boxes-stacked" style={{ color: metalCategoryFilter === 'GOLD' ? '#d97706' : '#0284c7' }}></i>
                    {metalCategoryFilter} Ornaments Stock Ledger
                  </h3>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                    {stockViewMode === 'TOTAL' ? `Complete list of ${metalCategoryFilter} ornaments with total weights and optional piece counts.` : `Newly added ${metalCategoryFilter} items today.`}
                  </p>
                </div>

                {/* Toggle Buttons: Total Stock vs Today Added */}
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setStockViewMode('TOTAL')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: stockViewMode === 'TOTAL' ? '#d97706' : 'transparent',
                      color: stockViewMode === 'TOTAL' ? '#ffffff' : '#64748b',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <i className="fa-solid fa-layer-group"></i> Total Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockViewMode('TODAY')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: stockViewMode === 'TODAY' ? '#166534' : 'transparent',
                      color: stockViewMode === 'TODAY' ? '#ffffff' : '#64748b',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <i className="fa-solid fa-calendar-day"></i> Today Added
                  </button>
                </div>
              </div>

              {/* Ornament Category Breakdown Table */}
              {ornamentsStockList.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  {stockViewMode === 'TODAY' ? `No ${metalCategoryFilter} inventory products were added or restocked today.` : `No active ${metalCategoryFilter} inventory stock records found.`}
                </p>
              ) : (
                <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>#</th>
                        <th style={{ padding: '10px 12px' }}>Ornament Name</th>
                        <th style={{ padding: '10px 12px' }}>Total Weight</th>
                        <th style={{ padding: '10px 12px' }}>Pieces (Optional)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Date Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ornamentsStockList.map((orn, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#64748b' }}>#{idx + 1}</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>
                            <i className={`fa-solid ${orn.metalType === 'SILVER' ? 'fa-coins' : 'fa-gem'}`} style={{ color: orn.metalType === 'SILVER' ? '#64748b' : '#d97706', marginRight: '8px' }}></i>
                            {orn.category}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                            {orn.totalWeight.toFixed(3)} g
                          </td>
                          <td style={{ padding: '12px', color: orn.hasPcs ? '#15803d' : '#94a3b8', fontWeight: orn.hasPcs ? 800 : 400 }}>
                            {orn.hasPcs ? `${orn.totalPcs} pcs` : '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#64748b', fontSize: '0.78rem' }}>
                            {orn.dateAdded}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* EOD Restock Reorder Alert Banner */}
              {eodReorderList.length > 0 && (
                <div style={{ background: '#fffdf5', border: '1px solid #fef3c7', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#b45309', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-cart-flatbed-suitcases"></i>
                    EOD Restock Reorder List (Items Sold Today)
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#78350f' }}>
                    These items were sold today and automatically deducted from inventory. Order fresh stock to replenish:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {eodReorderList.map((item, idx) => (
                      <span key={idx} style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                        📦 {item.product_name} ({item.weight_grams}g)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-SCREEN 3: 💵 Cash & Counter Register */}
          {activeSubTab === 'cash' && cashSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
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
          )}

          {/* SUB-SCREEN 4: ⚖️ Old Metal Scrap Vault */}
          {activeSubTab === 'scrap' && scrapSummary && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                <i className="fa-solid fa-vault" style={{ color: '#d97706', marginRight: '8px' }}></i>
                Customer Old Metal Purchases & Scrap Vault Ledger
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                  <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>Old Gold Bought Weight</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {scrapSummary.oldGoldBoughtWeight.toFixed(3)} g
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>Old Silver Bought Weight</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {scrapSummary.oldSilverBoughtWeight.toFixed(3)} g
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                  <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>Total Payout Paid to Customers</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534', marginTop: '4px' }}>
                    ₹{scrapSummary.totalScrapPayout.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Detailed Customer Scrap Items Table (Strictly Separate Vault) */}
              <h4 style={{ margin: '1.25rem 0 0.75rem 0', fontSize: '0.92rem', color: '#0f172a', fontWeight: 800 }}>
                📑 Customer Scrap Metal Audit Trail (Separate Vault Record)
              </h4>

              {oldMetalVaultItems.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No customer scrap items were bought today.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>Customer Name</th>
                        <th style={{ padding: '10px 12px' }}>Phone</th>
                        <th style={{ padding: '10px 12px' }}>Scrap Item</th>
                        <th style={{ padding: '10px 12px' }}>Gross Weight</th>
                        <th style={{ padding: '10px 12px' }}>Purity %</th>
                        <th style={{ padding: '10px 12px' }}>Pure Metal Wt</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Payout Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oldMetalVaultItems.map((sc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{sc.customer_name}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{sc.customer_phone}</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: sc.metal_type === 'GOLD' ? '#b45309' : '#0369a1' }}>
                            {sc.item_name}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{sc.gross_weight.toFixed(3)} g</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#d97706' }}>{sc.purity_percentage.toFixed(1)}%</td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#166534' }}>{sc.pure_weight.toFixed(3)} g</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#b91c1c' }}>
                            ₹{sc.payout_amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUB-SCREEN 5: 🤝 Udhaari & Karigar Account */}
          {activeSubTab === 'udhaari' && udhaariSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 0.85rem 0', color: '#0f172a', fontWeight: 800 }}>🤝 Customer Udhaari Dues Ledger</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                    <span>New Dues Created Today (Credit Sales):</span>
                    <strong>+₹{udhaariSummary.newDuesCreated.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                    <span>Old Customer Dues Collected Today:</span>
                    <strong>-₹{udhaariSummary.oldDuesCollected.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 0.85rem 0', color: '#0f172a', fontWeight: 800 }}>🔨 Goldsmith / Karigar Fine Gold Account</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                    <span>Fine Gold (99.9) Issued Today:</span>
                    <strong>{udhaariSummary.karigarGoldIssued.toFixed(3)} g</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                    <span>Finished Jewellery Received Today:</span>
                    <strong>{udhaariSummary.karigarGoldReceived.toFixed(3)} g</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-SCREEN 6: 📈 Daily Profit Engine */}
          {activeSubTab === 'profit' && profitSummary && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                <i className="fa-solid fa-chart-line" style={{ color: '#166534', marginRight: '8px' }}></i>
                Daily End-Of-Day Net Profit Engine
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(+) Making Charges / Vasti Earned Today:</span>
                  <strong>+₹{profitSummary.makingChargesProfit.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(+) Estimated Metal Rate Margin Profit:</span>
                  <strong>+₹{profitSummary.metalMarginProfit.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                  <span>(-) Daily Shop Expenses:</span>
                  <strong>-₹{profitSummary.dailyExpenses.toLocaleString('en-IN')}</strong>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: '#166534', fontWeight: 800 }}>
                  <span>🏆 TODAY'S NET PROFIT:</span>
                  <span>₹{profitSummary.netProfit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
