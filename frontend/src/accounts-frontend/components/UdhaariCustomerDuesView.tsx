import React, { useState, useMemo } from 'react';

interface UdhaariCustomerDuesViewProps {
  logBookTimeline: any[];
  onSelectBill: (item: any) => void;
  selectedDate?: string;
  formatISTDateTime: (isoString?: string, fallbackTime?: string, billDateStr?: string) => string;
}

export const UdhaariCustomerDuesView: React.FC<UdhaariCustomerDuesViewProps> = ({
  logBookTimeline = [],
  onSelectBill,
  formatISTDateTime,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PARTIAL' | 'UNPAID'>('ALL');

  const allSortedDues = useMemo(() => {
    return logBookTimeline
      .filter((item: any) => {
        const itemType = (item.type || '').toUpperCase();
        if (itemType === 'SETTLEMENT' || itemType === 'INVENTORY' || itemType === 'WORKER TX' || itemType === 'WORK ASSIGN' || itemType === 'CASH_REGISTER') {
          return false;
        }
        const activeDue = Number(item.current_due ?? item.latest_due_amount ?? item.raw_invoice?.due_amount ?? item.due_amount ?? 0);
        return activeDue > 0.01;
      })
      .sort((a: any, b: any) => {
        const timeA = new Date(a.bill_date || a.raw_invoice?.bill_date || a.created_at || a.date || 0).getTime();
        const timeB = new Date(b.bill_date || b.raw_invoice?.bill_date || b.created_at || b.date || 0).getTime();
        return timeB - timeA;
      })
      .map((item: any, idx: number) => {
        const activeDue = Number(item.current_due ?? item.latest_due_amount ?? item.raw_invoice?.due_amount ?? item.due_amount ?? 0);
        const totalPaid = Number(item.current_paid ?? item.latest_paid_amount ?? item.raw_invoice?.paid_amount ?? item.paid_amount ?? 0);
        const billVal = Number(item.amount || (totalPaid + activeDue));
        return {
          ...item,
          due_amount: activeDue,
          paid_amount: totalPaid,
          total_bill: billVal,
          originalSNo: idx + 1,
        };
      });
  }, [logBookTimeline]);

  // Filter customer dues list
  const customerDuesList = useMemo(() => {
    return allSortedDues.filter((item: any) => {
      const title = (item.title || item.raw_invoice?.customer_name || '').toLowerCase();
      const details = (item.details || item.raw_invoice?.customer_phone || '').toLowerCase();
      const id = String(item.id || item.raw_invoice?.invoice_number || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || title.includes(query) || details.includes(query) || id.includes(query);

      if (!matchesSearch) return false;

      const paid = Number(item.paid_amount || 0);
      if (statusFilter === 'PARTIAL') return paid > 0;
      if (statusFilter === 'UNPAID') return paid === 0;

      return true;
    });
  }, [allSortedDues, searchTerm, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalDue = 0;
    let totalBillVal = 0;
    let totalPaid = 0;
    const customerSet = new Set<string>();

    customerDuesList.forEach((item: any) => {
      const due = Number(item.due_amount || 0);
      const paid = Number(item.paid_amount || 0);
      const billVal = Number(item.total_bill || (paid + due));

      totalDue += due;
      totalPaid += paid;
      totalBillVal += billVal;

      const custKey = item.title || item.raw_invoice?.customer_name || 'Guest Customer';
      customerSet.add(custKey);
    });

    return {
      totalDue,
      totalBillVal,
      totalPaid,
      customerCount: customerSet.size,
      totalDueRecords: customerDuesList.length,
    };
  }, [customerDuesList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* KPI Cards Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#dc2626' }}></i>
            Total Pending Customer Dues
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
            ₹{metrics.totalDue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#b91c1c', fontWeight: 700, marginTop: '2px' }}>
            Across {metrics.totalDueRecords} Purchase Invoice Records
          </div>
        </div>

        <div style={{ background: '#fffbe6', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-users" style={{ color: '#d97706' }}></i>
            Customers With Dues
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
            {metrics.customerCount} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Customers</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#854d0e', fontWeight: 700, marginTop: '2px' }}>
            Pending Payment Collections
          </div>
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
            Paid Amount Collected
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
            ₹{metrics.totalPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
            Initial & Partial Collections Made
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-receipt" style={{ color: '#0284c7' }}></i>
            Total Bill Value
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            ₹{metrics.totalBillVal.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
            Gross Purchase Value
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        {/* Table Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-clipboard-list" style={{ color: '#dc2626' }}></i>
            Customer Purchase Dues & Udhaari Register ({metrics.totalDueRecords} Records)
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Customer Name or Bill #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '6px 12px 6px 30px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  outline: 'none',
                  width: '220px',
                }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.72rem' }}></i>
            </div>

            {/* Status Filter Buttons */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              {(['ALL', 'PARTIAL', 'UNPAID'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStatusFilter(mode)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: statusFilter === mode ? '#ffffff' : 'transparent',
                    color: statusFilter === mode ? '#0f172a' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    boxShadow: statusFilter === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {mode === 'ALL' ? 'All Dues' : mode === 'PARTIAL' ? 'Partial Paid' : 'Unpaid'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dues Table */}
        {customerDuesList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '2rem', color: '#16a34a', marginBottom: '8px', display: 'block' }}></i>
            No pending customer dues found for the selected filter!
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <table className="table-responsive-font" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 800 }}>S.No</th>
                  <th style={{ padding: '12px 10px', fontWeight: 800 }}>Date & Time (IST)</th>
                  <th style={{ padding: '12px 10px', fontWeight: 800 }}>Name</th>
                  <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'right', color: '#15803d' }}>Paid (₹)</th>
                  <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'right', color: '#dc2626' }}>Due (₹)</th>
                  <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 10px', fontWeight: 800, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customerDuesList.map((item: any, idx: number) => {
                  const due = Number(item.due_amount || 0);
                  const paid = Number(item.paid_amount || 0);
                  const totalBill = Number(item.total_bill || (paid + due));
                  const isPartial = paid > 0;

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                      }}
                    >
                      <td style={{ padding: '10px', fontWeight: 800, color: '#64748b' }}>#{item.originalSNo || idx + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>
                        {formatISTDateTime(item.created_at, item.time, item.bill_date || item.raw_invoice?.bill_date)}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.title || 'Guest Customer'}</div>
                        <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                          {item.details ? ` ${item.details}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
                        {paid > 0 ? `₹${paid.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#dc2626', whiteSpace: 'nowrap' }}>
                        ₹{due.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        ₹{totalBill.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            color: isPartial ? '#b45309' : '#b91c1c',
                            background: isPartial ? '#fffbe6' : '#fef2f2',
                            border: isPartial ? '1px solid #fde68a' : '1px solid #fecaca',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isPartial ? 'PARTIAL PAID' : 'UNPAID DUE'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onSelectBill(item)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #4f46e5',
                            background: '#eeeffe',
                            color: '#4f46e5',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          View Bill & Settle ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
