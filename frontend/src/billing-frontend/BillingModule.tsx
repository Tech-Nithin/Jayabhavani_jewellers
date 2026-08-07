import React, { useState } from 'react';

export const BillingModule: React.FC = () => {
  const [invoices] = useState([
    { id: 'INV-1092', customer: 'Ananya Reddy', date: '07 Aug 2026', amount: '₹1,35,000', status: 'Paid' },
    { id: 'INV-1091', customer: 'Priya Sharma', date: '06 Aug 2026', amount: '₹89,500', status: 'Paid' },
    { id: 'INV-1090', customer: 'Rohan Mehta', date: '05 Aug 2026', amount: '₹45,000', status: 'Paid' },
  ]);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
          Billing & Invoicing
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Manage customer invoices and billing history
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '2rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Recent Billing Statements</h3>
          <button style={{ padding: '8px 16px', background: '#b45309', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            + Generate New Invoice
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
              <th style={{ padding: '12px 16px' }}>Invoice ID</th>
              <th style={{ padding: '12px 16px' }}>Customer</th>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Amount</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{inv.id}</td>
                <td style={{ padding: '12px 16px', color: '#475569' }}>{inv.customer}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>{inv.date}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#b45309' }}>{inv.amount}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.75rem', fontWeight: 600 }}>
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BillingModule;
