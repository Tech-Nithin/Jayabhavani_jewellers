import React from 'react';

interface TransactionActivityKpiCardsProps {
  kpiMetrics: any;
  kpiDrillFilter: 'ORDER' | 'SELL' | 'BUY' | 'EXCHANGE' | null;
  setKpiDrillFilter: (filter: 'ORDER' | 'SELL' | 'BUY' | 'EXCHANGE' | null) => void;
}

export const TransactionActivityKpiCards: React.FC<TransactionActivityKpiCardsProps> = ({
  kpiMetrics,
  kpiDrillFilter,
  setKpiDrillFilter,
}) => {
  const fmtWt = (num: number) => Number(num || 0).toFixed(3);

  return (
    <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', marginBottom: '0.90rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-chart-pie" style={{ color: '#d97706', fontSize: '0.80rem' }} />
          Transaction Activity
        </div>
        <span style={{ fontSize: '0.60rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '3px 9px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          Total: {kpiMetrics.totalTransactions} Bills Done
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
        {/* 1. ORDERS CARD */}
        <div
          onClick={() => setKpiDrillFilter(kpiDrillFilter === 'ORDER' ? null : 'ORDER')}
          style={{
            background: kpiDrillFilter === 'ORDER' ? '#fef3c7' : '#fffbe6',
            border: `1.5px solid ${kpiDrillFilter === 'ORDER' ? '#f59e0b' : '#fde68a'}`,
            borderRadius: '10px',
            padding: '9px 11px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter === 'ORDER' ? '0 0 0 2px rgba(245,158,11,0.2)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🛍️ Orders</span>
              {kpiDrillFilter === 'ORDER' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.55rem', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
            </div>
            <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#92400e', marginTop: '2px' }}>
              {kpiMetrics.orderCount} <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bills</span>
            </div>
            <div style={{ fontSize: '0.60rem', color: '#b45309', fontWeight: 700, margin: '2px 0 6px 0' }}>
              {kpiMetrics.orderMode ? `${kpiMetrics.orderMode.sellsCount || 0} Delivered Ornaments · ${kpiMetrics.orderMode.buysCount || 0} Scrap Buy` : 'Order items'}
            </div>
          </div>
          {/* Weight Breakdown */}
          {(() => {
            const m = kpiMetrics.orderMode;
            return (
              <div style={{ background: 'rgba(255,255,255,0.88)', padding: '4px 7px', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.58rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {(m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) && (
                  <div style={{ color: '#92400e' }}>
                    {m?.goldSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold Sold:</span><strong>{fmtWt(m.goldSoldGross)}g (Delivered)</strong></div>}
                    {m?.goldBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold buy:</span><strong>{fmtWt(m.goldBoughtGross)}g → {fmtWt(m.goldBoughtPure)}g Pure</strong></div>}
                  </div>
                )}
                {(m?.silverSoldGross > 0 || m?.silverBoughtGross > 0) && (
                  <div style={{ color: '#475569', borderTop: (m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) ? '1px dashed #fde68a' : 'none', paddingTop: '3px' }}>
                    {m?.silverSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Sold:</span><strong>{fmtWt(m.silverSoldGross)}g (Delivered)</strong></div>}
                    {m?.silverBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver buy:</span><strong>{fmtWt(m.silverBoughtGross)}g → {fmtWt(m.silverBoughtPure)}g Pure</strong></div>}
                  </div>
                )}
                {!m?.goldSoldGross && !m?.goldBoughtGross && !m?.silverSoldGross && !m?.silverBoughtGross && (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No metal weight in period</span>
                )}
              </div>
            );
          })()}
        </div>

        {/* 2. SELLS CARD */}
        <div
          onClick={() => setKpiDrillFilter(kpiDrillFilter === 'SELL' ? null : 'SELL')}
          style={{
            background: kpiDrillFilter === 'SELL' ? '#dcfce7' : '#f0fdf4',
            border: `1.5px solid ${kpiDrillFilter === 'SELL' ? '#22c55e' : '#bbf7d0'}`,
            borderRadius: '10px',
            padding: '9px 11px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter === 'SELL' ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🟢 Direct Sells</span>
              {kpiDrillFilter === 'SELL' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.55rem', background: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
            </div>
            <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#166534', marginTop: '2px' }}>
              {kpiMetrics.sellCount} <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bills</span>
            </div>
            <div style={{ fontSize: '0.60rem', color: '#15803d', fontWeight: 700, margin: '2px 0 6px 0' }}>
              {kpiMetrics.sellMode?.sellsCount || 0} Direct Sale Items
            </div>
          </div>
          {/* Weight Breakdown */}
          {(() => {
            const m = kpiMetrics.sellMode;
            return (
              <div style={{ background: 'rgba(255,255,255,0.88)', padding: '4px 7px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.58rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {m?.goldSoldGross > 0 && <div style={{ color: '#166534', display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold Sold:</span><strong>{fmtWt(m.goldSoldGross)}g sold</strong></div>}
                {m?.silverSoldGross > 0 && <div style={{ color: '#475569', display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Sold:</span><strong>{fmtWt(m.silverSoldGross)}g sold</strong></div>}
                {!m?.goldSoldGross && !m?.silverSoldGross && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No direct sales in period</span>}
              </div>
            );
          })()}
        </div>

        {/* 3. BUYS CARD */}
        <div
          onClick={() => setKpiDrillFilter(kpiDrillFilter === 'BUY' ? null : 'BUY')}
          style={{
            background: kpiDrillFilter === 'BUY' ? '#dbeafe' : '#eff6ff',
            border: `1.5px solid ${kpiDrillFilter === 'BUY' ? '#3b82f6' : '#bfdbfe'}`,
            borderRadius: '10px',
            padding: '9px 11px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter === 'BUY' ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1d4ed8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔵 Buys</span>
              {kpiDrillFilter === 'BUY' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.55rem', background: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
            </div>
            <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#1e40af', marginTop: '2px' }}>
              {kpiMetrics.buyCount} <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bills</span>
            </div>
            <div style={{ fontSize: '0.60rem', color: '#1d4ed8', fontWeight: 700, margin: '2px 0 6px 0' }}>
              {kpiMetrics.buyMode?.buysCount || 0} Buy Purchases
            </div>
          </div>
          {/* Weight Breakdown */}
          {(() => {
            const m = kpiMetrics.buyMode;
            return (
              <div style={{ background: 'rgba(255,255,255,0.88)', padding: '4px 7px', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.58rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {m?.goldBoughtGross > 0 && <div style={{ color: '#1e40af', display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold buy:</span><strong>{fmtWt(m.goldBoughtGross)}g → {fmtWt(m.goldBoughtPure)}g Pure</strong></div>}
                {m?.silverBoughtGross > 0 && <div style={{ color: '#475569', display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver buy:</span><strong>{fmtWt(m.silverBoughtGross)}g → {fmtWt(m.silverBoughtPure)}g Pure</strong></div>}
                {!m?.goldBoughtGross && !m?.silverBoughtGross && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No buy purchases in period</span>}
              </div>
            );
          })()}
        </div>

        {/* 4. TRADE-INS CARD */}
        <div
          onClick={() => setKpiDrillFilter(kpiDrillFilter === 'EXCHANGE' ? null : 'EXCHANGE')}
          style={{
            background: kpiDrillFilter === 'EXCHANGE' ? '#ede9fe' : '#faf5ff',
            border: `1.5px solid ${kpiDrillFilter === 'EXCHANGE' ? '#a855f7' : '#e9d5ff'}`,
            borderRadius: '10px',
            padding: '9px 11px',
            cursor: 'pointer',
            boxShadow: kpiDrillFilter === 'EXCHANGE' ? '0 0 0 2px rgba(168,85,247,0.2)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7e22ce', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🟣 Trade-ins (Exchange)</span>
              {kpiDrillFilter === 'EXCHANGE' ? <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }} /> : <span style={{ fontSize: '0.55rem', background: '#ede9fe', padding: '1px 5px', borderRadius: '4px' }}>Filter</span>}
            </div>
            <div style={{ fontSize: '1.20rem', fontWeight: 900, color: '#6b21a8', marginTop: '2px' }}>
              {kpiMetrics.exchangeCount} <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Bills</span>
            </div>
            <div style={{ fontSize: '0.60rem', color: '#7e22ce', fontWeight: 700, margin: '2px 0 6px 0' }}>
              {kpiMetrics.tradeInMode ? `${kpiMetrics.tradeInMode.sellsCount || 0} Sold Ornaments · ${kpiMetrics.tradeInMode.buysCount || 0} buy` : 'Exchange Items'}
            </div>
          </div>
          {/* Weight Breakdown */}
          {(() => {
            const m = kpiMetrics.tradeInMode;
            return (
              <div style={{ background: 'rgba(255,255,255,0.88)', padding: '4px 7px', borderRadius: '6px', border: '1px solid #e9d5ff', fontSize: '0.58rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {(m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) && (
                  <div style={{ color: '#6b21a8' }}>
                    {m?.goldSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold Sold:</span><strong>{fmtWt(m.goldSoldGross)}g sold</strong></div>}
                    {m?.goldBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥇 Gold buy:</span><strong>{fmtWt(m.goldBoughtGross)}g → {fmtWt(m.goldBoughtPure)}g Pure</strong></div>}
                  </div>
                )}
                {(m?.silverSoldGross > 0 || m?.silverBoughtGross > 0) && (
                  <div style={{ color: '#475569', borderTop: (m?.goldSoldGross > 0 || m?.goldBoughtGross > 0) ? '1px dashed #e9d5ff' : 'none', paddingTop: '3px' }}>
                    {m?.silverSoldGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Sold:</span><strong>{fmtWt(m.silverSoldGross)}g → {fmtWt(m.silverSoldPure)}g Pure</strong></div>}
                    {m?.silverBoughtGross > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🥈 Silver Buy:</span><strong>{fmtWt(m.silverBoughtGross)}g → {fmtWt(m.silverBoughtPure)}g Pure</strong></div>}
                  </div>
                )}
                {!m?.goldSoldGross && !m?.goldBoughtGross && !m?.silverSoldGross && !m?.silverBoughtGross && (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No exchange weights in period</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
