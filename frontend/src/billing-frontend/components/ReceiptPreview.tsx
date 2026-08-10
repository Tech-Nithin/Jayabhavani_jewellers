import React from 'react';
import html2canvas from 'html2canvas';
import type { BillItem, GlobalRates } from '../types';

import { translations } from '../../utils/translations';
import type { Language } from '../../utils/translations';

interface ReceiptPreviewProps {
  receiptId: string;
  mode: 'SELL' | 'BUY' | 'EXCHANGE';
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  rates: GlobalRates | null;
  items: BillItem[];
  totalSellValue: number;
  totalBuyCredit: number;
  netPayable: number;
  createdDate?: string;
  updatedDate?: string;
  billType?: 'SALE_DONE' | 'ESTIMATION';
  lang?: Language;
  onDownloadPNG?: () => void;
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

const formatMax2Decimals = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  return String(rounded);
};

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  receiptId,
  mode,
  customerName,
  customerPhone,
  customerAddress,
  rates,
  items,
  totalSellValue,
  totalBuyCredit,
  createdDate,
  updatedDate,
  billType = 'SALE_DONE',
  lang = 'EN',
  onDownloadPNG,
}) => {
  const t = translations[lang] || translations.EN;

  const getItemDetails = (item: any) => {
    const isGold = (item.metal_type || '').toUpperCase() === 'GOLD';
    const isSell = (item.item_type || '').toUpperCase() === 'SELL';
    const customRate = Number(item.custom_rate_per_gram || item.customRate || item.appliedRate);
    const defaultRate = isGold
      ? (isSell ? rates?.gold_sell_value || 0 : rates?.gold_buy_value || 0)
      : (isSell ? rates?.silver_sell_value || 0 : rates?.silver_buy_value || 0);
    const rate = customRate > 0 ? customRate : defaultRate;

    const grossWeight = Number((Number(item.weight_grams) || 0).toFixed(2));
    const deductionWeight = Number((Number(item.deduction_weight_grams) || 0).toFixed(2));
    const netWeight = Math.max(0, Number((grossWeight - deductionWeight).toFixed(2)));

    const purityPercent = isSell ? 100 : (Number(item.purity_percentage) || 100);
    const pureWeight = Number((netWeight * (purityPercent / 100)).toFixed(2));

    const wastagePercent = Number(item.wastage_percent) || 0;
    const wastageWeight = isSell ? Number(((wastagePercent / 100) * netWeight).toFixed(3)) : 0;
    const totalChargedWeight = isSell ? Number((netWeight + wastageWeight).toFixed(3)) : pureWeight;

    const makingCharges = Number(item.making_charges_per_gram) || 0;
    const additionalCharges = Number(item.additional_charges_amount) || 0;

    const wastageVal = isSell ? Number(((wastagePercent / 100) * netWeight * rate).toFixed(2)) : 0;
    const metalVal = isSell
      ? Number((totalChargedWeight * rate).toFixed(2))
      : Number((pureWeight * rate).toFixed(2));

    const makingVal = isSell ? Number(makingCharges.toFixed(2)) : 0;
    const additionalVal = isSell ? Number(additionalCharges.toFixed(2)) : 0;

    const computedLineTotal = Number((metalVal + makingVal + additionalVal).toFixed(2));

    return {
      grossWeight,
      deductionWeight,
      netWeight,
      purityPercent,
      pureWeight,
      wastagePercent,
      wastageWeight,
      totalChargedWeight,
      metalVal,
      wastageVal,
      makingVal,
      additionalVal,
      lineTotal: computedLineTotal,
    };
  };

  const handleDownload = () => {
    if (onDownloadPNG) {
      onDownloadPNG();
    } else {
      downloadReceiptAsPNG(receiptId, customerName);
    }
  };

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
      {/* 25% Opacity Watermark Logo Background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          opacity: 0.25,
          zIndex: 0,
        }}
      >
        <img
          src="/JB_logo.png"
          alt="JB Watermark"
          style={{ width: '220px', height: '220px', objectFit: 'contain' }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Thermal Store Header & Download Action */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '1.25rem', marginBottom: '1rem', position: 'relative' }}>
          <button
            type="button"
            onClick={handleDownload}
            title="Download Receipt PNG Image"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #a13003ff',
              background: '#f8fafc',
              color: '#a13003ff',
              fontWeight: 700,
              fontSize: '0.65rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-solid fa-download" style={{ color: '#a13003ff' }}></i> Bill
          </button>

          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
            {t.storeName}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.62rem', color: '#0f172a', fontWeight: 700 }}>
            {t.storeAddress}
          </p>
        </div>

        <div style={{ marginTop: '8px', fontSize: '0.62rem', color: '#475569', fontWeight: 700, marginBottom: '0.85rem' }}>
          <div>{t.dateLabel} {createdDate ? formatReceiptDateTime(createdDate) : `${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}</div>
          {updatedDate && (
            <div style={{ color: '#d97706', marginTop: '3px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-solid fa-pen-to-square" style={{ fontSize: '0.6rem' }}></i>
              {t.lastUpdated} {formatReceiptDateTime(updatedDate)}
            </div>
          )}
        </div>

        {/* Transaction Mode & Customer Info */}
        <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem', fontSize: '0.7rem', color: '#334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>{t.modeLabel}</span>
            <strong style={{ color: billType === 'ESTIMATION' ? '#d97706' : (mode === 'SELL' ? '#b45309' : mode === 'BUY' ? '#0369a1' : '#4f46e5') }}>
              [{billType === 'ESTIMATION' ? t.estimationBill : (mode === 'SELL' ? t.sellingBill : mode === 'BUY' ? t.buyingBill : t.exchangeBill)}]
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>{t.customerLabel}</span>
            <strong style={{ color: '#0f172a' }}>{customerName || t.walkInCustomer}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>{t.phoneLabel}</span>
            <strong style={{ color: '#0f172a' }}>{customerPhone || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>{t.addressLabel}</span>
            <strong style={{ color: '#0f172a' }}>{customerAddress || 'Siddipet, Telangana'}</strong>
          </div>
        </div>

        {/* Live Active Rates Snapshot Box */}
        <div style={{ background: 'rgba(248, 250, 252, 0.65)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.65rem' }}>
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
            const details = getItemDetails(it);
            const isSell = it.item_type === 'SELL';
            const customRate = Number(it.custom_rate_per_gram || it.customRate || it.appliedRate);
            const isGold = (it.metal_type || '').toUpperCase() === 'GOLD';
            const rate = customRate > 0 ? customRate : (isGold ? (isSell ? rates?.gold_sell_value : rates?.gold_buy_value) : (isSell ? rates?.silver_sell_value : rates?.silver_buy_value)) || 0;

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

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                    <span style={{ fontWeight: 700 }}>{t.grossItemWeightReceipt}</span>
                    <strong>{formatMax2Decimals(details.grossWeight)} gm</strong>
                  </div>

                  {details.deductionWeight > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a' }}>
                      <span style={{ fontWeight: 700 }}>{t.deductionReceipt} ({it.deduction_name || 'Stones/Wax'}):</span>
                      <strong>- {formatMax2Decimals(details.deductionWeight)} gm</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
                    <span>{isGold ? t.onlyGoldWeightLabel : t.onlySilverWeightLabel}:</span>
                    <strong>{formatMax2Decimals(details.netWeight)} gm</strong>
                  </div>

                  {isSell && details.wastagePercent > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                      <span>HMW ({formatMax2Decimals(details.wastagePercent)}%):</span>
                      <strong>{formatMax2Decimals(details.totalChargedWeight)} gm</strong>
                    </div>
                  )}

                  {!isSell && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                        <span>{t.itemQualityReceipt}</span>
                        <strong>{formatMax2Decimals(details.purityPercent)}%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
                        <span>{isGold ? t.pureGoldWeightLabel : t.pureSilverWeightLabel} ({formatMax2Decimals(details.purityPercent)}%):</span>
                        <strong>{formatMax2Decimals(details.pureWeight)} gm</strong>
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
                      {details.makingVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
                          <span>{t.makingChargesReceipt}</span>
                          <strong>+ ₹{details.makingVal.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                      {details.additionalVal > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                          <span>{it.additional_charges_name || 'Additional Charges'}:</span>
                          <strong>+ ₹{details.additionalVal.toLocaleString('en-IN')}</strong>
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
              bottom: '50px',
              right: '75px',
              pointerEvents: 'none',
              zIndex: 10,
              opacity: 0.88,
              transform: 'rotate(-10deg)',
            }}
          >
            <img
              src={billType === 'ESTIMATION' ? '/images/Estimation.png' : '/images/jbj_sale_done_stamp.webp'}
              alt={billType === 'ESTIMATION' ? 'Estimation Stamp' : 'Sale Done Stamp'}
              style={{
                width: billType === 'ESTIMATION' ? '120px' : '110px',
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
        </div>

        {/* Thermal Barcode Graphic Footer */}
        <div style={{ textAlign: 'center', marginTop: '0.2rem', paddingTop: '0.2rem', borderTop: '1px dashed #94a3b8' }}>
          <div style={{ letterSpacing: '4px', fontSize: '1.1rem', fontFamily: 'monospace', color: '#334155', opacity: 0.8 }}>
            ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
          </div>
          <div style={{ margin: '2px 0 2px 0', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/Jaya_Bhavani_Jewellers_QR.svg"
              alt="Jaya Bhavani Jewellers QR Code"
              style={{ width: '100px', height: '100px', objectFit: 'contain' }}
            />
          </div>
          <small style={{ fontSize: '0.7rem', color: '#181f30ff', display: 'block', marginTop: '2px' }}>
            {t.thankYouMessage}
          </small>
        </div>
      </div>
    </div>
  );
};
