import React from 'react';

interface MetalTurnoverPurityViewProps {
  kpiMetrics: any;
}

export const MetalTurnoverPurityView: React.FC<MetalTurnoverPurityViewProps> = ({ kpiMetrics }) => {
  const g = kpiMetrics.overallMetalPuritySummary?.gold || {};
  const s = kpiMetrics.overallMetalPuritySummary?.silver || {};

  const fmtCash = (num: number) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtWt = (num: number) => Number(num || 0).toFixed(3);

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <i className="fa-solid fa-scale-balanced" style={{ color: '#d97706', fontSize: '0.70rem' }} />
        Metal Turnover & Purity
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.45rem' }}>
        {/* GOLD SOLD */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#fffbe6', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>🥇</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#92400e' }}>Gold Sold: <strong>{fmtWt(g.soldGross)}g</strong> <span style={{ fontSize: '0.55rem', fontWeight: 600 }}>(Item Wt)</span></span>
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>
            → {fmtWt(g.soldGross)}g sold
          </span>
        </div>

        {/* GOLD BOUGHT */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>⚖️</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#854d0e' }}>Gold buy: <strong>{fmtWt(g.boughtGross)}g</strong> <span style={{ fontSize: '0.55rem', fontWeight: 600 }}>(Item Wt)</span></span>
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#a16207', background: '#fef9c3', padding: '1px 5px', borderRadius: '4px' }}>
            → {fmtWt(g.boughtNet || g.boughtGross)}g Net → {fmtWt(g.boughtPure || g.boughtGross)}g Pure
          </span>
        </div>

        {/* SILVER SOLD */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>🥈</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#0369a1' }}>Silver Sold: <strong>{fmtWt(s.soldGross)}g</strong> <span style={{ fontSize: '0.55rem', fontWeight: 600 }}>(Item Wt)</span></span>
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '1px 5px', borderRadius: '4px' }}>
            → {fmtWt(s.soldGross)}g sold
          </span>
        </div>

        {/* SILVER BOUGHT */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>🥈</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#334155' }}>Silver buy: <strong>{fmtWt(s.boughtGross)}g</strong> <span style={{ fontSize: '0.55rem', fontWeight: 600 }}>(Item Wt)</span></span>
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
            → {fmtWt(s.boughtNet || s.boughtGross)}g Net → {fmtWt(s.boughtPure || s.boughtGross)}g Pure
          </span>
        </div>

        {/* CASH GOT FROM CUSTOMERS */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>💵</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#15803d' }}>Cash Got From Customers:</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#15803d' }}>+₹{fmtCash(kpiMetrics.cashGotFromCustomer)}</strong>
        </div>

        {/* CASH GIVEN TO CUSTOMERS */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>💸</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#b91c1c' }}>Cash Given To Customers:</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#b91c1c' }}>-₹{fmtCash(kpiMetrics.cashGivenToCustomer)}</strong>
        </div>

        {/* CASH GOT FROM FINANCE */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#ccfbf1', border: '1px solid #99f6e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>🏦</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#0f766e' }}>Cash Got From Finance:</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#0f766e' }}>+₹{fmtCash(kpiMetrics.cashGotFromFinance)}</strong>
        </div>

        {/* CASH GIVEN TO FINANCE */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#fff7ed', border: '1px solid #ffedd5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>🪵</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#c2410c' }}>Cash Given To Finance:</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#c2410c' }}>-₹{fmtCash(kpiMetrics.cashGivenToFinance)}</strong>
        </div>
      </div>
    </div>
  );
};
