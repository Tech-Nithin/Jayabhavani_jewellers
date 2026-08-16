import React, { useState } from 'react';
import type { OrderItem } from '../types';
import { ReceiptPreview, downloadReceiptAsPNG } from '../../billing-frontend/components/ReceiptPreview';
import { getOrdersTranslation, type Language } from '../ordersTranslations';

interface OrderDetailViewProps {
  order: OrderItem;
  onBack: () => void;
  initialShowBill?: boolean;
  onSeeBill?: () => void;
  lang?: Language;
}

const fmt = (isoStr?: string | null): string => {
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

const getReturnDurationText = (assignedAt?: string | null, returnedAt?: string | null, isReturned?: boolean) => {
  if (!assignedAt) return '—';
  const startDate = new Date(assignedAt);
  if (isNaN(startDate.getTime())) return '—';

  if (isReturned && returnedAt) {
    const endDate = new Date(returnedAt);
    if (isNaN(endDate.getTime())) return '—';
    const calDays = getCalendarDaysDiff(startDate, endDate);
    if (calDays <= 0) {
      return 'Same Day';
    } else if (calDays === 1) {
      return '1 Day';
    } else {
      return `${calDays} Days`;
    }
  }

  // Not returned yet
  const nowDate = new Date();
  const calDaysSoFar = getCalendarDaysDiff(startDate, nowDate);
  if (calDaysSoFar > 0) {
    return `Still Processing (${calDaysSoFar} day${calDaysSoFar > 1 ? 's' : ''})`;
  }
  return 'Still Processing (Today)';
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f1f5f9', gap: '0.4rem' }}>
    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>{value}</span>
  </div>
);

const Badge: React.FC<{ text: string; bg: string; color: string; border: string }> = ({ text, bg, color, border }) => (
  <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: '20px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
    {text}
  </span>
);

const Card: React.FC<{ icon: string; title: string; accent: string; children: React.ReactNode; action?: React.ReactNode }> = ({ icon, title, accent, children, action }) => (
  <div style={{ background: '#ffffff', borderRadius: '12px', border: `1.5px solid ${accent}20`, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.65rem 0.9rem', background: `${accent}10`, borderBottom: `1px solid ${accent}25` }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 6px ${accent}40` }}>
        <i className={icon} style={{ color: '#ffffff', fontSize: '0.72rem' }}></i>
      </div>
      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.8rem', flex: 1 }}>{title}</span>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
    <div style={{ padding: '0.2rem 0.9rem 0.65rem' }}>
      {children}
    </div>
  </div>
);

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order, onBack, initialShowBill = false, onSeeBill, lang = 'EN' }) => {
  const t = getOrdersTranslation(lang);
  const isAssigned = !!(order.assigned_worker_id || order.assigned_worker_name);
  const isReturned = order.returned_from_worker === 'yes';
  const isSubmitted = order.submitted === 'yes';
  const isPaid = order.sold_status === 'SOLD';
  const totalAmount = (order.paid_amount || 0) + (order.due_amount || 0);
  const [showBill, setShowBill] = useState(initialShowBill);

  // Parse stored receipt JSON
  let billPayload: any = null;
  if (order.receipt_json_data) {
    try {
      billPayload = typeof order.receipt_json_data === 'string'
        ? JSON.parse(order.receipt_json_data)
        : order.receipt_json_data;
    } catch (e) { billPayload = null; }
  }

  const steps = [
    { label: 'Order Created', done: true, icon: 'fa-solid fa-file-circle-plus', color: '#059669' },
    { label: 'Assigned', done: isAssigned, icon: 'fa-solid fa-user-gear', color: '#2563eb' },
    { label: 'Returned', done: isReturned, icon: 'fa-solid fa-rotate-left', color: '#7c3aed' },
    { label: 'Submitted', done: isSubmitted, icon: 'fa-solid fa-handshake', color: '#d97706' },
    { label: 'Paid', done: isPaid, icon: 'fa-solid fa-circle-check', color: '#059669' },
  ];

  return (
    <div className="tablet-dense-view" style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', 'Outfit', sans-serif" }}>

      {/* ── STICKY HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        padding: '0.9rem 1.5rem',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
      }}>
        {/* Row 1: Back button + Order ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.6rem' }}>
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '9px', color: '#ffffff', padding: '6px 14px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center',
              gap: '7px', flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Orders
          </button>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order Detail</span>
            <div style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.2 }}>#{order.id}</div>
          </div>
        </div>

        {/* Row 2: Customer info horizontal strip */}
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0',
          background: 'rgba(255,255,255,0.07)', borderRadius: '10px',
          padding: '0.55rem 1rem', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.15)', marginRight: '1rem' }}>
            <i className="fa-solid fa-user" style={{ color: '#94a3b8', fontSize: '0.72rem' }}></i>
            <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem' }}>{order.customer_name}</span>
          </div>
          {order.customer_phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', paddingRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.15)', marginRight: '1rem' }}>
              <i className="fa-solid fa-phone" style={{ color: '#94a3b8', fontSize: '0.68rem' }}></i>
              <span style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.82rem' }}>{order.customer_phone}</span>
            </div>
          )}
          {order.customer_address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <i className="fa-solid fa-location-dot" style={{ color: '#94a3b8', fontSize: '0.68rem' }}></i>
              <span style={{ color: '#cbd5e1', fontWeight: 600, fontSize: '0.82rem' }}>{order.customer_address}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── PROGRESS TIMELINE ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: '480px' }}>
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', minWidth: '80px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: step.done ? step.color : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: step.done ? `0 4px 12px ${step.color}55` : 'none',
                }}>
                  <i className={step.icon} style={{ fontSize: '0.72rem', color: step.done ? '#ffffff' : '#94a3b8' }}></i>
                </div>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: step.done ? step.color : '#94a3b8', textAlign: 'center', lineHeight: '1.3', maxWidth: '70px' }}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: '3px', background: step.done ? step.color : '#e2e8f0', margin: '0 4px', marginBottom: '20px', borderRadius: '2px' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>

        {/* Row 1: Order Item Details */}
        <Card
          icon="fa-solid fa-gem"
          title={t.itemBreakdownSec}
          accent="#d97706"
          action={
            billPayload ? (
              <button
                onClick={() => (onSeeBill ? onSeeBill() : setShowBill(true))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: '#d97706', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '5px 13px', fontWeight: 700,
                  fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 8px #d9770640',
                }}
              >
                <i className="fa-solid fa-file-invoice-dollar" /> See Bill
              </button>
            ) : null
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10rem' }}>

            {/* Left column */}
            <div>
              <Row label="Order Date" value={fmt(order.created_at)} />
              {(order.quantity_value && order.quantity_value > 0) ? (
                <Row label="Quantity" value={`${order.quantity_value} ${order.quantity_unit === 'PAIRS' ? 'Pairs' : 'Pcs'}${order.item_length_inches ? ` · L: ${order.item_length_inches}"` : ''}`} />
              ) : (
                <Row label="Quantity" value="—" />
              )}
              <Row
                label="Item Name"
                value={
                  <span>
                    <strong>{order.item_name}</strong>{' '}
                    <span style={{ fontSize: '0.68rem', background: order.metal_type === 'GOLD' ? '#fef3c7' : '#e0f2fe', color: order.metal_type === 'GOLD' ? '#b45309' : '#0369a1', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                      {order.metal_type}
                    </span>
                  </span>
                }
              />
              <Row label="Gross Weight" value={
                <strong>{order.gross_weight_grams} g</strong>
              } />
              <Row label="Deduction Weight" value={`${Math.max(0, (order.gross_weight_grams || 0) - (order.net_weight_grams || 0)).toFixed(3)} g`} />
              <Row label="Net Weight" value={`${order.net_weight_grams} g`} />
              <Row label="HMW (%)" value={order.hmw_percentage !== undefined && order.hmw_percentage !== null ? `${order.hmw_percentage}%` : '—'} />
              <Row label="Total Wt after HMW" value={order.hmw_weight ? `${order.hmw_weight} g` : '—'} />
            </div>

            {/* Right column */}
            <div>
              <Row label="Value per Gram" value={
                order.applied_rate_per_gram
                  ? <span style={{ display: 'inline-block', background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', borderRadius: '6px', padding: '1px 10px', fontWeight: 700, fontSize: '0.82rem' }}>
                    ₹{Number(order.applied_rate_per_gram).toLocaleString('en-IN')}/g
                  </span>
                  : '—'
              } />
              <Row label="Add. Charges Name" value={order.additional_charge_name || '—'} />
              <Row label="Add. Charges (₹)" value={order.additional_charge_value ? `₹${Number(order.additional_charge_value).toLocaleString('en-IN')}` : '—'} />
              <Row label={t.makingChargesLabel} value={`₹${(order.making_charges || 0).toLocaleString('en-IN')}`} />
              <Row label="Notes" value={order.notes || '—'} />
            </div>

          </div>
        </Card>

        {/* Row 2: 3-column grid for assignment / return / payment */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>

          {/* Card 2: Worker Assignment */}
          <Card icon="fa-solid fa-user-gear" title={t.assignedWorkerCol} accent="#2563eb">
            <Row
              label="Status"
              value={isAssigned
                ? <Badge text="✓ ASSIGNED" bg="#dcfce7" color="#15803d" border="#86efac" />
                : <Badge text="⏳ PENDING" bg="#fef3c7" color="#b45309" border="#fbbf24" />}
            />
            <Row
              label="Worker"
              value={isAssigned
                ? <span><strong>{order.assigned_worker_name}</strong><br /><span style={{ fontSize: '0.68rem', color: '#64748b' }}>{order.assigned_worker_id}</span></span>
                : '—'}
            />
            <Row label="Assigned On" value={fmt(order.assigned_at)} />
            <Row
              label="Turnaround Time"
              value={
                isAssigned ? (
                  <span style={{
                    color: isReturned ? '#15803d' : '#b45309',
                    fontWeight: 700,
                    fontSize: '0.8rem'
                  }}>
                    {getReturnDurationText(order.assigned_at, order.returned_at, isReturned)}
                  </span>
                ) : '—'
              }
            />
          </Card>

          {/* Card 3: Return from Worker */}
          <Card icon="fa-solid fa-rotate-left" title="Return from Worker" accent="#7c3aed">
            <Row
              label="Returned?"
              value={isReturned
                ? <Badge text="✓ YES" bg="#dcfce7" color="#15803d" border="#86efac" />
                : <Badge text="✗ Not Yet" bg="#fef2f2" color="#dc2626" border="#fca5a5" />}
            />
            <Row label="Return Date & Time" value={isReturned ? fmt(order.returned_at) : '—'} />
          </Card>

          {/* Card 4: Payment & Submission */}
          <Card icon={isPaid ? 'fa-solid fa-circle-check' : 'fa-solid fa-indian-rupee-sign'} title="Submission & Payment" accent={isPaid ? '#059669' : '#ea580c'}>
            <Row
              label="Submitted to customer?"
              value={isSubmitted
                ? <Badge text="✓ YES" bg="#dcfce7" color="#15803d" border="#86efac" />
                : <Badge text="✗ Not Yet" bg="#fef3c7" color="#b45309" border="#fbbf24" />}
            />
            <Row
              label="Payment status"
              value={isPaid
                ? <Badge text="✓ PAID" bg="#dcfce7" color="#15803d" border="#86efac" />
                : <Badge text="⚠ DUE" bg="#fef2f2" color="#dc2626" border="#fca5a5" />}
            />
            {totalAmount > 0 && (
              <>
                <Row label="Total Value" value={<strong>₹{totalAmount.toLocaleString('en-IN')}</strong>} />
                <Row label="Paid" value={<span style={{ color: '#059669', fontWeight: 800 }}>₹{(order.paid_amount || 0).toLocaleString('en-IN')}</span>} />
                {(order.due_amount || 0) > 0 && (
                  <Row label="Due" value={<span style={{ color: '#dc2626', fontWeight: 800 }}>₹{(order.due_amount || 0).toLocaleString('en-IN')}</span>} />
                )}
              </>
            )}
          </Card>

        </div>
      </div>

      {/* ── SEE BILL MODAL ── */}
      {showBill && billPayload && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowBill(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div style={{
            background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '480px',
            maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            padding: '1.25rem', position: 'relative',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#d97706' }} /> Order Bill — #{order.id}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{order.customer_name} · {order.customer_phone}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => downloadReceiptAsPNG(`order-bill-receipt-${order.id}`, order.customer_name)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #d97706', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-download" /> Download
                </button>
                <button
                  onClick={() => setShowBill(false)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-xmark" /> Close
                </button>
              </div>
            </div>

            {/* Receipt */}
            <ReceiptPreview
              receiptId={`order-bill-receipt-${order.id}`}
              mode={billPayload.mode || billPayload.transaction_type || 'ORDER'}
              customerName={order.customer_name}
              customerPhone={order.customer_phone}
              customerAddress={order.customer_address}
              rates={billPayload.rates || null}
              items={billPayload.items || []}
              totalSellValue={billPayload.totalSellValue ?? 0}
              totalBuyCredit={billPayload.totalBuyCredit ?? 0}
              netPayable={billPayload.netPayable ?? 0}
              paymentType={(billPayload.paymentType || (order.due_amount === 0 ? 'FULL' : 'PARTIAL')) as any}
              advancePaidAmount={billPayload.advancePaidAmount ?? order.paid_amount ?? 0}
              balanceDueAmount={billPayload.balanceDueAmount ?? order.due_amount ?? 0}
              paymentHistory={billPayload.payment_history || []}
              createdDate={order.created_at}
              onDownloadPNG={() => downloadReceiptAsPNG(`order-bill-receipt-${order.id}`, order.customer_name)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
