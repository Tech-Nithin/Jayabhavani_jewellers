import React, { useState } from 'react';
import type { OrderItem } from '../types';
import { translations, type Language } from '../../utils/translations';
import { getOrdersTranslation } from '../ordersTranslations';
import { FullImagePreviewModal } from '../../inventory-frontend/components/FullImagePreviewModal';
import { formatDDMMYYYY } from '../../utils/dateUtils';

interface OrdersHistoryTableProps {
  orders: OrderItem[];
  loading: boolean;
  lang?: Language;
  onOpenAssignModal: (order: OrderItem) => void;
  onOpenSettlementModal: (order: OrderItem) => void;
  onUnassignOrder?: (order: OrderItem) => void;
  onMarkOrderCompleted?: (order: OrderItem) => void;
  onToggleReturnStatus?: (order: OrderItem, status: 'yes' | 'no', customDateTime?: string | null) => void;
  onToggleSubmittedStatus?: (order: OrderItem, submitted: 'yes' | 'no', customDateTime?: string | null) => void;
  onViewDetail?: (order: OrderItem, showBill?: boolean) => void;
  onViewSeeBill?: (order: OrderItem) => void;
  onViewOrderDetails?: (order: OrderItem) => void;
  onEditOrder?: (order: OrderItem) => void;
  onDeleteOrder?: (order: OrderItem) => void;
}

const getCurrentDatetimeLocalString = (isoStr?: string | null): string => {
  const d = isoStr ? new Date(isoStr) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  }
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export const OrdersHistoryTable: React.FC<OrdersHistoryTableProps> = ({
  orders,
  loading,
  lang = 'EN',
  onOpenAssignModal,
  onOpenSettlementModal,
  onUnassignOrder,
  onMarkOrderCompleted,
  onToggleReturnStatus,
  onToggleSubmittedStatus,
  onViewDetail,
  onViewSeeBill,
  onViewOrderDetails,
  onEditOrder,
  onDeleteOrder,
}) => {
  const t = getOrdersTranslation(lang);
  const commonT = translations[lang] || translations.EN;
  void commonT;
  const [activeDropdownOrderId, setActiveDropdownOrderId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);

  const [returnDateModal, setReturnDateModal] = useState<{
    open: boolean;
    order: OrderItem | null;
    selectedDateTime: string;
  }>({
    open: false,
    order: null,
    selectedDateTime: '',
  });

  const [submissionDateModal, setSubmissionDateModal] = useState<{
    open: boolean;
    order: OrderItem | null;
    selectedDateTime: string;
  }>({
    open: false,
    order: null,
    selectedDateTime: '',
  });

  const handleOpenReturnCalendar = (order: OrderItem) => {
    setReturnDateModal({
      open: true,
      order,
      selectedDateTime: getCurrentDatetimeLocalString(order.returned_at),
    });
  };

  const handleOpenSubmissionCalendar = (order: OrderItem) => {
    setSubmissionDateModal({
      open: true,
      order,
      selectedDateTime: getCurrentDatetimeLocalString(order.item_submitted_at),
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#d97706', marginBottom: '0.5rem' }}></i>
        <p style={{ margin: 0, fontSize: '0.82rem' }}>{translations[lang]?.loadingOrdersMsg || 'Loading orders...'}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.5rem' }}></i>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600 }}>{translations[lang]?.noOrdersFoundMsg || 'No custom orders found'}</p>
      </div>
    );
  }

  return (
    <div className="tablet-dense-view" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700, fontSize: '0.72rem' }}>
            <th style={{ padding: '0.55rem 0.35rem', textAlign: 'center', width: '36px' }}>{(t as any).snCol || 'S.N.'}</th>
            <th style={{ padding: '0.55rem 0.45rem', textAlign: 'center' }}>{(t as any).orderDateCol || 'Order Date'}</th>
            <th style={{ padding: '0.55rem 0.45rem', textAlign: 'center' }}>{(t as any).customerDetailsCol || 'Customer Details'}</th>
            <th style={{ padding: '0.55rem 0.45rem', textAlign: 'center' }}>{(t as any).orderItemCol || t.itemsCol}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>{(t as any).grossWtHeader || 'Gross Wt'}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>{(t as any).statusHeader || 'Status'}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>{(t as any).workerHeader || 'Worker'}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>{(t as any).returnFromWorkerCol || 'Return from Worker'}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>{(t as any).custPaidStatusCol || 'Cust Paid Status'}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>{(t as any).submittedToCustCol || 'Submitted to cust'}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>{(t as any).infoCol || 'Info'}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((ord, idx) => {
            const isCompleted = ord.status === 'COMPLETED' || ord.sold_status === 'SOLD';
            const isAssigned = ord.status === 'ASSIGNED';
            const rowBg = isCompleted ? '#f0fdf4' : isAssigned ? '#f0f9ff' : '#fef2f2';
            const rowBorder = isCompleted ? '#bbf7d0' : isAssigned ? '#bae6fd' : '#fecaca';

            return (
              <tr key={ord.id} style={{ background: rowBg, borderBottom: `1px solid ${rowBorder}`, transition: 'background 0.15s ease' }}>
                <td style={{ padding: '0.55rem 0.4rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '0.55rem 0.5rem', color: '#334155', whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: 600 }}>
                  {formatDDMMYYYY(ord.created_at)}
                </td>
                <td style={{ padding: '0.55rem 0.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem' }}>{ord.customer_name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {ord.customer_phone || '-'} {ord.customer_address ? `· ${ord.customer_address}` : ''}
                  </div>
                </td>
                <td style={{ padding: '0.55rem 0.5rem' }}>
                  {(() => {
                    const itemImg = ord.image_url || (ord as any).receipt_json_data?.image_url || (ord as any).receipt_json_data?.items?.[0]?.image_url || '';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={ord.item_name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage({ url: itemImg, title: `${ord.customer_name} - ${ord.item_name}` });
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
                          <div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: ord.metal_type === 'GOLD' ? '#fef3c7' : '#e0f2fe', color: ord.metal_type === 'GOLD' ? '#b45309' : '#0369a1' }}>
                              {ord.metal_type}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.78rem' }}>
                            {ord.item_name}
                            {(ord.quantity_value || ord.item_length_inches) && (
                              <span style={{ fontSize: '0.68rem', color: '#6366f1', marginLeft: '5px', fontWeight: 700 }}>
                                ({ord.quantity_value ? `${ord.quantity_value} ${ord.quantity_unit === 'PAIRS' ? 'Pairs' : ord.quantity_unit === 'GRAMS' ? 'g' : 'Pcs'}` : ''}
                                {ord.item_length_inches ? `${ord.quantity_value ? ', ' : ''}L: ${ord.item_length_inches.toString().endsWith('"') ? ord.item_length_inches : ord.item_length_inches + '"'}` : ''})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </td>
                <td style={{ padding: '0.55rem 0.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.76rem' }}>{ord.gross_weight_grams} g</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Net: {ord.net_weight_grams} g</div>
                </td>

                {/* Status Cell with Modern Custom Dropdown Popover */}
                <td style={{ padding: '0.55rem 0.5rem' }}>
                  {ord.status === 'COMPLETED' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.68rem' }}>
                      <i className="fa-solid fa-check-circle"></i> Completed
                    </span>
                  ) : (
                    <div>
                      {/* Modern Trigger Pill Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          if (activeDropdownOrderId === ord.id) {
                            setActiveDropdownOrderId(null);
                            setDropdownPos(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                            setActiveDropdownOrderId(ord.id);
                          }
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          border: ord.status === 'ASSIGNED' ? '1px solid #7dd3fc' : '1px solid #fca5a5',
                          background: ord.status === 'ASSIGNED'
                            ? '#e0f2fe'
                            : '#fee2e2',
                          color: ord.status === 'ASSIGNED' ? '#0369a1' : '#991b1b',
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <i className={ord.status === 'ASSIGNED' ? 'fa-solid fa-user-gear' : 'fa-solid fa-clock'}></i>
                        {ord.status === 'ASSIGNED' ? 'Assigned' : 'Not assigned'}
                        <i className={`fa-solid fa-chevron-${activeDropdownOrderId === ord.id ? 'up' : 'down'}`} style={{ fontSize: '0.6rem', marginLeft: '2px' }}></i>
                      </button>

                      {/* Floating Modern Custom Dropdown Menu with Fixed Position */}
                      {activeDropdownOrderId === ord.id && dropdownPos && (
                        <>
                          {/* Backdrop overlay to dismiss on outside click */}
                          <div
                            onClick={() => {
                              setActiveDropdownOrderId(null);
                              setDropdownPos(null);
                            }}
                            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                          />

                          <div
                            style={{
                              position: 'fixed',
                              top: `${dropdownPos.top}px`,
                              left: `${dropdownPos.left}px`,
                              zIndex: 99999,
                              minWidth: '175px',
                              background: '#ffffff',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.22), 0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                              padding: '6px',
                            }}
                          >
                            {/* Option 1: Pending */}
                            <div
                              onClick={() => {
                                setActiveDropdownOrderId(null);
                                setDropdownPos(null);
                                if (ord.status === 'ASSIGNED' && onUnassignOrder) {
                                  onUnassignOrder(ord);
                                }
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: ord.status === 'PENDING' ? '#b45309' : '#334155',
                                background: ord.status === 'PENDING' ? '#fffbeb' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef3c7')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = ord.status === 'PENDING' ? '#fffbeb' : 'transparent')}
                            >
                              <i className="fa-solid fa-clock" style={{ color: '#d97706' }}></i>
                              Pending
                            </div>

                            {/* Option 2: Assign / Re-Assign */}
                            <div
                              onClick={() => {
                                setActiveDropdownOrderId(null);
                                setDropdownPos(null);
                                onOpenAssignModal(ord);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: ord.status === 'ASSIGNED' ? '#0369a1' : '#059669',
                                background: ord.status === 'ASSIGNED' ? '#f0f9ff' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#e0f2fe')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = ord.status === 'ASSIGNED' ? '#f0f9ff' : 'transparent')}
                            >
                              <i className="fa-solid fa-user-plus" style={{ color: '#0284c7' }}></i>
                              {ord.status === 'ASSIGNED' ? 'Re-Assign Worker...' : 'Assign Worker...'}
                            </div>

                            {/* Option 3: Mark as Completed */}
                            <div
                              onClick={() => {
                                setActiveDropdownOrderId(null);
                                setDropdownPos(null);
                                if (onMarkOrderCompleted) {
                                  onMarkOrderCompleted(ord);
                                }
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: '#15803d',
                                background: 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background 0.15s ease',
                                marginTop: '2px',
                                borderTop: '1px solid #f1f5f9',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }}></i>
                              Completed
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </td>

                {/* Worker Name Column */}
                <td style={{ padding: '0.55rem 0.5rem' }}>
                  {ord.assigned_worker_name ? (
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.78rem' }}>{ord.assigned_worker_name}</div>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>Unassigned</span>
                  )}
                </td>

                {/* Return from Worker Column */}
                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <select
                      value={ord.returned_from_worker === 'yes' ? 'yes' : 'no'}
                      onChange={(e) => {
                        const val = e.target.value as 'yes' | 'no';
                        if (val === 'yes') {
                          const hasWorker = !!(ord.assigned_worker_id || ord.assigned_worker_name || (ord as any).worker_id || (ord as any).worker_name);
                          if (!hasWorker) {
                            alert('⚠️ Please assign a worker to this order before marking it as "Returned from Worker".');
                            return;
                          }
                          handleOpenReturnCalendar(ord);
                        } else if (val === 'no' && onToggleReturnStatus) {
                          onToggleReturnStatus(ord, 'no', null);
                        }
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: ord.returned_from_worker === 'yes' ? '1px solid #86efac' : '1px solid #fde68a',
                        background: ord.returned_from_worker === 'yes' ? '#dcfce7' : '#fef3c7',
                        color: ord.returned_from_worker === 'yes' ? '#15803d' : '#b45309',
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="no" style={{ background: '#ffffff', color: '#b45309', fontWeight: 700 }}>NO</option>
                      <option value="yes" style={{ background: '#ffffff', color: '#15803d', fontWeight: 700 }}>YES</option>
                    </select>
                  </div>
                </td>

                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    {ord.sold_status === 'SOLD' || (ord.due_amount !== undefined && Number(ord.due_amount) === 0) ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '10px', background: '#16a34a', color: '#ffffff', fontWeight: 800, fontSize: '0.68rem' }}>
                        <i className="fa-solid fa-circle-check"></i> Paid
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <div style={{ display: 'inline-flex', gap: '3px', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <span
                            style={{
                              padding: '3px 6px',
                              borderRadius: '4px',
                              background: '#d97706',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                            }}
                          >
                            Due
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenSettlementModal(ord)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#ffffff',
                              color: '#16a34a',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                          >
                            Paid?
                          </button>
                        </div>

                        {(ord.paid_amount !== undefined || ord.due_amount !== undefined) && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '2px', textAlign: 'center' }}>
                            <span style={{ color: '#16a34a' }}>Paid: ₹{(ord.paid_amount || 0).toLocaleString('en-IN')}</span>
                            {(ord.due_amount || 0) > 0 && (
                              <span style={{ color: '#dc2626', marginLeft: '4px', fontWeight: 800 }}>Due: ₹{(ord.due_amount || 0).toLocaleString('en-IN')}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <select
                      value={ord.submitted === 'yes' ? 'yes' : 'no'}
                      onChange={(e) => {
                        const val = e.target.value as 'yes' | 'no';
                        if (val === 'yes') {
                          handleOpenSubmissionCalendar(ord);
                        } else if (val === 'no' && onToggleSubmittedStatus) {
                          onToggleSubmittedStatus(ord, 'no', null);
                        }
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: ord.submitted === 'yes' ? '1px solid #86efac' : '1px solid #fde68a',
                        background: ord.submitted === 'yes' ? '#dcfce7' : '#fef3c7',
                        color: ord.submitted === 'yes' ? '#15803d' : '#b45309',
                        fontWeight: 800,
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="no" style={{ background: '#ffffff', color: '#b45309', fontWeight: 700 }}>NO</option>
                      <option value="yes" style={{ background: '#ffffff', color: '#15803d', fontWeight: 700 }}>YES</option>
                    </select>
                  </div>
                </td>

                {/* Info / Actions Column */}
                <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                    {/* ✏️ Edit Order Button */}
                    <button
                      type="button"
                      onClick={() => onEditOrder && onEditOrder(ord)}
                      title="Edit Order Details"
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#16a34a',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#16a34a';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f0fdf4';
                        e.currentTarget.style.color = '#16a34a';
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>

                    {/* 🗑️ Delete Order Button */}
                    <button
                      type="button"
                      onClick={() => onDeleteOrder && onDeleteOrder(ord)}
                      title="Delete Order & Cancel Worker Assignment"
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#dc2626';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.color = '#dc2626';
                      }}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>

                    {/* Bill Receipt Icon Button */}
                    <button
                      type="button"
                      onClick={() => (onViewSeeBill ? onViewSeeBill(ord) : onViewDetail && onViewDetail(ord, true))}
                      title={translations[lang]?.seeBillTooltip || 'See Bill'}
                      style={{
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        color: '#0284c7',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e0f2fe';
                        e.currentTarget.style.borderColor = '#7dd3fc';
                        e.currentTarget.style.color = '#0369a1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f0f9ff';
                        e.currentTarget.style.borderColor = '#bae6fd';
                        e.currentTarget.style.color = '#0284c7';
                      }}
                    >
                      <i className="fa-solid fa-file-invoice"></i>
                    </button>

                    {/* Order Details Drawer Button */}
                    <button
                      type="button"
                      onClick={() => (onViewOrderDetails ? onViewOrderDetails(ord) : onViewDetail && onViewDetail(ord, false))}
                      title={translations[lang]?.orderDetailsDrawerTooltip || 'Order Details Drawer'}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#94a3b8';
                        e.currentTarget.style.color = '#0f172a';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.color = '#475569';
                      }}
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── RETURN DATE & TIME CALENDAR MODAL ── */}
      {returnDateModal.open && returnDateModal.order && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-calendar-days" style={{ color: '#059669' }}></i>
                Select Return Date & Time
              </h3>
              <button
                type="button"
                onClick={() => setReturnDateModal({ open: false, order: null, selectedDateTime: '' })}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Order & Worker Info Card */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.88rem' }}>Order #{returnDateModal.order.id} · {returnDateModal.order.customer_name}</div>
              <div style={{ color: '#15803d', fontSize: '0.78rem', marginTop: '3px' }}>
                💍 <strong>{returnDateModal.order.item_name}</strong> ({returnDateModal.order.gross_weight_grams} g)
              </div>
              {returnDateModal.order.assigned_worker_name && (
                <div style={{ color: '#047857', fontSize: '0.75rem', marginTop: '2px', fontWeight: 700 }}>
                  👤 Worker: {returnDateModal.order.assigned_worker_name}
                </div>
              )}
            </div>

            {/* Date & Time Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                📅 Actual Date & Time Returned from Worker:
              </label>
              <input
                type="datetime-local"
                value={returnDateModal.selectedDateTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setReturnDateModal((prev) => ({ ...prev, selectedDateTime: val }));
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '2px solid #059669',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReturnDateModal({ open: false, order: null, selectedDateTime: '' })}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!returnDateModal.order) return;
                  const iso = new Date(returnDateModal.selectedDateTime).toISOString();
                  if (onToggleReturnStatus) {
                    onToggleReturnStatus(returnDateModal.order, 'yes', iso);
                  }
                  setReturnDateModal({ open: false, order: null, selectedDateTime: '' });
                }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}
              >
                Confirm Return Date & Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION TO CUSTOMER DATE PICKER MODAL */}
      {submissionDateModal.open && submissionDateModal.order && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.75rem',
              width: '90%',
              maxWidth: '420px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                <i className="fa-solid fa-hand-holding-heart"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Item Submitted to Customer
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Select the actual date & time of item handover to customer
                </p>
              </div>
            </div>

            {/* Order Details Card */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                📦 Order #{(submissionDateModal.order as any).order_number || submissionDateModal.order.id} • {submissionDateModal.order.customer_name || 'Customer'}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                Item: {submissionDateModal.order.item_name} ({(submissionDateModal.order as any).item_type || submissionDateModal.order.metal_type || 'Gold'})
              </div>
            </div>

            {/* Date & Time Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                📅 Actual Date & Time Submitted to Customer:
              </label>
              <input
                type="datetime-local"
                value={submissionDateModal.selectedDateTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setSubmissionDateModal((prev) => ({ ...prev, selectedDateTime: val }));
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '2px solid #2563eb',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSubmissionDateModal({ open: false, order: null, selectedDateTime: '' })}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!submissionDateModal.order) return;
                  const iso = new Date(submissionDateModal.selectedDateTime).toISOString();
                  if (onToggleSubmittedStatus) {
                    onToggleSubmittedStatus(submissionDateModal.order, 'yes', iso);
                  }
                  setSubmissionDateModal({ open: false, order: null, selectedDateTime: '' });
                }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}
              >
                Confirm Submission Date & Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE PREVIEW MODAL */}
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
