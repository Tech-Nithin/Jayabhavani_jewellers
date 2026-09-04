import React from 'react';

interface DeleteInvoiceModalProps {
  open: boolean;
  invoice: any | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteInvoiceModal: React.FC<DeleteInvoiceModalProps> = ({
  open,
  invoice,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!open || !invoice) return null;

  const bId = invoice.billing_id || invoice.id || invoice.latestInvoice?.billing_id || 'Invoice';
  const custName = invoice.customer_name || invoice.name || 'Customer';
  const phone = invoice.customer_phone || invoice.phone || '';
  const totalAmt = Number(invoice.total_amount || invoice.totalSpent || invoice.final_amount || 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="tablet-dense-view"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #fecaca',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #fee2e2', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-trash-can" style={{ color: '#dc2626' }}></i>
            Delete Bill #{bId}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Invoice Brief */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
            {custName} {phone ? `(${phone})` : ''}
          </div>
          <div style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 800, marginTop: '3px' }}>
            Total Value: ₹{totalAmt.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Warning Message Box */}
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.25rem',
            color: '#991b1b',
            fontSize: '0.84rem',
            lineHeight: '1.45',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            Permanent Removal Notice
          </div>
          <div>
            ⚠️ Deleting this bill will permanently remove it from <strong>Sales Records, Installments, Day Book, Cash Ledger, and Metal registers</strong>. This action cannot be undone.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              fontWeight: 800,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isDeleting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Deleting Everywhere...
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash-can"></i> Yes, Delete Bill
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
