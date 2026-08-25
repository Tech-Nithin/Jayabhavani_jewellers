import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';

// Sub-component views
import { OldMetalVaultView } from './components/OldMetalVaultView';
import { UdhaariCustomerDuesView } from './components/UdhaariCustomerDuesView';
import { UdhaariKarigarView } from './components/UdhaariKarigarView';
import { StockMovementView } from './components/StockMovementView';
import { CashRegisterView } from './components/CashRegisterView';
import { TransactionActivityKpiCards } from './components/TransactionActivityKpiCards';
import { MetalTurnoverPurityView } from './components/MetalTurnoverPurityView';
import { WorkerTransactionsKpiView } from './components/WorkerTransactionsKpiView';
import { PeriodMovementFlowView } from './components/PeriodMovementFlowView';
import { ChronologicalLogBookTable } from './components/ChronologicalLogBookTable';

// Modals
import { SeeBillModal } from '../billing-frontend/components/SeeBillModal';

export type AccountTab = 'logbook' | 'stock' | 'cash' | 'scrap' | 'udhaari' | 'udhaari_dues';
export type DateFilterMode = 'TODAY' | 'YESTERDAY' | 'MONTH' | 'DATE' | 'CUSTOM' | 'ALL';

interface AccountsModuleProps {
  lang?: any;
  onNavigateToBilling?: () => void;
}

const getTodayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const getYesterdayIST = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const getMonthStartIST = () => {
  const d = new Date();
  d.setDate(1);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper to read initial state from URL parameters
const getInitialUrlParams = () => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    tab: (params.get('tab') as AccountTab) || 'logbook',
    dateMode: (params.get('dateMode') as DateFilterMode) || 'TODAY',
    date: params.get('date') || getTodayIST(),
    startDate: params.get('startDate') || getTodayIST(),
    endDate: params.get('endDate') || getTodayIST(),
    kpiFilter: (params.get('kpiFilter') as any) || null,
    kpiFilter2: (params.get('kpiFilter2') as any) || null,
    kpiFilter3: (params.get('kpiFilter3') as any) || null,
  };
};

export const AccountsModule: React.FC<AccountsModuleProps> = () => {
  const initialParams = getInitialUrlParams();

  // Navigation & Sub-Tabs State
  const [activeSubTab, setActiveSubTab] = useState<AccountTab>(initialParams.tab || 'logbook');

  // Date Filtering State
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>(initialParams.dateMode || 'TODAY');
  const [selectedDate, setSelectedDate] = useState<string>(initialParams.date || getTodayIST());
  const [startDate, setStartDate] = useState<string>(initialParams.startDate || getTodayIST());
  const [endDate, setEndDate] = useState<string>(initialParams.endDate || getTodayIST());

  // Search & Filter State
  const [logSearchTerm, setLogSearchTerm] = useState<string>('');
  const [stockViewMode, setStockViewMode] = useState<'ALL' | 'TODAY'>('ALL');
  const [metalCategoryFilter, setMetalCategoryFilter] = useState<'ALL' | 'GOLD' | 'SILVER'>('ALL');

  // KPI Card Drilldown Filters
  const [kpiDrillFilter, setKpiDrillFilter] = useState<'ORDER' | 'SELL' | 'BUY' | 'EXCHANGE' | null>(initialParams.kpiFilter || null);
  const [kpiDrillFilter2, setKpiDrillFilter2] = useState<any>(initialParams.kpiFilter2 || null);
  const [kpiDrillFilter3, setKpiDrillFilter3] = useState<any>(initialParams.kpiFilter3 || null);

  // Selected Bill item state for modal
  const [selectedBillModalItem, setSelectedBillModalItem] = useState<any | null>(null);

  // Loading State for Fetching Accounts Data
  const [loading, setLoading] = useState<boolean>(true);

  // Raw Server Data State
  const [logBookTimeline, setLogBookTimeline] = useState<any[]>([]);
  const [scrapSummary, setScrapSummary] = useState<any | null>(null);
  const [oldMetalVaultItems, setOldMetalVaultItems] = useState<any[]>([]);
  const [udhaariSummary, setUdhaariSummary] = useState<any | null>(null);
  const [cashSummary, setCashSummary] = useState<any | null>(null);
  const [serverBillingActivity, setServerBillingActivity] = useState<any | null>(null);
  const [cashLedgerRecords, setCashLedgerRecords] = useState<any[]>([]);
  const [dayBookStockSummary, setDayBookStockSummary] = useState<any[]>([]);
  const [eodReorderList, setEodReorderList] = useState<any[]>([]);
  const [ornamentsStockList, setOrnamentsStockList] = useState<any[]>([]);

  // Sync React State changes to URL Query Parameters
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.get('module')) params.set('module', 'accounts');

    if (activeSubTab) params.set('tab', activeSubTab);
    if (dateFilterMode) params.set('dateMode', dateFilterMode);
    if (selectedDate) params.set('date', selectedDate);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    if (kpiDrillFilter) params.set('kpiFilter', kpiDrillFilter);
    else params.delete('kpiFilter');

    if (kpiDrillFilter2) params.set('kpiFilter2', kpiDrillFilter2);
    else params.delete('kpiFilter2');

    if (kpiDrillFilter3) params.set('kpiFilter3', kpiDrillFilter3);
    else params.delete('kpiFilter3');

    const newSearch = `?${params.toString()}`;
    if (window.location.search !== newSearch) {
      window.history.pushState({}, '', `${window.location.pathname}${newSearch}`);
    }
  }, [activeSubTab, dateFilterMode, selectedDate, startDate, endDate, kpiDrillFilter, kpiDrillFilter2, kpiDrillFilter3]);

  // Listen to Browser Back / Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const p = getInitialUrlParams();
      setActiveSubTab(p.tab || 'logbook');
      setDateFilterMode(p.dateMode || 'TODAY');
      setSelectedDate(p.date || getTodayIST());
      setStartDate(p.startDate || getTodayIST());
      setEndDate(p.endDate || getTodayIST());
      setKpiDrillFilter(p.kpiFilter);
      setKpiDrillFilter2(p.kpiFilter2);
      setKpiDrillFilter3(p.kpiFilter3);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isFetchingRef = useRef<boolean>(false);

  const fetchDayBookData = async (force: boolean = false) => {
    if (isFetchingRef.current && !force) return;
    try {
      setLoading(true);
      let queryUrl = `${API_BASE}/billing/accounts/day-book?section=all`;
      if (dateFilterMode === 'ALL') {
        queryUrl += `&date=all`;
      } else if (dateFilterMode === 'CUSTOM' && startDate && endDate) {
        queryUrl += `&date=range&startDate=${startDate}&endDate=${endDate}`;
      } else if (dateFilterMode === 'YESTERDAY') {
        queryUrl += `&date=${getYesterdayIST()}`;
      } else if (dateFilterMode === 'MONTH') {
        queryUrl += `&date=range&startDate=${getMonthStartIST()}&endDate=${getTodayIST()}`;
      } else {
        queryUrl += `&date=${selectedDate}`;
      }

      queryUrl += `&t=${Date.now()}`;

      const resBook = await fetch(queryUrl, { cache: 'no-store' });
      const dataBook = await resBook.json();

      if (dataBook.success) {
        setLogBookTimeline(dataBook.logBookTimeline || []);
        setScrapSummary(dataBook.scrapSummary || null);
        setOldMetalVaultItems(dataBook.oldMetalVaultItems || []);
        setUdhaariSummary(dataBook.udhaariSummary || null);
        setCashSummary(dataBook.cashSummary || null);
        setServerBillingActivity(dataBook.billingActivitySummary || null);
        setCashLedgerRecords(dataBook.cashLedgerRecords || []);
        setDayBookStockSummary(dataBook.dayBookStockSummary || []);
        setEodReorderList(dataBook.eodReorderList || []);
        setOrnamentsStockList(dataBook.ornamentsStockList || []);
      }
    } catch (err) {
      console.error('Failed to fetch Day Book Accounts:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchDayBookData(true);
  }, [selectedDate, dateFilterMode, startDate, endDate]);

  const handleDateModeChange = (mode: DateFilterMode) => {
    setDateFilterMode(mode);
    if (mode === 'TODAY') {
      setSelectedDate(getTodayIST());
    } else if (mode === 'YESTERDAY') {
      setSelectedDate(getYesterdayIST());
    } else if (mode === 'MONTH') {
      setStartDate(getMonthStartIST());
      setEndDate(getTodayIST());
    } else if (mode === 'CUSTOM') {
      setStartDate(getTodayIST());
      setEndDate(getTodayIST());
    }
  };

  const handleTabChange = (newTab: AccountTab) => {
    setActiveSubTab(newTab);
    setKpiDrillFilter(null);
    setKpiDrillFilter2(null);
    setKpiDrillFilter3(null);
    setLogSearchTerm('');
    setMetalCategoryFilter('ALL');
    setStockViewMode('ALL');

    if (newTab === 'udhaari_dues') {
      setDateFilterMode('ALL');
    } else {
      setDateFilterMode('TODAY');
      setSelectedDate(getTodayIST());
    }
  };

  const getISTDateOnly = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch {
      return '';
    }
  };

  const formatISTDateTime = (dateStr?: string, fallbackTime?: string) => {
    if (!dateStr) return fallbackTime || '';
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });
      const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      return `${datePart} ${timePart}`;
    } catch {
      return fallbackTime || '';
    }
  };

  // Compute KPI metrics dynamically
  const kpiMetrics = useMemo(() => {
    let localOrderCount = 0;
    let localSellCount = 0;
    let localBuyCount = 0;
    let localExchangeCount = 0;
    let totalCashCollected = 0;

    let goldGivenToWorker = 0;
    let goldTakenFromWorker = 0;
    let silverGivenToWorker = 0;
    let silverTakenFromWorker = 0;
    let cashGivenToWorker = 0;
    let cashTakenFromWorker = 0;

    let cashGotFromCustomer = 0;
    let cashGivenToCustomer = 0;
    let cashGotFromFinance = 0;
    let cashGivenToFinance = 0;

    let totalFinanceIssued = 0;
    let financeClearedCount = 0;
    let financeTakenCount = 0;

    logBookTimeline.forEach((item: any) => {
      const type = (item.type || '').toUpperCase();
      const amount = Number(item.amount || 0);
      const paid = Number(item.paid_amount || 0);

      if (type === 'ORDER') localOrderCount++;
      else if (type === 'SELL') localSellCount++;
      else if (type === 'BUY') localBuyCount++;
      else if (type === 'EXCHANGE') localExchangeCount++;

      if (type === 'WORKER TX' || type === 'WORK ASSIGN' || type === 'KARIGAR') {
        const cat = (item.category || '').toUpperCase();
        const details = (item.details || '').toUpperCase();
        const isGiven = details.includes('GIVEN TO WORKER') || details.includes('ISSUE');
        const wt = Number(item.weight_grams || 0);

        if (cat.includes('GOLD')) {
          if (isGiven) goldGivenToWorker += wt;
          else goldTakenFromWorker += wt;
        } else if (cat.includes('SILVER')) {
          if (isGiven) silverGivenToWorker += wt;
          else silverTakenFromWorker += wt;
        } else if (cat.includes('CASH')) {
          if (isGiven) cashGivenToWorker += paid;
          else cashTakenFromWorker += paid;
        }
      } else if (type === 'FINANCE') {
        const flow = (item.flow_type || '').toUpperCase();
        if (flow === 'OUT' || amount > 0) {
          totalFinanceIssued += amount;
          cashGivenToFinance += amount;
          financeTakenCount++;
        } else {
          cashGotFromFinance += paid;
          financeClearedCount++;
        }
      } else if (type === 'BUY') {
        cashGivenToCustomer += paid;
      } else if (type === 'SELL' || type === 'ORDER' || type === 'EXCHANGE') {
        if (paid > 0) {
          cashGotFromCustomer += paid;
          totalCashCollected += paid;
        }
      } else if (type === 'CASH_REGISTER' && (item.payment_mode === 'CASH_IN' || (item.raw_cash_ledger && item.raw_cash_ledger.flow_type === 'IN'))) {
        totalCashCollected += paid;
      }
    });

    let localGoldBought = 0;
    let localSilverBought = 0;
    let localGoldSold = 0;
    let localSilverSold = 0;

    logBookTimeline.forEach((item: any) => {
      const inv = item.raw_invoice;
      const type = (item.type || '').toUpperCase();

      const buyRecs = inv?.receipt_json_data?.buy_records || inv?.receipt_json_data?.old_metal || [];
      buyRecs.forEach((br: any) => {
        const metal = (br.metal_type || 'GOLD').toUpperCase();
        const wt = Number(br.weight_grams || br.item_weight || 0);
        if (metal.includes('SILVER')) localSilverBought += wt;
        else localGoldBought += wt;
      });

      if (type === 'SELL' || type === 'EXCHANGE') {
        const sellRecs = inv?.receipt_json_data?.items || inv?.receipt_json_data?.line_items || [];
        sellRecs.forEach((sr: any) => {
          const metal = (sr.metal_type || 'GOLD').toUpperCase();
          const wt = Number(sr.weight_grams || sr.item_weight || 0);
          if (metal.includes('SILVER')) localSilverSold += wt;
          else localGoldSold += wt;
        });
      }
    });

    const orderCount = serverBillingActivity?.orderMode?.count ?? localOrderCount;
    const sellCount = serverBillingActivity?.sellMode?.count ?? localSellCount;
    const buyCount = serverBillingActivity?.buyMode?.count ?? localBuyCount;
    const exchangeCount = serverBillingActivity?.tradeInMode?.count ?? localExchangeCount;
    const totalTransactions = serverBillingActivity?.totalTransactionsCount ?? (orderCount + sellCount + buyCount + exchangeCount);

    const overallMetalPuritySummary = serverBillingActivity?.overallMetalPuritySummary || {
      gold: {
        soldGross: localGoldSold,
        soldNet: localGoldSold,
        soldPure: localGoldSold,
        boughtGross: localGoldBought,
        boughtNet: localGoldBought,
        boughtPure: localGoldBought,
        netPureFlow: localGoldBought - localGoldSold,
      },
      silver: {
        soldGross: localSilverSold,
        soldNet: localSilverSold,
        soldPure: localSilverSold,
        boughtGross: localSilverBought,
        boughtNet: localSilverBought,
        boughtPure: localSilverBought,
        netPureFlow: localSilverBought - localSilverSold,
      },
    };

    return {
      orderCount,
      sellCount,
      buyCount,
      exchangeCount,
      totalTransactions,
      orderMode: serverBillingActivity?.orderMode || null,
      sellMode: serverBillingActivity?.sellMode || null,
      buyMode: serverBillingActivity?.buyMode || null,
      tradeInMode: serverBillingActivity?.tradeInMode || null,
      overallMetalPuritySummary,
      goldGivenToWorker: Number(goldGivenToWorker.toFixed(3)),
      goldTakenFromWorker: Number(goldTakenFromWorker.toFixed(3)),
      silverGivenToWorker: Number(silverGivenToWorker.toFixed(3)),
      silverTakenFromWorker: Number(silverTakenFromWorker.toFixed(3)),
      cashGivenToWorker: Math.round(cashGivenToWorker),
      cashTakenFromWorker: Math.round(cashTakenFromWorker),
      goldIn: overallMetalPuritySummary?.gold?.boughtGross || 0,
      goldOut: overallMetalPuritySummary?.gold?.soldGross || 0,
      goldWtAdded: 0,
      silverIn: overallMetalPuritySummary?.silver?.boughtGross || 0,
      silverOut: overallMetalPuritySummary?.silver?.soldGross || 0,
      silverWtAdded: 0,
      cashIn: Math.round(cashGotFromCustomer + cashGotFromFinance),
      cashOut: Math.round(cashGivenToCustomer + cashGivenToFinance),
      cashGotFromCustomer: Math.round(cashGotFromCustomer),
      cashGivenToCustomer: Math.round(cashGivenToCustomer),
      cashGotFromFinance: Math.round(cashGotFromFinance),
      cashGivenToFinance: Math.round(cashGivenToFinance),
      totalCashCollected: Math.round(totalCashCollected),
      totalFinanceIssued: Math.round(totalFinanceIssued),
      financeClearedCount,
      financeTakenCount,
    };
  }, [logBookTimeline, serverBillingActivity]);

  // Filter Log Book timeline by search term and KPI drilldown filter
  const filteredTimeline = useMemo(() => {
    let result = logBookTimeline;

    if (kpiDrillFilter) {
      result = result.filter((item) => {
        const rawType = (item.type || '').toUpperCase();
        if (kpiDrillFilter === 'ORDER') return rawType === 'ORDER';
        if (kpiDrillFilter === 'SELL') return rawType === 'SELL';
        if (kpiDrillFilter === 'BUY') return rawType === 'BUY';
        if (kpiDrillFilter === 'EXCHANGE') return rawType === 'EXCHANGE';
        return true;
      });
    }

    if (logSearchTerm.trim()) {
      const term = logSearchTerm.trim().toLowerCase();
      result = result.filter((item) => {
        const nameMatch = (item.title || '').toLowerCase().includes(term);
        const detailsMatch = (item.details || '').toLowerCase().includes(term);
        const phoneMatch = (item.customer_phone || '').includes(term);
        return nameMatch || detailsMatch || phoneMatch;
      });
    }

    return [...result].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [logBookTimeline, kpiDrillFilter, logSearchTerm]);

  const pillTabs = [
    { id: 'logbook', label: '💻 Daily Entry Log Book' },
    { id: 'stock', label: '📦 Metal In & Outs' },
    { id: 'cash', label: '💵 Cash In & Outs' },
    { id: 'scrap', label: '⚖️ Buy Metal records' },
    { id: 'udhaari', label: '🤝 Workers Transactions' },
    { id: 'udhaari_dues', label: '📋 Customer Dues' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '0.25rem 0.5rem', fontFamily: "'Inter', sans-serif" }}>
      {/* Header & Date Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.80rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-book-journal-whills" style={{ color: '#d97706' }} />
            Accounts & Daily EOD Day Book
            <button onClick={() => fetchDayBookData(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}>
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </h1>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
            Daily sales, cash counter, scrap purchases, worker fine accounts & net profit
          </p>
        </div>

        {/* Date Selector UI (Synced with URL Params) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={dateFilterMode}
            onChange={(e) => handleDateModeChange(e.target.value as DateFilterMode)}
            style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.70rem', fontWeight: 700, outline: 'none', background: '#ffffff' }}
          >
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="MONTH">This Month</option>
            <option value="CUSTOM">Custom Range</option>
            <option value="ALL">All Time</option>
          </select>

          {dateFilterMode === 'DATE' || dateFilterMode === 'TODAY' || dateFilterMode === 'YESTERDAY' ? (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setDateFilterMode('DATE'); }}
              style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.70rem', fontWeight: 700, outline: 'none', background: '#ffffff' }}
            />
          ) : null}

          {dateFilterMode === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '2px 5px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '0.65rem', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '2px 5px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '0.65rem', fontWeight: 700 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Pill Selection Bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.05rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {pillTabs.map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as AccountTab)}
              style={{
                padding: '3px 9px',
                borderRadius: '6px',
                border: active ? '1.5px solid #d97706' : '1px solid #e2e8f0',
                background: active ? '#181310' : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.62rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '12px' }}>
          <style>{`@keyframes accountsSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ width: '42px', height: '42px', border: '3.5px solid #fef3c7', borderTop: '3.5px solid #d97706', borderRadius: '50%', animation: 'accountsSpin 0.75s linear infinite' }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-calculator" style={{ color: '#d97706' }} />
            Loading Accounts & EOD Day Book...
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
            Fetching transactions, scrap vault, worker accounts & cash flow
          </div>
        </div>
      ) : (
        <>
          {/* SUB-SCREEN 1: 💻 Daily Entry Log Book */}
          {activeSubTab === 'logbook' && (
            <>
              {/* Top 4 Transaction Activity KPI Cards */}
              <TransactionActivityKpiCards
                kpiMetrics={kpiMetrics}
                kpiDrillFilter={kpiDrillFilter}
                setKpiDrillFilter={setKpiDrillFilter}
              />

              {/* 3 Grid Analytics Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <MetalTurnoverPurityView kpiMetrics={kpiMetrics} />
                <WorkerTransactionsKpiView kpiMetrics={kpiMetrics} />
                <PeriodMovementFlowView
                  kpiMetrics={kpiMetrics}
                  cashSummary={cashSummary}
                  dateFilterMode={dateFilterMode}
                />
              </div>

              {/* Chronological Daily Entry Log Table */}
              <ChronologicalLogBookTable
                filteredTimeline={filteredTimeline}
                kpiDrillFilter={kpiDrillFilter}
                setKpiDrillFilter={setKpiDrillFilter}
                logSearchTerm={logSearchTerm}
                setLogSearchTerm={setLogSearchTerm}
                selectedDate={selectedDate}
                dateFilterMode={dateFilterMode}
                getISTDateOnly={getISTDateOnly}
                formatISTDateTime={formatISTDateTime}
                setSelectedBillModalItem={setSelectedBillModalItem}
              />
            </>
          )}

          {/* SUB-SCREEN 2: 📦 Metal In & Outs (StockMovementView) */}
          {activeSubTab === 'stock' && (
            <StockMovementView
              stockViewMode={stockViewMode === 'ALL' ? 'ALL' : 'TODAY'}
              setStockViewMode={(mode) => setStockViewMode(mode === 'ALL' ? 'ALL' : 'TODAY')}
              metalCategoryFilter={metalCategoryFilter}
              setMetalCategoryFilter={setMetalCategoryFilter}
              ornamentsStockList={ornamentsStockList}
              eodReorderList={eodReorderList}
              logBookTimeline={logBookTimeline}
              dayBookStockSummary={dayBookStockSummary}
            />
          )}

          {/* SUB-SCREEN 3: 💵 Cash In & Outs (CashRegisterView) */}
          {activeSubTab === 'cash' && cashSummary && (
            <CashRegisterView
              cashSummary={cashSummary}
              cashLedgerRecords={cashLedgerRecords}
            />
          )}

          {/* SUB-SCREEN 4: ⚖️ Buy Metal records (OldMetalVaultView) */}
          {activeSubTab === 'scrap' && (
            <OldMetalVaultView
              scrapSummary={scrapSummary}
              oldMetalVaultItems={oldMetalVaultItems}
            />
          )}

          {/* SUB-SCREEN 5: 📋 Customer Purchase Dues & Udhaari */}
          {activeSubTab === 'udhaari_dues' && (
            <UdhaariCustomerDuesView
              logBookTimeline={logBookTimeline}
              onSelectBill={(item) => setSelectedBillModalItem(item)}
              formatISTDateTime={formatISTDateTime}
            />
          )}

          {/* SUB-SCREEN 6: 🤝 Workers Transactions (UdhaariKarigarView) */}
          {activeSubTab === 'udhaari' && (
            <UdhaariKarigarView
              udhaariSummary={udhaariSummary}
              logBookTimeline={logBookTimeline}
            />
          )}
        </>
      )}

      {/* Modals */}
      {selectedBillModalItem && (
        <SeeBillModal
          customer={{
            id: selectedBillModalItem.id || 'bill-modal',
            customer_name: selectedBillModalItem.raw_invoice?.customer_name || selectedBillModalItem.title || 'Customer',
            customer_phone: selectedBillModalItem.raw_invoice?.customer_phone || '',
            latestInvoice: selectedBillModalItem.raw_invoice || selectedBillModalItem,
          } as any}
          rates={null}
          onClose={() => setSelectedBillModalItem(null)}
        />
      )}
    </div>
  );
};