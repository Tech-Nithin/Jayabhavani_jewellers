import React from 'react';
import type { LoanRecord } from '../types';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  record: LoanRecord | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  record,
  onClose,
  onConfirm,
  submitting,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '420px', padding: '1.75rem', boxShadow: '0 24px 64px rgba(15,23,42,0.25)', border: '1px solid #fee2e2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#dc2626', flexShrink: 0 }}>
            <i className="fa-solid fa-trash" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Delete Loan Record?</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>This record will be moved to the Deleted tab. You can undo this action.</div>
          </div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{record.customer_name} {record.customer_surname}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{record.item_name} · ₹{Number(record.amount).toLocaleString('en-IN')} · {record.loan_date}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', color: '#475569' }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-trash" />} Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};
