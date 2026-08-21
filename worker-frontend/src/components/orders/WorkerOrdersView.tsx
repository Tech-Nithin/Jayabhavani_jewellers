import React, { useState, useEffect } from 'react';
import { WorkerProfile } from '../../types/worker';
import { fetchWorkerAssignedOrders } from '../../services/workerApi';

interface Props {
  worker: WorkerProfile;
  onBack: () => void;
  onPreviewImage: (url: string) => void;
}

export const WorkerOrdersView: React.FC<Props> = ({ worker, onBack, onPreviewImage }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = () => {
    setLoading(true);
    fetchWorkerAssignedOrders(worker.id)
      .then((data) => {
        setOrders(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [worker.id]);

  const filteredOrders = orders.filter((ord) => {
    const isCompleted = ord.returned_from_worker === 'yes' || ord.status === 'COMPLETED';
    if (filterTab === 'PENDING' && isCompleted) return false;
    if (filterTab === 'COMPLETED' && !isCompleted) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = (ord.id || '').toLowerCase().includes(q);
      const matchCust = (ord.customer_name || '').toLowerCase().includes(q);
      const matchItem = (ord.item_name || '').toLowerCase().includes(q);
      return matchId || matchCust || matchItem;
    }
    return true;
  });

  const pendingCount = orders.filter((o) => o.returned_from_worker !== 'yes' && o.status !== 'COMPLETED').length;
  const completedCount = orders.filter((o) => o.returned_from_worker === 'yes' || o.status === 'COMPLETED').length;

  // Helper to calculate days based on calendar date changing (IST midnight boundary)
  const getOrderDaysSummary = (ord: any) => {
    const isCompleted = ord.returned_from_worker === 'yes' || ord.status === 'COMPLETED';
    const assignedDateStr = ord.assigned_at || ord.created_at || ord.order_date;

    if (!assignedDateStr) {
      return isCompleted ? 'Completed' : 'Pending in progress';
    }

    const assigned = new Date(assignedDateStr);
    const assignedCal = new Date(assigned.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    assignedCal.setHours(0, 0, 0, 0);

    if (isCompleted) {
      const returnedDateStr = ord.returned_at || ord.updated_at || new Date().toISOString();
      const returned = new Date(returnedDateStr);
      const returnedCal = new Date(returned.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      returnedCal.setHours(0, 0, 0, 0);

      const diffMs = returnedCal.getTime() - assignedCal.getTime();
      const totalDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      if (totalDays === 0) {
        return 'Completed on the same day (0 days)';
      }
      return `Completed in ${totalDays} day${totalDays > 1 ? 's' : ''}`;
    }

    // Pending Order (from assigned_at to today)
    const now = new Date();
    const nowCal = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    nowCal.setHours(0, 0, 0, 0);

    const diffMs = nowCal.getTime() - assignedCal.getTime();
    const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) {
      return '0 days happened (Today)';
    }
    return `${diffDays} days happened`;
  };

  const formatAssignedDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).formatToParts(d);

      let day = '', month = '', year = '', hour = '', minute = '', dayPeriod = '';
      for (const p of parts) {
        if (p.type === 'day') day = p.value;
        if (p.type === 'month') month = p.value;
        if (p.type === 'year') year = p.value;
        if (p.type === 'hour') hour = p.value;
        if (p.type === 'minute') minute = p.value;
        if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
      }

      return `${day}-${month}-${year} ${hour}:${minute} ${dayPeriod}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden', fontSize: '0.74rem' }}>
      {/* Top Header Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)',
          color: '#ffffff',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>📦 My Assigned Orders</h2>
            <p style={{ margin: 0, fontSize: '0.60rem', color: '#a7f3d0' }}>
              {pendingCount} Pending Work Orders · {completedCount} Completed
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          title="Refresh orders from database"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#ffffff',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ background: '#ffffff', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <i
            className="fa-solid fa-magnifying-glass"
            style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.68rem' }}
          />
          <input
            type="text"
            placeholder="Search by order ID, customer or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px 5px 26px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.72rem',
              outline: 'none',
              background: '#f8fafc',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.70rem' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setFilterTab('PENDING')}
            style={{
              padding: '5px 2px',
              fontSize: '0.68rem',
              fontWeight: 800,
              borderRadius: '6px',
              border: filterTab === 'PENDING' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
              background: filterTab === 'PENDING' ? '#fef3c7' : '#ffffff',
              color: filterTab === 'PENDING' ? '#92400e' : '#475569',
              cursor: 'pointer',
            }}
          >
            Pending ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('COMPLETED')}
            style={{
              padding: '5px 2px',
              fontSize: '0.68rem',
              fontWeight: 800,
              borderRadius: '6px',
              border: filterTab === 'COMPLETED' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
              background: filterTab === 'COMPLETED' ? '#dcfce7' : '#ffffff',
              color: filterTab === 'COMPLETED' ? '#15803d' : '#475569',
              cursor: 'pointer',
            }}
          >
            Done ({completedCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            style={{
              padding: '5px 2px',
              fontSize: '0.68rem',
              fontWeight: 800,
              borderRadius: '6px',
              border: filterTab === 'ALL' ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              background: filterTab === 'ALL' ? '#eff6ff' : '#ffffff',
              color: filterTab === 'ALL' ? '#1d4ed8' : '#475569',
              cursor: 'pointer',
            }}
          >
            All ({orders.length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: '0.75rem' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.2rem', color: '#075e54', marginBottom: '6px' }} />
            <div>Loading assigned orders...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 12px', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📋</div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem' }}>No orders found</div>
            <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
              {filterTab === 'PENDING' ? 'No pending orders waiting for return.' : 'No orders matched your filter.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredOrders.map((ord) => {
              const isReturned = ord.returned_from_worker === 'yes' || ord.status === 'COMPLETED';
              const metalType = (ord.metal_type || 'GOLD').toUpperCase() === 'GOLD' ? 'Gold' : 'Silver';
              const grossWt = Number(ord.gross_weight_grams || 0);
              const touch = Number(ord.touch_percentage || 100);
              const pureWt = (grossWt * touch) / 100;
              const daysSummary = getOrderDaysSummary(ord);
              const assignedDate = formatAssignedDate(ord.assigned_at || ord.created_at || ord.order_date);
              const returnedDate = ord.returned_at ? formatAssignedDate(ord.returned_at) : null;

              return (
                <div
                  key={ord.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '10px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    lineHeight: '1.45',
                  }}
                >
                  {/* 1. Order id */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Order id : </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.76rem' }}>{ord.id}</strong>
                    </div>
                    <span
                      style={{
                        fontSize: '0.56rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isReturned ? '#dcfce7' : '#fef3c7',
                        color: isReturned ? '#15803d' : '#b45309',
                        border: isReturned ? '1px solid #bbf7d0' : '1px solid #fde68a',
                      }}
                    >
                      {isReturned ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  {/* 2. Customer */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Customer : </span>
                    <strong style={{ color: '#0f172a' }}>{ord.customer_name || 'N/A'}</strong>
                  </div>

                  {/* 3. Metal/cash */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Metal/cash : </span>
                    <strong style={{ color: metalType === 'Gold' ? '#b45309' : '#475569' }}>{metalType}</strong>
                  </div>

                  {/* 4. Item name */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Item name : </span>
                    <strong style={{ color: '#0f172a' }}>{ord.item_name || 'N/A'}</strong>
                  </div>

                  {/* 5. Status */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Status : </span>
                    <span style={{ fontWeight: 700, color: isReturned ? '#15803d' : '#d97706' }}>
                      {isReturned ? 'Completed / Returned' : 'Pending'}
                    </span>
                  </div>

                  {/* 6. Weight */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Weight : </span>
                    <strong style={{ color: '#0f172a' }}>{grossWt.toFixed(3)}gm</strong>
                  </div>

                  {/* 7. Touch */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Ornamet Tounch Need : </span>
                    <strong style={{ color: '#d97706' }}>{touch}</strong>
                  </div>

                  {/* 8. Pure weight */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Pure weight : </span>
                    <strong style={{ color: '#15803d' }}>{pureWt.toFixed(3)}gm</strong>
                  </div>

                  {/* 9. Work assigned at */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Work assigned at : </span>
                    <strong style={{ color: '#0f172a' }}>{assignedDate}</strong>
                  </div>

                  {/* 10. Returned at */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Returned at : </span>
                    <strong style={{ color: isReturned ? '#15803d' : '#64748b' }}>
                      {returnedDate || '-'}
                    </strong>
                  </div>

                  {/* 11. Total days taken / Pending days */}
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>
                      {isReturned ? 'Total days taken : ' : 'Pending days : '}
                    </span>
                    <span style={{ color: isReturned ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                      {daysSummary}
                    </span>
                  </div>

                  {/* 11. Notes */}
                  {ord.notes ? (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Notes : </span>
                      <span style={{ color: '#334155', fontStyle: 'italic' }}>{ord.notes}</span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Notes : </span>
                      <span style={{ color: '#94a3b8' }}>-</span>
                    </div>
                  )}

                  {/* 12. Image */}
                  {ord.image_url ? (
                    <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Image : </span>
                      <button
                        type="button"
                        onClick={() => onPreviewImage(ord.image_url)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          color: '#2563eb',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="fa-solid fa-image" /> View Photo
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
