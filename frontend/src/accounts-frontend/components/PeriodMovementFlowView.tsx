import React from 'react';

interface PeriodMovementFlowViewProps {
  kpiMetrics: any;
  cashSummary?: any;
  dayBookStockSummary?: any[];
  dateFilterMode: string;
  kpiDrillFilter3?: string | null;
  setKpiDrillFilter3?: (filter: string | null) => void;
}

export const PeriodMovementFlowView: React.FC<PeriodMovementFlowViewProps> = ({
  kpiMetrics,
  cashSummary,
  dayBookStockSummary = [],
  dateFilterMode,
  kpiDrillFilter3,
  setKpiDrillFilter3,
}) => {
  const fmtCash = (num: number) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtWt = (num: number) => Number(num || 0).toFixed(3);

  // 1. Showcase Stock / Opening Stock
  const opGold = Number((dayBookStockSummary || []).find((s: any) => (s.category || '').includes('Gold'))?.openingWeight ?? 0);
  const opSilver = Number((dayBookStockSummary || []).find((s: any) => (s.category || '').includes('Silver'))?.openingWeight ?? 0);

  // 2. Inflows (Buy scrap, Trade-in scrap, Order scrap)
  const goldIn = Number(kpiMetrics.goldIn || kpiMetrics.overallMetalPuritySummary?.gold?.boughtGross || 0);
  const silverIn = Number(kpiMetrics.silverIn || kpiMetrics.overallMetalPuritySummary?.silver?.boughtGross || 0);

  // 3. Outflows (Direct Sells, Trade-in Sells, Delivered Orders)
  const goldOut = Number(kpiMetrics.goldOut || kpiMetrics.overallMetalPuritySummary?.gold?.soldGross || 0);
  const silverOut = Number(kpiMetrics.silverOut || kpiMetrics.overallMetalPuritySummary?.silver?.soldGross || 0);

  // 4. Worker transfers
  const goldGivenToWorkers = Number(kpiMetrics.goldGivenToWorker || 0);
  const silverGivenToWorkers = Number(kpiMetrics.silverGivenToWorker || 0);
  const goldFromWorkers = Number(kpiMetrics.goldTakenFromWorker || 0);
  const silverFromWorkers = Number(kpiMetrics.silverTakenFromWorker || 0);

  // --- EXACT USER FORMULA WITH 3-DECIMAL PRECISION ---
  const totalGoldBal = Number((opGold + goldIn - goldOut - goldGivenToWorkers + goldFromWorkers).toFixed(3));
  const totalSilverBal = Number((opSilver + silverIn - silverOut - silverGivenToWorkers + silverFromWorkers).toFixed(3));

  const openingCashVal = Number(cashSummary?.openingCash ?? 0);
  const cashInVal = Number(kpiMetrics.cashIn || 0);
  const cashOutVal = Number(kpiMetrics.cashOut || 0);
  const totalCashBal = Number((openingCashVal + cashInVal - cashOutVal).toFixed(2));
  const mainCashVal = totalCashBal;
  const totalFinanceVal = Number(kpiMetrics.totalFinanceIssued || 0);
  const gotFinanceVal = Number(kpiMetrics.cashGotFromFinance || 0);

  const modeLabel = dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'ALL' ? 'All Time' : 'Range';

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0.5rem 0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <i className="fa-solid fa-arrows-split-up-and-left" style={{ color: '#0284c7', fontSize: '0.70rem' }} />
          Period Movement & Flow
        </div>
        <span style={{ fontSize: '0.55rem', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '10px' }}>
          ({modeLabel})
        </span>
      </div>

      {/* 2X2 MATRIX GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.55rem' }}>
        {/* 1. CASH FLOW */}
        <div
          onClick={() => setKpiDrillFilter3 && setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_CASH' ? null : 'PERIOD_CASH')}
          style={{
            background: kpiDrillFilter3 === 'PERIOD_CASH' ? '#d1fae5' : '#f0fdf4',
            border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_CASH' ? '#22c55e' : '#a7f3d0'}`,
            borderRadius: '10px',
            padding: '8px 10px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter3 === 'PERIOD_CASH' ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💵 Cash Flow (Current Cash)</span>
            {kpiDrillFilter3 === 'PERIOD_CASH' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.50rem' }} />}
          </div>
          <div style={{ fontSize: '1.00rem', fontWeight: 900, color: '#065f46', margin: '2px 0 1px 0' }}>
            ₹{fmtCash(mainCashVal)}
          </div>
          <div style={{ fontSize: '0.52rem', color: '#047857', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
            <div>Opening: ₹{fmtCash(openingCashVal)}</div>
            <div style={{ color: '#15803d', fontWeight: 700 }}>Cash In: +₹{fmtCash(cashInVal)}</div>
            <div style={{ color: '#b91c1c', fontWeight: 700 }}>Cash Out: -₹{fmtCash(cashOutVal)}</div>
          </div>
        </div>

        {/* 2. FINANCE LOANS */}
        <div
          onClick={() => setKpiDrillFilter3 && setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_FINANCE' ? null : 'PERIOD_FINANCE')}
          style={{
            background: kpiDrillFilter3 === 'PERIOD_FINANCE' ? '#ccfbf1' : '#f0fdfa',
            border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_FINANCE' ? '#14b8a6' : '#99f6e4'}`,
            borderRadius: '10px',
            padding: '8px 10px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter3 === 'PERIOD_FINANCE' ? '0 0 0 2px rgba(20,184,166,0.2)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0f766e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💰 Finance</span>
            {kpiDrillFilter3 === 'PERIOD_FINANCE' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.50rem' }} />}
          </div>
          <div style={{ fontSize: '1.00rem', fontWeight: 900, color: '#115e59', margin: '2px 0 1px 0' }}>
            ₹{fmtCash(totalFinanceVal)}
          </div>
          <div style={{ fontSize: '0.52rem', color: '#0f766e', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
            <div style={{ color: '#047857', fontWeight: 700 }}>
              Finance cleared count : {kpiMetrics.financeClearedCount || 0} (₹{fmtCash(gotFinanceVal)})
            </div>
            <div style={{ color: '#0f766e', fontWeight: 700 }}>
              Finance taken count : {kpiMetrics.financeTakenCount || 0} (₹{fmtCash(totalFinanceVal)})
            </div>
          </div>
        </div>

        {/* 3. GOLD FLOW */}
        <div
          onClick={() => setKpiDrillFilter3 && setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_GOLD' ? null : 'PERIOD_GOLD')}
          style={{
            background: kpiDrillFilter3 === 'PERIOD_GOLD' ? '#fef3c7' : '#fffbe6',
            border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_GOLD' ? '#f59e0b' : '#fde68a'}`,
            borderRadius: '10px',
            padding: '8px 10px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter3 === 'PERIOD_GOLD' ? '0 0 0 2px rgba(245,158,11,0.2)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🥇 Gold Flow</span>
            {kpiDrillFilter3 === 'PERIOD_GOLD' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.50rem' }} />}
          </div>
          <div style={{ fontSize: '1.00rem', fontWeight: 900, color: '#92400e', margin: '2px 0 1px 0' }}>
            {fmtWt(totalGoldBal)}g
          </div>
          <div style={{ fontSize: '0.52rem', color: '#b45309', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
            <div>Opening: {fmtWt(opGold)}g</div>
            <div style={{ color: '#15803d', fontWeight: 700 }}>+ In (Buy, Trade-in, Order): +{fmtWt(goldIn)}g</div>
            <div style={{ color: '#b91c1c', fontWeight: 700 }}>- Out (Sells, Orders): -{fmtWt(goldOut)}g</div>
            <div style={{ color: '#b91c1c', fontWeight: 700 }}>- To Workers: -{fmtWt(goldGivenToWorkers)}g</div>
            <div style={{ color: '#047857', fontWeight: 700 }}>+ From Workers: +{fmtWt(goldFromWorkers)}g</div>
          </div>
        </div>

        {/* 4. SILVER FLOW */}
        <div
          onClick={() => setKpiDrillFilter3 && setKpiDrillFilter3(kpiDrillFilter3 === 'PERIOD_SILVER' ? null : 'PERIOD_SILVER')}
          style={{
            background: kpiDrillFilter3 === 'PERIOD_SILVER' ? '#e0f2fe' : '#f0f9ff',
            border: `1.5px solid ${kpiDrillFilter3 === 'PERIOD_SILVER' ? '#0284c7' : '#bae6fd'}`,
            borderRadius: '10px',
            padding: '8px 10px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter3 === 'PERIOD_SILVER' ? '0 0 0 2px rgba(2,132,199,0.2)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0369a1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🥈 Silver Flow</span>
            {kpiDrillFilter3 === 'PERIOD_SILVER' && <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.50rem' }} />}
          </div>
          <div style={{ fontSize: '1.00rem', fontWeight: 900, color: '#075985', margin: '2px 0 1px 0' }}>
            {fmtWt(totalSilverBal)}g
          </div>
          <div style={{ fontSize: '0.52rem', color: '#0369a1', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '3px' }}>
            <div>Opening: {fmtWt(opSilver)}g</div>
            <div style={{ color: '#15803d', fontWeight: 700 }}>+ In (Buy, Trade-in, Order): +{fmtWt(silverIn)}g</div>
            <div style={{ color: '#b91c1c', fontWeight: 700 }}>- Out (Sells, Orders): -{fmtWt(silverOut)}g</div>
            <div style={{ color: '#b91c1c', fontWeight: 700 }}>- To Workers: -{fmtWt(silverGivenToWorkers)}g</div>
            <div style={{ color: '#047857', fontWeight: 700 }}>+ From Workers: +{fmtWt(silverFromWorkers)}g</div>
          </div>
        </div>
      </div>
    </div>
  );
};
