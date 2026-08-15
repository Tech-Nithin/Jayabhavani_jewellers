import React from 'react';
import type { ModeFormProps } from './modeUtils';
import { toStartCase, formatMax3Decimals, CreatablePresetSelect } from './modeUtils';

export const SellModeForm: React.FC<ModeFormProps> = ({
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

        const hmwPct = Number(it.wastage_percent) || 0;
        const totalWWithHmw = grossW + (grossW * hmwPct) / 100;

        const retPurityPct = Number(it.return_purity_percentage) || 0;
        const calculatedRetPureG = (netW * retPurityPct) / 100;

        const netWeightLabel = it.metal_type === 'SILVER' ? t.onlySilverWeightLabel : t.onlyGoldWeightLabel;

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
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                🏷️ Item {idx + 1} — Selling Item
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
                    const defaultR = newMetal === 'GOLD' ? rates?.gold_sell_value : rates?.silver_sell_value;
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
                      : (it.metal_type === 'GOLD' ? rates?.gold_sell_value : rates?.silver_sell_value) || ''
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

            {/* Row 4: HMW (%) & Total Weight after HMW */}
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

            {/* Row 6: Making Charges & Item Line Total */}
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

            {/* Row 7: Return Purity (%) & Return Pure Gold */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6d28d9', margin: 0 }}>
                    {t.returnPurityLabel}
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 91.6"
                    onFocus={(e) => e.target.select()}
                    value={it.return_purity_percentage ?? ''}
                    onChange={(e) => handleUpdateItem(it.id, 'return_purity_percentage', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 1.8rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', pointerEvents: 'none' }}>
                    %
                  </span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', margin: 0 }}>
                    {t.returnPureGoldLabel}
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    readOnly
                    placeholder="0.000"
                    value={grossW > 0 && retPurityPct > 0 ? formatMax3Decimals(calculatedRetPureG) : (it.return_pure_gold || '')}
                    style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #ddd6fe', background: '#f5f3ff', fontWeight: 700, color: '#6d28d9', fontSize: '0.85rem' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed', pointerEvents: 'none' }}>
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
