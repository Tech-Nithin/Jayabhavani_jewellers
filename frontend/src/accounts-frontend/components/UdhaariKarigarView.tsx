import React, { useState } from 'react';

interface UdhaariKarigarProps {
  udhaariSummary: {
    newDuesCreated: number;
    oldDuesCollected: number;
    karigarGoldIssued: number;
    karigarGoldReceived: number;
  };
  logBookTimeline?: any[];
}

export const UdhaariKarigarView: React.FC<UdhaariKarigarProps> = ({ udhaariSummary, logBookTimeline = [] }) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [metalFilter, setMetalFilter] = useState<'ALL' | 'GOLD' | 'SILVER' | 'CASH'>('ALL');

  if (!udhaariSummary) return null;

  // 1. Group Karigar / Worker transactions using STRICT 100% PURE FINE METAL CALCULATION & CASH-METAL LINK FORMULA
  const workerMap: Record<string, {
    workerId: string;
    workerName: string;
    goldSentFine: number;
    goldReceivedFine: number;
    silverSentFine: number;
    silverReceivedFine: number;
    cashSent: number;
    cashReceived: number;
    txCount: number;
  }> = {};

  logBookTimeline.forEach((entry: any) => {
    const rawTx = entry.raw_worker_txn;
    const isWorkerEntry = entry.type === 'WORK ASSIGN' || entry.type === 'WORKER TX' || entry.type === 'KARIGAR' || Boolean(rawTx);

    if (isWorkerEntry) {
      const rawWorkerId = String(rawTx?.worker_id || entry.worker_id || entry.title || 'General Karigar').toLowerCase();
      let workerName = rawTx?.worker_name || entry.worker_name;
      if (!workerName && entry.title) {
        workerName = entry.title
          .replace(/Admin → Worker \(/g, '')
          .replace(/Admin → Worker/g, '')
          .replace(/Worker \(/g, '')
          .replace(/\) → Admin/g, '')
          .replace(/Worker/g, '')
          .replace(/\)/g, '')
          .trim();
      }
      if (!workerName) workerName = 'Goldsmith Karigar';

      if (!workerMap[rawWorkerId]) {
        workerMap[rawWorkerId] = {
          workerId: rawWorkerId,
          workerName,
          goldSentFine: 0,
          goldReceivedFine: 0,
          silverSentFine: 0,
          silverReceivedFine: 0,
          cashSent: 0,
          cashReceived: 0,
          txCount: 0,
        };
      }

      const isAdminToWorker = entry.title?.includes('Admin → Worker') || entry.details?.includes('Given') || rawTx?.direction === 'OUTGOING';

      // ── STRICT 100% PURE FINE METAL & CASH-METAL LINK CALCULATION (Same as Admin Chat!) ──
      const weight = Number(entry.weight_grams || rawTx?.weight_grams || rawTx?.net_weight || 0);
      const touch = Number(entry.touch_percentage || rawTx?.touch_percentage || 100.0);
      const fine = entry.fine_weight_grams || rawTx?.fine_weight_grams ? Number(entry.fine_weight_grams || rawTx?.fine_weight_grams) : (weight * touch / 100);

      const amt = Number(entry.paid_amount || entry.amount || rawTx?.amount_cash || rawTx?.amount || 0);
      const cat = (entry.category || rawTx?.category || 'GOLD').toUpperCase();
      const cashLink = rawTx?.cash_metal_link || entry.cash_metal_link;
      const appliedRate = Number(rawTx?.applied_rate_per_gram || entry.applied_rate_per_gram || 0);
      const equivMetal = Number(rawTx?.equivalent_metal_grams || entry.equivalent_metal_grams || 0);

      // Equivalent fine metal calculation using equivalent_metal_grams or applied_rate_per_gram (Exact Admin Chat rule)
      const calculatedEquiv = equivMetal > 0 ? equivMetal : (appliedRate > 0 ? (amt / appliedRate) : 0);

      workerMap[rawWorkerId].txCount += 1;

      if (isAdminToWorker) {
        if (cat === 'GOLD' || cat === 'ORNAMENT') {
          workerMap[rawWorkerId].goldSentFine += fine;
        } else if (cat === 'SILVER') {
          workerMap[rawWorkerId].silverSentFine += fine;
        } else if (cat === 'CASH' || cashLink) {
          if (cashLink === 'FOR_GOLD') {
            workerMap[rawWorkerId].goldSentFine += calculatedEquiv;
          } else if (cashLink === 'FOR_SILVER') {
            workerMap[rawWorkerId].silverSentFine += calculatedEquiv;
          } else {
            workerMap[rawWorkerId].cashSent += amt;
          }
        }
      } else {
        // INCOMING (Worker -> Admin)
        if (cat === 'GOLD' || cat === 'ORNAMENT') {
          workerMap[rawWorkerId].goldReceivedFine += fine;
        } else if (cat === 'SILVER') {
          workerMap[rawWorkerId].silverReceivedFine += fine;
        } else if (cat === 'CASH' || cashLink) {
          if (cashLink === 'FOR_GOLD') {
            workerMap[rawWorkerId].goldReceivedFine += calculatedEquiv;
          } else if (cashLink === 'FOR_SILVER') {
            workerMap[rawWorkerId].silverReceivedFine += calculatedEquiv;
          } else {
            workerMap[rawWorkerId].cashReceived += amt;
          }
        }
      }
    }
  });

  const workerSummaryList = Object.values(workerMap);

  // Calculate Combined Balances for All Workers Card
  let combinedGoldDue = 0;
  let combinedSilverDue = 0;
  let combinedCashDue = 0;

  workerSummaryList.forEach(w => {
    combinedGoldDue += (w.goldSentFine - w.goldReceivedFine);
    combinedSilverDue += (w.silverSentFine - w.silverReceivedFine);
    combinedCashDue += (w.cashSent - w.cashReceived);
  });

  // 2. Filter timeline events for Karigar / Goldsmith Worker transactions (filtered by selected worker & category)
  const karigarEvents = logBookTimeline.filter((entry: any) => {
    const rawType = (entry.type || '').toUpperCase();
    const isWorkerEntry = rawType === 'WORK ASSIGN' || rawType === 'WORKER TX' || rawType === 'KARIGAR' || Boolean(entry.raw_worker_txn);

    if (!isWorkerEntry) return false;

    // Worker Filter
    if (selectedWorkerId) {
      const rawTx = entry.raw_worker_txn;
      const rawWorkerId = String(rawTx?.worker_id || entry.worker_id || entry.title || 'General Karigar').toLowerCase();
      if (rawWorkerId !== selectedWorkerId) return false;
    }

    // Category / Metal Filter (ALL, GOLD, SILVER, CASH)
    const rawTx = entry.raw_worker_txn;
    const cat = (entry.category || rawTx?.category || 'GOLD').toUpperCase();

    if (metalFilter === 'GOLD') {
      return cat.includes('GOLD') || cat.includes('ORNAMENT');
    } else if (metalFilter === 'SILVER') {
      return cat.includes('SILVER');
    } else if (metalFilter === 'CASH') {
      return cat.includes('CASH');
    }

    return true;
  });

  // 3. Sort events chronologically in ASCENDING ORDER
  const sortedKarigarEvents = [...karigarEvents].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  let totalGoldIssuedGrossGrams = 0;
  let totalGoldReceivedGrossGrams = 0;
  let totalGoldIssuedFineGrams = 0;
  let totalGoldReceivedFineGrams = 0;

  let totalSilverIssuedGrossGrams = 0;
  let totalSilverReceivedGrossGrams = 0;
  let totalSilverIssuedFineGrams = 0;
  let totalSilverReceivedFineGrams = 0;

  let totalAdminLaborCash = 0;
  let totalWorkerLaborCash = 0;

  const processedEvents = sortedKarigarEvents.map((entry: any) => {
    const title = entry.title || '';
    const details = entry.details || '';
    const isAdminToWorker = title.includes('Admin → Worker') || details.includes('Given') || title.includes('Given');

    const rawTx = entry.raw_worker_txn;
    const weight = Number(entry.weight_grams || rawTx?.weight_grams || rawTx?.net_weight || 0);
    const touch = Number(entry.touch_percentage || rawTx?.touch_percentage || 100.0);
    const fine = entry.fine_weight_grams || rawTx?.fine_weight_grams ? Number(entry.fine_weight_grams || rawTx?.fine_weight_grams) : (weight * touch / 100);
    const amt = Number(entry.paid_amount || entry.amount || rawTx?.amount_cash || rawTx?.amount || 0);
    const cat = (entry.category || rawTx?.category || 'GOLD').toUpperCase();
    const cashLink = rawTx?.cash_metal_link || entry.cash_metal_link;
    const appliedRate = Number(rawTx?.applied_rate_per_gram || entry.applied_rate_per_gram || 0);
    const equivMetal = Number(rawTx?.equivalent_metal_grams || entry.equivalent_metal_grams || 0);

    const calculatedEquiv = equivMetal > 0 ? equivMetal : (appliedRate > 0 ? (amt / appliedRate) : 0);
    const displayFineWt = fine > 0 ? fine : (cashLink ? calculatedEquiv : 0);

    const rawWorkerName = rawTx?.worker_name || entry.worker_name || title;
    let cleanWorkerName = rawWorkerName
      .replace(/Admin → Worker \(/g, '')
      .replace(/Admin → Worker/g, '')
      .replace(/Worker \(/g, '')
      .replace(/\) → Admin/g, '')
      .replace(/Worker/g, '')
      .replace(/\)/g, '')
      .trim();
    if (!cleanWorkerName) cleanWorkerName = 'Karigar';

    if (cat === 'CASH' || cashLink) {
      if (cashLink === 'FOR_GOLD') {
        if (isAdminToWorker) totalGoldIssuedFineGrams += calculatedEquiv;
        else totalGoldReceivedFineGrams += calculatedEquiv;
      } else if (cashLink === 'FOR_SILVER') {
        if (isAdminToWorker) totalSilverIssuedFineGrams += calculatedEquiv;
        else totalSilverReceivedFineGrams += calculatedEquiv;
      } else {
        if (isAdminToWorker) totalAdminLaborCash += amt;
        else totalWorkerLaborCash += amt;
      }
    } else if (cat.includes('SILVER')) {
      if (isAdminToWorker) {
        totalSilverIssuedGrossGrams += weight;
        totalSilverIssuedFineGrams += fine;
      } else {
        totalSilverReceivedGrossGrams += weight;
        totalSilverReceivedFineGrams += fine;
      }
    } else {
      if (isAdminToWorker) {
        totalGoldIssuedGrossGrams += weight;
        totalGoldIssuedFineGrams += fine;
      } else {
        totalGoldReceivedGrossGrams += weight;
        totalGoldReceivedFineGrams += fine;
      }
    }

    return {
      ...entry,
      isAdminToWorker,
      wt: weight,
      touch,
      fineWt: fine,
      displayFineWt,
      amt,
      cat,
      cashLink,
      appliedRate,
      cleanWorkerName,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ============================================================ */}
      {/* WORKER PURE FINE METAL BALANCE KPI CARDS (Admin Chat Formula)*/}
      {/* ============================================================ */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-users-gear" style={{ color: '#d97706' }}></i>
            Goldsmith Karigars Balances (Gold, Silver & Cash)
          </h3>

          {selectedWorkerId && (
            <button
              type="button"
              onClick={() => setSelectedWorkerId(null)}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800 }}
            >
              🔄 Show All Karigars
            </button>
          )}
        </div>

        {workerSummaryList.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: 0, padding: '1rem 0' }}>
            No active Karigar work balance records available today.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: '1rem' }}>
            {/* "ALL WORKERS" COMBINED BALANCES CARD */}
            <div
              onClick={() => setSelectedWorkerId(null)}
              style={{
                background: selectedWorkerId === null ? '#fffbe6' : '#f8fafc',
                border: selectedWorkerId === null ? '2px solid #d97706' : '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: selectedWorkerId === null ? '0 4px 12px rgba(217, 119, 6, 0.12)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: selectedWorkerId === null ? '#b45309' : '#0f172a', fontSize: '0.92rem' }}>
                  🌟 ALL KARIGARS COMBINED
                </strong>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: '#d97706', color: '#ffffff' }}>
                  {workerSummaryList.length} Workers
                </span>
              </div>

              {/* Combined Balances Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                  <span>🥇 Combined Pure Gold:</span>
                  <strong>{combinedGoldDue.toFixed(3)} g</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                  <span>🥈 Combined Pure Silver:</span>
                  <strong>{combinedSilverDue.toFixed(3)} g</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                  <span>💵 Combined Cash:</span>
                  <strong>₹{combinedCashDue.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            {/* INDIVIDUAL WORKER PURE BALANCES CARDS */}
            {workerSummaryList.map((w) => {
              const isSelected = selectedWorkerId === w.workerId;
              const netFineGoldDue = w.goldSentFine - w.goldReceivedFine;
              const netFineSilverDue = w.silverSentFine - w.silverReceivedFine;
              const netCashDue = w.cashSent - w.cashReceived;

              return (
                <div
                  key={w.workerId}
                  onClick={() => setSelectedWorkerId(w.workerId)}
                  style={{
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    border: isSelected ? '2px solid #166534' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 14px rgba(22, 101, 52, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* Worker Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: isSelected ? '#166534' : '#0f172a', fontSize: '0.95rem' }}>
                      🔨 {w.workerName}
                    </strong>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: isSelected ? '#166534' : '#f1f5f9', color: isSelected ? '#ffffff' : '#475569' }}>
                      {w.txCount} Txns
                    </span>
                  </div>

                  {/* 100% Pure Fine Balances & Cash Due */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem' }}>
                    {/* Pure Gold Fine Balance */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                      <span>🥇 Pure Gold (99.9):</span>
                      <strong>{netFineGoldDue > 0 ? `${netFineGoldDue.toFixed(3)} g (Pending)` : netFineGoldDue < 0 ? `${Math.abs(netFineGoldDue).toFixed(3)} g (Excess)` : '0.000 g (Clear)'}</strong>
                    </div>

                    {/* Pure Silver Fine Balance */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                      <span>🥈 Pure Silver (99.9):</span>
                      <strong>{netFineSilverDue > 0 ? `${netFineSilverDue.toFixed(3)} g (Pending)` : netFineSilverDue < 0 ? `${Math.abs(netFineSilverDue).toFixed(3)} g (Excess)` : '0.000 g (Clear)'}</strong>
                    </div>

                    {/* Cash Balance */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                      <span>💵 Cash Balance:</span>
                      <strong>{netCashDue > 0 ? `+₹${netCashDue.toLocaleString('en-IN')} (Pending)` : netCashDue < 0 ? `-₹${Math.abs(netCashDue).toLocaleString('en-IN')} (Advance)` : '₹0 (Clear)'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* GOLDSMITH / KARIGAR & ADMIN WORK PASSBOOK LEDGER TABLE        */}
      {/* ============================================================ */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        {/* Table Header & Metal / Category Filter Switch */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-hammer" style={{ color: '#b45309' }}></i>
            {selectedWorkerId
              ? `Passbook Ledger for ${workerMap[selectedWorkerId]?.workerName || 'Selected Karigar'} (${processedEvents.length} transactions)`
              : `All Goldsmith / Karigar & Admin Work Transactions (${processedEvents.length} entries)`
            }
          </h3>

          {/* Category Filter Buttons Switch (ALL | GOLD | SILVER | CASH) */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setMetalFilter('ALL')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: metalFilter === 'ALL' ? '#0f172a' : 'transparent',
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
              <i className="fa-solid fa-layer-group"></i> All
            </button>

            <button
              type="button"
              onClick={() => setMetalFilter('GOLD')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: metalFilter === 'GOLD' ? '#d97706' : 'transparent',
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
                background: metalFilter === 'SILVER' ? '#0284c7' : 'transparent',
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

            <button
              type="button"
              onClick={() => setMetalFilter('CASH')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: metalFilter === 'CASH' ? '#166534' : 'transparent',
                color: metalFilter === 'CASH' ? '#ffffff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="fa-solid fa-money-bill-wave"></i> Cash
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>S.No</th>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Transfer Direction</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Wt (g)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Purity %</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: '#b45309', background: '#fffbeb' }}>Pure Fine Wt (99.9)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Labor Cash / Wage (₹)</th>
                <th style={{ padding: '10px 12px' }}>Category & Details</th>
              </tr>
            </thead>
            <tbody>
              {processedEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                    No {metalFilter === 'ALL' ? 'Goldsmith / Karigar' : metalFilter} transactions recorded today.
                  </td>
                </tr>
              ) : (
                processedEvents.map((entry: any, idx: number) => {
                  const createdStr = entry.time || (entry.created_at ? new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-');
                  const isGiven = entry.isAdminToWorker;
                  const amt = entry.amt;

                  return (
                    <tr key={entry.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#94a3b8' }}>#{idx + 1}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{createdStr}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: isGiven ? '#fffbe6' : '#f0fdf4', color: isGiven ? '#b45309' : '#15803d', border: `1px solid ${isGiven ? '#fde68a' : '#bbf7d0'}` }}>
                          {isGiven ? `⬆ To ${entry.cleanWorkerName}` : `⬇ From ${entry.cleanWorkerName}`}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>
                        {entry.wt > 0 ? `${entry.wt.toFixed(3)} g` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: isGiven ? '#b45309' : '#15803d', whiteSpace: 'nowrap' }}>
                        {entry.fineWt > 0 ? `${entry.touch}%` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: isGiven ? '#b45309' : '#15803d', background: '#fffbeb', whiteSpace: 'nowrap' }}>
                        {entry.displayFineWt > 0 ? `${entry.displayFineWt.toFixed(3)} g` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>
                        {amt > 0 ? (
                          <div>
                            <div>₹{amt.toLocaleString('en-IN')}</div>
                            {entry.cashLink && (
                              <div style={{ fontSize: '0.70rem', color: '#b45309', fontWeight: 800, marginTop: '2px' }}>
                                {entry.appliedRate > 0 ? `@ ₹${entry.appliedRate.toLocaleString('en-IN')}/g` : `Linked ${entry.cashLink}`}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        <div style={{ fontWeight: 700 }}>{entry.cat || 'GOLD'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{entry.details || '-'}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Dynamic Category Filtered Totals */}
            <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
              <tr>
                <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontSize: '0.78rem', color: '#0f172a' }}>
                  🔨 TOTAL KARIGAR WORK FLOW SUMMARY ({metalFilter}):
                </td>

                {/* Column 3: Gross Wt Totals */}
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '160px' }}>
                  {metalFilter === 'GOLD' || metalFilter === 'ALL' ? (
                    <>
                      <div style={{ color: '#b45309' }}>🥇 Admin Gross: +{totalGoldIssuedGrossGrams.toFixed(3)}g</div>
                      <div style={{ color: '#b45309' }}>🥇 Worker Gross: -{totalGoldReceivedGrossGrams.toFixed(3)}g</div>
                    </>
                  ) : null}

                  {metalFilter === 'SILVER' || metalFilter === 'ALL' ? (
                    <>
                      <div style={{ color: '#0369a1', marginTop: metalFilter === 'ALL' ? '3px' : '0' }}>🥈 Admin Gross: +{totalSilverIssuedGrossGrams.toFixed(3)}g</div>
                      <div style={{ color: '#0369a1', marginTop: '3px' }}>🥈 Worker Gross: -{totalSilverReceivedGrossGrams.toFixed(3)}g</div>
                    </>
                  ) : null}

                  {metalFilter === 'CASH' && '-'}
                </td>

                {/* Column 4: Purity % Empty Spacer */}
                <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8' }}>-</td>

                {/* Column 5: Pure Fine Wt Totals */}
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '0.78rem', background: '#fffbeb', whiteSpace: 'nowrap', minWidth: '160px' }}>
                  {metalFilter === 'GOLD' || metalFilter === 'ALL' ? (
                    <>
                      <div style={{ color: '#b45309' }}>🥇 Admin Fine: +{totalGoldIssuedFineGrams.toFixed(3)}g</div>
                      <div style={{ color: '#b45309' }}>🥇 Worker Fine: -{totalGoldReceivedFineGrams.toFixed(3)}g</div>
                    </>
                  ) : null}

                  {metalFilter === 'SILVER' || metalFilter === 'ALL' ? (
                    <>
                      <div style={{ color: '#0369a1', marginTop: metalFilter === 'ALL' ? '3px' : '0' }}>🥈 Admin Fine: +{totalSilverIssuedFineGrams.toFixed(3)}g</div>
                      <div style={{ color: '#0369a1', marginTop: '3px' }}>🥈 Worker Fine: -{totalSilverReceivedFineGrams.toFixed(3)}g</div>
                    </>
                  ) : null}

                  {metalFilter === 'CASH' && '-'}
                </td>

                {/* Column 6: Total Labor Wages (Admin Cash vs Worker Cash) */}
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: '140px' }}>
                  {metalFilter === 'CASH' || metalFilter === 'ALL' ? (
                    <>
                      <div style={{ color: '#b45309' }}>Admin Cash: +₹{totalAdminLaborCash.toLocaleString('en-IN')}</div>
                      <div style={{ color: '#15803d', marginTop: '3px' }}>Worker Cash: -₹{totalWorkerLaborCash.toLocaleString('en-IN')}</div>
                    </>
                  ) : '-'}
                </td>

                {/* Column 7: Details */}
                <td style={{ padding: '12px', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
                  ← Filtered Totals ({metalFilter})
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
