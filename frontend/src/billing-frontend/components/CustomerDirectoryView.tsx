import React, { useState, useEffect } from 'react';
import type { CustomerDirectoryRecord, GlobalRates } from '../types';
import { SeeBillModal } from './SeeBillModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { DeleteInvoiceModal } from './DeleteInvoiceModal';
import { translations } from '../../utils/translations';
import type { Language } from '../../utils/translations';
import { API_BASE } from '../../config/apiConfig';
import { getTeluguTransliterationSync } from '../../utils/transliterate';
import { FullImagePreviewModal } from '../../inventory-frontend/components/FullImagePreviewModal';
import { HeaderRefreshButton } from '../../components/HeaderRefreshButton';

const parseIndianCurrencyNumber = (val: string | number | undefined | null): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleanStr = String(val).replace(/[^0-9.]/g, '');
  return parseFloat(cleanStr) || 0;
};

const getSafeReceiptData = (inv: any): any => {
  if (!inv) return {};
  let raw = inv.receipt_json_data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }
  return raw || {};
};

interface CustomerDirectoryViewProps {
  customers: CustomerDirectoryRecord[];
  rates: GlobalRates | null;
  formatDate: (date?: string) => string;
  lang?: Language;
  onBackToPOS?: () => void;
  onSelectCustomerForBill?: (name: string, phone: string) => void;
  onEditCustomerRecord?: (cust: CustomerDirectoryRecord) => void;
  onViewInvoiceDetails?: (cust: CustomerDirectoryRecord) => void;
}

export const CustomerDirectoryView: React.FC<CustomerDirectoryViewProps> = ({
  customers,
  rates,
  formatDate,
  lang = 'EN',
  onBackToPOS,
  onSelectCustomerForBill,
  onEditCustomerRecord,
  onViewInvoiceDetails,
}) => {
  const t = translations[lang] || translations.EN;
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    invoice: any | null;
    isSubmitting: boolean;
  }>({
    open: false,
    invoice: null,
    isSubmitting: false,
  });

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    invoice: any | null;
    isDeleting: boolean;
  }>({
    open: false,
    invoice: null,
    isDeleting: false,
  });
  void onSelectCustomerForBill;
  const [search, setSearch] = useState(() => {
    return new URLSearchParams(window.location.search).get('search') || '';
  });

  const [historyTab, setHistoryTab] = useState<'ALL' | 'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER'>(() => {
    const params = new URLSearchParams(window.location.search);
    const histParam = (params.get('history') || params.get('tab') || '').toUpperCase();
    if (['SELL', 'BUY', 'EXCHANGE', 'ORDER'].includes(histParam)) return histParam as any;
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

  // Settlement Modal State
  const [settlementModal, setSettlementModal] = useState<{
    open: boolean;
    cust: CustomerDirectoryRecord | null;
    payingNow: string;
    discount: string;
    note: string;
    customPaidAt: string;
    isSubmitting: boolean;
  }>({
    open: false,
    cust: null,
    payingNow: '',
    discount: '',
    note: '',
    customPaidAt: '',
    isSubmitting: false,
  });

  const handleOpenSettlementModal = (cust: CustomerDirectoryRecord) => {
    const inv = cust.latestInvoice;
    const receiptData = getSafeReceiptData(inv);
    const dueVal = inv?.due_amount !== undefined ? Number(inv.due_amount) : Number(receiptData?.balanceDueAmount || 0);

    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localIso = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);

    setSettlementModal({
      open: true,
      cust,
      payingNow: dueVal > 0 ? dueVal.toLocaleString('en-IN') : '',
      discount: '',
      note: '',
      customPaidAt: localIso,
      isSubmitting: false,
    });
  };

  const handleConfirmSettlement = async () => {
    if (!settlementModal.cust || !settlementModal.cust.latestInvoice) return;
    const cust = settlementModal.cust;
    const inv = cust.latestInvoice;
    const paidNowNum = parseIndianCurrencyNumber(settlementModal.payingNow);
    const discountNum = parseIndianCurrencyNumber(settlementModal.discount);

    if (paidNowNum <= 0 && discountNum <= 0) {
      alert('Please enter a payment amount or discount');
      return;
    }

    const invId = inv?.id || 'INV';
    setSettlementModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`${API_BASE}/billing/invoices/${invId}/settlement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid_now: paidNowNum,
          discount_amount: discountNum,
          custom_paid_at: settlementModal.customPaidAt ? new Date(settlementModal.customPaidAt).toISOString() : new Date().toISOString(),
          note: settlementModal.note || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setServerCustomers((prev) =>
          prev.map((c) => {
            if ((invId && c.latestInvoice?.id === invId) || c.name === cust.name) {
              const updatedInv = data.invoice || {
                ...c.latestInvoice,
                paid_amount: data.paid_amount,
                due_amount: data.due_amount,
                discount_amount: data.discount_amount,
                receipt_json_data: {
                  ...(c.latestInvoice?.receipt_json_data || {}),
                  advancePaidAmount: data.paid_amount,
                  balanceDueAmount: data.due_amount,
                  discount_amount: data.discount_amount,
                  payment_history: data.payment_history,
                },
              };
              return {
                ...c,
                latestInvoice: updatedInv,
              };
            }
            return c;
          })
        );
        setSettlementModal({ open: false, cust: null, payingNow: '', discount: '', note: '', customPaidAt: '', isSubmitting: false });
        alert(
          data.due_amount === 0
            ? `✅ Invoice ${invId} full payment of ₹${paidNowNum.toLocaleString('en-IN')} received & marked as PAID!`
            : `ℹ️ Payment installment of ₹${paidNowNum.toLocaleString('en-IN')} recorded successfully! Remaining Due: ₹${Number(data.due_amount).toLocaleString('en-IN')}`
        );
      } else {
        alert('Failed to record payment: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      alert('Request error: ' + err.message);
    } finally {
      setSettlementModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Pagination State (persisted in URL query params & localStorage)
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('page');
    if (p && !isNaN(Number(p)) && Number(p) > 0) return Number(p);
    const localP = localStorage.getItem('jbj_purchase_history_page');
    if (localP && !isNaN(Number(localP)) && Number(localP) > 0) return Number(localP);
    return 1;
  });

  const [pageSize, setPageSize] = useState<number | 'ALL'>(() => {
    const params = new URLSearchParams(window.location.search);
    const lim = (params.get('limit') || '').toUpperCase();
    if (lim === 'ALL') return 'ALL';
    if (lim && !isNaN(Number(lim)) && Number(lim) > 0) return Number(lim);
    const localLim = (localStorage.getItem('jbj_purchase_history_limit') || '').toUpperCase();
    if (localLim === 'ALL') return 'ALL';
    if (localLim && !isNaN(Number(localLim)) && Number(localLim) > 0) return Number(localLim);
    return 10; // Default 10 records by default
  });

  const [serverCustomers, setServerCustomers] = useState<CustomerDirectoryRecord[]>(customers);
  const [serverTotalCount, setServerTotalCount] = useState<number>(customers.length);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [backendKpiSummary, setBackendKpiSummary] = useState<any>(null);

  const fetchKpiSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('from', startDate);
      if (endDate) params.set('to', endDate);
      const res = await fetch(`${API_BASE}/billing/kpi-summary?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.summary) {
        setBackendKpiSummary(data.summary);
      }
    } catch (e) { }
  };

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 1000);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch on-demand records from backend PostgreSQL database based on limit & page
  const fetchOnDemand = async () => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('page', String(currentPage));
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (historyTab !== 'ALL') params.set('history', historyTab);
      if (startDate) params.set('from', startDate);
      if (endDate) params.set('to', endDate);

      const res = await fetch(`${API_BASE}/billing/customer-directory?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setServerCustomers(data.customers);
        setServerTotalCount(data.totalCount ?? data.customers.length);
      }
    } catch (err) {
      console.error('Failed to fetch on-demand customer directory:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Fetch table records on filter, search, or pagination changes
  useEffect(() => {
    fetchOnDemand();
  }, [pageSize, currentPage, debouncedSearch, historyTab, startDate, endDate]);

  // Fetch global KPI summaries ONLY on filter or search changes (NOT on page navigation)
  useEffect(() => {
    fetchKpiSummary();
  }, [debouncedSearch, historyTab, startDate, endDate]);

  // Handle Chrome swipe gestures & browser Back/Forward navigation in CustomerDirectoryView
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const histParam = (params.get('history') || 'all').toUpperCase();
      if (['ALL', 'SELL', 'BUY', 'EXCHANGE', 'ORDER'].includes(histParam)) {
        setHistoryTab(histParam as any);
      }
      setSearch(params.get('search') || '');
      setStartDate(params.get('from') || '');
      setEndDate(params.get('to') || '');

      const p = params.get('page');
      if (p && !isNaN(Number(p)) && Number(p) > 0) setCurrentPage(Number(p));

      const lim = (params.get('limit') || '').toUpperCase();
      if (lim === 'ALL') setPageSize('ALL');
      else if (lim && !isNaN(Number(lim)) && Number(lim) > 0) setPageSize(Number(lim));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state changes to URL query parameters & localStorage in real-time
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

    params.set('limit', String(pageSize));
    params.set('page', String(currentPage));

    localStorage.setItem('jbj_purchase_history_limit', String(pageSize));
    localStorage.setItem('jbj_purchase_history_page', String(currentPage));

    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [historyTab, search, startDate, endDate, pageSize, currentPage]);

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

  const getCustomerMode = (cust: CustomerDirectoryRecord): 'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER' => {
    const inv = cust.latestInvoice;
    const receiptData = getSafeReceiptData(inv);
    const jsonMode = receiptData?.transaction_type || receiptData?.mode;
    const invMode = inv?.transaction_type;
    const rawMode = (jsonMode || invMode || 'SELL').toUpperCase();

    if (rawMode === 'ORDER') return 'ORDER';

    const items = Array.isArray(receiptData?.items) ? receiptData.items : [];
    const hasBuy = items.some((i: any) => (i?.item_type || '').toUpperCase() === 'BUY');
    const hasSell = items.some((i: any) => (i?.item_type || '').toUpperCase() === 'SELL');

    if (rawMode === 'EXCHANGE' || (hasBuy && hasSell)) return 'EXCHANGE';
    if (rawMode === 'BUY' || (hasBuy && !hasSell)) return 'BUY';
    return 'SELL';
  };

  const displayCustomersList = serverCustomers && serverCustomers.length > 0 ? serverCustomers : customers;

  const filtered = displayCustomersList.filter((c) => {
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
      let rawData = c.latestInvoice?.receipt_json_data;
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch (e) { rawData = {}; }
      }
      const invItems: any[] = Array.isArray(rawData?.items) ? rawData.items : [];
      if (invItems.length > 0) {
        const hasMatch = invItems.some((i: any) =>
          (i.metal_type || '').toUpperCase() === kpiMetal &&
          (i.item_type || (c.latestInvoice?.transaction_type || 'SELL')).toUpperCase() === kpiType
        );
        if (!hasMatch) return false;
      } else if (c.latestInvoice) {
        const inv = c.latestInvoice;
        const metal = (inv.metal_type || '').toUpperCase();
        const txn = (inv.transaction_type || '').toUpperCase();
        if (metal !== kpiMetal) return false;
        if (txn !== kpiType && txn !== 'EXCHANGE') return false;
      } else {
        return false;
      }
    }

    return true;
  });

  // ── Reactive KPI Aggregation (derived from customer_metal_transactions or filtered records) ──
  const localKpi = filtered.reduce(
    (acc, c) => {
      let rawData = c.latestInvoice?.receipt_json_data;
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch (e) { rawData = {}; }
      }
      const items: any[] = Array.isArray(rawData?.items) ? rawData.items : [];
      const finalAmt = Number(c.latestInvoice?.final_amount || 0);

      if (items.length > 0) {
        items.forEach((item: any) => {
          const w = Number(item.weight_grams) || 0;
          const metal = (item.metal_type || c.latestInvoice?.metal_type || 'GOLD').toUpperCase();
          const type = (item.item_type || c.latestInvoice?.transaction_type || 'SELL').toUpperCase();
          const purity = Number(item.purity_percentage || c.latestInvoice?.purity_percentage) || 0;
          const pureW = Number(item.pureWeight || item.pure_weight_grams || (w * (purity / 100))) || 0;

          // Compute or fallback amount
          const storedRate = Number(item.applied_rate_per_gram || item.appliedRate || item.custom_rate_per_gram || item.customRate || item.rate || 0);
          let amt = Number(item.lineTotal || item.line_total || 0);
          if (!amt && rates) {
            const isGold = metal === 'GOLD';
            const isSell = type === 'SELL';
            const rate = storedRate > 0 ? storedRate : (isGold
              ? (isSell ? rates.gold_sell_value : rates.gold_buy_value)
              : (isSell ? rates.silver_sell_value : rates.silver_buy_value));
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
          } else if (metal === 'GOLD' && (type === 'BUY' || type === 'EXCHANGE')) {
            acc.goldBoughtWeight += w;
            acc.goldBoughtAmount += amt;
            acc.goldBoughtPurityWeightedSum += purity * w;
          } else if (metal === 'SILVER' && type === 'SELL') {
            acc.silverSoldWeight += w;
            acc.silverSoldAmount += amt;
          } else if (metal === 'SILVER' && (type === 'BUY' || type === 'EXCHANGE')) {
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
        } else if (metal === 'GOLD' && (txn === 'BUY' || txn === 'EXCHANGE')) {
          acc.goldBoughtWeight += w; acc.goldBoughtAmount += finalAmt;
          acc.goldBoughtPurityWeightedSum += purity * w;
        } else if (metal === 'SILVER' && txn === 'SELL') {
          acc.silverSoldWeight += w; acc.silverSoldAmount += finalAmt;
        } else if (metal === 'SILVER' && (txn === 'BUY' || txn === 'EXCHANGE')) {
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

  const kpi = backendKpiSummary || localKpi;

  const goldBoughtAvgPurity = kpi.goldBoughtWeight > 0 ? kpi.goldBoughtPurityWeightedSum / kpi.goldBoughtWeight : 0;
  const silverBoughtAvgPurity = kpi.silverBoughtWeight > 0 ? kpi.silverBoughtPurityWeightedSum / kpi.silverBoughtWeight : 0;

  const totalBillsCount = displayCustomersList.length;
  const sellBillsCount = displayCustomersList.filter(c => getCustomerMode(c) === 'SELL').length;
  const buyBillsCount = displayCustomersList.filter(c => getCustomerMode(c) === 'BUY').length;
  const exchangeBillsCount = displayCustomersList.filter(c => getCustomerMode(c) === 'EXCHANGE').length;
  const orderBillsCount = displayCustomersList.filter(c => getCustomerMode(c) === 'ORDER').length;

  const fmtW = (w: number) => w > 0 ? `${w.toFixed(1)}g` : '0g';
  const fmtAmt = (a: number) => a > 0 ? `₹${a.toLocaleString('en-IN')}` : '₹0';
  const fmtPurity = (p: number) => p > 0 ? `${p.toFixed(1)}%` : '—';

  // Pagination calculations (using server-side on-demand fetched records & count)
  const displayList = serverCustomers && serverCustomers.length > 0 ? serverCustomers : filtered;
  const totalRecords = serverTotalCount > 0 ? serverTotalCount : filtered.length;
  const isAll = pageSize === 'ALL';
  const numericPageSize = isAll ? totalRecords : Number(pageSize);
  const totalPages = isAll || numericPageSize >= totalRecords ? 1 : Math.max(1, Math.ceil(totalRecords / numericPageSize));

  const startIndex = isAll ? 0 : (currentPage - 1) * numericPageSize;
  const paginatedList = displayList;

  const startRecordNum = totalRecords === 0 ? 0 : startIndex + 1;
  const endRecordNum = totalRecords === 0 ? 0 : startIndex + displayList.length;

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
              <i className="fa-solid fa-arrow-left"></i> {t.billing}
            </button>
          )}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-address-book" style={{ color: '#0284c7' }}></i>{t.purchaseHistoryTitle} ({filtered.length})
            <HeaderRefreshButton onRefresh={fetchOnDemand} size="sm" title="Hard Refresh Purchase History & KPI Cards from Server" />
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
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.goldSoldMetric}</span>
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
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.goldBoughtMetric}</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{fmtW(kpi.goldBoughtWeight)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#78350f', marginTop: '2px' }}>{fmtAmt(kpi.goldBoughtAmount)}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 400, color: '#78350f', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-flask" style={{ fontSize: '0.6rem' }}></i>
              {t.avgPurityLabel} {fmtPurity(goldBoughtAvgPurity)}
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
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.silverSoldMetric}</span>
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
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.silverBoughtMetric}</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{fmtW(kpi.silverBoughtWeight)}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b', marginTop: '2px' }}>{fmtAmt(kpi.silverBoughtAmount)}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 400, color: '#334155', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-flask" style={{ fontSize: '0.6rem' }}></i>
              {t.avgPurityLabel} {fmtPurity(silverBoughtAvgPurity)}
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
              placeholder={t.searchPlaceholder}
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
                <span>{t.filterDateRange}</span>
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
                  <span>{t.filterDateRange}</span>
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
                    {t.cancelBtn}
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
            {t.allFilter} ({totalBillsCount})
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
            {t.sellFilter} ({sellBillsCount})
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
            {t.buyFilter} ({buyBillsCount})
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
            {t.exchangeFilter} ({exchangeBillsCount})
          </button>

          <button
            type="button"
            onClick={() => setHistoryTab('ORDER')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: historyTab === 'ORDER' ? '#ffffff' : 'transparent',
              color: historyTab === 'ORDER' ? '#15803d' : '#64748b',
              fontWeight: historyTab === 'ORDER' ? 700 : 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: historyTab === 'ORDER' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-clipboard-list" style={{ fontSize: '0.74rem' }}></i>
            Order ({orderBillsCount})
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

      {/* ── TOP PAGINATION CONTROL BAR ── */}
      {totalRecords > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem',
            padding: '0.55rem 0.85rem',
            background: '#f8fafc',
            borderRadius: '10px 10px 0 0',
            border: '1px solid #cbd5e1',
            borderBottom: 'none',
            fontSize: '0.78rem',
            color: '#334155',
            marginBottom: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.76rem' }}>{t.rowsPerPage}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === 'ALL' ? 'ALL' : Number(val));
                }}
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {[10, 20, 50, 100, 200, 500, 1000, 'ALL'].map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? t.allRows : option}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.76rem' }}>
              {t.showingRecords} <strong style={{ color: '#0f172a' }}>{startRecordNum}–{endRecordNum}</strong> {t.ofRecords} <strong style={{ color: '#0f172a' }}>{totalRecords}</strong> {t.recordsLabel}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              disabled={currentPage <= 1 || isAll}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage <= 1 || isAll ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 || isAll ? '#94a3b8' : '#1e293b',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: currentPage <= 1 || isAll ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t.prevBtn}
            </button>

            <span style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: '#eef2ff', color: '#4338ca', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #c7d2fe' }}>
              {t.pageLabel} {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || isAll}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage >= totalPages || isAll ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages || isAll ? '#94a3b8' : '#1e293b',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: currentPage >= totalPages || isAll ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t.nextBtn}
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', borderRadius: totalRecords > 0 ? '0 0 12px 12px' : '12px', border: '1px solid #e6decb' }}>
        <table className="customer-history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', background: '#ffffff' }}>
          <thead>
            <tr style={{ background: '#f4ede4', borderBottom: '1px solid #e6decb', color: '#4a3e35', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '9%' }}>{t.thMode}</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '13%' }}>{t.thDateTime}</th>
              <th className="col-customer" style={{ padding: '0.65rem 0.75rem', textAlign: 'left', width: '22%' }}>{t.thCustomer}</th>
              <th className="col-product" style={{ padding: '0.65rem 0.75rem', textAlign: 'left', width: '25%' }}>{t.thProduct}</th>
              <th style={{ padding: '0.65rem 0.65rem', textAlign: 'center', width: '10%' }}>{t.thWeight}</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '10%' }}>STATUS</th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', width: '11%' }}>{t.thFinalAmount}</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '90px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loadingRecords ? (
              <tr>
                <td colSpan={8} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#6366f1' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'block', color: '#6366f1' }}></i>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Fetching records from database...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fa-solid fa-user-slash" style={{ fontSize: '1.3rem', marginBottom: '6px', display: 'block', color: '#cbd5e1' }}></i>
                  No customer records found in {historyTab} history.
                </td>
              </tr>
            ) : (
              paginatedList.map((cust, idx) => {
                const mode = getCustomerMode(cust);
                const addressStr = cust.address || cust.latestInvoice?.customer_address || cust.latestInvoice?.receipt_json_data?.customer_address || 'Patelpura, Siddipet';
                const actualIndex = startIndex + idx + 1;

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
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400, marginBottom: '2px' }}>#{actualIndex}</div>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '5px',
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          background: mode === 'SELL' ? '#fef3c7' : mode === 'BUY' ? '#e0f2fe' : mode === 'ORDER' ? '#dcfce7' : '#f3e8ff',
                          color: mode === 'SELL' ? '#b45309' : mode === 'BUY' ? '#0369a1' : mode === 'ORDER' ? '#15803d' : '#6d28d9',
                          border: mode === 'SELL' ? '1px solid #fde68a' : mode === 'BUY' ? '1px solid #bae6fd' : mode === 'ORDER' ? '1px solid #86efac' : '1px solid #e9d5ff',
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
                        {lang === 'TE' ? getTeluguTransliterationSync(cust.name) : cust.name}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px', fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>
                        <span><i className="fa-solid fa-phone" style={{ color: '#0284c7', fontSize: '0.62rem', marginRight: '2px' }}></i>{cust.phone}</span>
                        <span style={{ color: '#64748b' }}><i className="fa-solid fa-location-dot" style={{ color: '#ef4444', fontSize: '0.62rem', marginRight: '2px' }}></i>{lang === 'TE' ? getTeluguTransliterationSync(addressStr) : addressStr}</span>
                      </div>
                    </td>

                    {/* 3. PRODUCT Column */}
                    <td className="col-product" style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'left' }}>
                      {(() => {
                        const receiptData = getSafeReceiptData(cust.latestInvoice);
                        const items: any[] = Array.isArray(receiptData?.items) ? receiptData.items : [];
                        const primaryImg = cust.latestInvoice?.image_url || receiptData?.image_url || items.find((i: any) => i?.image_url)?.image_url || '';

                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt="Product"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage({ url: primaryImg, title: cust.name ? `${cust.name} Purchase` : 'Product Image' });
                                }}
                                title="Click to enlarge image"
                                style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1.5px solid #d97706', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.15s ease' }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                              />
                            ) : (
                              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                <i className="fa-solid fa-gem" style={{ color: '#d97706' }} />
                              </div>
                            )}
                            <div>
                              {items.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {items.map((item: any, i: number) => {
                                    const pName = typeof item === 'string' ? item : (item?.product_name || `${item?.metal_type || 'Jewellery'} Item`);
                                    const itemType = (typeof item === 'object' && item?.item_type ? item.item_type : mode).toUpperCase();
                                    const itemMetal = (typeof item === 'object' && item?.metal_type ? item.metal_type : 'GOLD').toUpperCase();

                                    return (
                                      <div key={i} style={{ fontSize: '0.74rem', color: '#334155', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
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
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.76rem' }}>
                                  {Array.isArray(cust.products)
                                    ? cust.products.map((p: any) => (typeof p === 'object' ? p.product_name || p.name || 'Item' : p)).join(', ') || '-'
                                    : (cust.products || '-')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* 4. WEIGHT Column */}
                    <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      {(() => {
                        const receiptData = getSafeReceiptData(cust.latestInvoice);
                        const items: any[] = Array.isArray(receiptData?.items) ? receiptData.items : [];

                        if (items.length > 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {items.map((item: any, i: number) => {
                                const grossW = Number(item?.weight_grams) || 0;
                                return (
                                  <div key={i} style={{ fontSize: '0.73rem', color: '#334155' }}>
                                    <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px' }}>
                                      <span>{grossW.toFixed(1)}g </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        return <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0369a1' }}>{Number(cust.totalWeight || 0).toFixed(3)}g</span>;
                      })()}
                    </td>

                    {/* 5. PAYMENT STATUS Column (Paid vs Due + Paid? Settlement Button) */}
                    {(() => {
                      const inv = cust.latestInvoice;
                      const receiptData = getSafeReceiptData(inv);
                      const grandTotalVal = Number(inv?.total_amount) || Number(inv?.final_amount) || Number(receiptData?.grandTotal) || Number(receiptData?.netPayable) || 0;
                      const dueAmount = inv?.due_amount !== undefined ? Number(inv.due_amount) : Number(receiptData?.balanceDueAmount || 0);
                      const paidAmount = inv?.paid_amount !== undefined ? Number(inv.paid_amount) : Number(receiptData?.advancePaidAmount || grandTotalVal);
                      const isDue = dueAmount > 0;

                      return (
                        <td style={{ padding: '0.65rem 0.5rem', verticalAlign: 'middle', textAlign: 'center' }}>
                          {!isDue ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.68rem' }}>
                              <i className="fa-solid fa-circle-check"></i> Paid
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              <div style={{ display: 'inline-flex', gap: '3px', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <span style={{ padding: '3px 6px', borderRadius: '4px', background: '#d97706', color: '#ffffff', fontSize: '0.68rem', fontWeight: 800 }}>
                                  Due
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenSettlementModal(cust);
                                  }}
                                  style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: '#ffffff', color: '#16a34a', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                                >
                                  Paid?
                                </button>
                              </div>

                              <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px', textAlign: 'center' }}>
                                <span style={{ color: '#16a34a' }}>Paid: ₹{paidAmount.toLocaleString('en-IN')}</span>
                                {dueAmount > 0 && (
                                  <span style={{ color: '#dc2626', marginLeft: '4px', fontWeight: 800 }}>Due: ₹{dueAmount.toLocaleString('en-IN')}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })()}


                    {/* 7. FINAL AMOUNT Column */}
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', verticalAlign: 'middle' }}>
                      {(() => {
                        const inv = cust.latestInvoice;
                        const receiptData = getSafeReceiptData(inv);
                        const grandTotalVal = Number(inv?.total_amount) || Number(inv?.final_amount) || Number(receiptData?.grandTotal) || Number(receiptData?.netPayable) || 0;
                        const isBuy = (inv?.transaction_type || mode).toUpperCase() === 'BUY';
                        return (
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isBuy ? '#0369a1' : '#0f172a' }}>
                            {isBuy ? `+ ₹${grandTotalVal.toLocaleString('en-IN')}` : `₹${grandTotalVal.toLocaleString('en-IN')}`}
                          </span>
                        );
                      })()}
                    </td>

                    {/* 8. ACTIONS Column (Edit, Delete, View Bill) */}
                    <td
                      style={{ padding: '0.65rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onViewInvoiceDetails) onViewInvoiceDetails(cust);
                          }}
                          title="View Bill / Receipt"
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                          }}
                        >
                          <i className="fa-solid fa-eye" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditCustomerRecord) {
                              onEditCustomerRecord(cust);
                            } else {
                              setEditModal({ open: true, invoice: cust, isSubmitting: false });
                            }
                          }}
                          title="Edit Invoice"
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            border: '1px solid #fde68a',
                            background: '#fef3c7',
                            color: '#b45309',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                          }}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ open: true, invoice: cust, isDeleting: false });
                          }}
                          title="Delete Invoice permanently"
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            background: '#fee2e2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                          }}
                        >
                          <i className="fa-solid fa-trash" />
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

      {/* ── BOTTOM PAGINATION CONTROL BAR ── */}
      {totalRecords > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem',
            padding: '0.55rem 0.85rem',
            background: '#f8fafc',
            borderRadius: '0 0 12px 12px',
            border: '1px solid #cbd5e1',
            borderTop: 'none',
            fontSize: '0.78rem',
            color: '#334155',
            marginTop: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.76rem' }}>{t.rowsPerPage}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === 'ALL' ? 'ALL' : Number(val));
                }}
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {[10, 20, 50, 100, 200, 500, 1000, 'ALL'].map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? t.allRows : option}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ color: '#64748b', fontWeight: 500, fontSize: '0.76rem' }}>
              {t.showingRecords} <strong style={{ color: '#0f172a' }}>{startRecordNum}–{endRecordNum}</strong> {t.ofRecords} <strong style={{ color: '#0f172a' }}>{totalRecords}</strong> {t.recordsLabel}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              disabled={currentPage <= 1 || isAll}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage <= 1 || isAll ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 || isAll ? '#94a3b8' : '#1e293b',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: currentPage <= 1 || isAll ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t.prevBtn}
            </button>

            <span style={{ padding: '0.3rem 0.55rem', borderRadius: '6px', background: '#eef2ff', color: '#4338ca', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #c7d2fe' }}>
              {t.pageLabel} {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || isAll}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: currentPage >= totalPages || isAll ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages || isAll ? '#94a3b8' : '#1e293b',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: currentPage >= totalPages || isAll ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t.nextBtn}
            </button>
          </div>
        </div>
      )}

      {/* SEE BILL POPUP MODAL */}
      {selectedCustomer && (
        <SeeBillModal
          customer={selectedCustomer}
          rates={rates}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* FULL IMAGE PREVIEW MODAL */}
      {previewImage && (
        <FullImagePreviewModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* ── EDIT INVOICE MODAL ── */}
      <EditInvoiceModal
        open={editModal.open}
        invoice={editModal.invoice}
        isSubmitting={editModal.isSubmitting}
        onClose={() => setEditModal({ open: false, invoice: null, isSubmitting: false })}
        onSave={async (updatedFields: any) => {
          if (!editModal.invoice) return;
          const inv = editModal.invoice.latestInvoice || editModal.invoice;
          const invId = inv.billing_id || inv.customer_billing_uuid || inv.id || editModal.invoice.id;
          setEditModal((prev) => ({ ...prev, isSubmitting: true }));
          try {
            const res = await fetch(`${API_BASE}/billing/invoices/${invId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedFields),
            });
            const data = await res.json();
            if (data.success) {
              setEditModal({ open: false, invoice: null, isSubmitting: false });
              alert(`✅ Invoice #${invId} updated successfully!`);
              fetchOnDemand();
            } else {
              alert('Failed to update invoice: ' + (data.message || 'Unknown error'));
            }
          } catch (err: any) {
            alert('Error updating invoice: ' + err.message);
          } finally {
            setEditModal((prev) => ({ ...prev, isSubmitting: false }));
          }
        }}
      />

      {/* ── DELETE INVOICE MODAL ── */}
      <DeleteInvoiceModal
        open={deleteModal.open}
        invoice={deleteModal.invoice}
        isDeleting={deleteModal.isDeleting}
        onClose={() => setDeleteModal({ open: false, invoice: null, isDeleting: false })}
        onConfirm={async () => {
          if (!deleteModal.invoice) return;
          const inv = deleteModal.invoice.latestInvoice || deleteModal.invoice;
          const invId = inv.billing_id || inv.customer_billing_uuid || inv.id || deleteModal.invoice.id;
          setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
          try {
            const res = await fetch(`${API_BASE}/billing/invoices/${invId}`, {
              method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
              setDeleteModal({ open: false, invoice: null, isDeleting: false });
              alert(`✅ Invoice #${invId} deleted permanently from all registers!`);
              fetchOnDemand();
            } else {
              alert('Failed to delete invoice: ' + (data.message || 'Unknown error'));
            }
          } catch (err: any) {
            alert('Error deleting invoice: ' + err.message);
          } finally {
            setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
          }
        }}
      />

      {/* ── INVOICE SETTLEMENT MODAL (UPGRADE / INSTALLMENT PAYMENT) ── */}
      {settlementModal.open && settlementModal.cust && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '1rem 1.25rem', borderBottom: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-credit-card"></i> Record Installment Payment
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>
                  Customer: <strong>{settlementModal.cust.name}</strong> ({settlementModal.cust.phone})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSettlementModal({ open: false, cust: null, payingNow: '', discount: '', note: '', customPaidAt: '', isSubmitting: false })}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#92400e', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(() => {
                const inv = settlementModal.cust.latestInvoice;
                const receiptData = getSafeReceiptData(inv);
                const totalGrand = Number(inv?.total_amount) || Number(inv?.final_amount) || Number(receiptData?.grandTotal) || Number(receiptData?.netPayable) || 0;
                const currentDue = inv?.due_amount !== undefined ? Number(inv.due_amount) : Number(receiptData?.balanceDueAmount || 0);
                const currentPaid = inv?.paid_amount !== undefined ? Number(inv.paid_amount) : Number(receiptData?.advancePaidAmount || totalGrand);

                const paidNowNum = parseIndianCurrencyNumber(settlementModal.payingNow);
                const discountNum = parseIndianCurrencyNumber(settlementModal.discount);
                const newRemainingDue = Math.max(0, currentDue - paidNowNum - discountNum);
                const newTotalPaid = currentPaid + paidNowNum;

                const paymentHistory: any[] = Array.isArray(receiptData?.payment_history) ? receiptData.payment_history : [];

                return (
                  <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, display: 'block' }}>TOTAL BILL</span>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 800 }}>₹{totalGrand.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 700, display: 'block' }}>PAID SO FAR</span>
                        <strong style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800 }}>₹{currentPaid.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 700, display: 'block' }}>BALANCE DUE</span>
                        <strong style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 800 }}>₹{currentDue.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>

                    {/* Payment Inputs Grid: Amount Paying Today + Settlement Discount */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                          Paying Today (₹):
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 10,000"
                          value={settlementModal.payingNow}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = parseIndianCurrencyNumber(raw);
                            setSettlementModal((prev) => ({
                              ...prev,
                              payingNow: num > 0 ? num.toLocaleString('en-IN') : raw,
                            }));
                          }}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #d97706', fontSize: '0.92rem', fontWeight: 800, color: '#b45309', outline: 'none', background: '#fffbeb' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#047857', marginBottom: '4px' }}>
                          Discount / తగ్గింపు (₹):
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 500 (Optional)"
                          value={settlementModal.discount}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = parseIndianCurrencyNumber(raw);
                            setSettlementModal((prev) => ({
                              ...prev,
                              discount: num > 0 ? num.toLocaleString('en-IN') : raw,
                            }));
                          }}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #10b981', fontSize: '0.92rem', fontWeight: 800, color: '#047857', outline: 'none', background: '#ecfdf5' }}
                        />
                      </div>
                    </div>

                    {/* Payment Date & Time Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                        Payment Date & Time:
                      </label>
                      <input
                        type="datetime-local"
                        value={settlementModal.customPaidAt}
                        onChange={(e) => setSettlementModal((prev) => ({ ...prev, customPaidAt: e.target.value }))}
                        style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                      />
                    </div>

                    {/* Calculation Real-Time Summary */}
                    <div style={{ background: newRemainingDue === 0 ? '#dcfce7' : '#fef3c7', border: newRemainingDue === 0 ? '1px solid #86efac' : '1px solid #fde68a', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                        <span>New Paid Total:</span>
                        <span style={{ color: '#16a34a' }}>₹{newTotalPaid.toLocaleString('en-IN')}</span>
                      </div>
                      {discountNum > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 700, marginTop: '2px' }}>
                          <span>Discount Deducted:</span>
                          <span>- ₹{discountNum.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: newRemainingDue === 0 ? '#15803d' : '#b45309', fontWeight: 800, marginTop: '2px' }}>
                        <span>Remaining Balance Due:</span>
                        <span>₹{newRemainingDue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Payment Installments Timeline History */}
                    {paymentHistory.length > 0 && (
                      <div style={{ marginTop: '0.2rem', paddingTop: '0.6rem', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-clock-rotate-left" style={{ color: '#0284c7' }}></i>
                          Payment Installments History ({paymentHistory.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
                          {paymentHistory.map((ph: any, pIdx: number) => {
                            const pDate = ph.paid_at ? new Date(ph.paid_at).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                            const discOnInst = Number(ph.discount_amount || 0);
                            return (
                              <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', fontSize: '0.70rem', border: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: 700, color: '#334155' }}>
                                  #{ph.installment || pIdx + 1} ({ph.note || 'Payment'}):
                                </span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{pDate}</span>
                                  <strong style={{ color: '#16a34a' }}>+ ₹{Number(ph.amount || 0).toLocaleString('en-IN')}</strong>
                                  {discOnInst > 0 && (
                                    <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.65rem' }}>(Disc: -₹{discOnInst.toLocaleString('en-IN')})</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setSettlementModal({ open: false, cust: null, payingNow: '', discount: '', note: '', customPaidAt: '', isSubmitting: false })}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={settlementModal.isSubmitting || (parseIndianCurrencyNumber(settlementModal.payingNow) <= 0 && parseIndianCurrencyNumber(settlementModal.discount) <= 0)}
                  onClick={handleConfirmSettlement}
                  style={{
                    flex: 1.5,
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: settlementModal.isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  {settlementModal.isSubmitting ? 'Recording Payment...' : 'Record Payment Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
