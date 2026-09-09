import React from 'react';
import html2canvas from 'html2canvas';
import type { BillItem, GlobalRates } from '../types';

import { translations } from '../../utils/translations';
import type { Language } from '../../utils/translations';
import { round3Decimals } from './modes/modeUtils';

interface ReceiptPreviewProps {
  receiptId: string;
  mode: 'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER';
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  teluguCustomerName?: string;
  teluguCustomerAddress?: string;
  rates: GlobalRates | null;
  items: BillItem[];
  /** Pre-computed item details from the mode calculate function (single source of truth) */
  itemDetails?: Record<string, any>;
  totalSellValue: number;
  totalBuyCredit: number;
  netPayable: number;
  createdDate?: string;
  updatedDate?: string;
  itemSubmittedAt?: string;
  billType?: 'SALE_DONE' | 'ESTIMATION';
  paymentType?: 'FULL' | 'PARTIAL';
  advancePaidAmount?: number;
  balanceDueAmount?: number;
  paymentHistory?: any[];
  lang?: Language;
  onDownloadPNG?: () => void;
  onPrint?: () => void;
}

const formatReceiptDateTime = (isoOrStr?: string) => {
  if (!isoOrStr) return '';
  try {
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return isoOrStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    return `${dd}-${mm}-${yyyy} ${hours}:${minutes} ${ampm}`;
  } catch (err) {
    return isoOrStr;
  }
};

/** Automatic 80mm Thermal Receipt Direct Printer (Format 80mm, Silent Kiosk Auto-Cut Ready) */
export const printReceipt80mm = (receiptId: string) => {
  const element = document.getElementById(receiptId);
  if (!element) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const clone = element.cloneNode(true) as HTMLElement;
  const buttons = clone.querySelectorAll('button');
  buttons.forEach((btn) => (btn.style.display = 'none'));

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>80mm Thermal Print</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            width: 80mm;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Courier New', Courier, monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #${receiptId} {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            border: none !important;
            box-shadow: none !important;
            padding: 3mm !important;
            margin: 0 !important;
            top: 0 !important;
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Thermal print trigger error:', e);
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  };

  const images = iframe.contentWindow?.document.querySelectorAll('img');
  const totalImages = images?.length || 0;

  if (totalImages === 0) {
    setTimeout(triggerPrint, 200);
  } else {
    let printed = false;
    let loadedCount = 0;

    const checkAndPrint = () => {
      if (!printed) {
        printed = true;
        triggerPrint();
      }
    };

    const fallbackTimer = setTimeout(checkAndPrint, 600);

    images?.forEach((img) => {
      if (img.complete) {
        loadedCount++;
        if (loadedCount >= totalImages) {
          clearTimeout(fallbackTimer);
          setTimeout(checkAndPrint, 100);
        }
      } else {
        img.onload = img.onerror = () => {
          loadedCount++;
          if (loadedCount >= totalImages) {
            clearTimeout(fallbackTimer);
            setTimeout(checkAndPrint, 100);
          }
        };
      }
    });
  }
};

// html2canvas-based Exact DOM Snapshot PNG Downloader (taint-free, 100% pixel-perfect)
export const downloadReceiptAsPNG = async (receiptId: string, custName?: string) => {
  const element = document.getElementById(receiptId);
  if (!element) return;

  const cleanName = (custName && custName.trim() !== '')
    ? custName.trim().replace(/[^a-zA-Z0-9]/g, '_')
    : 'Walk_In_Customer';
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const fileName = `${cleanName}_${dd}-${mm}-${yyyy}_${hours}-${minutes}.png`;

  // Temporarily hide the download button during capture
  const btn = element.querySelector('button') as HTMLElement | null;
  if (btn) btn.style.visibility = 'hidden';

  // Save current styles & force fixed 380px thermal receipt width for 100% consistent export across mobile, tablet, and PC
  const originalWidth = element.style.width;
  const originalMinWidth = element.style.minWidth;
  const originalMaxWidth = element.style.maxWidth;

  element.style.width = '380px';
  element.style.minWidth = '380px';
  element.style.maxWidth = '380px';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,           // 2x Retina resolution
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1280, // Force desktop viewport calculation
    });

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = fileName;
    link.href = pngUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('html2canvas export failed:', err);
  } finally {
    // Restore original styles & button visibility
    element.style.width = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;
    if (btn) btn.style.visibility = 'visible';
  }
};

const formatMax3Decimals = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return String(round3Decimals(num));
};

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  receiptId,
  mode,
  customerName,
  customerPhone,
  customerAddress,
  teluguCustomerName,
  teluguCustomerAddress,
  rates,
  items,
  itemDetails: passedItemDetails,
  totalSellValue,
  totalBuyCredit,
  createdDate,
  updatedDate,
  itemSubmittedAt,
  billType = 'SALE_DONE',
  paymentType = 'FULL',
  advancePaidAmount,
  balanceDueAmount,
  paymentHistory,
  lang = 'EN',
  onDownloadPNG,
  onPrint,
}) => {
  const t = translations[lang] || translations.EN;

  const getItemDetails = (item: any) => {
    const isGold = (item.metal_type || '').toUpperCase() === 'GOLD';
    const isSell = (item.item_type || '').toUpperCase() === 'SELL';
    const isOrderMode = mode === 'ORDER';
    const customRate = Number(item.applied_rate_per_gram || item.appliedRate || item.custom_rate_per_gram || item.customRate || item.rate);
    const defaultRate = isGold
      ? (isSell ? rates?.gold_sell_value || 0 : rates?.gold_buy_value || 0)
      : (isSell ? rates?.silver_sell_value || 0 : rates?.silver_buy_value || 0);
    const rate = customRate > 0 ? customRate : defaultRate;

    const grossWeight = round3Decimals(Number(item.weight_grams) || 0);
    const deductionWeight = round3Decimals(Number(item.deduction_weight_grams) || 0);
    const netWeight = Math.max(0, round3Decimals(grossWeight - deductionWeight));

    const purityPercent = Number(item.purity_percentage) || 0;
    const wastagePercent = Number(item.wastage_percent) || 0;
    const wastageWeight = isSell ? round3Decimals((wastagePercent / 100) * netWeight) : 0;
    const totalChargedWeight = round3Decimals(netWeight + wastageWeight);

    // Determine pureWeight and metalVal — mirrors the mode calculate functions exactly
    let pureWeight = netWeight;
    let metalVal = 0;

    if (isSell) {
      if (purityPercent > 0) {
        // Purity entered: rate on pureWeight = netWeight × purity%
        pureWeight = round3Decimals(netWeight * (purityPercent / 100));
        metalVal = Number((pureWeight * rate).toFixed(2));
      } else {
        // No purity: rate on totalChargedWeight (after HMW)
        pureWeight = netWeight;
        metalVal = Number((totalChargedWeight * rate).toFixed(2));
      }
    } else {
      if (isOrderMode) {
        // ORDER BUY: pureWeight if purity entered, else netWeight
        pureWeight = purityPercent > 0
          ? round3Decimals(netWeight * (purityPercent / 100))
          : netWeight;
      } else {
        // BUY / EXCHANGE BUY: pure metal weight
        pureWeight = round3Decimals(netWeight * (purityPercent / 100));
      }
      metalVal = Number((pureWeight * rate).toFixed(2));
    }

    // Making charges = flat amount directly (no per-gram multiplication)
    const makingVal = isSell ? Number((Number(item.making_charges ?? item.making_charges_per_gram ?? item.makingVal ?? 0)).toFixed(2)) : 0;
    const additionalVal = isSell ? Number((Number(item.additional_cost ?? item.additional_charges_amount ?? item.additional_charge_value ?? 0)).toFixed(2)) : 0;
    const lineTotal = Number((metalVal + makingVal + additionalVal).toFixed(2));

    return {
      grossWeight, deductionWeight, netWeight,
      purityPercent, pureWeight,
      wastagePercent, wastageWeight, totalChargedWeight,
      metalVal, wastageVal: 0, makingVal, additionalVal, lineTotal,
      rate,
    };
  };

  const handleDownload = () => {
    if (onDownloadPNG) {
      onDownloadPNG();
    } else {
      downloadReceiptAsPNG(receiptId, customerName);
    }
  };

  const handleThermalPrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      printReceipt80mm(receiptId);
    }
  };

  const isNeedToPayCustomer = mode === 'BUY' || totalBuyCredit > totalSellValue;
  const isPartialOrDue = !isNeedToPayCustomer && ((balanceDueAmount !== undefined && balanceDueAmount > 0) || paymentType === 'PARTIAL');

  return (
    <div
      id={receiptId}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.15rem',
        border: '1px dashed #94a3b8',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        top: '1rem',
        overflow: 'hidden',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* 20% Opacity Watermark Logo Background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0.20,
          zIndex: 0,
        }}
      >
        <img
          src="/jb_logo-symmetric.png"
          alt="JB Watermark"
          style={{ width: '220px', height: '220px', objectFit: 'contain' }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Thermal Store Header & Actions */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '0.45rem', marginBottom: '0.5rem', position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={handleDownload}
              title="Download Receipt PNG Image"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #a13003',
                background: '#f8fafc',
                color: '#a13003',
                fontWeight: 700,
                fontSize: '0.65rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-download" style={{ color: '#a13003' }}></i> Bill
            </button>

            <button
              type="button"
              onClick={handleThermalPrint}
              title="Print Direct 80mm Thermal Receipt"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #4f46e5',
                background: '#eef2ff',
                color: '#4338ca',
                fontWeight: 700,
                fontSize: '0.65rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-print"></i>
            </button>
          </div>

          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
            {t.storeName}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.62rem', color: '#0f172a', fontWeight: 700 }}>
            {t.storeAddress}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', fontSize: '0.62rem', color: '#0f172a', fontWeight: 800 }}>
            <span>{t.storeProprietor1Name || 'Dharmavaram Suryaprakash'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-phone" style={{ fontSize: '0.52rem', color: '#334155' }}></i> {t.storeProprietor1Phone || '9030030505'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px', fontSize: '0.62rem', color: '#0f172a', fontWeight: 800 }}>
            <span>{t.storeProprietor2Name || 'S/O Krishna'}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-phone" style={{ fontSize: '0.52rem', color: '#334155' }}></i> {t.storeProprietor2Phone || '9849845905'}
            </span>
          </div>
        </div>

        {/* Date, Mode & Customer Info with Goddess Artwork in the middle */}
        <div style={{ position: 'relative', borderBottom: '1px dashed #94a3b8', paddingBottom: '0.85rem', marginBottom: '0.85rem', fontSize: '0.7rem' }}>
          {/* Goddess Orange Artwork centered across the entire Date-to-Address section */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              opacity: 0.85,
              zIndex: 0,
            }}
          >
            <img
              src="/jbj-godess-orange.png"
              alt="Goddess Bhavani"
              style={{ width: '95px', height: '95px', objectFit: 'contain', filter: 'saturate(1.4) contrast(1.1)' }}
            />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Mode line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700 }}>{t.modeLabel || 'BILL MODE:'}</span>
              <strong style={{ color: billType === 'ESTIMATION' ? '#d97706' : (mode === 'ORDER' ? '#d97706' : mode === 'SELL' ? '#b45309' : mode === 'BUY' ? '#0369a1' : '#4f46e5') }}>
                [{(() => {
                  const baseTitle = mode === 'ORDER'
                    ? ((t as any).orderBill || 'JBJ CUSTOM ORDER BILL')
                    : mode === 'SELL'
                      ? t.sellingBill
                      : mode === 'BUY'
                        ? t.buyingBill
                        : t.exchangeBill;
                  const estTag = lang === 'TE' ? '(ఎస్టిమేషన్)' : '(Estimation)';
                  return billType === 'ESTIMATION' ? `${baseTitle} ${estTag}` : baseTitle;
                })()}]
              </strong>
            </div>

            {/* Date line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.68rem' }}>
              <span style={{ fontWeight: 700, color: '#334155' }}>{mode === 'ORDER' ? 'ORDER BOOKED DATE:' : t.dateLabel}</span>
              <strong style={{ color: '#0f172a' }}>
                {createdDate ? formatReceiptDateTime(createdDate) : `${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
              </strong>
            </div>
            {mode === 'ORDER' && itemSubmittedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.68rem', color: '#15803d' }}>
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '0.6rem' }}></i> DELIVERED ON:
                </span>
                <strong>{formatReceiptDateTime(itemSubmittedAt)}</strong>
              </div>
            )}
            {updatedDate && updatedDate !== createdDate && !itemSubmittedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.68rem', color: '#d97706' }}>
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-pen-to-square" style={{ fontSize: '0.6rem' }}></i> {t.lastUpdated}:
                </span>
                <strong>{formatReceiptDateTime(updatedDate)}</strong>
              </div>
            )}

            {/* Customer name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700 }}>{t.customerLabel}</span>
              <strong style={{ color: '#0f172a' }}>{(lang === 'TE' && teluguCustomerName ? teluguCustomerName : customerName) || t.walkInCustomer}</strong>
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700 }}>{t.phoneLabel}</span>
              <strong style={{ color: '#0f172a' }}>{customerPhone || 'N/A'}</strong>
            </div>

            {/* Address */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>{t.addressLabel}</span>
              <strong style={{ color: '#0f172a' }}>{(lang === 'TE' && teluguCustomerAddress ? teluguCustomerAddress : customerAddress) || (lang === 'TE' ? 'సిద్దిపేట, తెలంగాణ' : 'Siddipet, Telangana')}</strong>
            </div>
          </div>
        </div>

        {/* Live Active Rates Snapshot Box */}
        <div style={{ background: 'rgba(248, 250, 252, 0.65)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.85rem', fontSize: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700, marginBottom: '2px' }}>
            <span>JBJ GOLD SELL/BUY:</span>
            <span>₹{rates?.gold_sell_value || 0} / ₹{rates?.gold_buy_value || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
            <span>JBJ SILVER SELL/BUY:</span>
            <span>₹{rates?.silver_sell_value || 0} / ₹{rates?.silver_buy_value || 0}</span>
          </div>
        </div>

        {/* Itemized Line Items Breakdown */}
        <div style={{ marginBottom: '1rem' }}>
          {items.map((it, idx) => {
            // Use pre-computed values from the mode calculate function when available (live billing).
            // Fall back to local getItemDetails() for stored invoice views (SeeBillModal, InvoiceDetailsView).
            const details = (passedItemDetails && passedItemDetails[it.id]) || getItemDetails(it);
            const isSell = it.item_type === 'SELL';
            const isGold = (it.metal_type || '').toUpperCase() === 'GOLD';
            const rate = details.rate || 0;

            return (
              <div key={it.id || idx} style={{ background: 'rgba(248, 250, 252, 0.65)', borderRadius: '8px', padding: '0.65rem 0.75rem', marginBottom: '0.6rem', border: '1px solid #94a3b8', fontSize: '0.68rem', color: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderBottom: '1px dashed #94a3b8', paddingBottom: '3px', marginBottom: '4px' }}>
                  <span>#{idx + 1} {it.product_name || (it.metal_type + ' Item')}</span>
                  <span style={{ color: isSell ? '#b45309' : '#0284c7', fontWeight: 800 }}>
                    {isSell ? t.custBuyingTag : t.custSellingTag}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '2px', color: '#0f172a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                    <span style={{ fontWeight: 700 }}>{t.metalCategoryReceipt}</span>
                    <strong>{isGold ? t.goldMetal : t.silverMetal}</strong>
                  </div>

                  {mode === 'ORDER' && isSell && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                      <span style={{ fontWeight: 700 }}>Quantity & Unit:</span>
                      <strong>
                        {it.quantity_value || 1} {it.quantity_unit === 'PAIRS' ? 'Pairs' : it.quantity_unit === 'GRAMS' ? 'g' : 'Pcs'}
                        {it.item_length_inches ? ` (${it.item_length_inches.toString().endsWith('"') ? it.item_length_inches : it.item_length_inches + ' in'})` : ''}
                      </strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                    <span style={{ fontWeight: 700 }}>{t.grossItemWeightReceipt}</span>
                    <strong>{formatMax3Decimals(details.grossWeight)} gm</strong>
                  </div>

                  {details.deductionWeight > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                      <span style={{ fontWeight: 700 }}>{t.deductionReceipt} ({it.deduction_name || 'Stones/Wax'}):</span>
                      <strong>- {formatMax3Decimals(details.deductionWeight)} gm</strong>
                    </div>
                  )}

                  {/* Only Gold/Silver Weight — shown for SELL items after deduction, and always for BUY items */}
                  {isSell && details.deductionWeight > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
                      <span>{isGold ? t.onlyGoldWeightLabel : t.onlySilverWeightLabel}:</span>
                      <strong>{formatMax3Decimals(details.netWeight)} gm</strong>
                    </div>
                  )}

                  {isSell && details.wastagePercent > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                      <span>HMW ({formatMax3Decimals(details.wastagePercent)}%):</span>
                      <strong>{formatMax3Decimals(details.totalChargedWeight)} gm</strong>
                    </div>
                  )}

                  {!isSell && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
                        <span>{isGold ? t.onlyGoldWeightLabel : t.onlySilverWeightLabel}:</span>
                        <strong>{formatMax3Decimals(details.netWeight)} gm</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                        <span>{t.itemQualityReceipt}</span>
                        <strong>{formatMax3Decimals(details.purityPercent)}%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
                        <span>{isGold ? t.pureGoldWeightLabel : t.pureSilverWeightLabel} ({formatMax3Decimals(details.purityPercent)}%):</span>
                        <strong>{formatMax3Decimals(details.pureWeight)} gm</strong>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                    <span style={{ fontWeight: 700 }}>
                      {isGold ? t.goldValueReceipt : t.silverValueReceipt} (₹{rate}/g):
                    </span>
                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>₹{details.metalVal.toLocaleString('en-IN')}</strong>
                  </div>

                  {isSell && (
                    <>
                      {details.additionalVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                          <span>{it.additional_charges || it.additional_charges_name || it.additional_charge_name || 'Additional Charges'}:</span>
                          <strong>+ ₹{details.additionalVal.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                      {details.makingVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
                          <span>{t.makingChargesReceipt}</span>
                          <strong>+ ₹{details.makingVal.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: isSell ? '#15803d' : '#0284c7', borderTop: '1px dashed #94a3b8', paddingTop: '3px', marginTop: '2px' }}>
                    <span>{t.itemSubtotalReceipt}</span>
                    <strong>₹{details.lineTotal > 0 ? details.lineTotal.toLocaleString('en-IN') : '0'}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean Summary Breakdown based on Transaction Mode */}
        <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.65rem', fontSize: '0.72rem', color: '#334155', position: 'relative' }}>
          {/* Official Stamp Graphic Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '-38px',
              right: '78px',
              pointerEvents: 'none',
              zIndex: 10,
              opacity: 0.88,
              transform: 'rotate(-10deg)',
            }}
          >
            <img
              src={
                billType === 'ESTIMATION'
                  ? '/stamps/Estimation_stamp.png'
                  : isPartialOrDue
                    ? '/stamps/payment_due_stamp.webp'
                    : '/stamps/sale_done_stamp.webp'
              }
              alt={
                billType === 'ESTIMATION'
                  ? 'Estimation Stamp'
                  : isPartialOrDue
                    ? 'Payment Due Stamp'
                    : 'Sale Done Stamp'
              }
              style={{
                width: isPartialOrDue ? '110px' : billType === 'ESTIMATION' ? '120px' : '110px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))',
              }}
            />
          </div>

          {mode === 'BUY' ? (
            <>
              <div style={{ fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>{t.grossBuyingItems}</div>
              <div style={{ display: 'grid', gap: '3px', paddingLeft: '4px', marginBottom: '6px' }}>
                {items.filter(i => i.item_type === 'BUY').map((it, idx) => {
                  const details = getItemDetails(it);
                  return (
                    <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                      <span>{it.product_name || 'Old Metal Item'}:</span>
                      <span>₹{details.lineTotal.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.95rem', fontWeight: 800, color: '#0369a1', paddingTop: '6px', borderTop: '1px solid #94a3b8', marginTop: '4px' }}>
                <div>
                  <div>{t.grandTotal}</div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0369a1' }}>
                    {t.needToPayCustomer}
                  </div>
                </div>
                <div>₹{totalBuyCredit.toLocaleString('en-IN')}</div>
              </div>
            </>
          ) : mode === 'SELL' ? (
            <>
              <div style={{ fontWeight: 800, color: '#b45309', marginBottom: '4px' }}>{t.grossSellingItems}</div>
              <div style={{ display: 'grid', gap: '3px', paddingLeft: '4px', marginBottom: '6px' }}>
                {items.filter(i => i.item_type === 'SELL').map((it, idx) => {
                  const details = getItemDetails(it);
                  return (
                    <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                      <span>{it.product_name || 'Gold/Silver Item'}:</span>
                      <span>₹{details.lineTotal.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #94a3b8', marginTop: '4px' }}>
                <div>
                  <div>{t.grandTotal}</div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569' }}>
                    {t.customerShouldPay}
                  </div>
                </div>
                <div>₹{totalSellValue.toLocaleString('en-IN')}</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 700, color: '#b45309' }}>
                <span>{t.grossSellingTotal}</span>
                <span>₹{totalSellValue.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 700, color: '#0369a1' }}>
                <span>{t.lessExchangeCredit}</span>
                <span>- ₹{totalBuyCredit.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #94a3b8', marginTop: '4px' }}>
                <div>
                  <div>{t.grandTotal}</div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: totalBuyCredit > totalSellValue ? '#0369a1' : '#475569' }}>
                    {totalBuyCredit > totalSellValue ? t.needToPayCustomer : t.customerShouldPay}
                  </div>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900 }}>₹{Math.abs(totalSellValue - totalBuyCredit).toLocaleString('en-IN')}</div>
              </div>
            </>
          )}

          {/* Payment Breakdown (Paid vs Balance Due) - Shown ONLY when customer owes money to store */}
          {mode !== 'BUY' && totalSellValue >= totalBuyCredit && (advancePaidAmount !== undefined || balanceDueAmount !== undefined) && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', fontSize: '0.72rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
                <span>{lang === 'TE' ? 'చెల్లించిన మొత్తం' : 'Amount Paid'}:</span>
                <strong>₹{(advancePaidAmount || 0).toLocaleString('en-IN')}</strong>
              </div>
              {(balanceDueAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 800, marginTop: '2px' }}>
                  <span>{lang === 'TE' ? 'బాకీ బకాయి (Due)' : 'Balance Due'}:</span>
                  <strong>₹{(balanceDueAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>
          )}

          {/* Payment History List (Installments) */}
          {mode !== 'BUY' && totalSellValue >= totalBuyCredit && paymentHistory && paymentHistory.length > 0 && (
            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', fontSize: '0.68rem' }}>
              <div style={{ fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                Payment History (Installments):
              </div>
              {paymentHistory.map((ph: any, pIdx: number) => (
                <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', padding: '1px 0' }}>
                  <span>#{ph.installment || pIdx + 1} {formatReceiptDateTime(ph.paid_at || ph.date)} ({ph.note || ph.type || 'Payment'}):</span>
                  <strong style={{ color: '#16a34a' }}>+ ₹{(Number(ph.amount) || 0).toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thermal Receipt Footer */}
        <div style={{ textAlign: 'center', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #94a3b8' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#181f30', opacity: 0.8 }}>
            ⭐⭐⭐⭐⭐⭐ Bill End ⭐⭐⭐⭐⭐⭐
          </div>
          <small style={{ fontSize: '0.7rem', color: '#181f30', display: 'block', marginTop: '4px', fontWeight: 700 }}>
            {t.thankYouMessage}
          </small>
        </div>
      </div>
    </div>
  );
};
