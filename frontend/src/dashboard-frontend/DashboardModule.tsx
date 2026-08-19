import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations } from '../utils/translations';
import type { Language } from '../utils/translations';
import { FullImagePreviewModal } from '../inventory-frontend/components/FullImagePreviewModal';

interface CustomerRecord {
  id: string;
  invoice_number?: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  product_name: string;
  transaction_type: string;
  weight_grams: number;
  final_amount: number;
  image_url?: string;
  created_at: string;
  receipt_json_data?: any;
}

interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone?: string;
  item_name: string;
  metal_type: string;
  gross_weight_grams: number;
  net_weight_grams?: number;
  status: string;
  returned_from_worker?: string;
  assigned_worker_id?: string | null;
  assigned_worker_name?: string | null;
  created_at: string;
  image_url?: string;
}

interface FinanceRecord {
  id: string;
  borrower_name?: string;
  borrower_phone?: string;
  borrower_address?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  item_name?: string;
  metal_type?: string;
  weight_grams?: number;
  amount: number;
  interest_rate_percent: number;
  status: 'OPEN' | 'CLOSED';
  loan_date?: string;
  created_at: string;
}

interface WorkerRecord {
  id: string;
  name: string;
  phone?: string;
  specialization?: string;
  photo_url?: string;
  latest_assignment_item?: string;
  latest_assignment_date?: string;
}

export const DashboardModule: React.FC<{ globalSearch?: string; lang?: Language }> = ({ globalSearch = '', lang = 'EN' }) => {
  const t = translations[lang] || translations.EN;
  void t;
  const isTe = lang === 'TE';

  const [invoices, setInvoices] = useState<CustomerRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const [showSalesRevenue, setShowSalesRevenue] = useState(false);
  const [showBuyCredit, setShowBuyCredit] = useState(false);
  const [showBillingFinalAmount, setShowBillingFinalAmount] = useState(false);
  const [showFinanceAmounts, setShowFinanceAmounts] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAnyShow = showSalesRevenue || showBuyCredit || showBillingFinalAmount || showFinanceAmounts;

  const toggleMasterEye = () => {
    const next = !isAnyShow;
    setShowSalesRevenue(next);
    setShowBuyCredit(next);
    setShowBillingFinalAmount(next);
    setShowFinanceAmounts(next);
  };

  useEffect(() => {
    setSearchTerm(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const safeFetchJson = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await res.json();
          }
          return null;
        } catch {
          return null;
        }
      };

      const [invData, ordData, finData, wrkData] = await Promise.all([
        safeFetchJson(`${API_BASE}/billing/invoices`),
        safeFetchJson(`${API_BASE}/work-assignment/orders`),
        safeFetchJson(`${API_BASE}/finance/overview`),
        safeFetchJson(`${API_BASE}/work-assignment/workers`),
      ]);

      if (invData && invData.success) setInvoices(invData.invoices || []);
      if (ordData && ordData.success) setOrders(ordData.orders || []);
      if (finData && finData.success) setFinanceRecords(finData.ledger || finData.records || []);
      if (wrkData && wrkData.success) setWorkers(wrkData.workers || []);
    } catch (err) {
      console.warn('Dashboard fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  // Preset Date Filter Handler
  const handlePresetDate = (preset: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(pastWeek.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'MONTH') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstOfMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };
  void handlePresetDate;

  // Helper date checker
  const isWithinDateRange = (dateStr?: string) => {
    if (!startDate && !endDate) return true;
    if (!dateStr) return false;
    const dStr = dateStr.split('T')[0];
    if (startDate && dStr < startDate) return false;
    if (endDate && dStr > endDate) return false;
    return true;
  };

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtered Datasets
  const filteredInvoices = invoices.filter((inv) => {
    const term = debouncedSearchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      inv.customer_name?.toLowerCase().includes(term) ||
      (inv.customer_phone && inv.customer_phone.includes(term)) ||
      (inv.customer_address && inv.customer_address.toLowerCase().includes(term)) ||
      inv.product_name?.toLowerCase().includes(term);
    return matchesSearch && isWithinDateRange(inv.created_at);
  });

  const filteredOrders = orders.filter((ord) => {
    const term = debouncedSearchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      ord.customer_name?.toLowerCase().includes(term) ||
      ord.item_name?.toLowerCase().includes(term) ||
      (ord.assigned_worker_name && ord.assigned_worker_name.toLowerCase().includes(term));
    return matchesSearch && isWithinDateRange(ord.created_at);
  });

  const filteredFinance = financeRecords.filter((fin) => {
    const term = debouncedSearchTerm.toLowerCase();
    const bName = fin.borrower_name || fin.customer_name || '';
    const bPhone = fin.borrower_phone || fin.customer_phone || '';
    const bAddr = fin.borrower_address || fin.customer_address || '';
    const matchesSearch =
      !term ||
      bName.toLowerCase().includes(term) ||
      bPhone.includes(term) ||
      bAddr.toLowerCase().includes(term);
    return matchesSearch && isWithinDateRange(fin.created_at || fin.loan_date || '');
  });

  // KPI Calculations
  const totalOrdersCount = filteredOrders.length;
  const completedOrdersCount = filteredOrders.filter((o) => o.status === 'COMPLETED' || o.returned_from_worker === 'yes').length;

  const sellInvoices = filteredInvoices.filter((i) => (i.transaction_type || '').toUpperCase() === 'SELL');
  const totalSalesAmount = sellInvoices.reduce((sum, i) => sum + (Number(i.final_amount) || 0), 0);

  const buyInvoices = filteredInvoices.filter((i) => (i.transaction_type || '').toUpperCase() === 'BUY');
  const totalBuyAmount = buyInvoices.reduce((sum, i) => sum + (Number(i.receipt_json_data?.totalBuyCredit || i.final_amount) || 0), 0);

  const exchangeInvoices = filteredInvoices.filter((i) => (i.transaction_type || '').toUpperCase() === 'EXCHANGE');
  const totalExchangeNet = exchangeInvoices.reduce((sum, i) => sum + (Number(i.final_amount) || 0), 0);
  void totalExchangeNet;

  // Top/Recent Worker Performance & Latest Assignment Calculation
  const workerStatsMap: Record<string, { completedCount: number; weightProcessed: number; latestItem?: string; latestDate?: string }> = {};
  orders.forEach((ord) => {
    const isDone = ord.status === 'COMPLETED' || ord.returned_from_worker === 'yes';
    const workerKey = ord.assigned_worker_name || ord.assigned_worker_id || '';
    if (workerKey) {
      if (!workerStatsMap[workerKey]) {
        workerStatsMap[workerKey] = { completedCount: 0, weightProcessed: 0, latestItem: ord.item_name, latestDate: ord.created_at };
      }
      if (isDone) {
        workerStatsMap[workerKey].completedCount += 1;
        workerStatsMap[workerKey].weightProcessed += Number(ord.gross_weight_grams || 0);
      }
      if (!workerStatsMap[workerKey].latestItem && ord.item_name) {
        workerStatsMap[workerKey].latestItem = ord.item_name;
        workerStatsMap[workerKey].latestDate = ord.created_at;
      }
    }
  });

  // Compile recent communicated workers list
  const rankedWorkers = workers
    .map((w) => {
      const stats = workerStatsMap[w.name] || workerStatsMap[w.id] || { completedCount: 0, weightProcessed: 0 };
      return {
        ...w,
        completedCount: stats.completedCount,
        weightProcessed: stats.weightProcessed,
        latestAssignment: stats.latestItem || 'Jewellery Work',
        latestDate: stats.latestDate ? stats.latestDate.split('T')[0] : 'Recent',
      };
    })
    .sort((a, b) => b.completedCount - a.completedCount || b.weightProcessed - a.weightProcessed)
    .slice(0, 5);

  return (
    <div className="admin-dashboard-root" style={{ color: '#1e293b', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* ── Top Header & Date Range Filter Bar ── */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontSize: '1.45rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-chart-pie" style={{ color: '#d97706' }}></i>
            {isTe ? 'ఎగ్జిక్యూటివ్ డ్యాష్‌బోర్డ్ రౌండప్' : 'Executive Dashboard Overview'}
          </h2>
          <p style={{ margin: '3px 0 0 0', color: '#786a5e', fontSize: '0.8rem', fontWeight: 500 }}>
            {isTe ? 'రియల్ టైమ్ అమ్మకాలు, ఆర్డర్లు, ఫైనాన్స్ లాగ్ మరియు ఆర్టిసన్ వర్కర్ పనితీరు' : 'Real-time sales, order fulfillment, finance ledger, and artisan worker performance'}
          </p>
        </div>

        {/* Controls Container Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', background: '#ffffff', padding: '0.5rem 0.85rem', borderRadius: '12px', border: '1px solid #e6decb', boxShadow: '0 4px 14px rgba(24,19,16,0.03)' }}>
          {/* Date Range Dropdown Popover */}
          <div style={{ position: 'relative' }} ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setTempStartDate(startDate);
                setTempEndDate(endDate);
                setIsDateDropdownOpen((prev) => !prev);
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                border: (startDate || endDate) ? '1px solid #b45309' : '1px solid #cbd5e1',
                background: (startDate || endDate) ? '#fffbeb' : '#ffffff',
                color: (startDate || endDate) ? '#b45309' : '#334155',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-calendar-days" style={{ color: '#d97706', fontSize: '0.85rem' }}></i>
              <span>
                {startDate && endDate
                  ? `${startDate} ~ ${endDate}`
                  : startDate
                    ? `From ${startDate}`
                    : endDate
                      ? `Until ${endDate}`
                      : isTe
                        ? 'తేదీ రకం ఎంచుకోండి ▾'
                        : 'Filter by Date Range ▾'}
              </span>
              {(startDate || endDate) && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#d97706',
                    display: 'inline-block',
                  }}
                />
              )}
            </button>

            {/* Dropdown Popover Menu */}
            {isDateDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '310px',
                  maxWidth: 'calc(100vw - 24px)',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
                  padding: '0.95rem',
                  zIndex: 100,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-calendar-days" style={{ color: '#d97706' }}></i>
                    {isTe ? 'తేదీల పరిధి ఎంచుకోండి' : 'Select Date Range'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDateDropdownOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {/* Quick Preset Pills inside Dropdown */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    {isTe ? 'త్వరిత ఫిల్టర్లు:' : 'Quick Presets:'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'TODAY', label: isTe ? 'ఈ రోజు' : 'Today' },
                      { id: 'WEEK', label: isTe ? 'ఈ వారం' : 'This Week' },
                      { id: 'MONTH', label: isTe ? 'ఈ నెల' : 'This Month' },
                      { id: 'ALL', label: isTe ? 'అన్నీ' : 'All Time' },
                    ].map((p) => {
                      const now = new Date();
                      const todayStr = now.toISOString().split('T')[0];
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (p.id === 'TODAY') {
                              setTempStartDate(todayStr);
                              setTempEndDate(todayStr);
                            } else if (p.id === 'WEEK') {
                              const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                              setTempStartDate(pastWeek.toISOString().split('T')[0]);
                              setTempEndDate(todayStr);
                            } else if (p.id === 'MONTH') {
                              const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                              setTempStartDate(firstOfMonth.toISOString().split('T')[0]);
                              setTempEndDate(todayStr);
                            } else {
                              setTempStartDate('');
                              setTempEndDate('');
                            }
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#334155',
                            fontWeight: 700,
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* From Date Input */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    {isTe ? 'ప్రారంభ తేదీ (From):' : 'From Date:'}
                  </label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none', background: '#fafafa' }}
                  />
                </div>

                {/* To Date Input */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                    {isTe ? 'ముగింపు తేదీ (To):' : 'To Date:'}
                  </label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, outline: 'none', background: '#fafafa' }}
                  />
                </div>

                {/* Clear and Submit Footer Buttons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTempStartDate('');
                      setTempEndDate('');
                      setStartDate('');
                      setEndDate('');
                      setIsDateDropdownOpen(false);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: '1px solid #fca5a5',
                      background: '#fef2f2',
                      color: '#991b1b',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="fa-solid fa-rotate-left"></i> {isTe ? 'క్లియర్' : 'Clear'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(tempStartDate);
                      setEndDate(tempEndDate);
                      setIsDateDropdownOpen(false);
                    }}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '8px',
                      border: '1px solid #b45309',
                      background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)',
                    }}
                  >
                    <i className="fa-solid fa-check"></i> {isTe ? 'సమర్పించు' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ height: '18px', width: '1px', background: '#cbd5e1' }} />

          {/* Master Eye Toggle Privacy Button */}
          <button
            type="button"
            onClick={toggleMasterEye}
            style={{
              background: isAnyShow ? '#fef3c7' : '#f1f5f9',
              border: isAnyShow ? '1px solid #f59e0b' : '1px solid #cbd5e1',
              color: isAnyShow ? '#b45309' : '#475569',
              padding: '0.3rem 0.65rem',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title={isAnyShow ? 'Hide all financial amounts' : 'Show all financial amounts'}
          >
            <i className={`fa-solid ${isAnyShow ? 'fa-eye-slash' : 'fa-eye'}`} />
            {isAnyShow ? (isTe ? 'అన్నీ దాచు' : 'Hide All') : (isTe ? 'అన్నీ చూపించు' : 'Show All')}
          </button>
        </div>
      </div>

      {/* ── 4 KPI Summary Cards (Styled exactly like Finance Module KPI Cards) ── */}
      <style>{`
        .dashboard-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .billing-address-col {
          width: 160px;
          min-width: 140px;
          max-width: 190px;
          font-size: 0.74rem;
          padding: 0.65rem 0.6rem;
          color: #475569;
          white-space: normal;
          word-break: break-word;
          line-height: 1.2;
        }
        @media (max-width: 1024px) {
          .dashboard-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          .billing-address-col {
            width: 85px !important;
            min-width: 65px !important;
            max-width: 95px !important;
            font-size: 0.65rem !important;
            padding: 0.65rem 0.25rem !important;
            line-height: 1.15 !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.6rem;
          }
        }
      `}</style>
      <div className="dashboard-kpi-grid">
        {/* Card 1: Custom Orders Received & Submitted (ROYAL EMERALD THEME) */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            border: '1px solid #6ee7b7',
            boxShadow: '0 4px 14px rgba(5, 150, 105, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#065f46' }}>
              {isTe ? 'వచ్చిన & పూర్తి చేసిన ఆర్డర్లు' : 'Custom Orders Received & Submitted'}
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', lineHeight: 1.1, margin: '5px 0' }}>
              {completedOrdersCount} / {totalOrdersCount}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#047857' }}>
              {completedOrdersCount} {isTe ? 'పూర్తయ్యాయి' : 'submitted out of'} {totalOrdersCount} {isTe ? 'వచ్చిన ఆర్డర్లు' : 'received orders'}
            </span>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#059669',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              border: '1px solid #047857',
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-cart-flatbed"></i>
          </div>
        </div>

        {/* Card 2: Sales Done & Generated Revenue (IMPERIAL GOLD THEME) */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            border: '1px solid #f59e0b',
            boxShadow: '0 4px 14px rgba(180, 83, 9, 0.14)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#78350f' }}>
              {isTe ? 'జరిగిన అమ్మకాలు & ఆదాయం' : 'Sales Done & Generated Revenue'}
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, margin: '5px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showSalesRevenue ? `₹${totalSalesAmount.toLocaleString('en-IN')}` : '••••••••'}
              <button
                type="button"
                onClick={() => setShowSalesRevenue((prev) => !prev)}
                style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                title="Toggle sales revenue visibility"
              >
                <i className={`fa-solid ${showSalesRevenue ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#92400e' }}>
              {isTe ? 'మొత్తం ఆదాయం' : 'Generated from'} {sellInvoices.length} {isTe ? 'అమ్మకాల బిల్లులు' : 'completed sales'}
            </span>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#d97706',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              border: '1px solid #b45309',
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-cash-register"></i>
          </div>
        </div>

        {/* Card 3: Buyings Done & Amount Paid (SAPPHIRE OCEAN THEME) */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            border: '1px solid #7dd3fc',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#075985' }}>
              {isTe ? 'జరిగిన కొనుగోళ్లు & చెల్లించిన మొత్తం' : 'Buyings Done & Amount Paid'}
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0c4a6e', lineHeight: 1.1, margin: '5px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showBuyCredit ? `₹${totalBuyAmount.toLocaleString('en-IN')}` : '••••••••'}
              <button
                type="button"
                onClick={() => setShowBuyCredit((prev) => !prev)}
                style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                title="Toggle buying payout visibility"
              >
                <i className={`fa-solid ${showBuyCredit ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#0284c7' }}>
              {isTe ? 'చెల్లించిన మొత్తం' : 'Paid across'} {buyInvoices.length} {isTe ? 'కొనుగోలు బిల్లులు' : 'buying bills'}
            </span>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              border: '1px solid #0369a1',
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-bag-shopping"></i>
          </div>
        </div>

        {/* Card 4: Trade-Ins Done (AMETHYST VIOLET THEME) */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            border: '1px solid #c4b5fd',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#5b21b6' }}>
              {isTe ? 'జరిగిన ఎక్స్చేంజ్‌లు' : 'Trade-Ins Done'}
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4c1d95', lineHeight: 1.1, margin: '5px 0' }}>
              {exchangeInvoices.length} {isTe ? 'ఎక్స్చేంజ్‌లు' : 'Trade-Ins'}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#6d28d9' }}>
              {exchangeInvoices.length} {isTe ? 'పాత బంగారం ఎక్స్చేంజ్‌లు పూర్తయ్యాయి' : 'old gold trade-ins completed'}
            </span>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#7c3aed',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              border: '1px solid #6d28d9',
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-right-left"></i>
          </div>
        </div>
      </div>

      {/* ── Table 1: Recent 10 Billing Transactions ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e6decb', boxShadow: '0 6px 20px rgba(24,19,16,0.03)', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.1rem', background: '#fcfaf7', borderBottom: '1px solid #e6decb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#181310', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-receipt" style={{ color: '#d97706' }}></i>
            {isTe ? 'ఇటీవలి 10 బిల్లింగ్ లావాదేవీలు' : 'Recent 10 Billing Transactions'}
          </h3>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#786a5e', background: '#f4ede4', padding: '3px 8px', borderRadius: '6px' }}>
            {filteredInvoices.length} {isTe ? 'మొత్తం బిల్లులు' : 'Total Bills'}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '45px' }}>S.N.</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'తేదీ & బిల్ సంఖ్య' : 'Date & Invoice'}</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'కస్టమర్ వివరాలు' : 'Customer Details'}</th>
                <th className="billing-address-col">{isTe ? 'చిరునామా' : 'Address'}</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{isTe ? 'మోడ్' : 'Mode'}</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'వస్తువు & లోహం' : 'Product & Metal'}</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{isTe ? 'మొత్తం ధర' : 'Final Amount'}</span>
                    <button
                      type="button"
                      onClick={() => setShowBillingFinalAmount((prev) => !prev)}
                      style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                      title={showBillingFinalAmount ? 'Hide Final Amount column' : 'Show Final Amount column'}
                    >
                      <i className={`fa-solid ${showBillingFinalAmount ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.3rem', color: '#d97706', marginBottom: '6px' }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.8rem' }}>Loading recent billing records...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fa-solid fa-folder-open" style={{ fontSize: '1.5rem', marginBottom: '6px', color: '#cbd5e1' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No billing transactions found for selected date range.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.slice(0, 10).map((inv, idx) => {
                  const mode = (inv.transaction_type || 'SELL').toUpperCase();
                  const primaryImg = inv.image_url || inv.receipt_json_data?.image_url || inv.receipt_json_data?.items?.[0]?.image_url || '';
                  const addrStr = inv.customer_address || inv.receipt_json_data?.customer_address || '—';

                  const rawProductName = inv.product_name || inv.receipt_json_data?.items?.[0]?.product_name || 'Jewellery Item';
                  const cleanedProductName = rawProductName
                    // 1. Remove concatenated order references like AnkletORD-20260813-9935, BangleORD-20260813-5282, Order-123
                    .replace(/(?:Custom\s*)?(?:Order|ORD|ord)[-0-9a-z]*/gi, '')
                    // 2. Remove parenthesized order references like (-9935), (-5282), (-ord-834u3), (-9935, (ORD-9935)
                    .replace(/\s*\(\s*-(?:ORD|ord)?-?[0-9a-z]+\s*\)?/gi, '')
                    .replace(/\s*\(\s*#(?:ORD|ord)?-?[0-9a-z]+\s*\)?/gi, '')
                    .replace(/\s*\(\s*(?:ORD|ord)-?[0-9a-z]+\s*\)?/gi, '')
                    .replace(/\s+-\d{3,}\b/g, '')
                    .replace(/^[\s:\-\|\(\)]+|[\s:\-\|\(\)]+$/g, '')
                    .trim() || rawProductName || 'Jewellery Item';

                  return (
                    <tr key={inv.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{inv.invoice_number || `#${inv.id ? String(inv.id).slice(0, 6) : idx + 1}`}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{inv.created_at ? inv.created_at.split('T')[0] : '—'}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{inv.customer_name}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{inv.customer_phone || '—'}</div>
                      </td>
                      <td className="billing-address-col" title={addrStr}>
                        {addrStr}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            background: mode === 'SELL' ? '#fef3c7' : mode === 'BUY' ? '#e0f2fe' : mode === 'EXCHANGE' ? '#eef2ff' : '#fef2f2',
                            color: mode === 'SELL' ? '#b45309' : mode === 'BUY' ? '#0369a1' : mode === 'EXCHANGE' ? '#4338ca' : '#991b1b',
                            border: mode === 'SELL' ? '1px solid #fde68a' : mode === 'BUY' ? '1px solid #bae6fd' : mode === 'EXCHANGE' ? '1px solid #c7d2fe' : '1px solid #fecaca',
                          }}
                        >
                          {mode}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {primaryImg ? (
                            <img
                              src={primaryImg}
                              alt="Product"
                              onClick={() => setPreviewImage({ url: primaryImg, title: `${inv.customer_name}'s ${cleanedProductName}` })}
                              title="Click to enlarge image"
                              style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #d97706', cursor: 'pointer', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                              <i className="fa-solid fa-gem" style={{ color: '#d97706' }} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{cleanedProductName}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{inv.weight_grams ? `${inv.weight_grams}g` : '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {showBillingFinalAmount ? `₹${(Number(inv.final_amount) || 0).toLocaleString('en-IN')}` : '••••••••'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Table 2: Recent 5 Finance Loan Transactions ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e6decb', boxShadow: '0 6px 20px rgba(24,19,16,0.03)', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.1rem', background: '#fcfaf7', borderBottom: '1px solid #e6decb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#181310', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-scale-balanced" style={{ color: '#d97706' }}></i>
            {isTe ? 'ఇటీవలి 5 ఫైనాన్స్ లోన్ లావాదేవీలు' : 'Recent 5 Finance Loan Entries'}
          </h3>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#786a5e', background: '#f4ede4', padding: '3px 8px', borderRadius: '6px' }}>
            {filteredFinance.length} {isTe ? 'మొత్తం లోన్లు' : 'Total Loans'}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '45px' }}>S.N.</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'తేదీ & లోన్ ID' : 'Date & Loan ID'}</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'ఋణగ్రహీత వివరాలు' : 'Borrower Details'}</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'తాకట్టు లోహం & బరువు' : 'Pledged Metal & Wt'}</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{isTe ? 'అసలు మొత్తం' : 'Principal Amount'}</span>
                    <button
                      type="button"
                      onClick={() => setShowFinanceAmounts((prev) => !prev)}
                      style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                      title={showFinanceAmounts ? 'Hide finance amounts' : 'Show finance amounts'}
                    >
                      <i className={`fa-solid ${showFinanceAmounts ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                </th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{isTe ? 'నెలవారీ వడ్డీ' : 'Monthly Interest'}</span>
                    <button
                      type="button"
                      onClick={() => setShowFinanceAmounts((prev) => !prev)}
                      style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                      title={showFinanceAmounts ? 'Hide monthly interest' : 'Show monthly interest'}
                    >
                      <i className={`fa-solid ${showFinanceAmounts ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                </th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{isTe ? 'స్థితి' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.3rem', color: '#d97706', marginBottom: '6px' }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.8rem' }}>Loading finance records...</p>
                  </td>
                </tr>
              ) : filteredFinance.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fa-solid fa-folder-open" style={{ fontSize: '1.5rem', marginBottom: '6px', color: '#cbd5e1' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No finance entries found for selected date range.</p>
                  </td>
                </tr>
              ) : (
                filteredFinance.slice(0, 5).map((fin, idx) => {
                  const bName = fin.borrower_name || fin.customer_name || 'Borrower Name';
                  const bPhone = fin.borrower_phone || fin.customer_phone || '—';
                  const bAddr = fin.borrower_address || fin.customer_address || '';
                  const isGold = (fin.metal_type || 'GOLD').toUpperCase() === 'GOLD';
                  const monthlyInterest = (Number(fin.amount || 0) * (Number(fin.interest_rate_percent || 0) / 100)).toFixed(2);
                  const isOpen = fin.status === 'OPEN';

                  return (
                    <tr key={fin.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{`#LN-${fin.id ? String(fin.id).slice(0, 6) : idx + 1}`}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{fin.created_at || fin.loan_date ? (fin.created_at || fin.loan_date)!.split('T')[0] : '—'}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{bName}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {bPhone} {bAddr ? `· ${bAddr}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: isGold ? '#fffbeb' : '#f1f5f9', color: isGold ? '#b45309' : '#475569', border: isGold ? '1px solid #fde68a' : '1px solid #cbd5e1' }}>
                            {isGold ? 'GOLD' : 'SILVER'}
                          </span>
                          <span style={{ fontWeight: 700, color: '#334155' }}>
                            {fin.item_name || 'Ornament'} {fin.weight_grams ? `(${fin.weight_grams}g)` : ''}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {showFinanceAmounts ? `₹${(Number(fin.amount) || 0).toLocaleString('en-IN')}` : '••••••••'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#059669' }}>
                          {showFinanceAmounts ? `₹${Number(monthlyInterest).toLocaleString('en-IN')}/mo` : '••••/mo'}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#64748b' }}>@{fin.interest_rate_percent}% pm</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                        <span style={{ padding: '2px 7px', borderRadius: '6px', fontWeight: 800, fontSize: '0.65rem', background: isOpen ? '#fef3c7' : '#dcfce7', color: isOpen ? '#b45309' : '#15803d', border: isOpen ? '1px solid #fde68a' : '1px solid #86efac' }}>
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Most Recent Communicated Workers & Artisans Table (At Bottom) ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e6decb', boxShadow: '0 6px 20px rgba(24,19,16,0.03)', overflow: 'hidden' }}>
        <div style={{ padding: '0.85rem 1.1rem', background: '#fcfaf7', borderBottom: '1px solid #e6decb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#181310', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-comments" style={{ color: '#d97706' }}></i>
            {isTe ? 'ఇటీవలి సంభాషించిన వర్కర్ల వివరాలు' : 'Most Recent Communicated Workers & Artisans'}
          </h3>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#786a5e', background: '#f4ede4', padding: '3px 8px', borderRadius: '6px' }}>
            {rankedWorkers.length} {isTe ? 'ఆర్టిసన్‌లు' : 'Artisans'}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
                <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '100px' }}>{isTe ? 'ర్యాంక్' : 'Rank'}</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'వర్కర్ పేరు & ఫోన్' : 'Worker Details'}</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>{isTe ? 'ఇటీవలి పని అప్పగింత' : 'Recent Work Assignment'}</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{isTe ? 'పూర్తి చేసిన ఆర్డర్లు' : 'Completed Orders'}</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{isTe ? 'మొత్తం బరువు' : 'Weight Processed'}</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>{isTe ? 'చాట్ & లెడ్జర్' : 'Chat & Ledger'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.3rem', color: '#d97706', marginBottom: '6px' }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.8rem' }}>Loading worker communication list...</p>
                  </td>
                </tr>
              ) : rankedWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fa-solid fa-user-clock" style={{ fontSize: '1.5rem', marginBottom: '6px', color: '#cbd5e1' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No worker communication records available.</p>
                  </td>
                </tr>
              ) : (
                rankedWorkers.map((w, rankIdx) => {
                  const medals = ['🥇 #1 Top Artisan', '🥈 #2 Artisan', '🥉 #3 Artisan', '#4 Artisan', '#5 Artisan'];
                  const rankBadges = [
                    { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
                    { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
                    { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5' },
                    { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
                    { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
                  ];
                  const currentBadge = rankBadges[rankIdx] || rankBadges[0];

                  const openWorkerChat = () => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('module', 'work-assignment');
                    params.set('view', 'transaction-history');
                    if (lang) params.set('lang', lang.toLowerCase());
                    params.set('workerId', w.id);
                    window.location.search = params.toString();
                  };

                  return (
                    <tr
                      key={w.id || rankIdx}
                      onClick={openWorkerChat}
                      style={{ borderBottom: '1px solid #f1f5f9', background: rankIdx % 2 === 0 ? '#ffffff' : '#fafafa', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fefce8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rankIdx % 2 === 0 ? '#ffffff' : '#fafafa')}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '10px', fontWeight: 800, fontSize: '0.70rem', background: currentBadge.bg, color: currentBadge.color, border: `1px solid ${currentBadge.border}`, display: 'inline-block' }}>
                          {medals[rankIdx] || `#${rankIdx + 1}`}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#b45309', color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #d99b26', boxShadow: '0 2px 5px rgba(0,0,0,0.08)', flexShrink: 0 }}>
                            {w.name ? w.name.charAt(0).toUpperCase() : 'W'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>{w.name}</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                              {w.specialization || 'Jewellery Artisan'} {w.phone ? `· ${w.phone}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.78rem' }}>{w.latestAssignment}</div>
                        <div style={{ fontSize: '0.66rem', color: '#64748b' }}>Assigned: {w.latestDate}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.74rem', border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-circle-check" /> {w.completedCount} Orders
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '0.74rem', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-scale-balanced" /> {w.weightProcessed.toFixed(1)}g
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWorkerChat();
                          }}
                          style={{
                            padding: '2px 2px',
                            borderRadius: '8px',
                            border: '1px solid #d99b26',
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            color: '#b45309',
                            fontWeight: 800,
                            fontSize: '0.54rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 6px rgba(180,83,9,0.15)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isTe ? 'సంభాషణ' : 'Open Chat'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Full Image Preview Modal ── */}
      {previewImage && (
        <FullImagePreviewModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};
