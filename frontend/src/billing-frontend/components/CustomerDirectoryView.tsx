import React, { useState, useEffect } from 'react';
import type { CustomerDirectoryRecord, GlobalRates } from '../types';
import { SeeBillModal } from './SeeBillModal';
import { CustomCalendarPicker } from './CustomCalendarPicker';

interface CustomerDirectoryViewProps {
  customers: CustomerDirectoryRecord[];
  rates: GlobalRates | null;
  formatDate: (date?: string) => string;
  onBackToPOS?: () => void;
  onSelectCustomerForBill: (name: string, phone: string) => void;
  onEditCustomerRecord?: (cust: CustomerDirectoryRecord) => void;
}

export const CustomerDirectoryView: React.FC<CustomerDirectoryViewProps> = ({
  customers,
  rates,
  formatDate,
  onSelectCustomerForBill,
  onEditCustomerRecord,
}) => {
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

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDirectoryRecord | null>(null);
  const [openCalendarTarget, setOpenCalendarTarget] = useState<'FROM' | 'TO' | null>(null);

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

    return true;
  });

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)', marginBottom: '1.25rem' }}>
      {/* Top Header Row: Headline on Left, Search Bar on Right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-address-book" style={{ color: '#0284c7' }}></i> Customer Directory &amp; Purchase History ({filtered.length})
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', width: '280px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8' }}></i>
          <input
            type="text"
            placeholder="Search customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.82rem', color: '#0f172a' }}
          />
        </div>
      </div>

      {/* Date Range Selection Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
          <i className="fa-solid fa-calendar-days" style={{ color: '#6366f1' }}></i>
          <span>Filter Date Range:</span>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>From:</span>
          <button
            type="button"
            onClick={() => setOpenCalendarTarget(openCalendarTarget === 'FROM' ? null : 'FROM')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: startDate ? '#0f172a' : '#94a3b8',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-regular fa-calendar" style={{ color: '#d97706' }}></i>
            {startDate || 'YYYY-MM-DD'}
          </button>
          {openCalendarTarget === 'FROM' && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999 }}>
              <CustomCalendarPicker
                selectedDate={startDate}
                onSelectDate={(d) => setStartDate(d)}
                onClose={() => setOpenCalendarTarget(null)}
              />
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
          <button
            type="button"
            onClick={() => setOpenCalendarTarget(openCalendarTarget === 'TO' ? null : 'TO')}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: endDate ? '#0f172a' : '#94a3b8',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-regular fa-calendar" style={{ color: '#d97706' }}></i>
            {endDate || 'YYYY-MM-DD'}
          </button>
          {openCalendarTarget === 'TO' && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 9999 }}>
              <CustomCalendarPicker
                selectedDate={endDate}
                onSelectDate={(d) => setEndDate(d)}
                onClose={() => setOpenCalendarTarget(null)}
              />
            </div>
          )}
        </div>

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={handleClearDates}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#dc2626',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-solid fa-xmark"></i> Clear Filter
          </button>
        )}
      </div>
      {/* 3 Interactive History Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setHistoryTab('ALL')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'ALL' ? '1px solid #0f172a' : '1px solid #cbd5e1',
            background: historyTab === 'ALL' ? '#0f172a' : '#f8fafc',
            color: historyTab === 'ALL' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'ALL' ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
          }}
        >
          <i className="fa-solid fa-list-ul"></i> All History
        </button>

        <button
          onClick={() => setHistoryTab('SELL')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'SELL' ? '1px solid #b45309' : '1px solid #fde68a',
            background: historyTab === 'SELL' ? '#b45309' : '#fef3c7',
            color: historyTab === 'SELL' ? '#ffffff' : '#92400e',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'SELL' ? '0 4px 12px rgba(180, 83, 9, 0.25)' : 'none',
          }}
        >
          <i className="fa-solid fa-cart-shopping"></i> Sell History
        </button>

        <button
          onClick={() => setHistoryTab('BUY')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'BUY' ? '1px solid #0369a1' : '1px solid #bae6fd',
            background: historyTab === 'BUY' ? '#0369a1' : '#e0f2fe',
            color: historyTab === 'BUY' ? '#ffffff' : '#075985',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'BUY' ? '0 4px 12px rgba(3, 105, 161, 0.25)' : 'none',
          }}
        >
          <i className="fa-solid fa-hand-holding-dollar"></i> Buy History
        </button>

        <button
          onClick={() => setHistoryTab('EXCHANGE')}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            border: historyTab === 'EXCHANGE' ? '1px solid #6d28d9' : '1px solid #e9d5ff',
            background: historyTab === 'EXCHANGE' ? '#6d28d9' : '#f3e8ff',
            color: historyTab === 'EXCHANGE' ? '#ffffff' : '#5b21b6',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: historyTab === 'EXCHANGE' ? '0 4px 12px rgba(109, 40, 217, 0.25)' : 'none',
          }}
        >
          <i className="fa-solid fa-right-left"></i> Exchange History
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '0.7rem' }}>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>S.NO.</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>MODE</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>EDIT</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>CUSTOMER NAME</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>PHONE NUMBER</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>ADDRESS</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>PRODUCT NAME</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>PRODUCT WEIGHT</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>TOTAL SPENT (₹)</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>LAST TRANSACTION</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>SEE BILL</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fa-solid fa-user-slash" style={{ fontSize: '1.3rem', marginBottom: '6px', display: 'block' }}></i>
                  No customer records found in {historyTab} history.
                </td>
              </tr>
            ) : (
              filtered.map((cust, idx) => {
                const mode = getCustomerMode(cust);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          background: mode === 'SELL' ? '#fef3c7' : mode === 'BUY' ? '#e0f2fe' : '#f3e8ff',
                          color: mode === 'SELL' ? '#b45309' : mode === 'BUY' ? '#0369a1' : '#6d28d9',
                          border: mode === 'SELL' ? '1px solid #fde68a' : mode === 'BUY' ? '1px solid #bae6fd' : '1px solid #e9d5ff',
                        }}
                      >
                        {mode}
                      </span>
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          if (onEditCustomerRecord) {
                            onEditCustomerRecord(cust);
                          } else {
                            onSelectCustomerForBill(cust.name, cust.phone);
                          }
                        }}
                        title="Edit Record in POS Terminal"
                        style={{
                          padding: '5px 8px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>
                      {cust.name}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#475569', textAlign: 'center' }}>
                      {cust.phone}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#475569', textAlign: 'left' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: '#ef4444', marginRight: '5px' }}></i> {cust.address || cust.latestInvoice?.customer_address || cust.latestInvoice?.receipt_json_data?.customer_address || 'N/A'}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#0f172a', fontWeight: 600, textAlign: 'center' }}>
                      {cust.products.join(', ')}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#b45309', fontWeight: 700, textAlign: 'center' }}>
                      {cust.totalWeight.toFixed(3)} g
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#15803d', fontWeight: 800, textAlign: 'center' }}>
                      ₹{cust.totalSpent.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#64748b', fontSize: '0.72rem', textAlign: 'center' }}>
                      {formatDate(cust.lastDate)}
                    </td>

                    {/* SEE BILL POPUP ACTION */}
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        style={{
                          padding: '4px 8px',
                          background: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="fa-solid fa-eye"></i> See Bill
                      </button>
                    </td>

                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                      <button
                        onClick={() => onSelectCustomerForBill(cust.name, cust.phone)}
                        title="Create New Bill"
                        style={{
                          padding: '5px 8px',
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="fa-solid fa-cart-plus"></i> New Bill
                      </button>
                    </td>
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
