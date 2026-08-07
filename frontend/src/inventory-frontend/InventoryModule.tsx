import React from 'react';

interface InventoryModuleProps {
  productList: any[];
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ productList }) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
            Inventory Management ({productList.length} Items)
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Track stock availability, categories, and retail pricing
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Item</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Price</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            {productList.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img src={item.img} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                </td>
                <td style={{ padding: '12px 20px', color: '#64748b' }}>{item.category}</td>
                <td style={{ padding: '12px 20px', color: '#0f172a', fontWeight: 600 }}>₹{item.price.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.75rem', fontWeight: 600 }}>
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
