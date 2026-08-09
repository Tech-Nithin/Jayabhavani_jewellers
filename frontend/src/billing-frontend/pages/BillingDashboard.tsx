import React, { useEffect, useState } from 'react';
import { InvoiceGenerator } from '../components/InvoiceGenerator';
import { API_BASE } from '../../config/apiConfig';

interface Invoice {
  id: string;
  customer: string;
  amount: number;
  date: string;
  status: string;
}

export const BillingDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/invoices`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error('Failed to fetch billing invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#d4af37', marginBottom: '0.5rem' }}>🧾 Billing Module</h1>
        <p style={{ color: '#a1a1c0', margin: 0 }}>
          Manage customer invoicing, point-of-sale billing records, and payment tracking.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        <div>
          <InvoiceGenerator />
        </div>

        <div style={{ background: '#1e1e2d', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2b2b40' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#d4af37' }}>📋 Recent Invoices</h3>
          
          {loading ? (
            <p style={{ color: '#a1a1c0' }}>Loading billing data...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #323248', color: '#a1a1c0' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Invoice ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Customer</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #28283c' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{inv.id}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{inv.customer}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>₹{inv.amount.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        background: inv.status === 'PAID' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                        color: inv.status === 'PAID' ? '#4caf50' : '#ff9800',
                      }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
