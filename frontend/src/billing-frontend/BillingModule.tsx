import React, { useState } from 'react';
import { useWindowWidth } from '../utils/useWindowWidth';

export const BillingModule: React.FC = () => {
  const width = useWindowWidth();
  const isMobile = width < 768;

  const [invoices] = useState([
    { id: 'INV-1092', customer: 'Ananya Reddy',  date: '07 Aug 2026', amount: '₹1,35,000', status: 'Paid' },
    { id: 'INV-1091', customer: 'Priya Sharma',  date: '06 Aug 2026', amount: '₹89,500',   status: 'Paid' },
    { id: 'INV-1090', customer: 'Rohan Mehta',   date: '05 Aug 2026', amount: '₹45,000',   status: 'Paid' },
  ]);

  return (
    <div>
      {/* Section Header */}
      <div style={{ marginBottom: isMobile ? '1.25rem' : '1.5rem' }}>
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          color: '#0f172a',
          fontWeight: 700,
          margin: 0,
        }}>
          Billing &amp; Invoicing
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Manage customer invoices and billing history
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: isMobile ? '1rem' : '2rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
      }}>
        {/* Card header row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '1.25rem',
        }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', color: '#0f172a' }}>
            Recent Billing Statements
          </h3>
          <button style={{
            padding: isMobile ? '8px 14px' : '8px 16px',
            background: '#b45309',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            + New Invoice
          </button>
        </div>

        {/* Horizontally scrollable table */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{
            width: '100%',
            minWidth: '520px',   /* prevents crushing below 520px */
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: isMobile ? '0.82rem' : '0.9rem',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: isMobile ? '10px 12px' : '12px 16px', fontWeight: 600 }}>Invoice ID</th>
                <th style={{ padding: isMobile ? '10px 12px' : '12px 16px', fontWeight: 600 }}>Customer</th>
                <th style={{ padding: isMobile ? '10px 12px' : '12px 16px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: isMobile ? '10px 12px' : '12px 16px', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: isMobile ? '10px 12px' : '12px 16px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: isMobile ? '10px 12px' : '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {inv.id}
                  </td>
                  <td style={{ padding: isMobile ? '10px 12px' : '12px 16px', color: '#475569' }}>
                    {inv.customer}
                  </td>
                  <td style={{ padding: isMobile ? '10px 12px' : '12px 16px', color: '#64748b' }}>
                    {inv.date}
                  </td>
                  <td style={{ padding: isMobile ? '10px 12px' : '12px 16px', fontWeight: 600, color: '#b45309' }}>
                    {inv.amount}
                  </td>
                  <td style={{ padding: isMobile ? '10px 12px' : '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingModule;
