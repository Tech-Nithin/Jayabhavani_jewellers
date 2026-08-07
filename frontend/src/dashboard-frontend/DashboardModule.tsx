import React from 'react';

interface DashboardModuleProps {
  user: { name: string; email: string };
  productList: any[];
  collectionsList: any[];
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ user, productList, collectionsList }) => {
  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
          Dashboard Overview
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Key metrics & performance summary
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { title: 'Total Inventory Items', value: productList.length, note: 'Rings, Necklaces, Earrings, Nose Pins' },
          { title: 'Active Collections', value: collectionsList.length, note: '5 Exclusive Categories' },
          { title: 'Monthly Revenue', value: '₹18,45,000', note: '+12% from last month' },
          { title: 'Registered Admin', value: user.name, note: user.email },
        ].map((card, idx) => (
          <div 
            key={idx}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              {card.title}
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px 0' }}>
              {card.value}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {card.note}
            </span>
          </div>
        ))}
      </div>

      {/* Featured Products Summary */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
        <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: '#0f172a', fontWeight: 600, marginBottom: '1.25rem', marginTop: 0 }}>
          Top Performing Products
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {productList.slice(0, 4).map((p: any) => (
            <div key={p.id} style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#f8fafc', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '12px' }}>
              <img src={p.img} alt={p.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>₹{p.price.toLocaleString('en-IN')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
