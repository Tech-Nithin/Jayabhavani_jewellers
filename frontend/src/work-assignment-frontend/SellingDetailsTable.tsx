import React from 'react';
import { getWorkAssignmentTranslation, type Language } from './workAssignmentTranslations';

interface SellingDetailsTableProps {
  invoices: any[];
  loading: boolean;
  searchTerm?: string;
  onAssignClick: (item: any) => void;
  lang?: Language;
}

export const SellingDetailsTable: React.FC<SellingDetailsTableProps> = ({
  invoices,
  loading,
  searchTerm = '',
  onAssignClick,
  lang = 'EN',
}) => {
  const t = getWorkAssignmentTranslation(lang);

  const filtered = invoices.filter((item) => {
    const q = searchTerm.toLowerCase();
    const name = (item.customer_name || '').toLowerCase();
    const phone = (item.customer_phone || '').toLowerCase();
    const address = (item.customer_address || '').toLowerCase();
    const product = (item.product_name || '').toLowerCase();
    const metal = (item.metal_type || '').toLowerCase();

    return (
      name.includes(q) ||
      phone.includes(q) ||
      address.includes(q) ||
      product.includes(q) ||
      metal.includes(q)
    );
  });

  const formatWeight = (w: number): string => {
    if (w % 1 === 0) return `${w.toFixed(1)}g`;
    const str = w.toString();
    const decimalPart = str.split('.')[1] || '';
    if (decimalPart.length > 1) {
      return `${w.toFixed(3)}g`;
    }
    return `${w.toFixed(1)}g`;
  };

  const formatAmount = (amt: number): string => {
    if (amt % 1 === 0) {
      return amt.toLocaleString('en-IN');
    } else {
      return amt.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }
  };

  const formatDateTimeStacked = (isoString?: string) => {
    if (!isoString) return { dateStr: '-', timeStr: '' };
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { dateStr: isoString, timeStr: '' };

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return { dateStr, timeStr };
  };

  const getMetalBadgeStyle = (metal: string) => {
    const isGold = metal.toUpperCase() === 'GOLD';
    return {
      fontSize: '0.60rem',
      fontWeight: 700,
      padding: '2px 5px',
      borderRadius: '3px',
      background: isGold ? '#fffbeb' : '#f1f5f9',
      color: isGold ? '#b45309' : '#475569',
      border: isGold ? '1px solid #fde68a' : '1px solid #cbd5e1',
      display: 'inline-block',
      lineHeight: 1,
    };
  };

  const getProductDisplay = (inv: any) => {
    const items: any[] = inv.receipt_json_data?.items || [];
    const sellItems = items.filter((i: any) => (i.item_type || 'SELL').toUpperCase() === 'SELL');

    if (sellItems.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sellItems.map((item: any, i: number) => {
            const itemMetal = (item.metal_type || 'GOLD').toUpperCase();
            const pName = item.product_name || `${itemMetal} Item`;
            return (
              <div key={i} style={{ fontSize: '0.74rem', color: '#334155', display: 'flex', alignItems: 'center' }}>
                <span style={getMetalBadgeStyle(itemMetal)}>{itemMetal}</span>&nbsp;
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{pName}</span>
              </div>
            );
          })}
        </div>
      );
    }

    const metal = (inv.metal_type || 'GOLD').toUpperCase();
    const name = inv.product_name || 'Jewelry Item';
    return (
      <div style={{ fontSize: '0.74rem', color: '#334155', display: 'flex', alignItems: 'center' }}>
        <span style={getMetalBadgeStyle(metal)}>{metal}</span>&nbsp;
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span>
      </div>
    );
  };

  const getWeightDisplay = (inv: any) => {
    const items: any[] = inv.receipt_json_data?.items || [];
    const sellItems = items.filter((i: any) => (i.item_type || 'SELL').toUpperCase() === 'SELL');

    if (sellItems.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          {sellItems.map((item: any, i: number) => (
            <span key={i} style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 500 }}>
              {formatWeight(Number(item.weight_grams) || 0)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <span style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 500 }}>
        {formatWeight(Number(inv.weight_grams) || 0)}
      </span>
    );
  };

  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e6decb', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr style={{ background: '#f4ede4', borderBottom: '1px solid #e6decb', color: '#4a3e35', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '10%' }}># / MODE</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '14%' }}>DATE & TIME</th>
            <th style={{ padding: '0.65rem 0.75rem', width: '24%' }}>CUSTOMER</th>
            <th style={{ padding: '0.65rem 0.75rem', width: '28%' }}>{t.itemCol}</th>
            <th style={{ padding: '0.65rem 0.65rem', textAlign: 'center', width: '11%' }}>WEIGHT</th>
            <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', width: '13%' }}>FINAL AMOUNT</th>
            <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', width: '12%' }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px', color: '#d97706' }}></i>
                Loading sales details from database...
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                No selling records found in the system.
              </td>
            </tr>
          ) : (
            filtered.map((item, idx) => {
              const { dateStr, timeStr } = formatDateTimeStacked(item.created_at);
              const addressStr = item.customer_address || item.receipt_json_data?.customer_address || 'N/A';
              const finalAmt = Number(item.final_amount) || 0;

              return (
                <tr
                  key={item.id}
                  style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fcf0c5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc'; }}
                >
                  {/* 1. Index & MODE Badge */}
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500, marginBottom: '2px' }}>#{idx + 1}</div>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '5px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        display: 'inline-block',
                      }}
                    >
                      SELL
                    </span>
                  </td>

                  {/* 2. Date & Time */}
                  <td style={{ padding: '0.55rem 0.4rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </div>
                      {timeStr && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 500, color: '#6366f1', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <i className="fa-regular fa-clock" style={{ fontSize: '0.58rem' }}></i>
                          {timeStr}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 3. Customer */}
                  <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem', letterSpacing: '-0.2px' }}>
                      {item.customer_name}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px', fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>
                      {item.customer_phone && item.customer_phone !== '-' && (
                        <span>
                          <i className="fa-solid fa-phone" style={{ color: '#0284c7', fontSize: '0.62rem', marginRight: '2px' }}></i>
                          {item.customer_phone}
                        </span>
                      )}
                      <span>
                        <i className="fa-solid fa-location-dot" style={{ color: '#ef4444', fontSize: '0.62rem', marginRight: '2px' }}></i>
                        {addressStr}
                      </span>
                    </div>
                  </td>

                  {/* 4. Product Category and Name */}
                  <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle' }}>
                    {getProductDisplay(item)}
                  </td>

                  {/* 5. Weight */}
                  <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    {getWeightDisplay(item)}
                  </td>

                  {/* 6. Final Amount */}
                  <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                      ₹{formatAmount(finalAmt)}
                    </div>
                    <div style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>
                      (Customer should pay)
                    </div>
                  </td>

                  {/* 7. Action Button */}
                  <td style={{ padding: '0.65rem 0.75rem', verticalAlign: 'middle', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignClick(item);
                      }}
                      style={{
                        padding: '5px 12px',
                        background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(180, 83, 9, 0.15)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(180, 83, 9, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(180, 83, 9, 0.15)';
                      }}
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
