import React, { useState, useEffect } from 'react';

interface EditInvoiceModalProps {
  open: boolean;
  invoice: any | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (updatedFields: any) => Promise<void>;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  open,
  invoice,
  isSubmitting,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    bill_date: '',
    notes: '',
  });

  useEffect(() => {
    if (invoice) {
      const inv = invoice.latestInvoice || invoice;
      const rawDate = inv.bill_date || inv.date || (inv.created_at ? inv.created_at.split('T')[0] : '');
      setFormData({
        customer_name: invoice.customer_name || invoice.name || inv.customer_name || '',
        customer_phone: invoice.customer_phone || invoice.phone || inv.customer_phone || '',
        customer_address: invoice.customer_address || invoice.address || inv.customer_address || '',
        bill_date: rawDate,
        notes: inv.notes || '',
      });
    }
  }, [invoice]);

  if (!open || !invoice) return null;

  const bId = invoice.billing_id || invoice.id || invoice.latestInvoice?.billing_id || 'Invoice';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      alert('Customer Name is required.');
      return;
    }

    await onSave({
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_address: formData.customer_address.trim(),
      bill_date: formData.bill_date,
      notes: formData.notes.trim(),
    });
  };

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
          maxWidth: '480px',
          width: '100%',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#0284c7' }}></i>
            Edit Bill #{bId}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Customer Name *</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone Number</label>
              <input
                type="text"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Bill Date</label>
              <input
                type="date"
                value={formData.bill_date}
                onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Address</label>
            <input
              type="text"
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              disabled={isSubmitting}
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
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Save Bill Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
