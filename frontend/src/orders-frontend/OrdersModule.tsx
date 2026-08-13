import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations, type Language } from '../utils/translations';
import type { OrderItem, WorkerItem } from './types';
import { OrdersHistoryTable } from './components/OrdersHistoryTable';
import { AssignWorkerModal } from './components/AssignWorkerModal';
import { AddWorkerView } from '../work-assignment-frontend/AddWorkerView';
import { PaymentSettlementModal } from './components/PaymentSettlementModal';
import { OrderDetailView } from './components/OrderDetailDrawer';
import { ReceiptPreview, downloadReceiptAsPNG } from '../billing-frontend/components/ReceiptPreview';

const formatIndianCurrencyInput = (val: string): string => {
  const clean = val.replace(/[^0-9.]/g, '');
  if (!clean) return '';
  const parts = clean.split('.');
  const intStr = parts[0];
  const decimalStr = parts.length > 1 ? '.' + parts[1] : '';
  if (!intStr) return '0' + decimalStr;
  const formattedInt = Number(intStr).toLocaleString('en-IN');
  return formattedInt + decimalStr;
};

const parseIndianCurrencyNumber = (val: string | number | undefined | null): number => {
  const clean = String(val ?? '').replace(/,/g, '');
  return Number(clean) || 0;
};

export const OrdersModule: React.FC<{ lang?: Language }> = ({
  lang = 'EN',
}) => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ASSIGNED' | 'COMPLETED'>('ALL');
  const [activeView, setActiveView] = useState<'LIST' | 'ORDER_DETAILS' | 'SEE_BILL'>('LIST');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const [settlementModal, setSettlementModal] = useState<{
    open: boolean;
    order: OrderItem | null;
    payingNow: string;
    isSubmitting: boolean;
  }>({
    open: false,
    order: null,
    payingNow: '',
    isSubmitting: false,
  });

  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    order: OrderItem | null;
    searchWorker: string;
    selectedWorkerId: string;
    selectedWorkerName: string;
    isSubmitting: boolean;
  }>({
    open: false,
    order: null,
    searchWorker: '',
    selectedWorkerId: '',
    selectedWorkerName: '',
    isSubmitting: false,
  });

  const [addWorkerModal, setAddWorkerModal] = useState<{
    open: boolean;
    name: string;
    phone: string;
    address: string;
    specialization: string;
    photoUrl: string;
    notes: string;
    isSubmitting: boolean;
  }>({
    open: false,
    name: '',
    phone: '',
    address: '',
    specialization: '',
    photoUrl: '',
    notes: '',
    isSubmitting: false,
  });

  const syncFromUrl = (ordersList: OrderItem[] = orders) => {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('module');
    const viewParam = params.get('view');
    const orderIdParam = params.get('order_id');

    if ((mod === 'orders' || !mod) && orderIdParam && ordersList.length > 0) {
      const found = ordersList.find((o) => String(o.id) === String(orderIdParam));
      if (found) {
        setSelectedOrder(found);
        if (viewParam === 'see-bill' || viewParam === 'bill') {
          setActiveView('SEE_BILL');
        } else {
          setActiveView('ORDER_DETAILS');
        }
        return;
      }
    }

    if (!orderIdParam) {
      setActiveView('LIST');
      setSelectedOrder(null);
    }
  };

  useEffect(() => {
    const handlePopState = () => syncFromUrl();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [orders]);

  useEffect(() => {
    fetchOrders();
    fetchWorkers();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/work-assignment/orders`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
        syncFromUrl(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrderDetails = (order: OrderItem) => {
    setSelectedOrder(order);
    setActiveView('ORDER_DETAILS');

    const params = new URLSearchParams(window.location.search);
    params.set('module', 'orders');
    params.set('view', 'order-details');
    params.set('order_id', String(order.id));
    if (lang) params.set('lang', lang.toLowerCase());
    window.history.pushState({}, '', `?${params.toString()}`);
  };

  const handleOpenSeeBill = (order: OrderItem) => {
    setSelectedOrder(order);
    setActiveView('SEE_BILL');

    const params = new URLSearchParams(window.location.search);
    params.set('module', 'orders');
    params.set('view', 'see-bill');
    params.set('order_id', String(order.id));
    if (lang) params.set('lang', lang.toLowerCase());
    window.history.pushState({}, '', `?${params.toString()}`);
  };

  const handleBackToList = () => {
    setActiveView('LIST');
    setSelectedOrder(null);

    const params = new URLSearchParams(window.location.search);
    params.set('module', 'orders');
    params.delete('view');
    params.delete('order_id');
    if (lang) params.set('lang', lang.toLowerCase());
    window.history.pushState({}, '', `?${params.toString()}`);
  };

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/workers`);
      const data = await res.json();
      if (data.success && Array.isArray(data.workers)) {
        setWorkers(data.workers);
      }
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    }
  };

  const handleOpenAssignModal = (order: OrderItem) => {
    fetchWorkers();
    setAssignModal({
      open: true,
      order,
      searchWorker: '',
      selectedWorkerId: order.assigned_worker_id || '',
      selectedWorkerName: order.assigned_worker_name || '',
      isSubmitting: false,
    });
  };

  const handleConfirmAssign = async () => {
    if (!assignModal.order) return;
    const order = assignModal.order;
    setAssignModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const res = await fetch(`${API_BASE}/work-assignment/orders/${order.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: assignModal.selectedWorkerId || null,
          worker_name: assignModal.selectedWorkerName || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  assigned_worker_id: assignModal.selectedWorkerId || null,
                  assigned_worker_name: assignModal.selectedWorkerName || null,
                  status: assignModal.selectedWorkerId ? 'ASSIGNED' : 'PENDING',
                  assigned_at: assignModal.selectedWorkerId ? (data.assigned_at || new Date().toISOString()) : null,
                }
              : o
          )
        );
        setAssignModal({
          open: false,
          order: null,
          searchWorker: '',
          selectedWorkerId: '',
          selectedWorkerName: '',
          isSubmitting: false,
        });
        alert(
          assignModal.selectedWorkerId
            ? `✅ Order ${order.id} assigned to worker "${assignModal.selectedWorkerName}"!`
            : `ℹ️ Order ${order.id} unassigned.`
        );
      } else {
        alert('Failed to assign worker: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      alert('Request error: ' + err.message);
    } finally {
      setAssignModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleUnassignOrder = async (order: OrderItem) => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/orders/${order.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: null, worker_name: null }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, assigned_worker_id: null, assigned_worker_name: null, status: 'PENDING' }
              : o
          )
        );
      }
    } catch (err) {
      console.error('Failed to unassign order:', err);
    }
  };

  const handleToggleReturnStatus = async (order: OrderItem, newStatus: 'yes' | 'no', customDateTime?: string | null) => {
    const returnTimestamp = newStatus === 'yes' ? (customDateTime || new Date().toISOString()) : null;
    try {
      const res = await fetch(`${API_BASE}/work-assignment/orders/${order.id}/return-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returned_from_worker: newStatus,
          returned_at: returnTimestamp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  returned_from_worker: newStatus,
                  returned_at: returnTimestamp,
                }
              : o
          )
        );
      } else {
        alert('Failed to update return status: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      alert('Request error: ' + err.message);
    }
  };

  const handleOpenSettlement = (order: OrderItem) => {
    const dueVal = order.due_amount || 0;
    setSettlementModal({
      open: true,
      order,
      payingNow: dueVal > 0 ? dueVal.toLocaleString('en-IN') : '',
      isSubmitting: false,
    });
  };

  const handleConfirmSettlement = async () => {
    if (!settlementModal.order) return;
    const order = settlementModal.order;
    const paidNowNum = parseIndianCurrencyNumber(settlementModal.payingNow);
    const currentDue = order.due_amount !== undefined ? order.due_amount : 0;
    const remainingDue = Math.max(0, currentDue - paidNowNum);
    const targetStatus: 'SOLD' | 'DUE' = remainingDue === 0 ? 'SOLD' : 'DUE';

    setSettlementModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const isDelivered = remainingDue === 0;
      const res = await fetch(`${API_BASE}/work-assignment/orders/${order.id}/sold-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sold_status: targetStatus,
          submitted: isDelivered ? 'yes' : 'no',
          paid_now: paidNowNum,
          remaining_due: remainingDue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  submitted: isDelivered ? 'yes' : o.submitted || 'no',
                  sold_status: targetStatus,
                  status: targetStatus === 'SOLD' ? 'COMPLETED' : o.status,
                  paid_amount: (o.paid_amount || 0) + paidNowNum,
                  due_amount: remainingDue,
                }
              : o
          )
        );
        setSettlementModal({ open: false, order: null, payingNow: '', isSubmitting: false });
        alert(
          targetStatus === 'SOLD'
            ? `✅ Order ${order.id} delivered & marked as SOLD! Status updated to Submitted: YES, receipt stamp updated to SALE DONE, and invoice saved to billing_invoices database table!`
            : `ℹ️ Payment of ₹${paidNowNum.toLocaleString('en-IN')} recorded. Remaining Balance Due: ₹${remainingDue.toLocaleString('en-IN')}.`
        );
      } else {
        alert('Failed to update payment status: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      alert('Request error: ' + err.message);
    } finally {
      setSettlementModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      o.customer_name.toLowerCase().includes(term) ||
      o.customer_phone.includes(term) ||
      o.item_name.toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term);

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && o.status === 'PENDING') ||
      (statusFilter === 'ASSIGNED' && o.status === 'ASSIGNED') ||
      (statusFilter === 'COMPLETED' && (o.status === 'COMPLETED' || o.sold_status === 'SOLD'));

    return matchSearch && matchStatus;
  });

  // ── Standalone See Bill Screen View ──
  if (activeView === 'SEE_BILL' && selectedOrder) {
    let billPayload: any = null;
    if (selectedOrder.receipt_json_data) {
      try {
        billPayload = typeof selectedOrder.receipt_json_data === 'string'
          ? JSON.parse(selectedOrder.receipt_json_data)
          : selectedOrder.receipt_json_data;
      } catch (e) { billPayload = null; }
    }

    return (
      <div style={{ padding: '1.25rem', maxWidth: '900px', margin: '0 auto', fontFamily: "'Inter', 'Source Sans 3', sans-serif" }}>
        {/* Top Header & Back Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleBackToList}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.83rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>{translations[lang]?.backToOrders || 'Back to Orders'}</span>
          </button>

          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, fontSize: '1.0rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-file-invoice" style={{ color: '#0284c7' }}></i>
              {translations[lang]?.officialBillReceipt || 'Official Bill Receipt'} #{selectedOrder.id}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {selectedOrder.customer_name} {selectedOrder.customer_phone ? `· ${selectedOrder.customer_phone}` : ''}
            </span>
          </div>
        </div>

        {/* Centered Official Bill Receipt Preview Card */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '1.5rem', boxShadow: '0 12px 35px rgba(0,0,0,0.06)' }}>
          <ReceiptPreview
            receiptId={`see-bill-receipt-${selectedOrder.id}`}
            mode={(billPayload?.mode || billPayload?.transaction_type || 'ORDER') as any}
            customerName={selectedOrder.customer_name}
            customerPhone={selectedOrder.customer_phone}
            customerAddress={selectedOrder.customer_address}
            rates={billPayload?.rates || null}
            items={billPayload?.items || []}
            totalSellValue={billPayload?.totalSellValue ?? 0}
            totalBuyCredit={billPayload?.totalBuyCredit ?? 0}
            netPayable={billPayload?.netPayable ?? 0}
            paymentType={(billPayload?.paymentType || (selectedOrder.due_amount === 0 ? 'FULL' : 'PARTIAL')) as any}
            advancePaidAmount={billPayload?.advancePaidAmount ?? selectedOrder.paid_amount ?? 0}
            balanceDueAmount={billPayload?.balanceDueAmount ?? selectedOrder.due_amount ?? 0}
            paymentHistory={billPayload?.payment_history || []}
            createdDate={selectedOrder.created_at}
            lang={lang}
            onDownloadPNG={() => downloadReceiptAsPNG(`see-bill-receipt-${selectedOrder.id}`, selectedOrder.customer_name)}
          />
        </div>
      </div>
    );
  }

  // ── Standalone Order Details View ──
  if (activeView === 'ORDER_DETAILS' && selectedOrder) {
    return (
      <OrderDetailView
        order={selectedOrder}
        initialShowBill={false}
        onSeeBill={() => handleOpenSeeBill(selectedOrder)}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", color: '#181310' }}>
      {/* Header Title Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-list-check" style={{ color: '#d97706' }}></i>
            {translations[lang]?.ordersScreenTitle || 'Custom Orders History & Worker Assignment'}
          </h1>
          <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.78rem' }}>
            {translations[lang]?.ordersScreenSub || 'Track all POS billing orders, worker assignments, balance payments & delivery sales'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('module', 'billing');
              url.searchParams.set('lang', lang.toLowerCase());
              url.searchParams.set('mode', 'order');
              window.location.href = url.toString();
            }}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-solid fa-plus-circle"></i> {translations[lang]?.createOrderBtn || 'Create Order'}
          </button>

          <button
            type="button"
            onClick={() => setAddWorkerModal({ open: true, name: '', phone: '', address: '', specialization: '', photoUrl: '', notes: '', isSubmitting: false })}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-solid fa-user-plus"></i> {translations[lang]?.addNewWorker || 'Add New Worker'}
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8' }}></i>
          <input
            type="text"
            placeholder={translations[lang]?.searchOrdersPlaceholder || 'Search by customer name, phone, item, or order ID...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.80rem', color: '#0f172a', background: 'transparent' }}
          />
        </div>

        {/* Status Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {(['ALL', 'PENDING', 'ASSIGNED', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '4px 12px',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === st ? '#ffffff' : 'transparent',
                color: statusFilter === st ? '#0f172a' : '#64748b',
                fontWeight: statusFilter === st ? 800 : 600,
                fontSize: '0.74rem',
                cursor: 'pointer',
                boxShadow: statusFilter === st ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {st === 'ALL' ? (translations[lang]?.allOrdersTab || 'All Orders') : st}
            </button>
          ))}
        </div>
      </div>

      {/* ── ORDERS LIST TABLE (Decoupled Component) ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <OrdersHistoryTable
          orders={filteredOrders}
          loading={loading}
          lang={lang}
          onOpenAssignModal={handleOpenAssignModal}
          onOpenSettlementModal={handleOpenSettlement}
          onUnassignOrder={handleUnassignOrder}
          onToggleReturnStatus={handleToggleReturnStatus}
          onViewSeeBill={(order) => handleOpenSeeBill(order)}
          onViewOrderDetails={(order) => handleOpenOrderDetails(order)}
          onViewDetail={(order, showBill) => (showBill ? handleOpenSeeBill(order) : handleOpenOrderDetails(order))}
        />
      </div>

      {/* ── ASSIGN WORKER MODAL (Decoupled Component) ── */}
      <AssignWorkerModal
        open={assignModal.open}
        order={assignModal.order}
        workers={workers}
        searchWorker={assignModal.searchWorker}
        selectedWorkerId={assignModal.selectedWorkerId}
        isSubmitting={assignModal.isSubmitting}
        onSearchChange={(q) => setAssignModal((prev) => ({ ...prev, searchWorker: q }))}
        onSelectWorker={(id, name) => setAssignModal((prev) => ({ ...prev, selectedWorkerId: id, selectedWorkerName: name, searchWorker: name }))}
        onUnassign={() => setAssignModal((prev) => ({ ...prev, selectedWorkerId: '', selectedWorkerName: '', searchWorker: '' }))}
        onClose={() => setAssignModal({ open: false, order: null, searchWorker: '', selectedWorkerId: '', selectedWorkerName: '', isSubmitting: false })}
        onConfirm={handleConfirmAssign}
        onOpenAddWorkerModal={(initName) => {
          setAddWorkerModal({ open: true, name: initName || '', phone: '', address: '', specialization: '', photoUrl: '', notes: '', isSubmitting: false });
          const params = new URLSearchParams(window.location.search);
          params.set('module', 'orders');
          params.set('view', 'add-worker');
          window.history.pushState({}, '', `?${params.toString()}`);
        }}
      />
      <AddWorkerView
        open={addWorkerModal.open}
        initialName={addWorkerModal.name}
        onClose={() => {
          setAddWorkerModal({ open: false, name: '', phone: '', address: '', specialization: '', photoUrl: '', notes: '', isSubmitting: false });
          const params = new URLSearchParams(window.location.search);
          params.set('module', 'orders');
          params.delete('view');
          window.history.pushState({}, '', `?${params.toString()}`);
        }}
        onWorkerAdded={async (newWorker: any) => {
          await fetchWorkers();
          if (newWorker && assignModal.open) {
            setAssignModal((prev) => ({
              ...prev,
              selectedWorkerId: newWorker.id,
              selectedWorkerName: newWorker.name,
              searchWorker: newWorker.name,
            }));
          }
        }}
        lang={lang}
      />

      {/* ── PAYMENT SETTLEMENT MODAL (Decoupled Component) ── */}
      <PaymentSettlementModal
        open={settlementModal.open}
        order={settlementModal.order}
        payingNow={settlementModal.payingNow}
        isSubmitting={settlementModal.isSubmitting}
        lang={lang}
        onPayingNowChange={(val) => setSettlementModal((prev) => ({ ...prev, payingNow: formatIndianCurrencyInput(val) }))}
        onClose={() => setSettlementModal({ open: false, order: null, payingNow: '', isSubmitting: false })}
        onConfirm={handleConfirmSettlement}
      />
    </div>
  );
};

export default OrdersModule;
