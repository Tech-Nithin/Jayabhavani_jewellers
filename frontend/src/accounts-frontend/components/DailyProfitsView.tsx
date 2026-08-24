import React from 'react';

interface DailyProfitsProps {
  profitSummary: {
    makingChargesProfit: number;
    metalMarginProfit: number;
    dailyExpenses: number;
    netProfit: number;
  };
}

export const DailyProfitsView: React.FC<DailyProfitsProps> = ({ profitSummary }) => {
  if (!profitSummary) return null;

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
        <i className="fa-solid fa-chart-line" style={{ color: '#166534', marginRight: '8px' }}></i>
        Daily End-Of-Day Net Profit Engine
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>(+) Making Charges / Vasti Earned Today:</span>
          <strong>+₹{profitSummary.makingChargesProfit.toLocaleString('en-IN')}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>(+) Estimated Metal Rate Margin Profit:</span>
          <strong>+₹{profitSummary.metalMarginProfit.toLocaleString('en-IN')}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
          <span>(-) Daily Shop Expenses:</span>
          <strong>-₹{profitSummary.dailyExpenses.toLocaleString('en-IN')}</strong>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: '#166534', fontWeight: 800 }}>
          <span>🏆 TODAY'S NET PROFIT:</span>
          <span>₹{profitSummary.netProfit.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
};
