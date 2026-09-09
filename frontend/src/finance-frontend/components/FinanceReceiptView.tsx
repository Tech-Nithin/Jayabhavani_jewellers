import React from 'react';
import html2canvas from 'html2canvas';
import { getFinanceTranslation, type Language } from '../financeTranslations';

interface FinanceReceiptViewProps {
  data: {
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    item_metal_type: 'GOLD' | 'SILVER' | 'CASH';
    item_name: string;
    item_weight_grams: number;
    item_deduction_name?: string;
    item_deduction_weight: number;
    item_purity_percent: number;
    pure_metal_weight: number;
    metal_value_per_gram: number;
    total_value_of_item: number;
    item_image_url?: string;
    amount: number;
    interest_rate_percent: number;
    timeline_months: number;
    loan_date: string;
    loan_id?: string;
    current_principal?: number;
    total_interest_paid?: number;
    total_principal_paid?: number;
    payment_history?: any[];
    receipt_json?: any;
  };
  compact?: boolean;
  lang?: Language;
}

const formatReceiptDateTime = (loanDate?: string) => {
  const d = loanDate ? new Date(loanDate) : new Date();
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const timeStr = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  return `${day}/${month}/${year} ${timeStr}`;
};

/** Automatic 80mm Thermal Receipt Direct Printer (Format 80mm) */
export const printFinanceReceipt80mm = (receiptId: string) => {
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
        <title>80mm Finance Thermal Print</title>
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
          img[alt="Loan Given Stamp"] {
            width: 95px !important;
          }
          img[alt="JB Watermark"] {
            width: 140px !important;
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

    images?.forEach((img) => {
      if (img.complete) {
        loadedCount++;
        if (loadedCount === totalImages) checkAndPrint();
      } else {
        img.onload = () => {
          loadedCount++;
          if (loadedCount === totalImages) checkAndPrint();
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === totalImages) checkAndPrint();
        };
      }
    });

    setTimeout(checkAndPrint, 1500);
  }
};

/** Download 80mm Thermal Receipt as PNG Image */
export const downloadFinanceReceiptAsPNG = async (receiptId: string, customerName?: string) => {
  const element = document.getElementById(receiptId);
  if (!element) return;

  const cleanName = (customerName || 'Finance_Pledge_Receipt').trim().replace(/[^a-zA-Z0-9]/g, '_');
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const fileName = `${cleanName}_FIN_${dd}-${mm}-${yyyy}_${hours}-${minutes}.png`;

  const buttons = element.querySelectorAll('button');
  buttons.forEach((b) => ((b as HTMLElement).style.visibility = 'hidden'));

  const originalWidth = element.style.width;
  const originalMinWidth = element.style.minWidth;
  const originalMaxWidth = element.style.maxWidth;

  element.style.width = '380px';
  element.style.minWidth = '380px';
  element.style.maxWidth = '380px';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1280,
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
    element.style.width = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;
    buttons.forEach((b) => ((b as HTMLElement).style.visibility = 'visible'));
  }
};

export const FinanceReceiptView: React.FC<FinanceReceiptViewProps> = ({ data, compact = false, lang = 'EN' }) => {
  const t = getFinanceTranslation(lang);
  const isCash = data.item_metal_type === 'CASH';
  const grossWt = Number(data.item_weight_grams || 0);
  const dedWt = Number(data.item_deduction_weight || 0);
  const netWt = Math.max(0, grossWt - dedWt);
  const purityPct = Number(data.item_purity_percent || 0);
  const pureWt = Number(data.pure_metal_weight || 0);
  const ratePerGram = Number(data.metal_value_per_gram || 0);
  const itemValue = Number(data.total_value_of_item || 0);
  const monthlyInterest = Math.round((Number(data.amount || 0) * Number(data.interest_rate_percent || 1.5)) / 100);

  const containerId = `finance-receipt-${data.loan_id || 'preview'}`;

  const handleDownload = () => {
    downloadFinanceReceiptAsPNG(containerId, data.customer_name);
  };

  const handleThermalPrint = () => {
    printFinanceReceipt80mm(containerId);
  };

  return (
    <div
      id={containerId}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: compact ? '1rem' : '1.15rem',
        border: '1px dashed #94a3b8',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Courier New', Courier, monospace",
        color: '#0f172a',
        fontWeight: 800,
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

        {/* 1. Store Header — Matching Billing Receipt Exactly */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '0.45rem', marginBottom: '0.5rem', position: 'relative' }}>

          <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={handleDownload}
              title="Download 80mm Thermal Receipt PNG Image"
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #a13003',
                background: '#f8fafc',
                color: '#a13003',
                fontWeight: 800,
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
                fontWeight: 800,
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

          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
            {t.receiptStoreName}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.62rem', color: '#0f172a', fontWeight: 800, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.3 }}>
            {t.receiptStoreAddress}
          </p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.62rem', color: '#0f172a', fontWeight: 800, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.3 }}>
            {t.receiptStoreProprietors}
          </p>
        </div>

        {/* 2. Date, Mode & Customer Info with Goddess Artwork in the middle */}
        <div style={{ position: 'relative', borderBottom: '1px dashed #94a3b8', paddingBottom: '0.85rem', marginBottom: '0.85rem', fontSize: '0.72rem', color: '#0f172a' }}>
          {/* Goddess Orange Artwork centered across the whole Date-to-Address section */}
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
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{t.modeLabel || 'BILL TYPE:'}</span>
              <strong style={{ color: '#b45309', fontWeight: 900 }}>[{t.receiptGirviTag.replace(/[\[\]]/g, '') || 'Finance/Girvi Loan'}]</strong>
            </div>

            {/* Date line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.68rem' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{t.receiptDateLabel}</span>
              <strong style={{ color: '#0f172a', fontWeight: 900 }}>{formatReceiptDateTime(data.loan_date)}</strong>
            </div>

            {/* Customer name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{t.receiptCustomerLabel}</span>
              <strong style={{ color: '#0f172a', fontWeight: 900 }}>{data.customer_name || 'Walk-in Customer'}</strong>
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{t.receiptPhoneLabel}</span>
              <strong style={{ color: '#0f172a', fontWeight: 900 }}>{data.customer_phone || 'N/A'}</strong>
            </div>

            {/* Address */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{t.receiptAddressLabel}</span>
              <strong style={{ color: '#0f172a', fontWeight: 900 }}>{data.customer_address || (lang?.toUpperCase() === 'TE' ? 'సిద్దిపేట, తెలంగాణ' : 'Siddipet, Telangana')}</strong>
            </div>
          </div>
        </div>

        {/* 4. Active Rates Snapshot Box */}
        <div style={{ background: 'rgba(248, 250, 252, 0.65)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.85rem', fontSize: '0.68rem', fontWeight: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, marginBottom: '2px' }}>
            <span style={{ fontWeight: 800 }}>{t.receiptGoldRate}</span>
            <span style={{ fontWeight: 900 }}>₹{ratePerGram ? ratePerGram.toLocaleString('en-IN') : '15,000'} / g</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
            <span style={{ fontWeight: 800 }}>{t.receiptSilverRate}</span>
            <span style={{ fontWeight: 900 }}>₹250 / g</span>
          </div>
        </div>

        {/* 5. Pledged Item Card */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.7)', position: 'relative', marginBottom: '0.85rem' }}>
          <div>
            {/* Item Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 900 }}>
              <span style={{ color: '#0f172a' }}>#1 {data.item_name || (isCash ? t.receiptCashCardTitle : t.receiptItemCardTitle)}</span>
              <span style={{ color: '#b45309' }}>{t.receiptGirviTag}</span>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontSize: '0.72rem', color: '#0f172a', fontWeight: 800, display: 'grid', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800 }}>{t.receiptMetalCategory}</span>
                <span style={{ fontWeight: 900 }}>{data.item_metal_type === 'SILVER' ? t.silverCategory : data.item_metal_type === 'CASH' ? t.cashCategory : t.goldCategory}</span>
              </div>

              {!isCash && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>{t.receiptGrossWeight}</span>
                    <span style={{ fontWeight: 900 }}>{grossWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>{t.receiptDeduction} ({data.item_deduction_name || 'Stones'}):</span>
                    <span style={{ fontWeight: 900 }}>- {dedWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#1e40af' }}>
                    <span>{t.receiptNetWeight}</span>
                    <span>{netWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>{t.receiptTouchPurity}</span>
                    <span style={{ fontWeight: 900 }}>{purityPct}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#b45309' }}>
                    <span>{t.receiptPureMetalWeight}</span>
                    <span>{pureWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '2px', fontWeight: 900, color: '#0f172a', fontSize: '0.78rem' }}>
                    <span>{t.receiptTotalItemValue} (₹{ratePerGram.toLocaleString('en-IN')}/g):</span>
                    <span style={{ color: '#059669' }}>₹{itemValue.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 6. Financial Terms Breakdown + Loan Given Stamp Box */}
        <div style={{ position: 'relative', borderBottom: '1px dashed #94a3b8', paddingBottom: '0.65rem', marginBottom: '0.85rem', fontSize: '0.75rem', fontWeight: 800 }}>

          {/* loan_given.webp Stamp Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '0%',
              left: '60%',
              transform: 'translate(-50%, -50%) rotate(-8deg)',
              pointerEvents: 'none',
              zIndex: 10,
              opacity: 0.88,
            }}
          >
            <img
              src="/stamps/loan_given.webp"
              alt="Loan Given Stamp"
              style={{
                width: '115px',
                height: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 900, color: '#047857', fontSize: '0.9rem' }}>
            <span>{t.receiptLoanAmount}</span>
            <span>₹{Number(data.amount || 0).toLocaleString('en-IN')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 800, color: '#0f172a', fontSize: '0.74rem' }}>
            <span>{t.receiptMonthlyInterestRate}</span>
            <span style={{ fontWeight: 900 }}>{data.interest_rate_percent || 1.5}% {t.perMonthText}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 900, color: '#059669', fontSize: '0.8rem' }}>
            <span>{t.livePerMonthInterest}:</span>
            <span>₹{monthlyInterest.toLocaleString('en-IN')} / {t.perMonthText}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0f172a', fontSize: '0.72rem', marginTop: '2px' }}>
            <span>{t.receiptTimelineMonths}</span>
            <span style={{ fontWeight: 900 }}>{data.timeline_months || 1} {Number(data.timeline_months) === 1 ? t.monthTimelineUnit : t.monthsTimelineUnit}</span>
          </div>

          {/* Optional Installment Payments & Passbook Summary */}
          {((data.payment_history && data.payment_history.length > 0) || (data.current_principal !== undefined && data.current_principal < data.amount)) && (
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '6px', fontSize: '0.72rem' }}>
              <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.passbookHistoryTitle}:</span>
                <span style={{ color: '#0284c7' }}>₹{Number(data.current_principal ?? data.amount).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 800 }}>
                <span>{t.receiptTotalPrincipalPaid}</span>
                <span>₹{Number(data.total_principal_paid || (data.amount - (data.current_principal ?? data.amount))).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7c3aed', fontWeight: 800 }}>
                <span>{t.receiptTotalInterestPaid}</span>
                <span>₹{Number(data.total_interest_paid || 0).toLocaleString('en-IN')}</span>
              </div>
              {Array.isArray(data.payment_history) && data.payment_history.length > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dotted #cbd5e1' }}>
                  <div style={{ fontWeight: 900, color: '#334155', fontSize: '0.68rem', marginBottom: '3px', textTransform: 'uppercase' }}>{t.receiptInstallmentHistory} ({data.payment_history.length}):</div>
                  {data.payment_history.map((p: any, pIdx: number) => (
                    <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#1e293b', marginBottom: '2px', fontWeight: 800 }}>
                      <span>#{p.installment_number || pIdx + 1} ({new Date(p.paid_at || p.date || Date.now()).toLocaleDateString('en-IN')})</span>
                      <span style={{ color: '#0369a1' }}>₹{Number(p.paying_amount || p.amount || 0).toLocaleString('en-IN')} (P: ₹{Number(p.principal_component || 0).toLocaleString('en-IN')} + Int: ₹{Number(p.interest_component || 0).toLocaleString('en-IN')})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 7. Terms & Conditions */}
        <div style={{ paddingBottom: '0.5rem', marginBottom: '0.75rem', fontSize: '0.60rem', color: '#475569', lineHeight: 1.25, fontWeight: 700 }}>
          <strong>PLEDGE TERMS:</strong> 1. Monthly interest payable on due date. 2. Ornaments returned upon full principal + interest settlement. 3. Interest resets on remaining principal after partial payments.
        </div>

        {/* 8. Receipt Footer */}
        <div style={{ textAlign: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #94a3b8' }}>
          <div style={{ letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 800, color: '#0c0c0cff', opacity: 0.8 }}>
            {t.receiptBillEnd}
          </div>
          <small style={{ fontSize: '0.65rem', color: '#181f30', display: 'block', fontWeight: 800, marginTop: '4px' }}>
            {t.receiptThankYou}
          </small>
        </div>
      </div>
    </div>
  );
};
