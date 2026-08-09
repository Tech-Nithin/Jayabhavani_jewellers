import React, { useState } from 'react';
import { API_BASE } from '../../config/apiConfig';

export const InvoiceGenerator: React.FC = () => {
  const [customer, setCustomer] = useState('');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !amount) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/billing/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer,
          amount: Number(amount),
          items: [item || 'Gold Jewelry Item'],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedInvoice(data.invoice);
        setCustomer('');
        setItem('');
        setAmount('');
      }
    } catch (err) {
      console.error('Invoice creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#1e1e2d', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2b2b40', color: '#fff' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#d4af37' }}>📄 New Invoice Generator</h3>
      
      <form onSubmit={handleGenerateInvoice} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1c0', marginBottom: '0.25rem' }}>Customer Name</label>
          <input
            type="text"
            placeholder="e.g. Rajesh Kumar"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', background: '#151521', border: '1px solid #323248', color: '#fff' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1c0', marginBottom: '0.25rem' }}>Item Description</label>
          <input
            type="text"
            placeholder="e.g. 22K Gold Bangle Set"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', background: '#151521', border: '1px solid #323248', color: '#fff' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1c0', marginBottom: '0.25rem' }}>Amount (₹)</label>
          <input
            type="number"
            placeholder="e.g. 75000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', background: '#151521', border: '1px solid #323248', color: '#fff' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)',
            color: '#000',
            fontWeight: '600',
            padding: '0.75rem',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '0.5rem',
          }}
        >
          {loading ? 'Generating...' : 'Generate Invoice'}
        </button>
      </form>

      {createdInvoice && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#151521', borderRadius: '8px', border: '1px dashed #d4af37' }}>
          <span style={{ fontSize: '0.85rem', color: '#4caf50', fontWeight: 'bold' }}>✓ Invoice Generated Successfully!</span>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            <p style={{ margin: '0.2rem 0' }}><strong>Invoice ID:</strong> {createdInvoice.id}</p>
            <p style={{ margin: '0.2rem 0' }}><strong>Customer:</strong> {createdInvoice.customer}</p>
            <p style={{ margin: '0.2rem 0' }}><strong>Amount:</strong> ₹{createdInvoice.amount.toLocaleString('en-IN')}</p>
            <p style={{ margin: '0.2rem 0' }}><strong>Status:</strong> {createdInvoice.status}</p>
          </div>
        </div>
      )}
    </div>
  );
};
