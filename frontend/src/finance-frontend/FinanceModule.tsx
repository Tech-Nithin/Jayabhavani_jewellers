import React from 'react';

export const FinanceModule: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
          Financial Management
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Accounts, revenue reports, and payment analytics
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Revenue YTD', value: '₹2.45 Cr', change: '+18% vs last year' },
          { label: 'Pending Receivables', value: '₹3,20,000', change: '4 outstanding invoices' },
          { label: 'Gold Bullion Reserves', value: '14.2 kg', change: '99.9% 24K Purity' },
        ].map((f, i) => (
          <div key={i} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{f.label}</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px 0' }}>{f.value}</div>
            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>{f.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinanceModule;
