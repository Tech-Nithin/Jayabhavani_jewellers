import React from 'react';
import type { GlobalRates, BillItem } from '../../types';
import type { ModeFormProps, ItemCalcDetail, BillCalcResult } from './modeUtils';
import { toStartCase, formatMax3Decimals, round3Decimals, CreatablePresetSelect } from './modeUtils';

// ─── EXCHANGE / TRADE-IN MODE CALCULATION ─────────────────────────────────────
// SELL items (new ornament JBJ sells):
//   finalWeight = netWeight + HMW wastage         [3 decimals]
//   metalVal    = finalWeight × sell_rate          [2 decimals]
//   makingVal   = making_charges_per_gram × finalWeight  [2 decimals]
//
// BUY items (old gold customer brings in):
//   finalWeight = pureWeight = netWeight × (purity%/100)  [3 decimals]
//   metalVal    = pureWeight × buy_rate            [2 decimals]
//   makingVal   = 0

export const calculateExchangeItems = (items: BillItem[], rates: GlobalRates): BillCalcResult => {
  const itemDetails: Record<string, ItemCalcDetail> = {};
  let totalSellValue = 0;
  let totalBuyCredit = 0;

  items.forEach((it) => {
    const isSell = (it.item_type || 'SELL').toUpperCase() === 'SELL';
    const isGold = (it.metal_type || 'GOLD').toUpperCase() === 'GOLD';
    const customRate = Number(it.custom_rate_per_gram || (it as any).customRate || (it as any).appliedRate) || 0;
    const defaultRate = isGold
      ? (isSell ? rates.gold_sell_value : rates.gold_buy_value)
      : (isSell ? rates.silver_sell_value : rates.silver_buy_value);
    const rate = customRate > 0 ? customRate : defaultRate || 0;

    const grossWeight = Number(it.weight_grams) || 0;
    const deductionWeight = Number(it.deduction_weight_grams) || 0;
    const netWeight = Math.max(0, round3Decimals(grossWeight - deductionWeight));

    let metalVal = 0, makingVal = 0, additionalVal = 0;
    let wastageWeight = 0, totalChargedWeight = netWeight, pureWeight = netWeight;
    let purityPercent = 100;

    if (isSell) {
      // SELL item: final weight = netWeight + HMW
      const wastagePercent = Number(it.wastage_percent) || 0;
      wastageWeight = round3Decimals((wastagePercent / 100) * netWeight);
      totalChargedWeight = round3Decimals(netWeight + wastageWeight);
      pureWeight = netWeight;
      purityPercent = 100;

      metalVal = Number((totalChargedWeight * rate).toFixed(2));
      makingVal = Number((Number(it.making_charges_per_gram) || 0).toFixed(2));
      additionalVal = Number((Number(it.additional_charges_amount) || 0).toFixed(2));
      totalSellValue = Number((totalSellValue + metalVal + makingVal + additionalVal).toFixed(2));
    } else {
      // BUY item: final weight = pureWeight = netWeight × (purity%/100)
      purityPercent = Number(it.purity_percentage) || 0;
      pureWeight = round3Decimals(netWeight * (purityPercent / 100));
      totalChargedWeight = pureWeight;

      metalVal = Number((pureWeight * rate).toFixed(2));
      totalBuyCredit = Number((totalBuyCredit + metalVal).toFixed(2));
    }

    const lineTotal = Number((metalVal + makingVal + additionalVal).toFixed(2));

    itemDetails[it.id] = {
      metalVal, makingVal, additionalVal, wastageVal: 0, gstVal: 0, lineTotal,
      grossWeight, deductionWeight, netWeight, pureWeight, wastageWeight, totalChargedWeight,
      wastagePercent: isSell ? (Number(it.wastage_percent) || 0) : 0, purityPercent, rate,
    };
  });

  return {
    itemDetails,
    totalSellValue: Number(totalSellValue.toFixed(2)),
    totalBuyCredit: Number(totalBuyCredit.toFixed(2)),
    netPayable: Number(Math.abs(totalSellValue - totalBuyCredit).toFixed(2)),
  };
};

export const ExchangeModeForm: React.FC<ModeFormProps> = ({
  items,
  handleUpdateItem,
  handleUpdateItemMultiple,
  handleRemoveItem,
  calcResults,
  presets,
  getItemNameOptions,
  handleAddNewPreset,
  rates,
  t,
  showValidationErrors,
  setShowValidationErrors,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem' }}>
      {items.map((it, idx) => {
        const grossW = Number(it.weight_grams) || 0;
        const dedW = Number(it.deduction_weight_grams) || 0;
        const netW = Math.max(0, grossW - dedW);

        const isSellItem = it.item_type === 'SELL';
        const hmwPct = Number(it.wastage_percent) || 0;
        const totalWWithHmw = netW + (netW * hmwPct) / 100;

        const purityPct = Number(it.purity_percentage) || 0;
        const pureW = (netW * purityPct) / 100;

        // const retPurityPct = Number(it.return_purity_percentage) || 0;
        // const calculatedRetPureG = (netW * retPurityPct) / 100;

        const netWeightLabel = it.metal_type === 'SILVER' ? t.onlySilverWeightLabel : t.onlyGoldWeightLabel;
        const pureMetalWeightLabel = it.metal_type === 'SILVER' ? t.pureSilverWeightLabel : t.pureGoldWeightLabel;

        return (
          <div
            key={it.id}
            style={{
              background: '#ffffff',
              border: isSellItem ? '1.5px solid #86efac' : '1.5px solid #7dd3fc',
              borderRadius: '12px',
              padding: '1rem',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            {/* Item Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isSellItem ? '#15803d' : '#0369a1', background: isSellItem ? '#dcfce7' : '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                {isSellItem ? `Item ${idx + 1} — New Ornament Selling` : `Item ${idx + 1} — Customer Old Item Selling`}
              </span>
              {items.length > 1 && handleRemoveItem && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(it.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid #fca5a5',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Remove Item"
                >
                  <i className="fa-solid fa-trash"></i> Remove
                </button>
              )}
            </div>

            {/* Row 1: Metal Type & Custom Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  {t.metalTypeLabel}
                </label>
                <select
                  value={it.metal_type}
                  onChange={(e) => {
                    const newMetal = e.target.value as 'GOLD' | 'SILVER';
                    const defaultR = newMetal === 'GOLD'
                      ? (isSellItem ? rates?.gold_sell_value : rates?.gold_buy_value)
                      : (isSellItem ? rates?.silver_sell_value : rates?.silver_buy_value);
                    if (handleUpdateItemMultiple) {
                      handleUpdateItemMultiple(it.id, { metal_type: newMetal, custom_rate_per_gram: defaultR || 0 });
                    } else {
                      handleUpdateItem(it.id, 'metal_type', newMetal);
                      handleUpdateItem(it.id, 'custom_rate_per_gram', defaultR || 0);
                    }
                  }}
                  style={{ width: '100%', padding: '0.55rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
                >
                  <option value="GOLD">🥇 {t.goldMetal}</option>
                  <option value="SILVER">🥈 {t.silverMetal}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  {t.rateLabel}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Rate"
                  onFocus={(e) => e.target.select()}
                  value={
                    it.custom_rate_per_gram !== undefined && it.custom_rate_per_gram !== ''
                      ? it.custom_rate_per_gram
                      : (
                        it.metal_type === 'GOLD'
                          ? (isSellItem ? rates?.gold_sell_value : rates?.gold_buy_value)
                          : (isSellItem ? rates?.silver_sell_value : rates?.silver_buy_value)
                      ) || ''
                  }
                  onChange={(e) => handleUpdateItem(it.id, 'custom_rate_per_gram', e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.6rem', borderRadius: '6px', border: '1px solid #6366f1', background: '#eef2ff', fontWeight: 700, color: '#4338ca', fontSize: '0.85rem' }}
                  required
                />
              </div>
            </div>

            {/* Row 2: Item Name & Gross Weight */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: showValidationErrors && (!it.product_name || !it.product_name.trim()) ? '#dc2626' : '#475569', display: 'block', marginBottom: '3px' }}>
                    {t.itemNameLabel} <span style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                  </label>
                  {showValidationErrors && (!it.product_name || !it.product_name.trim()) && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#dc2626' }}>* Required</span>
                  )}
                </div>
                <CreatablePresetSelect
                  value={it.product_name}
                  onChange={(val) => {
                    handleUpdateItem(it.id, 'product_name', toStartCase(val));
                    if (showValidationErrors) setShowValidationErrors(false);
                  }}
                  options={getItemNameOptions ? getItemNameOptions(it.metal_type) : (presets.item_name || [])}
                  placeholder={t.itemNamePlaceholder}
                  categoryName="item_name"
                  onAddNewPreset={handleAddNewPreset}
                  style={showValidationErrors && (!it.product_name || !it.product_name.trim()) ? { border: '2px solid #dc2626', background: '#fef2f2', boxShadow: '0 0 0 4px rgba(220, 38, 38, 0.25)' } : {}}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: showValidationErrors && (!it.weight_grams || Number(it.weight_grams) <= 0) ? '#dc2626' : '#475569', display: 'block', marginBottom: '3px' }}>
                    {t.itemWeightLabel} <span style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                  </label>
                  {showValidationErrors && (!it.weight_grams || Number(it.weight_grams) <= 0) && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#dc2626' }}>* &gt; 0g Req</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 10.000"
                    onFocus={(e) => e.target.select()}
                    value={it.weight_grams ?? ''}
                    onChange={(e) => {
                      handleUpdateItem(it.id, 'weight_grams', e.target.value);
                      if (showValidationErrors) setShowValidationErrors(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.2rem 0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: showValidationErrors && (!it.weight_grams || Number(it.weight_grams) <= 0) ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: showValidationErrors && (!it.weight_grams || Number(it.weight_grams) <= 0) ? '#fef2f2' : '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                    required
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', pointerEvents: 'none' }}>
                    g
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3: Deduction Name, Deduction Weight & Net Metal Weight */}
            {(() => {
              const isDeductionTooHigh = dedW > grossW && grossW > 0;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>{t.deductionNameLabel}</label>
                    <CreatablePresetSelect
                      value={it.deduction_name ?? ''}
                      onChange={(val) => handleUpdateItem(it.id, 'deduction_name', toStartCase(val))}
                      options={presets.deduction_name || []}
                      placeholder={t.deductionNamePlaceholder}
                      categoryName="deduction_name"
                      onAddNewPreset={handleAddNewPreset}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: isDeductionTooHigh ? '#dc2626' : '#475569', display: 'block', marginBottom: '3px' }}>
                        {t.deductionWeightLabel}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.000"
                          onFocus={(e) => e.target.select()}
                          value={it.deduction_weight_grams ?? ''}
                          onChange={(e) => handleUpdateItem(it.id, 'deduction_weight_grams', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 1.8rem 0.55rem 0.5rem',
                            borderRadius: '6px',
                            border: isDeductionTooHigh ? '2px solid #dc2626' : '1px solid #cbd5e1',
                            background: isDeductionTooHigh ? '#fef2f2' : '#ffffff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        />
                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, color: isDeductionTooHigh ? '#dc2626' : '#64748b', pointerEvents: 'none' }}>
                          g
                        </span>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '3px' }}>
                        {netWeightLabel}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          readOnly
                          placeholder="0.000"
                          value={grossW > 0 ? formatMax3Decimals(netW) : ''}
                          style={{ width: '100%', padding: '0.55rem 1.8rem 0.55rem 0.5rem', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', fontWeight: 800, color: '#166534', fontSize: '0.85rem' }}
                        />
                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 700, color: '#166534', pointerEvents: 'none' }}>
                          g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Row 4: SELL HMW vs BUY Quality % */}
            {isSellItem ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>{t.hmwLabel}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 3"
                    onFocus={(e) => e.target.select()}
                    value={it.wastage_percent ? it.wastage_percent : ''}
                    onChange={(e) => handleUpdateItem(it.id, 'wastage_percent', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309', display: 'block', marginBottom: '3px' }}>{t.totalWeightAfterHmwLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      readOnly
                      placeholder="0.000"
                      value={grossW > 0 ? formatMax3Decimals(totalWWithHmw) : ''}
                      style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #fde68a', background: '#fef3c7', fontWeight: 700, color: '#b45309', fontSize: '0.85rem' }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#b45309', pointerEvents: 'none' }}>
                      g
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    {t.itemQualityLabel}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 90"
                      onFocus={(e) => e.target.select()}
                      value={it.purity_percentage ? it.purity_percentage : ''}
                      onChange={(e) => handleUpdateItem(it.id, 'purity_percentage', e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', pointerEvents: 'none' }}>
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', display: 'block', marginBottom: '3px' }}>
                    {pureMetalWeightLabel}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      readOnly
                      placeholder="0.000"
                      value={grossW > 0 && purityPct > 0 ? formatMax3Decimals(pureW) : ''}
                      style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #bae6fd', background: '#f0f9ff', fontWeight: 800, color: '#0369a1', fontSize: '0.85rem' }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', pointerEvents: 'none' }}>
                      g
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Charges (Stones, Beads, Pearls, Diamonds) & Additional Cost (₹) */}
            {isSellItem && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Additional Charges
                  </label>
                  <CreatablePresetSelect
                    value={it.additional_charges_name ?? ''}
                    onChange={(val) => handleUpdateItem(it.id, 'additional_charges_name', toStartCase(val))}
                    options={Array.from(new Set(['Stones', 'Beads', 'Pearls', 'Diamonds', ...(presets.additional_charge || [])]))}
                    placeholder="e.g. Stones / Beads / Pearls / Diamonds"
                    categoryName="additional_charge"
                    onAddNewPreset={handleAddNewPreset}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Additional Cost
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 250"
                      onFocus={(e) => e.target.select()}
                      value={it.additional_charges_amount ? it.additional_charges_amount : ''}
                      onChange={(e) => handleUpdateItem(it.id, 'additional_charges_amount', e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 1.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Row 6 (Making Charges for SELL) */}
            {isSellItem && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>{t.makingChargesLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 500"
                      onFocus={(e) => e.target.select()}
                      value={it.making_charges_per_gram ? it.making_charges_per_gram : ''}
                      onChange={(e) => handleUpdateItem(it.id, 'making_charges_per_gram', e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 1.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: '3px' }}>{t.itemTotalLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: '#15803d' }}>₹</span>
                    <input
                      type="text"
                      readOnly
                      placeholder="0"
                      value={(calcResults.itemDetails[it.id]?.lineTotal || 0).toLocaleString('en-IN')}
                      style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 1.8rem', borderRadius: '6px', border: '1px solid #86efac', background: '#f0fdf4', fontWeight: 800, color: '#15803d', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </div>
            )}



            {/* Subtotal line */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {t.calculatedSubtotal} <strong style={{ color: isSellItem ? '#15803d' : '#0369a1', fontSize: '0.88rem' }}>₹{(calcResults.itemDetails[it.id]?.lineTotal || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
