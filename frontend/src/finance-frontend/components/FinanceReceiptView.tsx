import React from 'react';
import html2canvas from 'html2canvas';

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

export const FinanceReceiptView: React.FC<FinanceReceiptViewProps> = ({ data, compact = false }) => {
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
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* 1. Store Header — Matching Billing Receipt Exactly */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '1.15rem', marginBottom: '0.85rem', position: 'relative' }}>

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
            JAYA BHAVANI JEWELLERS
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.62rem', color: '#0f172a', fontWeight: 800, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.3 }}>
            4-3-4/A, Old bustand to kaman road, Patelpura, Siddipet, Telangana, 502103
          </p>
        </div>

        {/* 2. Date Line */}
        <div style={{ marginTop: '4px', fontSize: '0.65rem', color: '#0f172a', fontWeight: 800, marginBottom: '0.85rem' }}>
          <div>DATE: {formatReceiptDateTime(data.loan_date)}</div>
        </div>

        {/* 3. Transaction Mode & Customer Info Box */}
        <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#0f172a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>MODE:</span>
            <strong style={{ color: '#b45309', fontWeight: 900 }}>
              [Finance/Girvi Loan]
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>CUSTOMER:</span>
            <strong style={{ color: '#0f172a', fontWeight: 900 }}>{data.customer_name || 'Walk-in Customer'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>PHONE:</span>
            <strong style={{ color: '#0f172a', fontWeight: 900 }}>{data.customer_phone || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>ADDRESS:</span>
            <strong style={{ color: '#0f172a', fontWeight: 900 }}>{data.customer_address || 'Siddipet, Telangana'}</strong>
          </div>
        </div>

        {/* 4. Active Rates Snapshot Box */}
        <div style={{ background: 'rgba(248, 250, 252, 0.65)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.85rem', fontSize: '0.68rem', fontWeight: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, marginBottom: '2px' }}>
            <span style={{ fontWeight: 800 }}>JBJ GOLD RATE:</span>
            <span style={{ fontWeight: 900 }}>₹{ratePerGram ? ratePerGram.toLocaleString('en-IN') : '15,000'} / g</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800 }}>
            <span style={{ fontWeight: 800 }}>JBJ SILVER RATE:</span>
            <span style={{ fontWeight: 900 }}>₹250 / g</span>
          </div>
        </div>

        {/* 5. Pledged Item Card */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem', background: '#ffffff', position: 'relative', overflow: 'hidden', marginBottom: '0.85rem' }}>

          {/* Watermark Logo inside Item Card */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              opacity: 0.15,
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
            {/* Item Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 900 }}>
              <span style={{ color: '#0f172a' }}>#1 {data.item_name || (isCash ? 'Cash Loan' : 'Pledged Ornament')}</span>
              <span style={{ color: '#b45309' }}>[GIRVI / FINANCE]</span>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontSize: '0.72rem', color: '#0f172a', fontWeight: 800, display: 'grid', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800 }}>Metal Category:</span>
                <span style={{ fontWeight: 900 }}>{data.item_metal_type || 'Gold'}</span>
              </div>

              {!isCash && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Gross Item Weight:</span>
                    <span style={{ fontWeight: 900 }}>{grossWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Deduction ({data.item_deduction_name || 'Stones'}):</span>
                    <span style={{ fontWeight: 900 }}>- {dedWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#1e40af' }}>
                    <span>Only Metal Weight:</span>
                    <span>{netWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>Touch:</span>
                    <span style={{ fontWeight: 900 }}>{purityPct}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#b45309' }}>
                    <span>Pure Metal Weight:</span>
                    <span>{pureWt.toFixed(3)} gm</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '4px', marginTop: '2px', fontWeight: 900, color: '#0f172a', fontSize: '0.78rem' }}>
                    <span>Item Value (₹{ratePerGram.toLocaleString('en-IN')}/g):</span>
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
            <span>Customer Taken Amount:</span>
            <span>₹{Number(data.amount || 0).toLocaleString('en-IN')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 800, color: '#0f172a', fontSize: '0.74rem' }}>
            <span>MONTHLY INTEREST RATE:</span>
            <span style={{ fontWeight: 900 }}>{data.interest_rate_percent || 1.5}% per month</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 900, color: '#059669', fontSize: '0.8rem' }}>
            <span>EST. MONTHLY INTEREST DUE:</span>
            <span>₹{monthlyInterest.toLocaleString('en-IN')} / month</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0f172a', fontSize: '0.72rem', marginTop: '2px' }}>
            <span>LOAN DURATION TIMELINE:</span>
            <span style={{ fontWeight: 900 }}>{data.timeline_months || 1} Month(s)</span>
          </div>

          {/* Optional Installment Payments & Passbook Summary */}
          {((data.payment_history && data.payment_history.length > 0) || (data.current_principal !== undefined && data.current_principal < data.amount)) && (
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '6px', fontSize: '0.72rem' }}>
              <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                <span>PASSBOOK SUMMARY:</span>
                <span style={{ color: '#0284c7' }}>REMAINING: ₹{Number(data.current_principal ?? data.amount).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 800 }}>
                <span>Total Principal Paid:</span>
                <span>₹{Number(data.total_principal_paid || (data.amount - (data.current_principal ?? data.amount))).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7c3aed', fontWeight: 800 }}>
                <span>Total Interest Paid:</span>
                <span>₹{Number(data.total_interest_paid || 0).toLocaleString('en-IN')}</span>
              </div>
              {Array.isArray(data.payment_history) && data.payment_history.length > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dotted #cbd5e1' }}>
                  <div style={{ fontWeight: 900, color: '#334155', fontSize: '0.68rem', marginBottom: '3px', textTransform: 'uppercase' }}>Installment Payments Log ({data.payment_history.length}):</div>
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

        {/* 8. QR Code & Footer */}
        <div style={{ textAlign: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #94a3b8' }}>
          <div style={{ letterSpacing: '4px', fontSize: '0.9rem', color: '#334155', opacity: 0.8 }}>
            ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐
          </div>
          <div style={{ margin: '4px 0', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/Jaya_Bhavani_Jewellers_QR.svg"
              alt="Jaya Bhavani Jewellers QR Code"
              style={{ width: '85px', height: '85px', objectFit: 'contain' }}
            />
          </div>
          <small style={{ fontSize: '0.65rem', color: '#181f30', display: 'block', fontWeight: 800, marginTop: '2px' }}>
            Thank You for Visiting Jaya Bhavani Jewellers!
          </small>
        </div>
      </div>
    </div>
  );
};
