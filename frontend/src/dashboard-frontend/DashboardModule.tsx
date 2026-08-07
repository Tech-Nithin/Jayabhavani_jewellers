import React from 'react';
import { useWindowWidth } from '../utils/useWindowWidth';

interface DashboardModuleProps {
  user: { name: string; email: string };
  productList: any[];
  collectionsList: any[];
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ user, productList, collectionsList }) => {
  const width = useWindowWidth();
  const isMobile = width < 768;

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: isMobile ? '1.1rem' : '1.5rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
  };

  return (
    <div>
      {/* Section Header */}
      <div style={{ marginBottom: isMobile ? '1.25rem' : '1.75rem' }}>
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          color: '#0f172a',
          fontWeight: 700,
          margin: 0,
        }}>
          Dashboard Overview
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Key metrics &amp; performance summary
        </p>
      </div>

      {/* Metric Cards — 1 col on mobile, 2 on tablet, 4 on desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? '1fr 1fr'
          : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: isMobile ? '0.875rem' : '1.5rem',
        marginBottom: isMobile ? '1.5rem' : '2.5rem',
      }}>
        {[
          { title: 'Total Items',        value: productList.length,       note: 'Rings · Necklaces · Earrings' },
          { title: 'Collections',        value: collectionsList.length,   note: '5 Exclusive Categories' },
          { title: 'Monthly Revenue',    value: '₹18,45,000',             note: '+12% from last month' },
          { title: 'Admin',              value: user.name,                 note: user.email },
        ].map((card, idx) => (
          <div key={idx} style={cardStyle}>
            <span style={{
              fontSize: '0.7rem',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600,
            }}>
              {card.title}
            </span>
            <div style={{
              fontSize: isMobile ? '1.35rem' : '1.75rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '8px 0 4px 0',
              wordBreak: 'break-word',
            }}>
              {card.value}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', wordBreak: 'break-word' }}>
              {card.note}
            </span>
          </div>
        ))}
      </div>

      {/* Featured Products Summary */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: isMobile ? '1rem' : '1.5rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
      }}>
        <h3 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: isMobile ? '1rem' : '1.1rem',
          color: '#0f172a',
          fontWeight: 600,
          marginBottom: '1rem',
          marginTop: 0,
        }}>
          Top Performing Products
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: isMobile ? '0.75rem' : '1rem',
        }}>
          {productList.slice(0, 4).map((p: any) => (
            <div key={p.id} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              padding: '12px',
              borderRadius: '12px',
            }}>
              <img
                src={p.img}
                alt={p.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>
                  ₹{p.price.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
