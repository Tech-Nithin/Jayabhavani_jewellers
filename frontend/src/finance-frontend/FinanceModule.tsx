import React from 'react';
import { useWindowWidth } from '../utils/useWindowWidth';

export const FinanceModule: React.FC = () => {
  const width = useWindowWidth();
  const isMobile = width < 768;

  const cards = [
    { label: 'Total Revenue YTD',    value: '₹2.45 Cr',    change: '+18% vs last year' },
    { label: 'Pending Receivables',  value: '₹3,20,000',   change: '4 outstanding invoices' },
    { label: 'Gold Bullion Reserves', value: '14.2 kg',    change: '99.9% 24K Purity' },
  ];

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
          Financial Management
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Accounts, revenue reports, and payment analytics
        </p>
      </div>

      {/* Finance Cards — 1 col on mobile, fluid auto-fit on larger */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: isMobile ? '0.875rem' : '1.5rem',
        marginBottom: isMobile ? '1.5rem' : '2rem',
      }}>
        {cards.map((f, i) => (
          <div key={i} style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: isMobile ? '1.1rem' : '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}>
            <span style={{
              fontSize: '0.72rem',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600,
            }}>
              {f.label}
            </span>
            <div style={{
              fontSize: isMobile ? '1.5rem' : '1.75rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '8px 0 4px 0',
            }}>
              {f.value}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>
              {f.change}
            </span>
          </div>
        ))}
      </div>

      {/* Placeholder for chart / detailed report */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: isMobile ? '1.25rem' : '2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '0.9rem',
      }}>
        Detailed financial reports &amp; charts coming soon. Connect your accounting module to view live analytics.
      </div>
    </div>
  );
};

export default FinanceModule;
