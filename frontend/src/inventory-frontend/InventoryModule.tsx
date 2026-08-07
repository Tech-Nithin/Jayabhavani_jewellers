import React from 'react';
import { useWindowWidth } from '../utils/useWindowWidth';

interface InventoryModuleProps {
  productList: any[];
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ productList }) => {
  const width = useWindowWidth();
  const isMobile = width < 768;

  return (
    <div>
      {/* Section Header */}
      <div style={{ marginBottom: isMobile ? '1.25rem' : '1.5rem' }}>
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: isMobile ? '1.2rem' : '1.5rem',
          color: '#0f172a',
          fontWeight: 700,
          margin: 0,
        }}>
          Inventory Management ({productList.length} Items)
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
          Track stock availability, categories, and retail pricing
        </p>
      </div>

      {/* Scrollable table container */}
      <div style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
      }}>
        <table style={{
          width: '100%',
          minWidth: '520px',    /* ensures table doesn't crush on narrow screens */
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: isMobile ? '0.82rem' : '0.9rem',
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
              <th style={{ padding: isMobile ? '12px 14px' : '14px 20px', fontWeight: 600 }}>Item</th>
              <th style={{ padding: isMobile ? '12px 14px' : '14px 20px', fontWeight: 600 }}>Category</th>
              <th style={{ padding: isMobile ? '12px 14px' : '14px 20px', fontWeight: 600 }}>Price</th>
              <th style={{ padding: isMobile ? '12px 14px' : '14px 20px', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {productList.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {/* Item cell — uses flexbox inside the td via an inner div */}
                <td style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={item.img}
                      alt={item.name}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        objectFit: 'cover',
                        border: '1px solid #e2e8f0',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{
                      fontWeight: 600,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: isMobile ? '120px' : '200px',
                    }}>
                      {item.name}
                    </span>
                  </div>
                </td>
                <td style={{ padding: isMobile ? '10px 14px' : '12px 20px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {item.category}
                </td>
                <td style={{
                  padding: isMobile ? '10px 14px' : '12px 20px',
                  color: '#0f172a',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  ₹{item.price.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
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
                    In Stock
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

export default InventoryModule;
