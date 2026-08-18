import React, { useState, useRef } from 'react';
import type { GlobalRates, BillItem } from '../../types';
import type { ModeFormProps, ItemCalcDetail, BillCalcResult } from './modeUtils';
import { toStartCase, formatMax3Decimals, round3Decimals, CreatablePresetSelect } from './modeUtils';
import { CameraCaptureModal } from '../../../inventory-frontend/components/CameraCaptureModal';

// ─── ORDER MODE CALCULATION ───────────────────────────────────────────────────
// SELL items (new custom order ornament):
//   finalWeight = netWeight + HMW wastage             [3 decimals]
//   metalVal    = finalWeight × sell_rate              [2 decimals]
//   makingVal   = making_charges_per_gram × finalWeight [2 decimals]
//
// BUY items (advance old metal given by customer):
//   finalWeight = netWeight  (no purity deduction for ORDER advance metal)  [3 decimals]
//   metalVal    = netWeight × buy_rate                 [2 decimals]
//   makingVal   = 0

export const calculateOrderItems = (items: BillItem[], rates: GlobalRates): BillCalcResult => {
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
    const purityPercent = Number(it.purity_percentage) || 0;

    if (isSell) {
      // SELL item:
      // HMW is always computed for display
      const wastagePercent = Number(it.wastage_percent) || 0;
      wastageWeight = round3Decimals((wastagePercent / 100) * netWeight);
      totalChargedWeight = round3Decimals(netWeight + wastageWeight);

      if (purityPercent > 0) {
        // Purity entered: pureWeight = netWeight × (purity%/100), rate on pureWeight
        pureWeight = round3Decimals(netWeight * (purityPercent / 100));
        metalVal = Number((pureWeight * rate).toFixed(2));
      } else {
        // No purity: rate on totalChargedWeight (after HMW)
        pureWeight = netWeight;
        metalVal = Number((totalChargedWeight * rate).toFixed(2));
      }
      makingVal = Number((Number(it.making_charges_per_gram) || 0).toFixed(2));
      additionalVal = Number((Number(it.additional_charges_amount) || 0).toFixed(2));
      totalSellValue = Number((totalSellValue + metalVal + makingVal + additionalVal).toFixed(2));
    } else {
      // ORDER BUY item:
      // If purity entered → pureWeight = netWeight × (purity%/100), rate on pureWeight
      // If no purity     → use netWeight directly
      pureWeight = purityPercent > 0
        ? round3Decimals(netWeight * (purityPercent / 100))
        : netWeight;
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

export const OrderModeForm: React.FC<ModeFormProps> = ({
  items,
  handleUpdateItem,
  handleUpdateItemMultiple,
  handleRemoveItem,
  calcResults,
  presets,
  handleAddNewPreset,
  rates,
  lang,
  t,
  showValidationErrors,
  setShowValidationErrors,
  uploadingImageItemId,
  handleItemImageUpload,
  setPreviewImage,
}) => {
  const [activeCameraItemId, setActiveCameraItemId] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fallbackInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const startCamera = async (itemId: string) => {
    setActiveCameraItemId(itemId);
    try {
      setIsCameraModalOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.warn('Live camera stream unavailable, falling back to native camera picker:', err);
      setIsCameraModalOpen(false);
      if (fallbackInputRefs.current[itemId]) {
        fallbackInputRefs.current[itemId]?.click();
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraModalOpen(false);
    setActiveCameraItemId(null);
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !activeCameraItemId) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob && handleItemImageUpload && activeCameraItemId) {
          const file = new File([blob], `order-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleItemImageUpload(activeCameraItemId, file);
        }
      }, 'image/jpeg', 0.9);
    }
    stopCamera();
  };

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

        const netWeightLabel = it.metal_type === 'SILVER' ? t.onlySilverWeightLabel : t.onlyGoldWeightLabel;
        const pureMetalWeightLabel = it.metal_type === 'SILVER' ? t.pureSilverWeightLabel : t.pureGoldWeightLabel;

        return (
          <div
            key={it.id}
            style={{
              background: '#ffffff',
              border: isSellItem ? '1.5px solid #fde68a' : '1.5px solid #7dd3fc',
              borderRadius: '12px',
              padding: '1rem',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            {/* Item Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.4rem', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isSellItem ? '#b45309' : '#0369a1', background: isSellItem ? '#fef3c7' : '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                {isSellItem ? `Item ${idx + 1} — JBJ Order Item` : `Item ${idx + 1} — Customer Selling Item`}
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

            {/* Row 2.5: Unit Type, Quantity & Length (Exclusive to JBJ ORDER ITEM) */}
            {isSellItem && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Unit Type (Pairs / Pcs)
                  </label>
                  <select
                    value={it.quantity_unit || 'PIECES'}
                    onChange={(e) => handleUpdateItem(it.id, 'quantity_unit', e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', fontWeight: 700, color: '#0f172a' }}
                  >
                    <option value="PIECES">🧩 Pieces (Pcs)</option>
                    <option value="PAIRS">👥 Pairs (Prs)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                      Quantity <span style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="1"
                      onFocus={(e) => e.target.select()}
                      value={it.quantity_value !== undefined ? it.quantity_value : ''}
                      onChange={(e) => handleUpdateItem(it.id, 'quantity_value', e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '3px' }}>
                      Length (inches)
                    </label>
                    <input
                      type="text"
                      placeholder='e.g. 18", 22"'
                      onFocus={(e) => e.target.select()}
                      value={it.item_length_inches ?? ''}
                      onChange={(e) => handleUpdateItem(it.id, 'item_length_inches', e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Row 3: Deduction Name, Deduction Weight & Net Metal Weight (Exclusive to JBJ BUYING ITEM) */}
            {!isSellItem && (() => {
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
                      value={netW > 0 && purityPct > 0 ? formatMax3Decimals(pureW) : ''}
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

            {/* Bottom Section: Image Picker & Order Notes (Shown ONLY for JBJ ORDER ITEM) */}
            {isSellItem && (
              <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0' }}>
                {/* 📸 Reference Photo Picker */}
                <div style={{ marginBottom: '0.75rem', background: '#fffbeb', border: '1px dashed #fde68a', borderRadius: '8px', padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {uploadingImageItemId === it.id ? (
                      <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#fef3c7', border: '1.5px solid #d97706', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        <i className="fa-solid fa-spinner fa-spin" />
                      </div>
                    ) : it.image_url ? (
                      <img
                        src={it.image_url}
                        alt="Ornament Design"
                        onClick={() => setPreviewImage && setPreviewImage({ url: it.image_url!, title: it.product_name || 'Ornament Design' })}
                        title="Click to enlarge image"
                        style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #d97706', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    ) : (
                      <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', border: '1px solid #fde68a' }}>
                        <i className="fa-solid fa-camera" />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                        {lang === 'TE' ? 'ఆర్డర్ నమూనా ఫోటో (Design Photo)' : 'Order Reference Photo / Design Image'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {uploadingImageItemId === it.id
                          ? 'Converting & loading preview...'
                          : it.image_url
                            ? 'Photo attached (Will store on Order Save)'
                            : 'Capture or upload reference ornament photo'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {/* 📸 Take Photo (Camera) Button */}
                    <button
                      type="button"
                      onClick={() => startCamera(it.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: uploadingImageItemId === it.id ? 0.7 : 1,
                        pointerEvents: uploadingImageItemId === it.id ? 'none' : 'auto',
                        boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)',
                      }}
                      title="Take direct photo using device camera"
                    >
                      <i className="fa-solid fa-camera"></i>
                      <span>Camera</span>
                    </button>

                    {/* Hidden Fallback Camera File Input */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={(el) => {
                        fallbackInputRefs.current[it.id] = el;
                      }}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && handleItemImageUpload) {
                          handleItemImageUpload(it.id, file);
                        }
                      }}
                    />

                    {/* 📁 Upload Image (File) Button */}
                    <label
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: '1px solid #d97706',
                        color: '#b45309',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: uploadingImageItemId === it.id ? 0.7 : 1,
                        pointerEvents: uploadingImageItemId === it.id ? 'none' : 'auto',
                      }}
                      title="Upload image from gallery or file storage"
                    >
                      <i className="fa-solid fa-upload"></i>
                      <span>{it.image_url ? 'Change File' : 'Upload File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && handleItemImageUpload) {
                            handleItemImageUpload(it.id, file);
                          }
                        }}
                      />
                    </label>

                    {it.image_url && !uploadingImageItemId && (
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(it.id, 'image_url', '')}
                        style={{ padding: '5px 8px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Remove Photo"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* 📝 Order Notes & Special Instructions */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                    <i className="fa-solid fa-pen-to-square" style={{ color: '#d97706' }}></i>
                    Order Notes & Special Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Antique finish, deliver before Friday, add extra side hooks..."
                    value={it.item_notes ?? ''}
                    onChange={(e) => handleUpdateItem(it.id, 'item_notes', toStartCase(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #fde68a',
                      background: '#fffbeb',
                      fontSize: '0.82rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      color: '#0f172a',
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Subtotal line */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {t.calculatedSubtotal} <strong style={{ color: isSellItem ? '#b45309' : '#0369a1', fontSize: '0.88rem' }}>₹{(calcResults.itemDetails[it.id]?.lineTotal || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>
        );
      })}

      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={stopCamera}
        onCapture={captureSnapshot}
        videoRef={videoRef}
        lang={lang}
      />
    </div>
  );
};
