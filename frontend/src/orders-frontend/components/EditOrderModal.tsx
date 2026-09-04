import React, { useState, useEffect } from 'react';
import type { OrderItem } from '../types';

interface EditOrderModalProps {
  open: boolean;
  order: OrderItem | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (updatedFields: Partial<OrderItem>) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  open,
  order,
  isSubmitting,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    item_name: '',
    metal_type: 'GOLD',
    gross_weight_grams: '',
    net_weight_grams: '',
    touch_percentage: '91.6',
    making_charges: '',
    additional_charge_name: '',
    additional_charge_value: '',
    estimated_delivery_date: '',
    bill_date: '',
    notes: '',
  });

  useEffect(() => {
    if (order) {
      setFormData({
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        customer_address: order.customer_address || '',
        item_name: order.item_name || '',
        metal_type: (order.metal_type || 'GOLD').toUpperCase(),
        gross_weight_grams: String(order.gross_weight_grams || ''),
        net_weight_grams: String(order.net_weight_grams || order.gross_weight_grams || ''),
        touch_percentage: String(order.touch_percentage || '91.6'),
        making_charges: String(order.making_charges || ''),
        additional_charge_name: order.additional_charge_name || '',
        additional_charge_value: String(order.additional_charge_value || ''),
        estimated_delivery_date: order.estimated_delivery_date || '',
        bill_date: order.bill_date || (order.created_at ? order.created_at.split('T')[0] : ''),
        notes: order.notes || '',
      });
    }
  }, [order]);

  if (!open || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim()) {
      alert('Customer Name is required.');
      return;
    }

    const payload: Partial<OrderItem> = {
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone.trim(),
      customer_address: formData.customer_address.trim(),
      item_name: formData.item_name.trim(),
      metal_type: formData.metal_type as any,
      gross_weight_grams: Number(formData.gross_weight_grams) || 0,
      net_weight_grams: Number(formData.net_weight_grams) || Number(formData.gross_weight_grams) || 0,
      touch_percentage: Number(formData.touch_percentage) || 91.6,
      making_charges: Number(formData.making_charges) || 0,
      additional_charge_name: formData.additional_charge_name.trim(),
      additional_charge_value: Number(formData.additional_charge_value) || 0,
      estimated_delivery_date: formData.estimated_delivery_date,
      bill_date: formData.bill_date,
      notes: formData.notes.trim(),
    };

    await onSave(payload);
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
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#0284c7' }}></i>
            Edit Order #{order.id}
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
          {/* Section: Customer Info */}
          <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
              Customer Details
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Phone Number</label>
                <input
                  type="text"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Address</label>
              <input
                type="text"
                value={formData.customer_address}
                onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Section: Item & Weight Specs */}
          <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
              Jewellery Specifications
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Item Name</label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Metal</label>
                <select
                  value={formData.metal_type}
                  onChange={(e) => setFormData({ ...formData, metal_type: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                >
                  <option value="GOLD">GOLD</option>
                  <option value="SILVER">SILVER</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', marginTop: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Gross Wt (g)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.gross_weight_grams}
                  onChange={(e) => setFormData({ ...formData, gross_weight_grams: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Net Wt (g)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.net_weight_grams}
                  onChange={(e) => setFormData({ ...formData, net_weight_grams: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Touch %</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.touch_percentage}
                  onChange={(e) => setFormData({ ...formData, touch_percentage: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Section: Charges & Dates */}
          <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Making Charges (₹)</label>
                <input
                  type="number"
                  value={formData.making_charges}
                  onChange={(e) => setFormData({ ...formData, making_charges: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Est. Delivery Date</label>
                <input
                  type="date"
                  value={formData.estimated_delivery_date}
                  onChange={(e) => setFormData({ ...formData, estimated_delivery_date: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>Order Notes / Special Instructions</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
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
                  <i className="fa-solid fa-floppy-disk"></i> Save Order Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
