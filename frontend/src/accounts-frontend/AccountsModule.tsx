import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { HeaderRefreshButton } from '../components/HeaderRefreshButton';
import type { Language } from '../utils/translations';
import { InvoiceDetailsView } from '../billing-frontend/components/InvoiceDetailsView';
import { useMetalRates } from '../utils/metalRatesStore';
// import { DailySnapshotView, SnapshotDetailView } from './components/DailySnapshotView';
import { StockMovementView } from './components/StockMovementView';
import { CashRegisterView } from './components/CashRegisterView';
import { OldMetalVaultView } from './components/OldMetalVaultView';
import { UdhaariKarigarView } from './components/UdhaariKarigarView';
// import { DailyProfitsView } from './components/DailyProfitsView';

interface AccountsModuleProps {
  lang?: Language;
  onNavigateToBilling?: (item?: any) => void;
}

type AccountTab = 'logbook' | 'stock' | 'cash' | 'scrap' | 'udhaari' | 'profit' | 'snapshot';

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
  const [metalCategoryFilter, setMetalCategoryFilter] = useState<'ALL' | 'GOLD' | 'SILVER'>('ALL');
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [oldMetalVaultItems, setOldMetalVaultItems] = useState<any[]>([]);

  // Day Book Data State
  const [logBookTimeline, setLogBookTimeline] = useState<any[]>([]);
  const [dayBookStockSummary, setDayBookStockSummary] = useState<any[]>([]);
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [cashLedgerRecords, setCashLedgerRecords] = useState<any[]>([]);
  const [scrapSummary, setScrapSummary] = useState<any>(null);
  const [udhaariSummary, setUdhaariSummary] = useState<any>(null);
  const [serverBillingActivity, setServerBillingActivity] = useState<any>(null);

  const sortedTimeline = [...logBookTimeline].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return sortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
  });

  const kpiMetrics = React.useMemo(() => {
    let localOrderCount = 0;
    let localSellCount = 0;
    let localBuyCount = 0;
    let localExchangeCount = 0;
    let goldWtAdded = 0;
    let silverWtAdded = 0;
    let goldPcsAdded = 0;
    let silverPcsAdded = 0;
    let cashGotFromCustomer = 0;
    let cashGivenToCustomer = 0;
    let cashGotFromFinance = 0;
    let cashGivenToFinance = 0;
    let totalCashCollected = 0;
    let totalFinanceIssued = 0;
    let financeTakenCount = 0;
    let financeClearedCount = 0;

    let goldWorkerGiven = 0;
    let goldWorkerTaken = 0;
    let silverWorkerGiven = 0;
    let silverWorkerTaken = 0;
    let cashWorkerGiven = 0;
    let cashWorkerTaken = 0;

    logBookTimeline.forEach((item: any) => {
      const type = (item.type || '').toUpperCase();
      const hasScrapBought = (item.raw_invoice && item.raw_invoice.buy_records && item.raw_invoice.buy_records.length > 0) || Boolean(item.scrap_details) || (item.details || '').includes('Bought:');
      const paid = Number(item.paid_amount || item.amount || 0);

      if (type === 'ORDER') localOrderCount++;
      if (type === 'SELL') localSellCount++;
      if (type === 'EXCHANGE') localExchangeCount++;
      if (hasScrapBought) localBuyCount++;

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

      if (type === 'KARIGAR' || type === 'WORK ASSIGN' || type === 'WORKER TX') {
        const isAdminToWorker = (item.direction || '').toUpperCase().includes('ADMIN_TO_WORKER') || (item.title || '').startsWith('Admin');
        const metalType = (item.transfer_item_mode || item.category || 'GOLD').toUpperCase();
        const wt = Number(item.weight_grams || item.net_weight || item.fine_weight_grams || 0);
        const amt = Number(item.amount || item.paid_amount || 0);

        if (isAdminToWorker) {
          if (metalType.includes('GOLD')) {
            goldWorkerGiven += wt;
          } else if (metalType.includes('SILVER')) {
            silverWorkerGiven += wt;
          }
          if (metalType.includes('CASH') || amt > 0) {
            cashWorkerGiven += amt;
          }
        } else {
          if (metalType.includes('GOLD')) {
            goldWorkerTaken += wt;
          } else if (metalType.includes('SILVER')) {
            silverWorkerTaken += wt;
          }
          if (metalType.includes('CASH') || amt > 0) {
            cashWorkerTaken += amt;
          }
        }
      }

      if (type === 'BUY') {
        // Admin bought scrap/items from customer -> Cash paid out to customer (DEBIT)
        cashGivenToCustomer += paid;
        totalCashCollected -= paid;
      } else if (type === 'FINANCE' || type === 'FINANCE_LOAN' || type === 'FINANCE_REPAYMENT') {
        const isRepayment = (item.payment_mode || '').toUpperCase().includes('REPAY') || (item.details || '').toLowerCase().includes('repay') || (item.flow_type || '').toUpperCase() === 'IN';
        const amt = Number(item.amount || item.paid_amount || 0);
        if (isRepayment) {
          cashGotFromFinance += amt;
          totalCashCollected += amt;
          financeClearedCount++;
        } else {
          cashGivenToFinance += amt;
          totalFinanceIssued += amt;
          financeTakenCount++;
        }
      } else if (paid > 0 && type !== 'INVENTORY' && type !== 'CASH_REGISTER' && type !== 'KARIGAR' && type !== 'WORK ASSIGN' && type !== 'WORKER TX') {
        const buyCredit = Number(item.raw_invoice?.total_buy_credit || item.raw_invoice?.receipt_json_data?.totalBuyCredit || item.raw_invoice?.receipt_json_data?.total_buy_credit || 0);
        const sellVal = Number(item.raw_invoice?.total_sell_value || item.raw_invoice?.receipt_json_data?.totalSellValue || item.raw_invoice?.receipt_json_data?.total_sell_value || 0);

        const isOutflow =
          (item.flow_type || '').toUpperCase() === 'OUT' ||
          (item.direction || '').toUpperCase().includes('OUT') ||
          Boolean(item.raw_invoice?.shop_pays_customer) ||
          (buyCredit > sellVal && buyCredit > 0);

        if (isOutflow) {
          cashGivenToCustomer += paid;
          totalCashCollected -= paid;
        } else {
          cashGotFromCustomer += paid;
          totalCashCollected += paid;
        }
      } else if (type === 'CASH_REGISTER' && (item.payment_mode === 'CASH_IN' || (item.raw_cash_ledger && item.raw_cash_ledger.flow_type === 'IN'))) {
        totalCashCollected += paid;
      }
    });

    const orderCount = serverBillingActivity?.orderMode?.count ?? localOrderCount;
    const sellCount = serverBillingActivity?.sellMode?.count ?? localSellCount;
    const buyCount = serverBillingActivity?.buyMode?.count ?? localBuyCount;
    const exchangeCount = serverBillingActivity?.tradeInMode?.count ?? localExchangeCount;
    const totalTransactions = serverBillingActivity?.totalTransactionsCount ?? (orderCount + sellCount + buyCount + exchangeCount);

    const totalGoldSoldGross = serverBillingActivity?.overallMetalPuritySummary?.gold?.soldGross ?? 0;
    const totalSilverSoldGross = serverBillingActivity?.overallMetalPuritySummary?.silver?.soldGross ?? 0;
    const boughtGold = serverBillingActivity?.overallMetalPuritySummary?.gold?.boughtGross ?? 0;
    const boughtSilver = serverBillingActivity?.overallMetalPuritySummary?.silver?.boughtGross ?? 0;

    const goldIn = Number((goldWtAdded + boughtGold + goldWorkerTaken).toFixed(3));
    const goldOut = Number((totalGoldSoldGross + goldWorkerGiven).toFixed(3));
    const silverIn = Number((silverWtAdded + boughtSilver + silverWorkerTaken).toFixed(3));
    const silverOut = Number((totalSilverSoldGross + silverWorkerGiven).toFixed(3));
    const cashIn = cashGotFromCustomer + cashGotFromFinance + cashWorkerTaken;
    const cashOut = cashGivenToCustomer + cashGivenToFinance + cashWorkerGiven;

    const netGoldFlow = Number((goldIn - goldOut).toFixed(3));
    const netSilverFlow = Number((silverIn - silverOut).toFixed(3));

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
      overallMetalPuritySummary: serverBillingActivity?.overallMetalPuritySummary || null,
      orderBreakdown: serverBillingActivity?.orderMode || null,
      sellBreakdown: serverBillingActivity?.sellMode || null,
      buyBreakdown: serverBillingActivity?.buyMode || null,
      tradeInBreakdown: serverBillingActivity?.tradeInMode || null,
      goldWtAdded: netGoldFlow,
      silverWtAdded: netSilverFlow,
      goldPcsAdded,
      silverPcsAdded,
      totalCashCollected,
      totalFinanceIssued,
      financeTakenCount,
      financeClearedCount,
      cashGotFromCustomer,
      cashGivenToCustomer,
      cashGotFromFinance,
      cashGivenToFinance,
      todayCashGotFromCustomer: cashGotFromCustomer,
      todayCashGivenToCustomer: cashGivenToCustomer,
      goldWorkerGiven: Number(goldWorkerGiven.toFixed(3)),
      goldWorkerTaken: Number(goldWorkerTaken.toFixed(3)),
      silverWorkerGiven: Number(silverWorkerGiven.toFixed(3)),
      silverWorkerTaken: Number(silverWorkerTaken.toFixed(3)),
      cashWorkerGiven,
      goldIn,
      goldOut,
      silverIn,
      silverOut,
      cashIn,
      cashOut,
      cashWorkerTaken,
    };
  }, [logBookTimeline, serverBillingActivity]);

  // KPI Drill-Down filtered entries
  const kpiDrillItems = React.useMemo(() => {
    if (!kpiDrillFilter) return [];
    return logBookTimeline.filter((item: any) => {
      const type = (item.type || '').toUpperCase();
      const details = (item.details || '');
      if (kpiDrillFilter === 'ORDER') return type === 'ORDER';
      if (kpiDrillFilter === 'SELL') return type === 'SELL' || type === 'EXCHANGE' || type === 'ORDER';
      if (kpiDrillFilter === 'BUY') return type === 'BUY' || details.includes('Bought:') || details.includes('Scrap') || type === 'EXCHANGE' || type === 'ORDER';
      if (kpiDrillFilter === 'EXCHANGE') return type === 'EXCHANGE';
      return false;
    });
  }, [logBookTimeline, kpiDrillFilter]);



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

      let prodUrl = `${API_BASE}/inventory/products`;
      if ((dateFilterMode === 'DATE' || dateFilterMode === 'TODAY') && selectedDate) {
        prodUrl = `${API_BASE}/inventory/historical-stock?date=${selectedDate}`;
      } else if (dateFilterMode === 'CUSTOM' && endDate) {
        prodUrl = `${API_BASE}/inventory/historical-stock?date=${endDate}`;
      }

      const [resBook, resProd] = await Promise.all([
        fetch(queryUrl),
        fetch(prodUrl),
      ]);

      const dataBook = await resBook.json();
      const dataProd = await resProd.json();

      if (dataBook.success) {
        setLogBookTimeline(dataBook.logBookTimeline || []);
        setDayBookStockSummary(dataBook.stockSummary || []);
        setCashSummary(dataBook.cashSummary || null);
        setCashLedgerRecords(dataBook.cashLedgerRecords || []);
        setScrapSummary(dataBook.scrapSummary || null);
        setOldMetalVaultItems(dataBook.oldMetalVaultItems || []);
        setUdhaariSummary(dataBook.udhaariSummary || null);
        setServerBillingActivity(dataBook.billingActivitySummary || null);
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
      const weight = Number(prod.current_stock_weight ?? prod.weight_grams ?? prod.weight_from_grams ?? 0);
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
    fetchDayBookData(true);
  }, [selectedDate, dateFilterMode, startDate, endDate]);

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
      try { receiptPayload = JSON.parse(receiptPayload); } catch (e) { }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-book-bookmark" style={{ color: '#d97706', fontSize: '1rem' }}></i>
            {lang === 'TE' ? 'ఖాతా పుస్తకం & రోజువారీ ముగింపు (Accounts Day Book)' : 'Accounts & Daily EOD Day Book'}
            <HeaderRefreshButton onRefresh={() => fetchDayBookData(true)} size="sm" title="Hard Refresh Accounts Ledger" />
          </h1>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.68rem' }}>
            {lang === 'TE' ? 'రోజువారీ నగదు రసీదులు, అమ్మకాలు, కొనుగోళ్లు మరియు ప్రాఫిట్ లెడ్జర్' : 'Daily sales, cash counter, scrap purchases, worker fine accounts & net profit'}
          </p>
        </div>

        {/* Date Selector Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setDateFilterMode('TODAY');
              setSelectedDate(getTodayIST());
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: dateFilterMode === 'TODAY' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
              background: dateFilterMode === 'TODAY' ? '#fef3c7' : '#ffffff',
              color: dateFilterMode === 'TODAY' ? '#b45309' : '#475569',
              fontWeight: 800,
              fontSize: '0.65rem',
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
              padding: '4px 10px',
              borderRadius: '6px',
              border: dateFilterMode === 'ALL' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              background: dateFilterMode === 'ALL' ? '#e0f2fe' : '#ffffff',
              color: dateFilterMode === 'ALL' ? '#0369a1' : '#475569',
              fontWeight: 800,
              fontSize: '0.65rem',
              cursor: 'pointer',
            }}
          >
            🌐 All Time (All Records)
          </button>

          <button
            type="button"
            onClick={() => setDateFilterMode('CUSTOM')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: dateFilterMode === 'CUSTOM' ? '1.5px solid #7e22ce' : '1px solid #cbd5e1',
              background: dateFilterMode === 'CUSTOM' ? '#faf5ff' : '#ffffff',
              color: dateFilterMode === 'CUSTOM' ? '#7e22ce' : '#475569',
              fontWeight: 800,
              fontSize: '0.65rem',
              cursor: 'pointer',
            }}
          >
            📅 Date Range
          </button>

          {dateFilterMode === 'CUSTOM' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ffffff', padding: '3px 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: 'none', fontSize: '0.68rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
              />
              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: 'none', fontSize: '0.68rem', fontWeight: 700, color: '#0f172a', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => fetchDayBookData(true)}
                style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: '#7e22ce', color: '#ffffff', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}
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
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.68rem',
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
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0' }}>
        {[
          { id: 'logbook', label: '📖 Daily Entry Log Book', desc: 'Live Minute-by-Minute Timeline' },
          { id: 'stock', label: '📦 Stock Movement', desc: 'Opening, Sold & Closing Weight' },
          { id: 'cash', label: '💵 Cash & Counter Register', desc: 'Cash Drawer Reconciliation' },
          { id: 'scrap', label: '⚖️ Buy Metal Vault', desc: 'Scrap Gold & Silver Purchases' },
          { id: 'udhaari', label: '🤝 Udhaari & Karigar', desc: 'Credit Dues & Goldsmith Fine' },
          // { id: 'snapshot', label: '📸 Daily Snapshot', desc: 'Full EOD Closing Snapshot History' },
        ].map((tab) => {
          const active = activeSubTab === tab.id;
          const isSnapshot = tab.id === 'snapshot';
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as AccountTab)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: active
                  ? (isSnapshot ? '1.5px solid #7c3aed' : '1.5px solid #d97706')
                  : '1px solid #e2e8f0',
                background: active
                  ? (isSnapshot ? 'linear-gradient(135deg, #4c1d95 0%, #3730a3 100%)' : 'linear-gradient(135deg, #2b2019 0%, #181310 100%)')
                  : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                fontWeight: 700,
                fontSize: '0.68rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: active
                  ? (isSnapshot ? '0 4px 12px rgba(124,58,237,0.3)' : '0 4px 12px rgba(43,32,25,0.25)')
                  : 'none',
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

      {/* SUB-SCREEN: 📸 Daily Snapshot (Full EOD Snapshot History + Detail) */}
      {/* {activeSubTab === 'snapshot' && (
        <DailySnapshotView lang={lang} onSelectSnapshot={(rec) => setSelectedSnapshotRecord(rec)} />
      )} */}

      {!loading && activeSubTab !== 'snapshot' && (
        <>
          {/* SUB-SCREEN 1: 📖 Daily Entry Log Book (Chronological Timeline) */}
          {activeSubTab === 'logbook' && (
            <div>
              {/* ── 1. TOP FULL HORIZONTAL ROW: TRANSACTION ACTIVITY (4-CARD GRID) ── */}
              <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '0.85rem 1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-chart-pie" style={{ color: '#d97706', fontSize: '0.75rem' }} />
                    Transaction Activity
                  </div>
                  <span style={{ fontSize: '0.60rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    Total: {kpiMetrics.totalTransactions} Bills Done
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                  {/* 1. ORDERS CARD */}
                  <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'ORDER' ? null : 'ORDER')} style={{ background: kpiDrillFilter === 'ORDER' ? '#fef3c7' : '#fffbe6', border: `1.5px solid ${kpiDrillFilter === 'ORDER' ? '#f59e0b' : '#fde68a'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'ORDER' ? '0 0 0 2px rgba(245,158,11,0.2)' : 'none', transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🛍️ Orders</span>
                        {kpiDrillFilter === 'ORDER' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.54rem', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
                      </div>
                      <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#92400e', marginTop: '2px' }}>{kpiMetrics.orderCount} <span style={{ fontSize: '0.62rem', fontWeight: 700 }}>Bills</span></div>
                      <div style={{ fontSize: '0.58rem', color: '#b45309', fontWeight: 700, margin: '2px 0 6px 0' }}>
                        {kpiMetrics.orderMode ? `${kpiMetrics.orderMode.sellsCount || 0} Sold Ornaments · ${kpiMetrics.orderMode.buysCount || 0} Scrap` : 'Order items'}
                      </div>
                    </div>
                    {/* Weight Breakdown */}
                    {(() => {
                      const m = kpiMetrics.orderMode;
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.85)', padding: '4px 6px', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.56rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {(m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) && (
                            <div style={{ color: '#92400e' }}>
                              {m?.goldSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold Sold:</span><strong>{m.goldSoldGross}g sold</strong></div>}
                              {m?.goldBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold Scrap:</span><strong>{m.goldBoughtGross}g → {m.goldBoughtPure}g Pure</strong></div>}
                            </div>
                          )}
                          {(m?.silverSoldGross > 0 || m?.silverBoughtGross > 0) && (
                            <div style={{ color: '#475569', borderTop: (m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) ? '1px dashed #fde68a' : 'none', paddingTop: '2px' }}>
                              {m?.silverSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Sold:</span><strong>{m.silverSoldGross}g → {m.silverSoldPure}g Pure</strong></div>}
                              {m?.silverBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Scrap:</span><strong>{m.silverBoughtGross}g → {m.silverBoughtPure}g Pure</strong></div>}
                            </div>
                          )}
                          {!m?.goldSoldGross && !m?.goldBoughtGross && !m?.silverSoldGross && !m?.silverBoughtGross && (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No metal weight in period</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 2. SELLS CARD */}
                  <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'SELL' ? null : 'SELL')} style={{ background: kpiDrillFilter === 'SELL' ? '#dcfce7' : '#f0fdf4', border: `1.5px solid ${kpiDrillFilter === 'SELL' ? '#22c55e' : '#bbf7d0'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'SELL' ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none', transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#15803d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🟢 Direct Sells</span>
                        {kpiDrillFilter === 'SELL' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.54rem', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
                      </div>
                      <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#166534', marginTop: '2px' }}>{kpiMetrics.sellCount} <span style={{ fontSize: '0.62rem', fontWeight: 700 }}>Bills</span></div>
                      <div style={{ fontSize: '0.58rem', color: '#15803d', fontWeight: 700, margin: '2px 0 6px 0' }}>
                        {kpiMetrics.sellMode ? `${kpiMetrics.sellMode.sellsCount || 0} Direct Sale Items` : 'Sale items'}
                      </div>
                    </div>
                    {/* Weight Breakdown */}
                    {(() => {
                      const m = kpiMetrics.sellMode;
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.85)', padding: '4px 6px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.56rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {m?.goldSoldGross > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                              <span>🥇 Gold Sold:</span>
                              <strong>{m.goldSoldGross}g sold</strong>
                            </div>
                          )}
                          {m?.silverSoldGross > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', borderTop: m?.goldSoldGross > 0 ? '1px dashed #bbf7d0' : 'none', paddingTop: '2px' }}>
                              <span>🥈 Silver Sold:</span>
                              <strong>{m.silverSoldGross}g → {m.silverSoldPure}g Pure</strong>
                            </div>
                          )}
                          {!m?.goldSoldGross && !m?.silverSoldGross && (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No direct sales in period</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 3. SCRAP BUYS CARD */}
                  <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'BUY' ? null : 'BUY')} style={{ background: kpiDrillFilter === 'BUY' ? '#dbeafe' : '#eff6ff', border: `1.5px solid ${kpiDrillFilter === 'BUY' ? '#3b82f6' : '#bfdbfe'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'BUY' ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none', transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#1d4ed8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🔵 Scrap Buys</span>
                        {kpiDrillFilter === 'BUY' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.54rem', background: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
                      </div>
                      <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#1e40af', marginTop: '2px' }}>{kpiMetrics.buyCount} <span style={{ fontSize: '0.62rem', fontWeight: 700 }}>Bills</span></div>
                      <div style={{ fontSize: '0.58rem', color: '#1d4ed8', fontWeight: 700, margin: '2px 0 6px 0' }}>
                        {kpiMetrics.buyMode ? `${kpiMetrics.buyMode.buysCount || 0} Scrap Purchases` : 'Scrap items'}
                      </div>
                    </div>
                    {/* Weight Breakdown */}
                    {(() => {
                      const m = kpiMetrics.buyMode;
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.85)', padding: '4px 6px', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.56rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {m?.goldBoughtGross > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e40af' }}>
                              <span>🥇 Gold Scrap:</span>
                              <strong>{m.goldBoughtGross}g → {m.goldBoughtPure}g Pure</strong>
                            </div>
                          )}
                          {m?.silverBoughtGross > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', borderTop: m?.goldBoughtGross > 0 ? '1px dashed #bfdbfe' : 'none', paddingTop: '2px' }}>
                              <span>🥈 Silver Scrap:</span>
                              <strong>{m.silverBoughtGross}g → {m.silverBoughtPure}g Pure</strong>
                            </div>
                          )}
                          {!m?.goldBoughtGross && !m?.silverBoughtGross && (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No scrap purchases in period</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 4. TRADE-INS CARD */}
                  <div onClick={() => setKpiDrillFilter(kpiDrillFilter === 'EXCHANGE' ? null : 'EXCHANGE')} style={{ background: kpiDrillFilter === 'EXCHANGE' ? '#ede9fe' : '#faf5ff', border: `1.5px solid ${kpiDrillFilter === 'EXCHANGE' ? '#8b5cf6' : '#e9d5ff'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter === 'EXCHANGE' ? '0 0 0 2px rgba(139,92,246,0.2)' : 'none', transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#7e22ce', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🟣 Trade-ins (Exchange)</span>
                        {kpiDrillFilter === 'EXCHANGE' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.54rem', background: '#ede9fe', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
                      </div>
                      <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#6b21a8', marginTop: '2px' }}>{kpiMetrics.exchangeCount} <span style={{ fontSize: '0.62rem', fontWeight: 700 }}>Bills</span></div>
                      <div style={{ fontSize: '0.58rem', color: '#7e22ce', fontWeight: 700, margin: '2px 0 6px 0' }}>
                        {kpiMetrics.tradeInMode ? `${kpiMetrics.tradeInMode.sellsCount || 0} Sold Ornaments · ${kpiMetrics.tradeInMode.buysCount || 0} Scrap` : 'Exchange items'}
                      </div>
                    </div>
                    {/* Weight Breakdown */}
                    {(() => {
                      const m = kpiMetrics.tradeInMode;
                      return (
                        <div style={{ background: 'rgba(255,255,255,0.85)', padding: '4px 6px', borderRadius: '6px', border: '1px solid #e9d5ff', fontSize: '0.56rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {(m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) && (
                            <div style={{ color: '#6b21a8' }}>
                              {m?.goldSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold Sold:</span><strong>{m.goldSoldGross}g sold</strong></div>}
                              {m?.goldBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold Scrap:</span><strong>{m.goldBoughtGross}g → {m.goldBoughtPure}g Pure</strong></div>}
                            </div>
                          )}
                          {(m?.silverSoldGross > 0 || m?.silverBoughtGross > 0) && (
                            <div style={{ color: '#475569', borderTop: (m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) ? '1px dashed #e9d5ff' : 'none', paddingTop: '2px' }}>
                              {m?.silverSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Sold:</span><strong>{m.silverSoldGross}g sold</strong></div>}
                              {m?.silverBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Scrap:</span><strong>{m.silverBoughtGross}g → {m.silverBoughtPure}g Pure</strong></div>}
                            </div>
                          )}
                          {!m?.goldSoldGross && !m?.goldBoughtGross && !m?.silverSoldGross && !m?.silverBoughtGross && (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No trade-ins in period</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* ── 2. BELOW 3-COLUMN BALANCED ROW: METAL PURITY (4 ROWS), STORE STOCK & PERIOD FLOW ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>

                {/* ── SECTION 1: METAL TURNOVER & PURITY FLOW (4 ROWS) ── */}
                <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)', borderRadius: '14px', border: '1px solid #fde68a', padding: '0.85rem 1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-scale-balanced" style={{ color: '#d97706', fontSize: '0.75rem' }} />
                        Metal Turnover & Purity
                      </div>
                      {/* {(() => {
                        const p = kpiMetrics.overallMetalPuritySummary;
                        if (!p) return null;
                        return (
                          <span style={{ fontSize: '0.56rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: p.gold.netPureFlow >= 0 ? '#dcfce7' : '#fee2e2', color: p.gold.netPureFlow >= 0 ? '#15803d' : '#b91c1c' }}>
                            Net: {p.gold.netPureFlow >= 0 ? '+' : ''}{p.gold.netPureFlow}g Pure
                          </span>
                        );
                      })()} */}
                    </div>

                    {/* 4 Rows of Metal Buy & Sell */}
                    {(() => {
                      const p = kpiMetrics.overallMetalPuritySummary;
                      const goldSoldGross = p?.gold?.soldGross ?? 0;
                      const goldBoughtGross = p?.gold?.boughtGross ?? 0;
                      const goldBoughtNet = p?.gold?.boughtNet ?? goldBoughtGross;
                      const goldBoughtPure = p?.gold?.boughtPure ?? 0;

                      const silverSoldGross = p?.silver?.soldGross ?? 0;
                      const silverBoughtGross = p?.silver?.boughtGross ?? 0;
                      const silverBoughtNet = p?.silver?.boughtNet ?? silverBoughtGross;
                      const silverBoughtPure = p?.silver?.boughtPure ?? 0;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {/* Row 1: Gold Sold */}
                          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>🥇</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#b45309' }}>Gold Sold:</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#78350f' }}>{goldSoldGross}g (Item Wt)</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#92400e', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                              ➔ {goldSoldGross}g sold
                            </span>
                          </div>

                          {/* Row 2: Gold Scrap In */}
                          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>⚖️</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#854d0e' }}>Gold Scrap In:</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#713f12' }}>{goldBoughtGross}g (Item Wt)</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#047857', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                              ➔ {goldBoughtNet}g Net ➔ {goldBoughtPure}g Pure
                            </span>
                          </div>

                          {/* Row 3: Silver Sold */}
                          <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>🥈</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0369a1' }}>Silver Sold:</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#0c4a6e' }}>{silverSoldGross}g (Item Wt)</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                              ➔ {silverSoldGross}g sold
                            </span>
                          </div>

                          {/* Row 4: Silver Scrap In */}
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>🥈</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569' }}>Silver Scrap In:</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#334155' }}>{silverBoughtGross}g (Item Wt)</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 800, color: '#047857', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                              ➔ {silverBoughtNet}g Net ➔ {silverBoughtPure}g Pure
                            </span>
                          </div>

                          {/* Row 5: Cash Got From Customers */}
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>💵</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#15803d' }}>Cash Got From Customers:</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 900, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                              +₹{kpiMetrics.cashGotFromCustomer.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Row 6: Cash Given To Customers */}
                          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>💸</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#b91c1c' }}>Cash Given To Customers:</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 900, color: '#b91c1c', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                              -₹{kpiMetrics.cashGivenToCustomer.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Row 7: Cash Got From Finance */}
                          <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>🏦</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0f766e' }}>Cash Got From Finance:</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 900, color: '#0f766e', background: '#ccfbf1', padding: '1px 6px', borderRadius: '4px' }}>
                              +₹{kpiMetrics.cashGotFromFinance.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Row 8: Cash Given To Finance */}
                          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.64rem' }}>💰</span>
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#c2410c' }}>Cash Given To Finance:</span>
                            </div>
                            <span style={{ fontSize: '0.60rem', fontWeight: 900, color: '#c2410c', background: '#ffedd5', padding: '1px 6px', borderRadius: '4px' }}>
                              -₹{kpiMetrics.cashGivenToFinance.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── SECTION 2: WORKER TRANSACTIONS ── */}
                <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)', borderRadius: '14px', border: '1px solid #fed7aa', padding: '0.85rem 1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-user-gear" style={{ color: '#ea580c', fontSize: '0.75rem' }} />
                      Worker Transactions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.63rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: '#fff7ed', border: '1px solid #ffedd5', color: '#9a3412', fontWeight: 600 }}>
                        <span>🥇 Gold Given to Worker</span>
                        <span style={{ fontWeight: 800, color: '#c2410c' }}>{kpiMetrics.goldWorkerGiven}g</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: '#fff7ed', border: '1px solid #ffedd5', color: '#9a3412', fontWeight: 600 }}>
                        <span>🥇 Gold Taken from Worker</span>
                        <span style={{ fontWeight: 800, color: '#047857' }}>{kpiMetrics.goldWorkerTaken}g</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: '#f0f9ff', border: '1px solid #e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                        <span>🥈 Silver Given to Worker</span>
                        <span style={{ fontWeight: 800, color: '#0284c7' }}>{kpiMetrics.silverWorkerGiven}g</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: '#f0f9ff', border: '1px solid #e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                        <span>🥈 Silver Taken from Worker</span>
                        <span style={{ fontWeight: 800, color: '#047857' }}>{kpiMetrics.silverWorkerTaken}g</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #dcfce7', color: '#15803d', fontWeight: 600 }}>
                        <span>💵 Cash Given to Worker</span>
                        <span style={{ fontWeight: 800, color: '#b91c1c' }}>₹{kpiMetrics.cashWorkerGiven.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #dcfce7', color: '#15803d', fontWeight: 600 }}>
                        <span>💸 Cash Taken from Worker</span>
                        <span style={{ fontWeight: 800, color: '#15803d' }}>₹{kpiMetrics.cashWorkerTaken.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: PERIOD MOVEMENT & FLOW ── */}
                <div style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: '14px', border: '1px solid #bae6fd', padding: '0.85rem 1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0c4a6e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-arrow-right-arrow-left" style={{ color: '#0284c7', fontSize: '0.75rem' }} />
                      Period Movement & Flow
                      <span style={{ fontSize: '0.60rem', fontWeight: 600, color: '#0369a1', marginLeft: 'auto' }}>({dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'ALL' ? 'All Time' : 'Range'})</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                      {/* Cash Flow */}
                      <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_CASH' ? null : 'PERIOD_CASH')} style={{ background: kpiDrillFilter3 === 'PERIOD_CASH' ? '#d1fae5' : '#f0fdf4', border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_CASH' ? '#22c55e' : '#a7f3d0'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_CASH' ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#047857', display: 'flex', justifyContent: 'space-between' }}>💵 Cash Flow {kpiDrillFilter3 === 'PERIOD_CASH' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} />}</div>
                        <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>₹{(cashSummary?.expectedClosingCash ?? kpiMetrics.totalCashCollected ?? 0).toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.56rem', color: '#047857', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                          <div>Opening: ₹{(cashSummary?.openingCash ?? 0).toLocaleString('en-IN')}</div>
                          <div style={{ color: '#15803d', fontWeight: 700 }}>Cash In: +₹{kpiMetrics.cashIn.toLocaleString('en-IN')}</div>
                          <div style={{ color: '#b91c1c', fontWeight: 700 }}>Cash Out: -₹{kpiMetrics.cashOut.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      {/* Finance Loans */}
                      <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_FINANCE' ? null : 'PERIOD_FINANCE')} style={{ background: kpiDrillFilter3 === 'PERIOD_FINANCE' ? '#ccfbf1' : '#f0fdfa', border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_FINANCE' ? '#14b8a6' : '#99f6e4'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_FINANCE' ? '0 0 0 2px rgba(20,184,166,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0f766e', display: 'flex', justifyContent: 'space-between' }}>💰 Finance {kpiDrillFilter3 === 'PERIOD_FINANCE' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} />}</div>
                        <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#115e59', marginTop: '2px' }}>₹{kpiMetrics.totalFinanceIssued.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '0.56rem', color: '#0f766e', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                          <div style={{ color: '#047857', fontWeight: 700 }}>Finance cleared count : {kpiMetrics.financeClearedCount} (₹{kpiMetrics.cashGotFromFinance.toLocaleString('en-IN')})</div>
                          <div style={{ color: '#0f766e', fontWeight: 700 }}>Finance taken count : {kpiMetrics.financeTakenCount} (₹{kpiMetrics.totalFinanceIssued.toLocaleString('en-IN')})</div>
                        </div>
                      </div>
                      {/* Gold Flow */}
                      {(() => {
                        const opGold = Number(dayBookStockSummary.find((s: any) => (s.category || '').includes('Gold'))?.openingWeight ?? 0);
                        const totalGoldBal = Number((opGold + kpiMetrics.goldWtAdded).toFixed(3));
                        return (
                          <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_GOLD' ? null : 'PERIOD_GOLD')} style={{ background: kpiDrillFilter3 === 'PERIOD_GOLD' ? '#fef3c7' : '#fffbe6', border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_GOLD' ? '#f59e0b' : '#fde68a'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_GOLD' ? '0 0 0 2px rgba(245,158,11,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#b45309', display: 'flex', justifyContent: 'space-between' }}>🥇 Gold Flow {kpiDrillFilter3 === 'PERIOD_GOLD' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} />}</div>
                            <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#92400e', marginTop: '2px' }}>{totalGoldBal}g</div>
                            <div style={{ fontSize: '0.56rem', color: '#b45309', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                              <div>Opening: {opGold}g</div>
                              <div style={{ color: '#047857', fontWeight: 700 }}>Gold In: +{kpiMetrics.goldIn}g</div>
                              <div style={{ color: '#c2410c', fontWeight: 700 }}>Gold Out: -{kpiMetrics.goldOut}g</div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Silver Flow */}
                      {(() => {
                        const opSilver = Number(dayBookStockSummary.find((s: any) => (s.category || '').includes('Silver'))?.openingWeight ?? 0);
                        const totalSilverBal = Number((opSilver + kpiMetrics.silverWtAdded).toFixed(3));
                        return (
                          <div onClick={() => setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_SILVER' ? null : 'PERIOD_SILVER')} style={{ background: kpiDrillFilter3 === 'PERIOD_SILVER' ? '#e0f2fe' : '#f0f9ff', border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_SILVER' ? '#0284c7' : '#bae6fd'}`, borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', boxShadow: kpiDrillFilter3 === 'PERIOD_SILVER' ? '0 0 0 2px rgba(2,132,199,0.2)' : 'none', transition: 'all 0.15s ease' }}>
                            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0369a1', display: 'flex', justifyContent: 'space-between' }}>🥈 Silver Flow {kpiDrillFilter3 === 'PERIOD_SILVER' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} />}</div>
                            <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#075985', marginTop: '2px' }}>{totalSilverBal}g</div>
                            <div style={{ fontSize: '0.56rem', color: '#0369a1', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
                              <div>Opening: {opSilver}g</div>
                              <div style={{ color: '#047857', fontWeight: 700 }}>Silver In: +{kpiMetrics.silverIn}g</div>
                              <div style={{ color: '#0284c7', fontWeight: 700 }}>Silver Out: -{kpiMetrics.silverOut}g</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>

              {/* KPI DRILL-DOWN PANEL */}
              {kpiDrillFilter && (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: `2px solid ${kpiDrillFilter === 'ORDER' ? '#fde68a' :
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
                        border: `1px solid ${kpiDrillFilter === 'ORDER' ? '#fde68a' : kpiDrillFilter === 'SELL' ? '#bbf7d0' : kpiDrillFilter === 'BUY' ? '#bfdbfe' : '#e9d5ff'}`,
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
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>JBJ-Type</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Customer / Details</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Weight</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Amount</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...kpiDrillItems].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).map((item: any, idx: number) => {
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
                              <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#475569' }}>Sell Count</th>
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
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f766e' }}>{p.sell_count ?? p.sold_quantity ?? 0}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{p.current_stock_weight ?? p.stock_quantity ?? p.weight_grams ?? '—'}g</td>
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
                  if (isGold) {
                    const cat = (item.category || item.transfer_item_mode || item.raw_invoice?.metal_type || '').toUpperCase();
                    const details = (item.details || '').toUpperCase();
                    const isGoldMatch = cat.includes('GOLD') || details.includes('GOLD') || (!cat.includes('SILVER') && !details.includes('SILVER') && item.weight_grams > 0);
                    return isGoldMatch && (type === 'INVENTORY' || type === 'SELL' || type === 'ORDER' || type === 'EXCHANGE' || type === 'KARIGAR' || type === 'WORK ASSIGN' || type === 'WORKER TX' || type === 'FINANCE');
                  }
                  if (isSilver) {
                    const cat = (item.category || item.transfer_item_mode || item.raw_invoice?.metal_type || '').toUpperCase();
                    const details = (item.details || '').toUpperCase();
                    const isSilverMatch = cat.includes('SILVER') || details.includes('SILVER');
                    return isSilverMatch && (type === 'INVENTORY' || type === 'SELL' || type === 'ORDER' || type === 'EXCHANGE' || type === 'KARIGAR' || type === 'WORK ASSIGN' || type === 'WORKER TX' || type === 'FINANCE');
                  }
                  if (isCash) return type === 'CASH_REGISTER' || ((item.paid_amount > 0 || item.amount > 0) && type !== 'FINANCE' && type !== 'BUY' && type !== 'INVENTORY' && type !== 'KARIGAR');
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
                            {[...periodItems].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).map((item: any, idx: number) => {
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
                      {sortOrder === 'ASC' ? '↑ Oldest First' : '↓ Newest First'}
                    </button>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Date: {selectedDate}</span>
                  </div>
                </div>

                {sortedTimeline.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No transaction entries recorded for this date yet.</p>
                ) : logBookViewMode === 'TABLE' ? (
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <table className="table-responsive-font" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                          <th style={{ padding: '12px 10px', fontWeight: 800 }}>S.No</th>
                          <th style={{ padding: '12px 10px', fontWeight: 800 }}>Time</th>
                          <th style={{ padding: '12px 10px', fontWeight: 800 }}>JBJ-Type</th>
                          <th style={{ padding: '12px 10px', fontWeight: 800 }}>Customer / Details</th>
                          <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'right' }}>Net Weight</th>
                          <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'right', color: '#15803d' }}>In Hand (₹)</th>
                          <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'right' }}>Total Amount (₹)</th>
                          <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTimeline.map((item, idx) => {
                          const rawItemType = (item.type || '').toUpperCase();
                          const isOrder = rawItemType === 'ORDER';
                          const isSell = rawItemType === 'SELL';
                          const isBuy = rawItemType === 'BUY';
                          const isExchange = rawItemType === 'EXCHANGE';
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
                          else if (isInventory) { typeBg = '#fff7ed'; typeColor = '#c2410c'; }
                          else if (isFinance) { typeBg = '#ccfbf1'; typeColor = '#0f766e'; }
                          else if (isWorkAssign) { typeBg = '#ecfdf5'; typeColor = '#047857'; }
                          else if (isWorkerTx) { typeBg = '#f1f5f9'; typeColor = '#334155'; }

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
                              <td style={{ padding: '8px 10px', fontWeight: 800, color: '#64748b' }}>#{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>{item.time}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: typeBg, color: typeColor, whiteSpace: 'nowrap' }}>
                                  {displayItemType}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
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
                                      <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: bg, color, border: `1px solid ${border}` }}>
                                        {label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{item.details}</div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                                {item.weight_grams > 0 ? `${item.weight_grams}g` : '-'}
                              </td>
                              {/* In Hand (₹) Column */}
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, color: isBuy || isFinance ? '#b91c1c' : '#15803d' }}>
                                {inHandCash > 0 ? `${isBuy || isFinance ? '-' : ''}₹${inHandCash.toLocaleString('en-IN')}` : '-'}
                              </td>
                              {/* Total Amount (₹) & Due Breakdown Column */}
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                {totalBillVal > 0 ? `₹${totalBillVal.toLocaleString('en-IN')}` : '-'}
                                {item.due_amount > 0 && (
                                  <div style={{ fontSize: '0.58rem', fontWeight: 800, color: '#b91c1c', marginTop: '1px' }}>
                                    Due: ₹{item.due_amount.toLocaleString('en-IN')}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {isInventory ? null : isFinance ? (
                                  <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', padding: '1px 6px', borderRadius: '4px' }}>
                                    DEBT
                                  </span>
                                ) : isKarigar ? (
                                  <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                                    WEIGHT ACC
                                  </span>
                                ) : item.due_amount > 0 ? (
                                  <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: '4px' }}>
                                    PARTIAL PAID
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {sortedTimeline.map((item, idx) => {
                      const rawItemType = (item.type || '').toUpperCase();
                      const isOrder = rawItemType === 'ORDER';
                      const isSell = rawItemType === 'SELL';
                      const isBuy = rawItemType === 'BUY';
                      const isExchange = rawItemType === 'EXCHANGE';
                      const isInventory = rawItemType === 'INVENTORY';
                      const isFinance = rawItemType === 'FINANCE';
                      const isCashLoad = rawItemType === 'CASH LOAD' || rawItemType === 'CASH_LOAD';
                      const isKarigar = rawItemType === 'KARIGAR' || rawItemType === 'WORK ASSIGN' || rawItemType === 'WORKER TX';
                      const isWorkAssign = rawItemType === 'WORK ASSIGN' || (isKarigar && (item.category === 'ORDER' || item.raw_worker_txn?.order_id || (item.details && item.details.includes('Order #'))));
                      const isWorkerTx = isKarigar && !isWorkAssign;

                      const displayItemType = isWorkAssign ? 'WORK ASSIGN' : isWorkerTx ? 'WORKER TX' : rawItemType;

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
                      } else if (isWorkAssign) {
                        badgeBg = '#ecfdf5';
                        badgeColor = '#047857';
                        badgeBorder = '#a7f3d0';
                      } else if (isWorkerTx) {
                        badgeBg = '#f1f5f9';
                        badgeColor = '#334155';
                        badgeBorder = '#cbd5e1';
                      }

                      const inHandCash = Number(item.paid_amount || (isFinance ? item.amount : 0));
                      const totalBillVal = Number(item.amount || item.paid_amount || 0);

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedBillModalItem(item)}
                          title="Click to view Tax Invoice Bill Receipt"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: isOrder ? '#fffdf5' : isSell ? '#f0fdf4' : isBuy ? '#eff6ff' : '#f8fafc',
                            border: isOrder ? '1px solid #fef3c7' : isSell ? '1px solid #dcfce7' : isBuy ? '1px solid #dbeafe' : '1px solid #e2e8f0',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, boxShadow 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* S.No Badge */}
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', minWidth: '26px', textAlign: 'center' }}>
                              #{idx + 1}
                            </span>

                            {/* Mode Badge (ORDER, SELL, BUY, WORK ASSIGN, WORKER TX) */}
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: badgeColor, background: badgeBg, padding: '3px 8px', borderRadius: '4px', border: `1px solid ${badgeBorder}`, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                              {displayItemType}
                            </span>

                            {/* Time */}
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #fef3c7', minWidth: '55px', textAlign: 'center' }}>
                              {item.time}
                            </span>

                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
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
                                    <span style={{ fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: bg, color, border: `1px solid ${border}` }}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{item.details}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                            {/* Weight Pill */}
                            {item.weight_grams > 0 && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>Weight</div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#334155' }}>{item.weight_grams}g</div>
                              </div>
                            )}

                            {/* In Hand Cash Paid */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>In Hand (₹)</div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: isBuy || isFinance ? '#b91c1c' : '#15803d' }}>
                                {inHandCash > 0 ? `${isBuy || isFinance ? '-' : ''}₹${inHandCash.toLocaleString('en-IN')}` : '-'}
                              </div>
                            </div>

                            {/* Total Bill Value & Due Pill */}
                            <div style={{ textAlign: 'right', minWidth: '70px' }}>
                              <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 700 }}>Total Value</div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>
                                {totalBillVal > 0 ? `₹${totalBillVal.toLocaleString('en-IN')}` : '-'}
                              </div>
                              {item.due_amount > 0 && (
                                <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#b91c1c', marginTop: '1px' }}>
                                  Due: ₹{item.due_amount.toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>

                            {/* Status Tag */}
                            {isInventory ? null : isFinance ? (
                              <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', border: '1px solid #99f6e4', padding: '1px 6px', borderRadius: '4px' }}>
                                DEBT
                              </span>
                            ) : isKarigar ? (
                              <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                                WEIGHT ACC
                              </span>
                            ) : item.due_amount > 0 ? (
                              <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: '4px' }}>
                                PARTIAL PAID
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.56rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px' }}>
                                FULL PAID
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-SCREEN 2: 📦 Stock Movement & Category Breakdown */}
          {activeSubTab === 'stock' && (
            <StockMovementView
              stockViewMode={stockViewMode === 'TOTAL' ? 'ALL' : 'TODAY'}
              setStockViewMode={(mode) => setStockViewMode(mode === 'ALL' ? 'TOTAL' : 'TODAY')}
              metalCategoryFilter={metalCategoryFilter}
              setMetalCategoryFilter={setMetalCategoryFilter}
              ornamentsStockList={ornamentsStockList}
              eodReorderList={eodReorderList}
              logBookTimeline={logBookTimeline}
              dayBookStockSummary={dayBookStockSummary}
            />
          )}

          {/* SUB-SCREEN 3: 💵 Cash & Counter Register */}
          {activeSubTab === 'cash' && cashSummary && (
            <CashRegisterView cashSummary={cashSummary} cashLedgerRecords={cashLedgerRecords} />
          )}

          {/* SUB-SCREEN 4: ⚖️ Old Metal Scrap Vault */}
          {activeSubTab === 'scrap' && scrapSummary && (
            <OldMetalVaultView scrapSummary={scrapSummary} oldMetalVaultItems={oldMetalVaultItems} />
          )}

          {/* SUB-SCREEN 5: 🤝 Udhaari & Karigar Account */}
          {activeSubTab === 'udhaari' && udhaariSummary && (
            <UdhaariKarigarView udhaariSummary={udhaariSummary} logBookTimeline={logBookTimeline} />
          )}
        </>
      )}


    </div>
  );
};