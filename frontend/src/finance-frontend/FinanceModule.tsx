import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import type { LoanRecord, MetalRates } from './types';
import { IssueNewLoanModal, DeleteConfirmDialog, SettlementDialog } from './components';

import { getFinanceTranslation } from './financeTranslations';
import type { Language } from '../utils/translations';

export const FinanceModule: React.FC<{ globalSearch?: string; lang?: Language }> = ({ globalSearch = '', lang = 'EN' }) => {
  const t = getFinanceTranslation(lang);
  const [ledger, setLedger] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue' | 'deleted'>('all');
  const [metalFilter, setMetalFilter] = useState<'all' | 'gold' | 'silver' | 'cash'>('all');
  const [metalRates, setMetalRates] = useState<MetalRates>({ gold_rate_per_gram: 1420, silver_rate_per_gram: 25 });
  const [showModal, setShowModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Full-size Image Preview Lightbox Modal State
  const [selectedLedgerImage, setSelectedLedgerImage] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  // Settlement Confirmation Modal State
  const [confirmCompleteRecord, setConfirmCompleteRecord] = useState<LoanRecord | null>(null);
  const [completingLoan, setCompletingLoan] = useState(false);

  // Edit & Delete State
  const [editingRecord, setEditingRecord] = useState<LoanRecord | null>(null);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<LoanRecord | null>(null);
  const [actionUpdating, setActionUpdating] = useState<string | null>(null);

  // Custom Calendar state & refs for Date Filters
  const [openStartCalendar, setOpenStartCalendar] = useState(false);
  const [startCalendarViewDate, setStartCalendarViewDate] = useState<Date>(new Date());
  const startCalendarDropdownRef = useRef<HTMLDivElement>(null);

  const [openEndCalendar, setOpenEndCalendar] = useState(false);
  const [endCalendarViewDate, setEndCalendarViewDate] = useState<Date>(new Date());
  const endCalendarDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearchTerm(globalSearch); }, [globalSearch]);
  useEffect(() => { fetchData(); fetchMetalRates(); }, []);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, metalFilter, searchTerm, startDate, endDate]);

  // Click outside listener for date range filters
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (startCalendarDropdownRef.current && !startCalendarDropdownRef.current.contains(e.target as Node)) {
        setOpenStartCalendar(false);
      }
      if (endCalendarDropdownRef.current && !endCalendarDropdownRef.current.contains(e.target as Node)) {
        setOpenEndCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchMetalRates = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/metal-rates`);
      const data = await res.json();
      if (data.success) {
        setMetalRates({
          gold_rate_per_gram: data.gold_rate_per_gram,
          silver_rate_per_gram: data.silver_rate_per_gram,
        });
      }
    } catch { /* use defaults */ }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/overview`);
      const data = await res.json();
      if (data.success) { setLedger(data.ledger || []); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
  };

  const handleEditRecord = (rec: LoanRecord) => {
    setEditingRecord(rec);
    setShowModal(true);
  };

  const handleRecordAction = async (id: string, action: string | null) => {
    setActionUpdating(id);
    try {
      const res = await fetch(`${API_BASE}/finance/debt/${id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_action: action }),
      });
      const data = await res.json();
      if (data.success) {
        setLedger(prev => prev.map(r => r.id === id ? { ...r, record_action: action } : r));
      } else {
        alert('Failed to update action: ' + data.message);
      }
    } catch { alert('Server error updating record action.'); }
    finally { setActionUpdating(null); }
  };

  const handleCompleteLoan = async (rec: LoanRecord, chosenInterest: number) => {
    setCompletingLoan(true);
    const chosenTypeStr = 'Month-Wise Interest';
    const closingDateStr = new Date().toISOString().split('T')[0];

    try {
      const res = await fetch(`${API_BASE}/finance/debt/${rec.id}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_consideration_interest_amount: chosenInterest,
          closing_date: closingDateStr,
          considered_type: chosenTypeStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLedger(prev => prev.map(r => r.id === rec.id ? {
          ...r,
          status: 'CLOSED',
          final_consideration_interest_amount: chosenInterest,
          closing_date: closingDateStr,
          considered_type: chosenTypeStr,
        } : r));
        setConfirmCompleteRecord(null);
        fetchData(); // refresh summary counts
      } else {
        alert('Failed to complete loan: ' + data.message);
      }
    } catch {
      alert('Server error while settling loan.');
    } finally {
      setCompletingLoan(false);
    }
  };

  const isRecordOverdue = (rec: LoanRecord) => {
    if (rec.status !== 'OPEN') return false;
    const diffDays = Math.max(0, Math.floor((new Date().getTime() - new Date(rec.loan_date).getTime()) / (1000 * 60 * 60 * 24)));
    return (diffDays / 30 > rec.timeline_months);
  };

  const metalFilteredLedger = ledger.filter(rec => {
    if (metalFilter === 'all') return true;
    const isCashRec = rec.item_metal_type?.toLowerCase() === 'cash' || rec.item_name?.toLowerCase() === 'cash';
    if (metalFilter === 'cash') return isCashRec;
    if (metalFilter === 'gold') return rec.item_metal_type?.toLowerCase() === 'gold' && !isCashRec;
    if (metalFilter === 'silver') return rec.item_metal_type?.toLowerCase() === 'silver' && !isCashRec;
    return true;
  });

  const pendingMetalCount = metalFilteredLedger.filter(r => r.status === 'OPEN' && r.record_action !== 'deleted').length;
  const completedMetalCount = metalFilteredLedger.filter(r => r.status === 'CLOSED' && r.record_action !== 'deleted').length;
  const overdueMetalCount = metalFilteredLedger.filter(r => isRecordOverdue(r) && r.record_action !== 'deleted').length;
  const deletedMetalCount = metalFilteredLedger.filter(r => r.record_action === 'deleted').length;

  const filteredLedger = metalFilteredLedger.filter(rec => {
    // Deleted tab: show only deleted records
    if (statusFilter === 'deleted') return rec.record_action === 'deleted';
    // All other tabs: exclude deleted records
    if (rec.record_action === 'deleted') return false;
    if (statusFilter === 'pending' && rec.status !== 'OPEN') return false;
    if (statusFilter === 'completed' && rec.status !== 'CLOSED') return false;
    if (statusFilter === 'overdue' && !isRecordOverdue(rec)) return false;

    const term = searchTerm.toLowerCase().trim();
    const match =
      !term ||
      rec.customer_name?.toLowerCase().includes(term) ||
      rec.customer_surname?.toLowerCase().includes(term) ||
      rec.customer_phone?.includes(term) ||
      rec.customer_address?.toLowerCase().includes(term) ||
      rec.item_name?.toLowerCase().includes(term) ||
      String(rec.amount || '').includes(term) ||
      String(rec.monthly_interest || '').includes(term) ||
      String(rec.month_wise_interest || '').includes(term) ||
      String(rec.total_interest_till_today || '').includes(term) ||
      String(rec.item_total_value || '').includes(term) ||
      String(rec.loan_date || '').toLowerCase().includes(term) ||
      String(rec.timeline_months || '').includes(term) ||
      `${rec.timeline_months} mo`.toLowerCase().includes(term) ||
      `${rec.timeline_months} month`.toLowerCase().includes(term) ||
      `${rec.timeline_months} months`.toLowerCase().includes(term);
    const d = new Date(rec.loan_date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return match;
  });

  // ── KPI values computed live from metalFilteredLedger ──────────────────
  const kpiOpenLoans = metalFilteredLedger.filter(r => r.status === 'OPEN' && r.record_action !== 'deleted');
  const kpiClosedLoans = metalFilteredLedger.filter(r => r.status === 'CLOSED' && r.record_action !== 'deleted');
  const kpiTotalDebt = kpiOpenLoans.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const kpiTotalInterest = metalFilteredLedger
    .filter(r => r.record_action !== 'deleted')
    .reduce((acc, r) => {
      const interest = r.status === 'CLOSED'
        ? Number(r.final_consideration_interest_amount ?? r.total_interest_till_today ?? 0)
        : Number(r.month_wise_interest || 0);
      return acc + interest;
    }, 0);

  // ── Pagination derived ──────────────────────────────────────────────────
  const sortedFilteredLedger = [...filteredLedger].sort((a, b) => {
    return new Date(b.loan_date).getTime() - new Date(a.loan_date).getTime();
  });
  const totalPages = Math.max(1, Math.ceil(sortedFilteredLedger.length / pageSize));
  const paginatedLedger = sortedFilteredLedger.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ color: '#1e293b', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.15rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
            <i className="fa-solid fa-scale-balanced" style={{ color: '#6366f1', marginRight: '8px' }} />
            {t.financeScreenTitle}
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
            {t.financeScreenSub}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Custom From Date Calendar Selector */}
          <div style={{ position: 'relative' }} ref={startCalendarDropdownRef}>
            <div
              onClick={() => { setOpenStartCalendar(!openStartCalendar); setOpenEndCalendar(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                padding: '6px 14px',
                borderRadius: '12px',
                border: openStartCalendar ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                boxShadow: openStartCalendar ? '0 0 0 3px rgba(245, 158, 11, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
            >
              <i className="fa-solid fa-calendar-days" style={{ color: '#b45309', fontSize: '0.8rem' }} />
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{t.fromLabel}</span>
              <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }}>{startDate || 'Select'}</span>
              <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.68rem', color: '#64748b', transform: openStartCalendar ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: '4px' }} />
            </div>

            {openStartCalendar && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '280px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #f59e0b',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.16)',
                padding: '1rem',
                zIndex: 155,
              }}>
                {/* Month / Year Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setStartCalendarViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    style={{ background: '#fef3c7', border: 'none', color: '#b45309', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                  >
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.75rem' }} />
                  </button>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {startCalendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStartCalendarViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    style={{ background: '#fef3c7', border: 'none', color: '#b45309', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                  >
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                  </button>
                </div>

                {/* Day Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <span key={day} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{day}</span>
                  ))}
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {(() => {
                    const year = startCalendarViewDate.getFullYear();
                    const month = startCalendarViewDate.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const grid = [];

                    for (let i = 0; i < firstDay; i++) {
                      grid.push(<div key={`blank-${i}`} />);
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = startDate === dateStr;
                      const isToday = new Date().toISOString().split('T')[0] === dateStr;

                      grid.push(
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setStartDate(dateStr);
                            setOpenStartCalendar(false);
                          }}
                          style={{
                            height: '32px',
                            width: '100%',
                            borderRadius: '8px',
                            border: isToday && !isSelected ? '1px solid #f59e0b' : 'none',
                            background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : isToday ? '#fffbeb' : 'transparent',
                            color: isSelected ? '#ffffff' : isToday ? '#b45309' : '#1e293b',
                            fontWeight: isSelected || isToday ? 800 : 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fef3c7'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? '#fffbeb' : 'transparent'; }}
                        >
                          {day}
                        </button>
                      );
                    }
                    return grid;
                  })()}
                </div>

                {/* Footer Controls */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        setStartDate(todayStr);
                        setStartCalendarViewDate(new Date());
                        setOpenStartCalendar(false);
                      }}
                      style={{ padding: '4px 10px', background: '#fef3c7', border: 'none', borderRadius: '6px', fontSize: '0.72rem', color: '#b45309', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Set Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate('');
                        setOpenStartCalendar(false);
                      }}
                      style={{ padding: '4px 10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Selected: <strong>{startDate || 'None'}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Custom To Date Calendar Selector */}
          <div style={{ position: 'relative' }} ref={endCalendarDropdownRef}>
            <div
              onClick={() => { setOpenEndCalendar(!openEndCalendar); setOpenStartCalendar(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                padding: '6px 14px',
                borderRadius: '12px',
                border: openEndCalendar ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                boxShadow: openEndCalendar ? '0 0 0 3px rgba(245, 158, 11, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
            >
              <i className="fa-solid fa-calendar-days" style={{ color: '#b45309', fontSize: '0.8rem' }} />
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{t.toLabel}</span>
              <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }}>{endDate || 'Select'}</span>
              <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.68rem', color: '#64748b', transform: openEndCalendar ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: '4px' }} />
            </div>

            {openEndCalendar && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '280px',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #f59e0b',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.16)',
                padding: '1rem',
                zIndex: 155,
              }}>
                {/* Month / Year Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setEndCalendarViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    style={{ background: '#fef3c7', border: 'none', color: '#b45309', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                  >
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.75rem' }} />
                  </button>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {endCalendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEndCalendarViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    style={{ background: '#fef3c7', border: 'none', color: '#b45309', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                  >
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                  </button>
                </div>

                {/* Day Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <span key={day} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{day}</span>
                  ))}
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {(() => {
                    const year = endCalendarViewDate.getFullYear();
                    const month = endCalendarViewDate.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const grid = [];

                    for (let i = 0; i < firstDay; i++) {
                      grid.push(<div key={`blank-${i}`} />);
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = endDate === dateStr;
                      const isToday = new Date().toISOString().split('T')[0] === dateStr;

                      grid.push(
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setEndDate(dateStr);
                            setOpenEndCalendar(false);
                          }}
                          style={{
                            height: '32px',
                            width: '100%',
                            borderRadius: '8px',
                            border: isToday && !isSelected ? '1px solid #f59e0b' : 'none',
                            background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : isToday ? '#fffbeb' : 'transparent',
                            color: isSelected ? '#ffffff' : isToday ? '#b45309' : '#1e293b',
                            fontWeight: isSelected || isToday ? 800 : 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fef3c7'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? '#fffbeb' : 'transparent'; }}
                        >
                          {day}
                        </button>
                      );
                    }
                    return grid;
                  })()}
                </div>

                {/* Footer Controls */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        setEndDate(todayStr);
                        setEndCalendarViewDate(new Date());
                        setOpenEndCalendar(false);
                      }}
                      style={{ padding: '4px 10px', background: '#fef3c7', border: 'none', borderRadius: '6px', fontSize: '0.72rem', color: '#b45309', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Set Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEndDate('');
                        setOpenEndCalendar(false);
                      }}
                      style={{ padding: '4px 10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Selected: <strong>{endDate || 'None'}</strong></span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => { setEditingRecord(null); setShowModal(true); }}
            style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 14px rgba(180, 83, 9, 0.3)' }}
          >
            <i className="fa-solid fa-plus" /> {t.issueNewLoanBtn}
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <style>{`
        .finance-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 1024px) {
          .finance-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .finance-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      <div className="finance-kpi-grid">
        {[
          { label: t.totalDebtPrincipal, value: `₹${kpiTotalDebt.toLocaleString('en-IN')}`, sub: metalFilter === 'all' ? t.activeLoanCapital : `${t.activeLoanCapital} – ${metalFilter.toUpperCase()}`, icon: 'fa-briefcase', isGold: true },
          { label: t.interestAccrued, value: `₹${Math.round(kpiTotalInterest).toLocaleString('en-IN')}`, sub: metalFilter === 'all' ? t.livePerMonthInterest : `${t.livePerMonthInterest} – ${metalFilter.toUpperCase()}`, icon: 'fa-chart-line', isGold: true },
          { label: t.openLoanAccounts, value: String(kpiOpenLoans.length), sub: metalFilter === 'all' ? t.activeInterestMonthly : `${t.activeInterestMonthly} – ${metalFilter.toUpperCase()}`, icon: 'fa-key', isGold: false },
          { label: t.closedAccounts, value: String(kpiClosedLoans.length), sub: metalFilter === 'all' ? t.fullySettled : `${t.fullySettled} – ${metalFilter.toUpperCase()}`, icon: 'fa-circle-check', isGold: false },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: card.isGold ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderRadius: '12px',
              padding: '0.75rem 0.85rem',
              border: card.isGold ? '1px solid #d99b26' : '1px solid #94a3b8',
              boxShadow: card.isGold ? '0 4px 14px rgba(180,83,9,0.1)' : '0 4px 14px rgba(0,0,0,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: card.isGold ? '#78350f' : '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1, margin: '3px 0' }}>{card.value}</div>
              <span style={{ fontSize: '0.72rem', fontWeight: 400, color: card.isGold ? '#78350f' : '#64748b' }}>{card.sub}</span>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: card.isGold ? '#b45309' : '#475569',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                flexShrink: 0,
              }}
            >
              <i className={`fa-solid ${card.icon}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Loan Table ── */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e6decb', boxShadow: '0 6px 20px rgba(24,19,16,0.03)', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#181310', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-table-list" style={{ color: '#d97706' }} />
            {t.pledgeLoanLedgerTitle}
          </h3>

          {/* Search Loan Person Input Bar */}
          <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '320px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
            <input
              type="text"
              placeholder={t.searchFinancePlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 28px 6px 32px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                color: '#0f172a',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Status Filter Toggle Group */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '100%' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                color: statusFilter === 'all' ? '#4f46e5' : '#64748b',
                boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-layer-group" /> {t.allTab} ({metalFilteredLedger.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'pending' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                color: statusFilter === 'pending' ? '#ffffff' : '#64748b',
                boxShadow: statusFilter === 'pending' ? '0 2px 6px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-clock-rotate-left" /> {t.pendingTab} ({pendingMetalCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'completed' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: statusFilter === 'completed' ? '#ffffff' : '#64748b',
                boxShadow: statusFilter === 'completed' ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-circle-check" /> {t.completedTab} ({completedMetalCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('overdue')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'overdue' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
                color: statusFilter === 'overdue' ? '#ffffff' : '#64748b',
                boxShadow: statusFilter === 'overdue' ? '0 2px 6px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" /> {t.overdueTab} ({overdueMetalCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('deleted')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'deleted' ? 'linear-gradient(135deg, #6b7280 0%, #374151 100%)' : 'transparent',
                color: statusFilter === 'deleted' ? '#ffffff' : '#64748b',
                boxShadow: statusFilter === 'deleted' ? '0 2px 6px rgba(55, 65, 81, 0.35)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-trash" /> {t.deletedTab} ({deletedMetalCount})
            </button>
          </div>

          {/* Gold & Silver Metal Filter Toggle Bar */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#f8fafc', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '100%', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setMetalFilter('all')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '4px 12px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: metalFilter === 'all' ? 'linear-gradient(135deg, #475569 0%, #334155 100%)' : 'transparent',
                color: metalFilter === 'all' ? '#ffffff' : '#64748b',
                boxShadow: metalFilter === 'all' ? '0 2px 4px rgba(51, 65, 85, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-border-all" /> {t.allMetals} ({ledger.length})
            </button>

            <button
              type="button"
              onClick={() => setMetalFilter('gold')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '4px 12px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: metalFilter === 'gold' ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : 'transparent',
                color: metalFilter === 'gold' ? '#ffffff' : '#b45309',
                boxShadow: metalFilter === 'gold' ? '0 2px 4px rgba(217, 119, 6, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-coins" /> {t.goldCategory} ({ledger.filter(r => r.item_metal_type?.toLowerCase() === 'gold' && r.item_name?.toLowerCase() !== 'cash').length})
            </button>

            <button
              type="button"
              onClick={() => setMetalFilter('silver')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '4px 12px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: metalFilter === 'silver' ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'transparent',
                color: metalFilter === 'silver' ? '#ffffff' : '#64748b',
                boxShadow: metalFilter === 'silver' ? '0 2px 4px rgba(100, 116, 139, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-gem" /> {t.silverCategory} ({ledger.filter(r => r.item_metal_type?.toLowerCase() === 'silver' && r.item_name?.toLowerCase() !== 'cash').length})
            </button>

            <button
              type="button"
              onClick={() => setMetalFilter('cash')}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '4px 12px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: metalFilter === 'cash' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: metalFilter === 'cash' ? '#ffffff' : '#059669',
                boxShadow: metalFilter === 'cash' ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-money-bill-wave" /> {t.cashCategory} ({ledger.filter(r => r.item_metal_type?.toLowerCase() === 'cash' || r.item_name?.toLowerCase() === 'cash').length})
            </button>
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '8px' }} />
            <p>Loading records...</p>
          </div>
        ) : (
          <>
            {/* Pagination controls top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {t.showingRecords} <strong>{filteredLedger.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>–<strong>{Math.min(currentPage * pageSize, filteredLedger.length)}</strong> {t.ofRecords} <strong>{filteredLedger.length}</strong> {t.recordsLabel}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{t.rowsPerPage}</label>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ border: '1px solid #cbd5e1', borderRadius: '7px', padding: '3px 8px', fontSize: '0.78rem', color: '#0f172a', background: '#ffffff', cursor: 'pointer', outline: 'none' }}
                >
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eaecf0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '10px 12px' }}>{t.snCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.loanDateCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.customerCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.itemCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.debtAmountCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.timelineCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.monthlyRateCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.totalAmountCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.itemValueCol}</th>
                <th style={{ padding: '10px 12px' }}>{t.statusHeader}</th>
                <th style={{ padding: '10px 12px' }}>{t.actionsCol}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No loan records found.</td></tr>
              ) : paginatedLedger.map((rec, index) => {
                const isCashLoan = rec.item_metal_type?.toLowerCase() === 'cash' || rec.item_name?.toLowerCase() === 'cash';
                const recDeductionWt = Number(rec.item_deduction_weight_grams ?? rec.item_deduction_weight ?? 0);
                const recPureWt = Math.max(0, (Number(rec.item_weight_grams || 0) - recDeductionWt) * (Number(rec.item_purity_percent || 100) / 100));
                const currentBuyRate = rec.item_metal_type?.toLowerCase() === 'silver' ? (metalRates.silver_rate_per_gram || 250) : (metalRates.gold_rate_per_gram || 15000);
                const liveMarketVal = isCashLoan ? 0 : Math.round(recPureWt * currentBuyRate);
                const openTotalAmount = Number(rec.amount || 0) + Number(rec.month_wise_interest || 0);
                const isExceeded = !isCashLoan && liveMarketVal > 0 && openTotalAmount > liveMarketVal;

                return (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#6366f1', fontSize: '0.78rem' }}>{index + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '0.62rem', color: '#0f172a' }}>
                      {rec.loan_date}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.customer_name} {rec.customer_surname}</div>
                      <small style={{ color: '#64748b', display: 'block' }}>{rec.customer_phone}</small>
                      {rec.customer_address && <small style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}><i className="fa-solid fa-location-dot" style={{ color: '#ef4444', marginRight: '3px' }} /> {rec.customer_address}</small>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {rec.item_image_url && (
                          <img
                            src={rec.item_image_url}
                            alt={rec.item_name}
                            onClick={() => setSelectedLedgerImage({
                              url: rec.item_image_url!,
                              title: rec.item_name,
                              subtitle: `${rec.item_weight_grams}g · ${rec.item_purity_percent}% · ${rec.item_metal_type.toUpperCase()} · ${rec.customer_name} ${rec.customer_surname}`,
                            })}
                            title="Click to view full-size photo"
                            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.item_name}</div>
                          {!isCashLoan && (
                            <small style={{ color: '#64748b' }}>
                              {rec.item_weight_grams}g {recDeductionWt > 0 ? `(Ded: ${recDeductionWt}g)` : ''} · {rec.item_purity_percent}% · {rec.item_metal_type}
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b45309' }}>₹{Number(rec.amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{rec.timeline_months} mo</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ color: '#4f46e5', fontWeight: 600, marginTop: '2px' }}>
                        {rec.interest_rate_percent}%
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.68rem', color: '#10b981' }}>
                        ( ₹{Number(rec.monthly_interest).toLocaleString('en-IN')})
                      </div>
                    </td>
                    {statusFilter === 'completed' ? (
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669' }}>
                        ₹{Number(Number(rec.amount) + Number(rec.final_consideration_interest_amount ?? rec.total_interest_till_today ?? 0)).toLocaleString('en-IN')}
                        <i className="fa-solid fa-circle-check" style={{ color: '#059669', marginLeft: '5px', fontSize: '0.85rem' }} title="Final Considered Settlement Total" />
                        <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 600, marginTop: '2px' }}>
                          (₹{Number(rec.final_consideration_interest_amount ?? rec.total_interest_till_today ?? 0).toLocaleString('en-IN')} interest)
                        </div>
                      </td>
                    ) : (
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: (rec.status === 'CLOSED' && rec.considered_type === 'Month-Wise Interest') ? '#059669' : rec.status === 'CLOSED' ? '#64748b' : '#4f46e5' }}>
                        {rec.status === 'CLOSED' ? (
                          rec.considered_type === 'Month-Wise Interest' ? (
                            <>
                              ₹{Number(Number(rec.amount) + Number(rec.final_consideration_interest_amount ?? rec.month_wise_interest ?? 0)).toLocaleString('en-IN')}
                              <i className="fa-solid fa-circle-check" style={{ color: '#059669', marginLeft: '5px', fontSize: '0.85rem' }} title="Settled Total Amount" />
                              <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 600, marginTop: '2px' }}>
                                (₹{Number(rec.final_consideration_interest_amount ?? rec.month_wise_interest ?? 0).toLocaleString('en-IN')} interest) · Settled ({rec.closing_date})
                              </div>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>-</span>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Account Closed</div>
                            </>
                          )
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              <span>₹{openTotalAmount.toLocaleString('en-IN')}</span>
                              {isExceeded && (
                                <span style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }} title={`Total amount ₹${openTotalAmount.toLocaleString('en-IN')} exceeds live market value ₹${liveMarketVal.toLocaleString('en-IN')}`}>
                                  <i className="fa-solid fa-triangle-exclamation" /> Exceeded
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600, marginTop: '2px' }}>
                              (₹{(rec.month_wise_interest || 0).toLocaleString('en-IN')} interest) · {rec.month_wise_count || 1} Month{(rec.month_wise_count || 1) > 1 ? 's' : ''}
                            </div>
                          </>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '10px 12px' }}>
                      {isCashLoan ? (
                        <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.82rem', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-money-bill-wave" /> Cash
                        </span>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            ₹{Number(rec.item_total_value).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }} title="Daily Live Current Market Value based on today's metal rate">
                            <i className="fa-solid fa-chart-line" style={{ fontSize: '0.65rem' }} />
                            <span>₹{liveMarketVal.toLocaleString('en-IN')}</span>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 400 }}>(Live Market)</span>
                          </div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {rec.status?.toUpperCase() === 'OPEN' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmCompleteRecord(rec);
                            }}
                            title="Click to complete/settle this loan"
                            style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)', transition: 'all 0.2s' }}
                          >
                            <i className="fa-solid fa-clock-rotate-left" /> Pending
                          </button>
                          {isRecordOverdue(rec) && (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.66rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <i className="fa-solid fa-triangle-exclamation" /> Overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, background: '#d1fae5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-circle-check" /> Completed
                          </span>
                          {rec.closing_date && (
                            <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 700, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <i className="fa-solid fa-calendar-check" style={{ fontSize: '0.65rem' }} />
                              {rec.closing_date}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    {/* ── Actions Column ── */}
                    <td style={{ padding: '10px 12px' }}>
                      {statusFilter === 'deleted' ? (
                        <button
                          type="button"
                          onClick={() => handleRecordAction(rec.id, null)}
                          disabled={actionUpdating === rec.id}
                          title="Undo delete — restore this record"
                          style={{ padding: '5px 12px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#ffffff', border: 'none', borderRadius: '7px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)', opacity: actionUpdating === rec.id ? 0.6 : 1 }}
                        >
                          {actionUpdating === rec.id ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-rotate-left" />} Undo
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            type="button"
                            onClick={() => handleEditRecord(rec)}
                            title="Edit this loan record"
                            style={{ width: '30px', height: '30px', border: '1px solid #c7d2fe', borderRadius: '7px', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#ffffff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.color = '#4f46e5'; }}
                          >
                            <i className="fa-solid fa-pen-to-square" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmRecord(rec)}
                            title="Delete this loan record"
                            style={{ width: '30px', height: '30px', border: '1px solid #fecaca', borderRadius: '7px', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </div>
          {/* Pagination Footer */}
          {filteredLedger.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: currentPage === 1 ? '#f8fafc' : '#ffffff', color: currentPage === 1 ? '#cbd5e1' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>«</button>
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: currentPage === 1 ? '#f8fafc' : '#ffffff', color: currentPage === 1 ? '#cbd5e1' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>‹ Prev</button>
                <span style={{ fontSize: '0.75rem', color: '#64748b', padding: '4px 10px' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: currentPage === totalPages ? '#f8fafc' : '#ffffff', color: currentPage === totalPages ? '#cbd5e1' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Next ›</button>
                <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '7px', background: currentPage === totalPages ? '#f8fafc' : '#ffffff', color: currentPage === totalPages ? '#cbd5e1' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>»</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* ── Issue / Edit Loan Modal Component ── */}
      <IssueNewLoanModal
        isOpen={showModal}
        editingRecord={editingRecord}
        metalRates={metalRates}
        lang={lang}
        onClose={handleCloseModal}
        onSaveSuccess={() => {
          handleCloseModal();
          fetchData();
        }}
      />

      {/* ── Delete Confirmation Dialog Component ── */}
      <DeleteConfirmDialog
        isOpen={deleteConfirmRecord !== null}
        record={deleteConfirmRecord}
        lang={lang}
        onClose={() => setDeleteConfirmRecord(null)}
        onConfirm={async () => {
          if (deleteConfirmRecord) {
            await handleRecordAction(deleteConfirmRecord.id, 'deleted');
            setDeleteConfirmRecord(null);
          }
        }}
        submitting={actionUpdating !== null}
      />

      {/* ── Settlement Confirmation Dialog Component ── */}
      <SettlementDialog
        isOpen={confirmCompleteRecord !== null}
        record={confirmCompleteRecord}
        lang={lang}
        onClose={() => setConfirmCompleteRecord(null)}
        onConfirm={async (finalInterest) => {
          if (confirmCompleteRecord) {
            await handleCompleteLoan(confirmCompleteRecord, finalInterest);
          }
        }}
        submitting={completingLoan}
      />

      {/* ── High-Resolution Item Photo Lightbox Modal Dialog ── */}
      {selectedLedgerImage && (
        <div
          onClick={() => setSelectedLedgerImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '24px', padding: '1.25rem', maxWidth: '580px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', position: 'relative', border: '1px solid #cbd5e1', textAlign: 'center' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: 800, textAlign: 'left' }}>
                  <i className="fa-solid fa-gem" style={{ color: '#d97706', marginRight: '6px' }} />
                  {selectedLedgerImage.title}
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'left', marginTop: '2px' }}>
                  {selectedLedgerImage.subtitle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerImage(null)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', transition: 'all 0.2s' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* High-Resolution Photo Display */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', maxHeight: '440px' }}>
              <img
                src={selectedLedgerImage.url}
                alt={selectedLedgerImage.title}
                style={{ maxWidth: '100%', maxHeight: '440px', objectFit: 'contain', width: 'auto', height: 'auto' }}
              />
            </div>

            {/* Modal Action Footer */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}><i className="fa-solid fa-shield-halved" /> Pledged Item Verification Photo</span>
              <button
                type="button"
                onClick={() => setSelectedLedgerImage(null)}
                style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;
