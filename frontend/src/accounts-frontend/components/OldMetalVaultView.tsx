import React, { useState } from 'react';

interface OldMetalVaultProps {
  scrapSummary: {
    oldGoldBoughtWeight: number;
    oldSilverBoughtWeight: number;
    totalScrapPayout: number;
  };
  oldMetalVaultItems: any[];
}

export const OldMetalVaultView: React.FC<OldMetalVaultProps> = ({ scrapSummary, oldMetalVaultItems }) => {
  const [metalFilter, setMetalFilter] = useState<'ALL' | 'GOLD' | 'SILVER'>('ALL');

  if (!scrapSummary) return null;

  // Calculate Average Purity % and Total Pure Fine Metal Weight (Gross Weight * Avg Purity %)
  let totalGoldGross = 0;
  let totalGoldPure = 0;
  let goldItemCount = 0;

  let totalSilverGross = 0;
  let totalSilverPure = 0;
  let silverItemCount = 0;

  oldMetalVaultItems.forEach((sc) => {
    const metalType = (sc.metal_type || sc.category || 'GOLD').toUpperCase();
    const gross = Number(sc.gross_weight || 0);
    const pure = Number(sc.pure_weight || 0);

    if (metalType.includes('SILVER')) {
      totalSilverGross += gross;
      totalSilverPure += pure;
      silverItemCount += 1;
    } else {
      totalGoldGross += gross;
      totalGoldPure += pure;
      goldItemCount += 1;
    }
  });

  // Average Purity %
  const avgGoldPurity = totalGoldGross > 0 ? (totalGoldPure / totalGoldGross) * 100 : 0;
  const avgSilverPurity = totalSilverGross > 0 ? (totalSilverPure / totalSilverGross) * 100 : 0;

  // Pure Fine Weight (Gold Weight * Avg Purity % = Total Pure Weight)
  const pureGoldWeight = totalGoldPure > 0 ? totalGoldPure : (scrapSummary.oldGoldBoughtWeight * (avgGoldPurity / 100));
  const pureSilverWeight = totalSilverPure > 0 ? totalSilverPure : (scrapSummary.oldSilverBoughtWeight * (avgSilverPurity / 100));

  const filteredScrapItems = oldMetalVaultItems
    .filter((sc) => {
      const metalType = (sc.metal_type || sc.category || 'GOLD').toUpperCase();
      if (metalFilter === 'GOLD') return metalType.includes('GOLD');
      if (metalFilter === 'SILVER') return metalType.includes('SILVER');
      return true;
    })
    .sort((a: any, b: any) => {
      const timeA = new Date(a.bill_date ? `${String(a.bill_date).split('T')[0]}T12:00:00` : (a.created_at || a.date || 0)).getTime();
      const timeB = new Date(b.bill_date ? `${String(b.bill_date).split('T')[0]}T12:00:00` : (b.created_at || b.date || 0)).getTime();
      return timeB - timeA;
    });

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
        <i className="fa-solid fa-vault" style={{ color: '#d97706', marginRight: '8px' }}></i>
        Customer Old Metal Purchases & buy Vault Ledger
      </h3>

      {/* Top KPI Summary Cards with Average Purity % and Pure Fine Weight */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Old Gold Vault Card */}
        <div style={{ padding: '14px 16px', background: '#fffbeb', borderRadius: '14px', border: '1px solid #fef3c7' }}>
          <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>🥇 Old Gold Gross Weight</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {scrapSummary.oldGoldBoughtWeight.toFixed(3)} g
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '6px', fontWeight: 800, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div>✨ Avg Purity: <strong>{avgGoldPurity.toFixed(1)}%</strong></div>
            <div>🌟 Pure Fine Wt (99.9): <strong>{pureGoldWeight.toFixed(3)} g</strong></div>
          </div>
        </div>

        {/* Old Silver Vault Card */}
        <div style={{ padding: '14px 16px', background: '#f0f9ff', borderRadius: '14px', border: '1px solid #bae6fd' }}>
          <span style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 700 }}>🥈 Old Silver Gross Weight</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {scrapSummary.oldSilverBoughtWeight.toFixed(3)} g
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '6px', fontWeight: 800, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div>✨ Avg Purity: <strong>{avgSilverPurity.toFixed(1)}%</strong></div>
            <div>🌟 Pure Fine Wt (99.9): <strong>{pureSilverWeight.toFixed(3)} g</strong></div>
          </div>
        </div>

        {/* Total Payout Paid to Customers Card */}
        <div style={{ padding: '14px 16px', background: '#fef2f2', borderRadius: '14px', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700 }}>💵 Total Scrap Cash Paid</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
            ₹{scrapSummary.totalScrapPayout.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '6px', fontWeight: 800 }}>
            Scrap Buy Vault Accounts Ledger
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#334155', fontWeight: 800 }}>
          Scrap Metal Receipts ({filteredScrapItems.length} items)
        </h4>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setMetalFilter('ALL')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              background: metalFilter === 'ALL' ? '#0f172a' : '#f1f5f9',
              color: metalFilter === 'ALL' ? '#ffffff' : '#64748b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-layer-group"></i> All Metals
          </button>

          <button
            type="button"
            onClick={() => setMetalFilter('GOLD')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              background: metalFilter === 'GOLD' ? '#d97706' : '#f1f5f9',
              color: metalFilter === 'GOLD' ? '#ffffff' : '#64748b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-gem"></i> Gold
          </button>

          <button
            type="button"
            onClick={() => setMetalFilter('SILVER')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              background: metalFilter === 'SILVER' ? '#0284c7' : '#f1f5f9',
              color: metalFilter === 'SILVER' ? '#ffffff' : '#64748b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-coins"></i> Silver
          </button>
        </div>
      </div>

      {filteredScrapItems.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
          No customer {metalFilter === 'ALL' ? 'scrap' : metalFilter.toLowerCase()} items were bought in this period.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table-responsive-font" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '14px 12px' }}>S.No</th>
                <th style={{ padding: '14px 12px' }}>Date & Time (IST)</th>
                <th style={{ padding: '14px 12px' }}>Customer Name</th>
                <th style={{ padding: '14px 12px' }}>Phone</th>
                <th style={{ padding: '14px 12px' }}>Metal</th>
                <th style={{ padding: '14px 12px' }}>Scrap Item</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Gross Weight</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Purity %</th>
                <th style={{ padding: '14px 12px', textAlign: 'right', color: '#166534', background: '#f0fdf4' }}>Pure Metal Wt</th>
              </tr>
            </thead>
            <tbody>
              {filteredScrapItems.map((sc, idx) => {
                const metalType = (sc.metal_type || sc.category || 'GOLD').toUpperCase();
                const isGold = metalType.includes('GOLD');
                const billDateStr = sc.bill_date || (sc.created_at ? sc.created_at.split('T')[0] : sc.date);
                let createdStr = '-';
                if (billDateStr) {
                  try {
                    const d = new Date(`${String(billDateStr).split('T')[0]}T12:00:00`);
                    const datePart = d.toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                    const timePart = sc.created_at
                      ? new Date(sc.created_at).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                      : '';
                    createdStr = timePart ? `${datePart} ${timePart}` : datePart;
                  } catch {
                    createdStr = String(billDateStr);
                  }
                }

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>{createdStr}</td>
                    <td style={{ padding: '14px 12px', fontWeight: 800, color: '#0f172a' }}>{sc.customer_name}</td>
                    <td style={{ padding: '14px 12px', color: '#475569' }}>{sc.customer_phone || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ fontSize: '0.70rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: isGold ? '#fffbe6' : '#f0f9ff', color: isGold ? '#b45309' : '#0284c7', border: `1px solid ${isGold ? '#fde68a' : '#bae6fd'}` }}>
                        {isGold ? '🥇 Gold' : '🥈 Silver'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: isGold ? '#b45309' : '#0369a1' }}>
                      {sc.item_name}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {Number(sc.gross_weight || 0).toFixed(3)} g
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 700, color: '#d97706', whiteSpace: 'nowrap' }}>
                      {Number(sc.purity_percentage || 0).toFixed(1)}%
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, color: '#166534', background: '#f0fdf4', whiteSpace: 'nowrap' }}>
                      {Number(sc.pure_weight || 0).toFixed(3)} g
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
