import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations, type Language } from '../utils/translations';
import { getWorkAssignmentTranslation } from './workAssignmentTranslations';
import { FullImagePreviewModal } from '../inventory-frontend/components/FullImagePreviewModal';

interface ModernSelectProps {
  value: string;
  onChange: (val: string) => void;
  workers: any[];
}

const ModernWorkerSelect: React.FC<ModernSelectProps> = ({ value, onChange, workers }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [filterQuery, setFilterQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = [
    { id: 'ALL', name: 'All Workers' },
    ...workers.map((w) => ({
      id: w.id,
      name: w.name ? w.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : '',
    })),
  ];

  const filtered = options.filter((opt) => opt.name.toLowerCase().includes(filterQuery.toLowerCase()));
  const selectedOpt = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setFilterQuery('');
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightIdx(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightIdx]) {
        onChange(filtered[highlightIdx].id);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ position: 'relative', outline: 'none', userSelect: 'none' }}
    >
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ffffff',
          border: isOpen ? '1px solid #0284c7' : '1px solid #cbd5e1',
          boxShadow: isOpen ? '0 0 0 3px rgba(2,132,199,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
          padding: '6px 14px',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: '#0f172a',
          transition: 'all 0.15s ease',
        }}
      >
        <i className="fa-solid fa-user-gear" style={{ color: '#0284c7', fontSize: '0.82rem' }}></i>
        <span style={{ minWidth: '90px' }}>{selectedOpt.name}</span>
        <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.72rem', color: '#64748b', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', marginLeft: '4px' }}></i>
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '220px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
            zIndex: 1000,
            padding: '6px',
          }}
        >
          {/* Quick Filter Input inside dropdown */}
          <div style={{ padding: '4px', marginBottom: '4px' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search worker..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                No worker found
              </div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.id === value;
                const isHighlighted = idx === highlightIdx;

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#0284c7' : '#334155',
                      background: isHighlighted ? '#e0f2fe' : isSelected ? '#f0f9ff' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '2px',
                    }}
                  >
                    <span>{opt.name}</span>
                    {isSelected && <i className="fa-solid fa-check" style={{ color: '#0284c7', fontSize: '0.75rem' }}></i>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface WorkerWorkHistoryViewProps {
  worker: any;
  onBack: () => void;
  onOpenWorkersList?: () => void;
  lang?: Language;
}

const fmtDate = (isoStr?: string | null): string => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
};

const getCalendarDaysDiff = (d1Date: Date, d2Date: Date) => {
  const utc1 = Date.UTC(d1Date.getFullYear(), d1Date.getMonth(), d1Date.getDate());
  const utc2 = Date.UTC(d2Date.getFullYear(), d2Date.getMonth(), d2Date.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
};

const getDurationText = (assignedAt?: string | null, returnedAt?: string | null, isReturned?: boolean) => {
  if (!assignedAt) return '—';
  const startDate = new Date(assignedAt);
  if (isNaN(startDate.getTime())) return '—';

  if (isReturned && returnedAt) {
    const endDate = new Date(returnedAt);
    if (isNaN(endDate.getTime())) return '—';
    const calDays = getCalendarDaysDiff(startDate, endDate);
    if (calDays <= 0) return 'Same Day';
    if (calDays === 1) return '1 Day';
    return `${calDays} Days`;
  }

  const nowDate = new Date();
  const calDaysSoFar = getCalendarDaysDiff(startDate, nowDate);
  if (calDaysSoFar > 0) {
    return `Still Processing (${calDaysSoFar} day${calDaysSoFar > 1 ? 's' : ''})`;
  }
  return 'Still Processing (Today)';
};

export const WorkerWorkHistoryView: React.FC<WorkerWorkHistoryViewProps> = ({
  worker,
  onBack,
  onOpenWorkersList,
  lang = 'EN',
}) => {
  const t = getWorkAssignmentTranslation(lang);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>(worker?.id || 'ALL');
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isAll = worker?.id === 'ALL';

  useEffect(() => {
    if (worker?.id) {
      setSelectedWorkerFilter(worker.id);
    }
  }, [worker?.id]);

  useEffect(() => {
    fetchWorkersList();
    fetchWorkerOrders();
  }, [worker?.id]);

  const fetchWorkersList = async () => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/workers`);
      const data = await res.json();
      if (data.success && Array.isArray(data.workers)) {
        setWorkersList(data.workers);
      }
    } catch (err) {
      console.error('Failed to fetch workers list for filter:', err);
    }
  };

  const fetchWorkerOrders = async () => {
    if (!worker?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/work-assignment/orders`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const workerAssigned = isAll
          ? data.orders.filter((o: any) => !!o.assigned_worker_id || !!o.assigned_worker_name)
          : data.orders.filter((o: any) => o.assigned_worker_id === worker.id);
        setOrders(workerAssigned);
      }
    } catch (err) {
      console.error('Failed to fetch worker orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalOrdersCount = orders.length;
  const pendingCount = orders.filter((o) => !(o.returned_at || o.completed_at)).length;
  const completedCount = orders.filter((o) => !!(o.returned_at || o.completed_at)).length;
  const activeWorkersCount = new Set(orders.map((o) => o.assigned_worker_id || o.assigned_worker_name)).size;

  const filteredOrders = orders.filter((ord) => {
    // 1. Worker Filter from "Assigned To" Dropdown
    if (selectedWorkerFilter !== 'ALL') {
      if (String(ord.assigned_worker_id) !== String(selectedWorkerFilter)) return false;
    }

    // 2. Status Filter
    if (statusFilter === 'PENDING' && ord.order_status === 'COMPLETED') return false;
    if (statusFilter === 'COMPLETED' && ord.order_status !== 'COMPLETED') return false;

    // 3. Date Range Filter (Direct selected date matching)
    if (startDate || endDate) {
      const rawDate = String(ord.created_at || '').trim();
      const ordDateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
      if (startDate && ordDateStr && ordDateStr < startDate) return false;
      if (endDate && ordDateStr && ordDateStr > endDate) return false;
    }

    // 4. Search Term Filter
    if (!debouncedSearchTerm.trim()) return true;
    const q = debouncedSearchTerm.toLowerCase().trim();
    const wName = (ord.assigned_worker_name || '').toLowerCase();
    const wId = (ord.assigned_worker_id || '').toLowerCase();
    const cName = (ord.customer_name || '').toLowerCase();
    const cPhone = (ord.customer_phone || '').toLowerCase();
    const item = (ord.item_name || '').toLowerCase();
    const metal = (ord.metal_type || '').toLowerCase();

    return (
      wName.includes(q) ||
      wId.includes(q) ||
      cName.includes(q) ||
      cPhone.includes(q) ||
      item.includes(q) ||
      metal.includes(q)
    );
  });

  return (
    <div className="tablet-dense-view" style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
      {/* ── TOP HEADER BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={onBack}
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>

          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fa-solid fa-clipboard-check" style={{ color: '#d97706', marginRight: '8px' }}></i>
              {isAll ? 'All Workers — Master Work & Orders History' : `${worker.name} — ${t.workHistoryTab}`}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {isAll ? (
                <span>Showing custom order assignments across all registered workers</span>
              ) : (
                <span>Worker ID: <strong style={{ color: '#0284c7' }}>{worker.id}</strong> &nbsp;·&nbsp; {worker.specialization}</span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenWorkersList) {
              onOpenWorkersList();
            } else {
              const params = new URLSearchParams(window.location.search);
              params.set('module', 'work-assignment');
              params.set('view', 'workers');
              window.history.pushState({}, '', `?${params.toString()}`);
              window.dispatchEvent(new Event('popstate'));
            }
          }}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid #d97706',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
          }}
        >
          <i className="fa-solid fa-users"></i> Workers ({workersList.length})
        </button>
      </div>

      {/* ── 4 INTERACTIVE CLICKABLE KPI SUMMARY CARDS (SINGLE ROW IN TABLET VIEW) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {/* Total Orders Card */}
        <div
          onClick={() => setStatusFilter('ALL')}
          title="Click to show all orders"
          style={{
            background: statusFilter === 'ALL' ? '#f1f5f9' : '#f8fafc',
            padding: '0.65rem 0.75rem',
            borderRadius: '12px',
            border: statusFilter === 'ALL' ? '2px solid #0f172a' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            boxShadow: statusFilter === 'ALL' ? '0 4px 12px rgba(15,23,42,0.12)' : 'none',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#cbd5e1', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Total Orders</span>
            <strong style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>{totalOrdersCount}</strong>
          </div>
        </div>

        {/* Pending Orders Card */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          title="Click to show only still processing orders"
          style={{
            background: statusFilter === 'PENDING' ? '#fef3c7' : '#fffbe8',
            padding: '0.65rem 0.75rem',
            borderRadius: '12px',
            border: statusFilter === 'PENDING' ? '2px solid #d97706' : '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            boxShadow: statusFilter === 'PENDING' ? '0 4px 12px rgba(217,119,6,0.15)' : 'none',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.60rem', color: '#b45309', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Still Processing</span>
            <strong style={{ fontSize: '1.1rem', color: '#92400e', fontWeight: 800 }}>{pendingCount}</strong>
          </div>
        </div>

        {/* Completed Orders Card */}
        <div
          onClick={() => setStatusFilter('COMPLETED')}
          title="Click to show only completed orders"
          style={{
            background: statusFilter === 'COMPLETED' ? '#dcfce7' : '#f0fdf4',
            padding: '0.65rem 0.75rem',
            borderRadius: '12px',
            border: statusFilter === 'COMPLETED' ? '2px solid #16a34a' : '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            boxShadow: statusFilter === 'COMPLETED' ? '0 4px 12px rgba(22,163,74,0.15)' : 'none',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.60rem', color: '#15803d', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Completed</span>
            <strong style={{ fontSize: '1.1rem', color: '#166534', fontWeight: 800 }}>{completedCount}</strong>
          </div>
        </div>

        {/* Active Artisans Card */}
        <div
          onClick={() => setStatusFilter('ALL')}
          title="Click to show all workers"
          style={{
            background: '#f0f9ff',
            padding: '0.65rem 0.75rem',
            borderRadius: '12px',
            border: '1px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
            <i className="fa-solid fa-users-gears"></i>
          </div>
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.60rem', color: '#0369a1', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Workers</span>
            <strong style={{ fontSize: '1.1rem', color: '#075985', fontWeight: 800 }}>{activeWorkersCount}</strong>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH CONTROLS BAR (SEARCH + WORKER DROPDOWN + DATE RANGE) ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        {/* Live Search Bar */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}></i>
          <input
            type="text"
            placeholder={translations[lang]?.searchWorkerHistoryPlaceholder || 'Search by Worker Name, Customer Name, Phone Number, or Ornament item...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.6rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {/* Assigned To Worker Modern Custom Dropdown (Keyboard Accessible & ONLY Worker Names) */}
        <ModernWorkerSelect
          value={selectedWorkerFilter}
          onChange={setSelectedWorkerFilter}
          workers={workersList}
        />

        {/* Date Range Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '4px 10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
          <i className="fa-solid fa-calendar-days" style={{ color: '#d97706', fontSize: '0.82rem' }}></i>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
          />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
          />

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              title="Reset Date Range"
              style={{ background: '#e2e8f0', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#475569', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <i className="fa-solid fa-xmark"></i> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── ORDERS TABLE ── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#d97706', marginBottom: '0.5rem' }}></i>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading work orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.5rem' }}></i>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
            {searchTerm ? `No orders matching "${searchTerm}"` : 'No work orders found'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 0.75rem', width: '50px', textAlign: 'center' }}>S.No</th>
                {isAll && <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Worker Name</th>}
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Customer Details</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Item & Metal</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Gross & Net Wt</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Assigned Date</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Completed Date</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Days Taken / Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord, idx) => {
                const completionDate = ord.returned_at || ord.completed_at;
                const isReturned = !!completionDate || (ord.status === 'COMPLETED' && !!completionDate);
                const durationText = getDurationText(ord.assigned_at || ord.created_at, completionDate, isReturned);

                return (
                  <tr key={ord.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                      {idx + 1}
                    </td>
                    {isAll && (
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#d97706' }}>{ord.assigned_worker_name || 'Worker'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700 }}></div>
                      </td>
                    )}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{ord.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ord.customer_phone || '—'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>
                      {(() => {
                        const itemImg = ord.image_url || ord.receipt_json_data?.image_url || ord.receipt_json_data?.items?.[0]?.image_url || '';
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={ord.item_name}
                                onClick={() => setPreviewImage({ url: itemImg, title: ord.item_name })}
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
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>{ord.item_name}</div>
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: ord.metal_type === 'GOLD' ? '#fef3c7' : '#e0f2fe', color: ord.metal_type === 'GOLD' ? '#b45309' : '#0369a1' }}>
                                {ord.metal_type}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{ord.gross_weight_grams} g</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Net: {ord.net_weight_grams} g</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: '#334155', fontSize: '0.78rem' }}>
                      {fmtDate(ord.assigned_at || ord.created_at)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', color: isReturned ? '#15803d' : '#94a3b8', fontWeight: isReturned ? 700 : 500, fontSize: '0.78rem' }}>
                      {isReturned ? fmtDate(ord.returned_at) : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: isReturned ? '#dcfce7' : '#fef3c7',
                        color: isReturned ? '#15803d' : '#b45309',
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        display: 'inline-block',
                      }}>
                        {durationText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

export default WorkerWorkHistoryView;
