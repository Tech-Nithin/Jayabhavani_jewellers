import React from 'react';
import type { GlobalRates, BillItem } from '../../types';
import type { ModeFormProps, ItemCalcDetail, BillCalcResult } from './modeUtils';
import { toStartCase, formatMax3Decimals, round3Decimals, CreatablePresetSelect } from './modeUtils';

// ─── BUY MODE CALCULATION ─────────────────────────────────────────────────────
// Formula:
//   netWeight    = grossWeight - deductionWeight          [3 decimals]
//   pureWeight   = netWeight × (purity% / 100)           [3 decimals]  ← final metal weight
//   metalVal     = pureWeight × rate                     [2 decimals]
//   makingVal    = 0  (JBJ buys, no making charges)
//   lineTotal    = metalVal                              [2 decimals]

export const calculateBuyItems = (items: BillItem[], rates: GlobalRates): BillCalcResult => {
  const itemDetails: Record<string, ItemCalcDetail> = {};
  let totalBuyCredit = 0;

  items
    .filter((it) => (it.item_type || 'BUY').toUpperCase() === 'BUY')
    .forEach((it) => {
      const isGold = (it.metal_type || 'GOLD').toUpperCase() === 'GOLD';
      const customRate = Number(it.custom_rate_per_gram || (it as any).customRate || (it as any).appliedRate) || 0;
      const rate = customRate > 0 ? customRate : (isGold ? rates.gold_buy_value : rates.silver_buy_value) || 0;

      const grossWeight = Number(it.weight_grams) || 0;
      const deductionWeight = Number(it.deduction_weight_grams) || 0;
      const netWeight = Math.max(0, round3Decimals(grossWeight - deductionWeight));

      const purityPercent = Number(it.purity_percentage) || 0;
      // Final metal weight for BUY = pure metal weight = netWeight × (purity% / 100)
      const pureWeight = round3Decimals(netWeight * (purityPercent / 100));

      const metalVal = Number((pureWeight * rate).toFixed(2));
      const lineTotal = Number(metalVal.toFixed(2));

      itemDetails[it.id] = {
        metalVal, makingVal: 0, additionalVal: 0, wastageVal: 0, gstVal: 0, lineTotal,
        grossWeight, deductionWeight, netWeight, pureWeight, wastageWeight: 0, totalChargedWeight: pureWeight,
        wastagePercent: 0, purityPercent, rate,
      };

      totalBuyCredit = Number((totalBuyCredit + lineTotal).toFixed(2));
    });

  return {
    itemDetails,
    totalSellValue: 0,
    totalBuyCredit: Number(totalBuyCredit.toFixed(2)),
    netPayable: Number(totalBuyCredit.toFixed(2)),
  };
};

export const BuyModeForm: React.FC<ModeFormProps> = ({
  items,
  handleUpdateItem,
  handleUpdateItemMultiple,
  handleRemoveItem,
  calcResults,
  presets,
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
        const purityPct = Number(it.purity_percentage) || 0;
        const pureW = (netW * purityPct) / 100;

        const netWeightLabel = it.metal_type === 'SILVER' ? t.onlySilverWeightLabel : t.onlyGoldWeightLabel;
        const pureMetalWeightLabel = it.metal_type === 'SILVER' ? t.pureSilverWeightLabel : t.pureGoldWeightLabel;

        return (
          <div
            key={it.id}
            style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            {/* Item Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                Item {idx + 1} - JBJ Buying
              </span>
              {items.length > 1 && handleRemoveItem && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(it.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
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
                    const defaultR = newMetal === 'GOLD' ? rates?.gold_buy_value : rates?.silver_buy_value;
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
                      : (it.metal_type === 'GOLD' ? rates?.gold_buy_value : rates?.silver_buy_value) || ''
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
                  options={presets.item_name || []}
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

            {/* Row 4 (for BUY): Item Quality (%) & Pure Metal Weight */}
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

            {/* Subtotal line */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {t.calculatedSubtotal} <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>₹{(calcResults.itemDetails[it.id]?.lineTotal || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
