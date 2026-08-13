import React from 'react';
import type { OrderItem, WorkerItem } from '../types';
import { translations, type Language } from '../../utils/translations';

interface AssignWorkerModalProps {
  open: boolean;
  order: OrderItem | null;
  workers: WorkerItem[];
  searchWorker: string;
  selectedWorkerId: string;
  isSubmitting: boolean;
  onSearchChange: (query: string) => void;
  onSelectWorker: (id: string, name: string) => void;
  onUnassign: () => void;
  onClose: () => void;
  onConfirm: () => void;
  onOpenAddWorkerModal: (initialName?: string) => void;
  lang?: Language;
}

export const AssignWorkerModal: React.FC<AssignWorkerModalProps> = ({
  open,
  order,
  workers,
  searchWorker,
  selectedWorkerId,
  isSubmitting,
  onSearchChange,
  onSelectWorker,
  onUnassign,
  onClose,
  onConfirm,
  onOpenAddWorkerModal,
  lang = 'EN',
}) => {
  if (!open || !order) return null;

  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchWorker.toLowerCase()) ||
      w.phone.includes(searchWorker) ||
      (w.specialization && w.specialization.toLowerCase().includes(searchWorker.toLowerCase()))
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="tablet-dense-view" style={{ background: '#ffffff', borderRadius: '18px', maxWidth: '460px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-user-plus" style={{ color: '#d97706' }}></i>
            {translations[lang]?.assignOrderToWorkerTitle || 'Assign Order to Worker'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Order Info Card */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.65rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.76rem' }}>
          <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.82rem' }}>{order.customer_name}</div>
          <div style={{ color: '#b45309', fontSize: '0.72rem', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span>💍 <strong>{order.item_name}</strong> ({order.gross_weight_grams} g)</span>
            {(order.quantity_value && order.quantity_value > 0) && (
              <span style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', padding: '1px 6px', fontWeight: 700, color: '#92400e', fontSize: '0.68rem' }}>
                Qty: {order.quantity_value} {order.quantity_unit === 'PAIRS' ? 'Pairs' : 'Pcs'}
              </span>
            )}
          </div>

          {/* Assignment Status Row */}
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #fcd34d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e' }}>Assignment Status:</span>
              {order.status === 'ASSIGNED' || order.assigned_worker_id ? (
                <span style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '16px', padding: '1px 8px', fontSize: '0.68rem', fontWeight: 800, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <i className="fa-solid fa-circle-check"></i> ASSIGNED
                </span>
              ) : (
                <span style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '16px', padding: '1px 8px', fontSize: '0.68rem', fontWeight: 800, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <i className="fa-solid fa-clock"></i> PENDING
                </span>
              )}
            </div>
            {order.assigned_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#64748b' }}>
                <i className="fa-regular fa-calendar" style={{ color: '#3b82f6' }}></i>
                <span>
                  {new Date(order.assigned_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {', '}
                  {new Date(order.assigned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search Worker Input */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>Search / Select Worker</label>
            <button
              type="button"
              onClick={() => onOpenAddWorkerModal('')}
              style={{ background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
            >
              <i className="fa-solid fa-user-plus"></i> Add Worker
            </button>
          </div>
          <input
            type="text"
            placeholder="🔍 Type worker name..."
            value={searchWorker}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.78rem' }}
          />
        </div>

        {/* Worker Options Dropdown List */}
        <div style={{ maxHeight: '170px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', background: '#f8fafc' }}>
          {filteredWorkers.length === 0 ? (
            <div style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
              No worker found matching "{searchWorker}".
              <br />
              <button
                type="button"
                onClick={() => onOpenAddWorkerModal(searchWorker)}
                style={{ marginTop: '6px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '0.70rem', fontWeight: 700, cursor: 'pointer' }}
              >
                + Create Worker "{searchWorker}"
              </button>
            </div>
          ) : (
            filteredWorkers.map((w) => {
              const isSelected = selectedWorkerId === w.id;
              return (
                <div
                  key={w.id}
                  onClick={() => onSelectWorker(w.id, w.name)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: isSelected ? '#dbeafe' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {w.photo_url ? (
                      <img src={w.photo_url} alt={w.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#d97706', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem' }}>
                        {w.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.78rem' }}>{w.name}</div>
                      <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                        📞 {w.phone || 'No phone'} · {w.specialization || 'Goldsmith'}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.75rem' }}>
                      <i className="fa-solid fa-circle-check"></i> Selected
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {selectedWorkerId && (
            <button
              type="button"
              onClick={onUnassign}
              style={{ padding: '0.5rem 0.85rem', borderRadius: '7px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontSize: '0.74rem' }}
            >
              {translations[lang]?.unassignWorkerBtn || 'Unassign Worker'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem 0.85rem', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.74rem' }}
          >
            {translations[lang]?.cancelBtn || 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.74rem', boxShadow: '0 3px 10px rgba(180, 83, 9, 0.25)' }}
          >
            {isSubmitting ? (translations[lang]?.updatingStatusBtn || 'Saving...') : (translations[lang]?.confirmAssignmentBtn || 'Confirm Assignment')}
          </button>
        </div>
      </div>
    </div>
  );
};
