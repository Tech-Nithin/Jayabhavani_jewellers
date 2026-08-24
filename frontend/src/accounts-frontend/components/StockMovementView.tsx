import React, { useState } from 'react';

interface StockMovementProps {
  stockViewMode: 'ALL' | 'TODAY';
  setStockViewMode: (mode: 'ALL' | 'TODAY') => void;
  metalCategoryFilter: 'ALL' | 'GOLD' | 'SILVER';
  setMetalCategoryFilter: (filter: 'ALL' | 'GOLD' | 'SILVER') => void;
  ornamentsStockList?: any[];
  eodReorderList: any[];
  logBookTimeline?: any[];
  dayBookStockSummary?: any[];
}

export const StockMovementView: React.FC<StockMovementProps> = ({
  stockViewMode,
  setStockViewMode,
  metalCategoryFilter,
  setMetalCategoryFilter,
  eodReorderList,
  logBookTimeline = [],
  dayBookStockSummary = [],
}) => {
  // Accordion Expand/Collapse State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const toggleRowAccordion = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  // 1. Determine Opening Stock Weight for selected metal category (ALL, GOLD, or SILVER)
  let openingStockWeight = 0;
  if (metalCategoryFilter === 'ALL') {
    openingStockWeight = dayBookStockSummary.reduce((sum: number, s: any) => sum + Number(s.openingWeight || 0), 0);
  } else {
    const targetSummary = dayBookStockSummary.find((s: any) =>
      (s.category || '').toUpperCase().includes(metalCategoryFilter)
    );
    openingStockWeight = Number(targetSummary?.openingWeight || 0);
  }

  // 2. Expand logBookTimeline entries into itemized metal events
  const expandedMetalEvents: any[] = [];

  logBookTimeline.forEach((entry: any) => {
    const rawInv = entry.raw_invoice || entry.raw_order;
    let rData: any = rawInv?.receipt_json_data;
    if (typeof rData === 'string') {
      try { rData = JSON.parse(rData); } catch (e) { }
    }

    const partyName = entry.title || rawInv?.customer_name || 'Walk-in Customer';
    const partyPhone = rawInv?.customer_phone || entry.customer_phone || '-';

    if (rData && Array.isArray(rData.items) && rData.items.length > 0) {
      rData.items.forEach((it: any, itemIdx: number) => {
        const itemTypeRaw = (it.item_type || entry.type || '').toUpperCase();
        const isBuyScrap = itemTypeRaw === 'BUY' || itemTypeRaw === 'EXCHANGE_BUY' || itemTypeRaw === 'EXCHANGE';

        const itemMetal = (it.metal_type || entry.category || 'GOLD').toUpperCase();
        const itemWt = Number(it.weight_grams || it.net_weight || it.gross_weight || 0);
        const purityPct = Number(it.purity_percentage || it.purity || 91.6);
        const fineWt = Number(it.pure_weight || (itemWt * (purityPct / 100)));

        // Filter by selected metal category (ALL vs GOLD vs SILVER)
        const isTargetMetal = metalCategoryFilter === 'ALL'
          ? true
          : metalCategoryFilter === 'SILVER'
            ? itemMetal.includes('SILVER')
            : !itemMetal.includes('SILVER');

        if (itemWt > 0 && isTargetMetal) {
          const isOrder = (entry.type || '').toUpperCase() === 'ORDER';
          const displayType = isOrder
            ? (isBuyScrap ? 'ORDER - BUY' : 'ORDER - SELL')
            : (isBuyScrap ? 'BUY' : 'SELL');

          expandedMetalEvents.push({
            id: `event-${entry.id}-${itemIdx}`,
            created_at: entry.created_at,
            time: entry.time,
            partyName: partyName,
            partyPhone: partyPhone,
            invoiceId: rawInv?.id || entry.id || 'N/A',
            rawType: displayType,
            productName: it.product_name || (isBuyScrap ? 'Old Scrap Metal' : 'New Ornament'),
            details: `Invoice #${rawInv?.id || 'N/A'} · ${it.product_name || 'Item'} (${itemWt.toFixed(3)}g)`,
            metalCategory: itemMetal,
            weight_grams: itemWt,
            purity_percentage: purityPct,
            fine_weight: fineWt,
            amount: Number(it.total_amount || it.price || entry.amount || 0),
            isInflow: isBuyScrap,
            rawItem: it,
            rawEntry: entry,
          });
        }
      });
    } else {
      // Worker transfers, inventory loads, or fallback single entries
      const rawType = (entry.type || '').toUpperCase();
      const wt = Number(entry.weight_grams || 0);
      const cat = (entry.category || '').toUpperCase();
      const purityPct = Number(entry.purity_percentage || 91.6);
      const fineWt = Number(entry.pure_weight || (wt * (purityPct / 100)));

      const isTargetMetal = metalCategoryFilter === 'ALL'
        ? true
        : metalCategoryFilter === 'SILVER'
          ? cat.includes('SILVER') || rawType.includes('SILVER')
          : !cat.includes('SILVER') && !rawType.includes('SILVER');

      const isBuyScrap = rawType === 'BUY' || rawType === 'EXCHANGE';
      const isInventoryLoad = rawType === 'INVENTORY' || rawType === 'STOCK LOAD';
      const isWorkerReturn = (rawType === 'WORKER TX' || rawType === 'KARIGAR') &&
        (entry.title?.includes('Worker → Admin') || entry.details?.includes('Returned'));

      const isInflow = isBuyScrap || isInventoryLoad || isWorkerReturn;

      if (wt > 0 && isTargetMetal) {
        expandedMetalEvents.push({
          id: String(entry.id || Math.random()),
          created_at: entry.created_at,
          time: entry.time,
          partyName: partyName,
          partyPhone: partyPhone,
          invoiceId: entry.id || 'N/A',
          rawType: rawType,
          productName: entry.details || 'Jewellery Movement',
          details: entry.details || '-',
          metalCategory: cat || 'GOLD',
          weight_grams: wt,
          purity_percentage: purityPct,
          fine_weight: fineWt,
          amount: Number(entry.amount || entry.paid_amount || 0),
          isInflow: isInflow,
          rawEntry: entry,
        });
      }
    }
  });

  // 3. Sort itemized events chronologically in ASCENDING ORDER (earliest event first)
  const sortedAscendingTimeline = [...expandedMetalEvents].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  // 4. Calculate running stock weight after every itemized transaction starting from Opening Stock Weight
  let runningStockWt = openingStockWeight;
  let totalMetalIn = 0;
  let totalMetalOut = 0;

  const processedStockRows = sortedAscendingTimeline.map((entry: any) => {
    const rawType = entry.rawType;
    const wt = Number(entry.weight_grams || 0);

    if (entry.isInflow) {
      runningStockWt += wt;
      totalMetalIn += wt;
    } else {
      runningStockWt -= wt;
      totalMetalOut += wt;
    }

    return {
      ...entry,
      rawType,
      wt,
      afterTxStockWt: runningStockWt,
    };
  });

  const finalAvailableStockWt = runningStockWt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Main Card Container */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        
        {/* Header Bar & Metal Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-boxes-stacked" style={{ color: metalCategoryFilter === 'GOLD' ? '#d97706' : metalCategoryFilter === 'SILVER' ? '#0284c7' : '#7c3aed' }}></i>
              {metalCategoryFilter === 'ALL' ? 'All Metals (Gold & Silver)' : metalCategoryFilter} Stock Movement Passbook
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
              Click on any row to expand the full transaction breakdown accordion 🔽
            </p>
          </div>

          {/* Filter Switch Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Metal Category Filter (ALL | GOLD | SILVER) */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setMetalCategoryFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: metalCategoryFilter === 'ALL' ? '#0f172a' : 'transparent',
                  color: metalCategoryFilter === 'ALL' ? '#ffffff' : '#64748b',
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
                onClick={() => setMetalCategoryFilter('GOLD')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: metalCategoryFilter === 'GOLD' ? '#d97706' : 'transparent',
                  color: metalCategoryFilter === 'GOLD' ? '#ffffff' : '#64748b',
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
                onClick={() => setMetalCategoryFilter('SILVER')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: metalCategoryFilter === 'SILVER' ? '#0284c7' : 'transparent',
                  color: metalCategoryFilter === 'SILVER' ? '#ffffff' : '#64748b',
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

            {/* Time Filter (ALL | TODAY) */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setStockViewMode('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: stockViewMode === 'ALL' ? '#0284c7' : 'transparent',
                  color: stockViewMode === 'ALL' ? '#ffffff' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-layer-group"></i> Total Stock
              </button>

              <button
                type="button"
                onClick={() => setStockViewMode('TODAY')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: stockViewMode === 'TODAY' ? '#166534' : 'transparent',
                  color: stockViewMode === 'TODAY' ? '#ffffff' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-calendar-day"></i> Today Added
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* EXPANDABLE ACCORDION TABLE (IN vs OUT)                        */}
        {/* ============================================================ */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table-responsive-font" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '14px 12px', width: '40px' }}></th>
                <th style={{ padding: '14px 12px' }}>S.No</th>
                <th style={{ padding: '14px 12px' }}>Date / Time</th>
                <th style={{ padding: '14px 12px' }}>Customer / Party</th>
                <th style={{ padding: '14px 12px' }}>Transaction Type</th>
                <th style={{ padding: '14px 12px' }}>Flow</th>
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Weight (g)</th>
                <th style={{ padding: '14px 12px', textAlign: 'right', background: '#f0fdf4', color: '#166534' }}>After Tx (g)</th>
                <th style={{ padding: '14px 12px' }}>Metal</th>
                <th style={{ padding: '14px 12px' }}>Item & Details</th>
              </tr>
            </thead>
            <tbody>
              {/* Row #0: Opening Stock Weight */}
              <tr style={{ background: '#fffbeb', borderBottom: '2px solid #fef3c7' }}>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}>📌</td>
                <td style={{ padding: '14px 12px', fontWeight: 800, color: '#b45309' }}>#0</td>
                <td style={{ padding: '14px 12px', fontWeight: 800, color: '#b45309' }}>Opening (9:00 AM)</td>
                <td style={{ padding: '14px 12px', fontWeight: 800, color: '#b45309' }}>Shop Opening Balance</td>
                <td style={{ padding: '14px 12px' }}>
                  <span className="badge-responsive-font" style={{ fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                    OPENING STOCK
                  </span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  <span className="badge-responsive-font" style={{ fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: '#ffffff', color: '#b45309', border: '1px solid #fde68a' }}>
                    START
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, color: '#94a3b8' }}>
                  {openingStockWeight.toFixed(3)} g
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 900, color: '#b45309' }}>
                  {openingStockWeight.toFixed(3)} g
                </td>
                <td style={{ padding: '14px 12px', fontWeight: 700, color: '#b45309' }}>
                  {metalCategoryFilter === 'ALL' ? 'ALL METALS' : metalCategoryFilter}
                </td>
                <td style={{ padding: '14px 12px', color: '#b45309', fontWeight: 700 }}>Starting Showcase Stock Weight</td>
              </tr>

              {/* Dynamic Accordion Transactions Rows */}
              {processedStockRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    No {metalCategoryFilter === 'ALL' ? 'Gold or Silver' : metalCategoryFilter} weight movement transactions recorded today.
                  </td>
                </tr>
              ) : (
                processedStockRows.map((entry: any, idx: number) => {
                  const txType = entry.rawType;
                  const createdStr = entry.time || (entry.created_at ? new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-');
                  const itemMetal = (entry.metalCategory || 'GOLD').toUpperCase();
                  const isExpanded = expandedRowId === entry.id;

                  // Dynamic color styling for Transaction Type
                  let typeBg = '#f1f5f9', typeColor = '#475569', typeBorder = '#cbd5e1';
                  if (txType === 'ORDER - SELL' || txType === 'ORDER') { typeBg = '#fffbe6'; typeColor = '#b45309'; typeBorder = '#fde68a'; }
                  else if (txType === 'ORDER - BUY') { typeBg = '#e0f2fe'; typeColor = '#0369a1'; typeBorder = '#bae6fd'; }
                  else if (txType === 'SELL') { typeBg = '#f0fdf4'; typeColor = '#15803d'; typeBorder = '#bbf7d0'; }
                  else if (txType === 'BUY' || txType === 'EXCHANGE') { typeBg = '#eff6ff'; typeColor = '#1d4ed8'; typeBorder = '#bfdbfe'; }
                  else if (txType === 'INVENTORY') { typeBg = '#fff7ed'; typeColor = '#c2410c'; typeBorder = '#ffedd5'; }
                  else if (txType === 'WORK ASSIGN' || txType === 'WORKER TX') { typeBg = '#ecfdf5'; typeColor = '#047857'; typeBorder = '#a7f3d0'; }

                  return (
                    <React.Fragment key={entry.id || idx}>
                      {/* Main Clickable Accordion Row */}
                      <tr
                        onClick={() => toggleRowAccordion(entry.id)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          background: isExpanded ? '#f0f9ff' : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Expand Icon Chevron */}
                        <td style={{ padding: '14px 12px', textAlign: 'center', color: '#0284c7', fontWeight: 800 }}>
                          <span style={{ padding: '2px 6px', borderRadius: '6px', background: isExpanded ? '#e0f2fe' : '#f1f5f9' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>
                        <td style={{ padding: '14px 12px', fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap' }}>{createdStr}</td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#0f172a' }}>{entry.partyName || 'Customer'}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <span className="badge-responsive-font" style={{ fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: typeBg, color: typeColor, border: `1px solid ${typeBorder}` }}>
                            Jb-{txType}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span className="badge-responsive-font" style={{ fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: entry.isInflow ? '#f0fdf4' : '#fef2f2', color: entry.isInflow ? '#15803d' : '#b91c1c', border: `1px solid ${entry.isInflow ? '#bbf7d0' : '#fecaca'}` }}>
                            {entry.isInflow ? '⬇ IN' : '⬆ OUT'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 900, color: entry.isInflow ? '#15803d' : '#b91c1c', whiteSpace: 'nowrap' }}>
                          {entry.isInflow ? '+' : '-'}{entry.wt.toFixed(3)} g
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 900, color: '#0f172a', background: '#f8fafc', whiteSpace: 'nowrap' }}>
                          {entry.afterTxStockWt.toFixed(3)} g
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span className="badge-responsive-font" style={{ fontWeight: 800, padding: '3px 6px', borderRadius: '6px', background: itemMetal.includes('SILVER') ? '#f0f9ff' : '#fffbe6', color: itemMetal.includes('SILVER') ? '#0369a1' : '#b45309', border: `1px solid ${itemMetal.includes('SILVER') ? '#bae6fd' : '#fde68a'}` }}>
                            {itemMetal.includes('SILVER') ? '🥈 SILVER' : '🥇 GOLD'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', color: '#334155' }}>
                          <div style={{ fontWeight: 700 }}>{entry.productName || '-'}</div>
                        </td>
                      </tr>

                      {/* Smooth Accordion Expanded Detail Dropdown */}
                      {isExpanded && (
                        <tr style={{ background: '#f0f9ff', borderBottom: '2px solid #bae6fd' }}>
                          <td colSpan={10} style={{ padding: '12px 16px' }}>
                            <div style={{
                              background: '#ffffff',
                              borderRadius: '12px',
                              padding: '14px 18px',
                              border: '1.5px solid #0284c7',
                              boxShadow: '0 8px 24px rgba(2,132,199,0.1)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>🔍 Full Item & Transaction Breakdown</span>
                                  <span style={{ fontSize: '0.70rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                                    Invoice/Tx #{entry.invoiceId}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                                  ⏰ {createdStr}
                                </span>
                              </div>

                              {/* Breakdown Grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.80rem' }}>
                                <div>
                                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Customer / Party Name:</span>
                                  <div style={{ fontWeight: 800, color: '#0f172a' }}>👤 {entry.partyName || 'Walk-in Customer'}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📞 Phone: {entry.partyPhone || '-'}</div>
                                </div>

                                <div>
                                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Product / Ornament Name:</span>
                                  <div style={{ fontWeight: 800, color: '#b45309' }}>📦 {entry.productName}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>Metal: <strong>{entry.metalCategory}</strong></div>
                                </div>

                                <div>
                                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Weight & Purity Breakdown:</span>
                                  <div style={{ fontWeight: 800, color: '#0f172a' }}>
                                    Gross Weight: <strong>{entry.wt.toFixed(3)} g</strong>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#d97706' }}>
                                    Purity: <strong>{entry.purity_percentage}%</strong> · Pure Fine: <strong>{entry.fine_weight.toFixed(3)} g</strong>
                                  </div>
                                </div>

                                <div>
                                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Transaction Amount & Impact:</span>
                                  <div style={{ fontWeight: 900, color: entry.isInflow ? '#15803d' : '#b91c1c', fontSize: '0.9rem' }}>
                                    {entry.isInflow ? '+' : '-'}{entry.wt.toFixed(3)} g ({entry.isInflow ? '⬇ Stock Inflow' : '⬆ Stock Outflow'})
                                  </div>
                                  {entry.amount > 0 && (
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534' }}>
                                      Paid/Billed Amount: ₹{entry.amount.toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Itemized details line */}
                              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem', color: '#475569', border: '1px solid #e2e8f0' }}>
                                <strong>Log Description:</strong> {entry.details}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Whole Metal Flow Totals */}
            <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
              <tr>
                <td colSpan={6} style={{ padding: '12px', textAlign: 'right', fontSize: '0.82rem', color: '#0f172a' }}>
                  📊 TOTAL {metalCategoryFilter === 'ALL' ? 'ALL METALS' : metalCategoryFilter} MOVEMENT SUMMARY:
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '0.82rem' }}>
                  <div style={{ color: '#15803d' }}>+{totalMetalIn.toFixed(3)} g (⬇ IN)</div>
                  <div style={{ color: '#b91c1c' }}>-{totalMetalOut.toFixed(3)} g (⬆ OUT)</div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, color: '#b45309', fontSize: '0.88rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
                  {finalAvailableStockWt.toFixed(3)} g
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* EOD Stock Reconciliation Banner Card */}
        <div style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '14px', padding: '1.25rem', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700 }}>📦 SHOWCASE {metalCategoryFilter === 'ALL' ? 'ALL METALS' : metalCategoryFilter} STOCK RECONCILIATION</div>
            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', marginTop: '4px' }}>
              Opening Weight: <strong>{openingStockWeight.toFixed(3)} g</strong> · Metal IN: <strong style={{ color: '#4ade80' }}>+{totalMetalIn.toFixed(3)} g</strong> · Metal OUT: <strong style={{ color: '#f87171' }}>-{totalMetalOut.toFixed(3)} g</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700 }}>FINAL LIVE {metalCategoryFilter === 'ALL' ? 'METALS' : metalCategoryFilter} STOCK</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f59e0b' }}>
              {finalAvailableStockWt.toFixed(3)} g
            </div>
          </div>
        </div>

        {/* EOD Restock Reorder Alert Banner */}
        {eodReorderList.length > 0 && (
          <div style={{ marginTop: '1.25rem', background: '#fffdf5', border: '1px solid #fef3c7', borderRadius: '12px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#b45309', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-cart-flatbed-suitcases"></i>
              EOD Restock Reorder List (Items Sold Today)
            </h4>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.78rem', color: '#78350f' }}>
              These items were sold today and automatically deducted from inventory. Order fresh stock to replenish:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {eodReorderList.map((item, idx) => (
                <span key={idx} style={{ fontSize: '0.78rem', fontWeight: 800, color: '#b45309', background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                  📦 {item.product_name} ({item.weight_grams}g)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
