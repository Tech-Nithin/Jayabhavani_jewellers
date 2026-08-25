import React from 'react';

interface WorkerTransactionsKpiViewProps {
  kpiMetrics: any;
}

export const WorkerTransactionsKpiView: React.FC<WorkerTransactionsKpiViewProps> = ({ kpiMetrics }) => {
  const fmtCash = (num: number) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtWt = (num: number) => Number(num || 0).toFixed(3);

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <i className="fa-solid fa-users-gear" style={{ color: '#d97706', fontSize: '0.70rem' }} />
        Worker Transactions
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.45rem' }}>
        {/* GOLD GIVEN TO WORKER */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#fffbe6', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>🪵</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#92400e' }}>Gold Given to Worker</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#b45309' }}>{fmtWt(kpiMetrics.goldGivenToWorker)}g</strong>
        </div>

        {/* GOLD TAKEN FROM WORKER */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#fefce8', border: '1px solid #fef08a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>🪵</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#854d0e' }}>Gold Taken from Worker</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#a16207' }}>{fmtWt(kpiMetrics.goldTakenFromWorker)}g</strong>
        </div>

        {/* SILVER GIVEN TO WORKER */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#f0f9ff', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>⚒️</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#0369a1' }}>Silver Given to Worker</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#0284c7' }}>{fmtWt(kpiMetrics.silverGivenToWorker)}g</strong>
        </div>

        {/* SILVER TAKEN FROM WORKER */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>⚒️</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#334155' }}>Silver Taken from Worker</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#475569' }}>{fmtWt(kpiMetrics.silverTakenFromWorker)}g</strong>
        </div>

        {/* CASH GIVEN TO WORKER */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>💵</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#15803d' }}>Cash Given to Worker</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#15803d' }}>₹{fmtCash(kpiMetrics.cashGivenToWorker)}</strong>
        </div>

        {/* CASH TAKEN FROM WORKER */}
        <div style={{ padding: '5px 8px', borderRadius: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.75rem' }}>💵</span>
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#15803d' }}>Cash Taken from Worker</span>
          </div>
          <strong style={{ fontSize: '0.70rem', color: '#15803d' }}>₹{fmtCash(kpiMetrics.cashTakenFromWorker)}</strong>
        </div>
      </div>
    </div>
  );
};
