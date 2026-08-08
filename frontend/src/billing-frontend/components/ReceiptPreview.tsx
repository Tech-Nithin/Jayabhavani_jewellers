import React from 'react';
import html2canvas from 'html2canvas';
import type { BillItem, GlobalRates } from '../types';

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
  onDownloadPNG?: () => void;
}

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
  onDownloadPNG,
}) => {
  const getItemDetails = (item: BillItem) => {
    if (!rates) return { metalVal: 0, makingVal: 0, gstVal: 0, lineTotal: 0 };
    const isGold = item.metal_type === 'GOLD';
    const isSell = item.item_type === 'SELL';
    const rate = isGold
      ? (isSell ? rates.gold_sell_value : rates.gold_buy_value)
      : (isSell ? rates.silver_sell_value : rates.silver_buy_value);

    const weightNum = Number(item.weight_grams) || 0;
    const purityNum = Number(item.purity_percentage) || 0;
    const makingNum = Number(item.making_charges_per_gram) || 0;
    const gstNum = Number(item.gst_percent) || 0;

    const pureWeight = Number((weightNum * (purityNum / 100)).toFixed(3));
    const weightUsed = isSell ? weightNum : pureWeight;
    const metalVal = Number((weightUsed * rate).toFixed(2));
    const makingVal = isSell ? Number(makingNum.toFixed(2)) : 0;
    const subtotal = metalVal + makingVal;
    const gstVal = isSell ? Number((subtotal * (gstNum / 100)).toFixed(2)) : 0;
    const lineTotal = Number((subtotal + gstVal).toFixed(2));

    return { pureWeight, metalVal, makingVal, gstVal, lineTotal };
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
        position: 'sticky',
        top: '1rem',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
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
          JAYA BHAVANI JEWELLERS
        </h4>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.62rem', color: '#0f172a', fontWeight: 700 }}>
          4-3-4/A, Old bustand to kaman road, Patelpura, Siddipet, Telangana, 502103
        </p>
      </div>

      <div style={{ marginTop: '8px', fontSize: '0.62rem', color: '#475569', fontWeight: 700, marginBottom: '0.85rem' }}>
        DATE: {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* Transaction Mode & Customer Info */}
      <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem', fontSize: '0.7rem', color: '#334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>MODE:</span>
          <strong style={{ color: mode === 'SELL' ? '#b45309' : mode === 'BUY' ? '#0369a1' : '#4f46e5' }}>
            {mode === 'SELL' ? '[SELLING BILL]' : mode === 'BUY' ? '[BUYING CREDIT]' : '[TRADE-IN EXCHANGE]'}
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>CUSTOMER:</span>
          <strong style={{ color: '#0f172a', fontWeight: 700 }}>{customerName || 'Walk-in Customer'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>PHONE:</span>
          <strong style={{ color: '#0f172a', fontWeight: 700 }}>{customerPhone || 'N/A'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#0f172a', fontWeight: 700 }}>ADDRESS:</span>
          <strong style={{ color: '#0f172a', fontWeight: 700, maxWidth: '65%', textAlign: 'right' }}>{customerAddress || 'N/A'}</strong>
        </div>
      </div>

      {/* Active Metal Rates Snapshot */}
      <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', fontSize: '0.62rem', color: '#0f172a', fontWeight: 700, marginBottom: '0.65rem', border: '1px solid #94a3b8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>GOLD SELL/BUY:</span>
          <strong>₹{rates?.gold_sell_value} / ₹{rates?.gold_buy_value}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
          <span>SILVER SELL/BUY:</span>
          <strong>₹{rates?.silver_sell_value} / ₹{rates?.silver_buy_value}</strong>
        </div>
      </div>

      {/* Real-time Itemized Receipt Items */}
      <div style={{ marginBottom: '0.75rem' }}>
        {items.map((it, idx) => {
          const details = getItemDetails(it);
          const isGold = it.metal_type === 'GOLD';
          const isSell = it.item_type === 'SELL';
          const rate = isGold
            ? (isSell ? rates?.gold_sell_value || 0 : rates?.gold_buy_value || 0)
            : (isSell ? rates?.silver_sell_value || 0 : rates?.silver_buy_value || 0);

          return (
            <div key={it.id || idx} style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.65rem 0.75rem', marginBottom: '0.6rem', border: '1px solid #94a3b8', fontSize: '0.68rem', color: '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderBottom: '1px dashed #94a3b8', paddingBottom: '3px', marginBottom: '4px' }}>
                <span>#{idx + 1} {it.product_name || (it.metal_type + ' Item')}</span>
                <span style={{ color: isSell ? '#b45309' : '#0369a1' }}>
                  {isSell ? '[CUST BUYING]' : '[CUST SELLING]'}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '2px', color: '#0f172a' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Metal:</span>
                  <strong>{it.metal_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Item Name:</span>
                  <strong style={{ fontWeight: 700, color: '#0f172a' }}>{it.product_name || (it.metal_type + ' Item')}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Item Weight:</span>
                  <strong>{it.weight_grams ?? 0} gm</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Item Quality:</span>
                  <strong style={{ color: '#0f172a', fontWeight: 700 }}>{it.purity_percentage ?? 0}%</strong>
                </div>
                {!isSell && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                    <span style={{ fontWeight: 700 }}>Pure {it.metal_type} Weight:</span>
                    <strong style={{ fontWeight: 800 }}>{details.pureWeight} gm</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>
                    {it.metal_type} Rate ({isSell ? `${it.weight_grams ?? 0}gm` : `${details.pureWeight}gm pure`} × ₹{rate}/g):
                  </span>
                  <strong style={{ color: '#0f172a', fontWeight: 700 }}>₹{details.metalVal.toLocaleString('en-IN')}</strong>
                </div>

                {isSell && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 800 }}>
                      <span>Making Charges:</span>
                      <strong>+ ₹{details.makingVal.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 800 }}>
                      <span>GST ({it.gst_percent}%):</span>
                      <strong>+ ₹{details.gstVal.toLocaleString('en-IN')}</strong>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: isSell ? '#15803d' : '#0369a1', borderTop: '1px dashed #94a3b8', paddingTop: '3px', marginTop: '2px' }}>
                  <span>Item Subtotal:</span>
                  <strong>₹{details.lineTotal > 0 ? details.lineTotal.toLocaleString('en-IN') : '0'}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Summary Breakdown based on Transaction Mode */}
      <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.65rem', fontSize: '0.72rem', color: '#334155' }}>
        {mode === 'BUY' ? (
          <>
            <div style={{ fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>Gross Buying Items:</div>
            <div style={{ display: 'grid', gap: '3px', paddingLeft: '4px', marginBottom: '6px' }}>
              {items.filter(i => i.item_type === 'BUY').map((it, idx) => {
                const details = getItemDetails(it);
                return (
                  <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                    <span>{idx === 0 ? '  ' : '+ '} {it.product_name || (it.metal_type + ' Item')}:</span>
                    <span>₹{details.lineTotal.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #94a3b8' }}>
              <div>
                <div>GRAND TOTAL:</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0369a1' }}>
                  (Need to pay to customer)
                </div>
              </div>
              <div>₹{totalBuyCredit.toLocaleString('en-IN')}</div>
            </div>
          </>
        ) : mode === 'SELL' ? (
          <>
            <div style={{ fontWeight: 800, color: '#b45309', marginBottom: '4px' }}>Gross Selling Items:</div>
            <div style={{ display: 'grid', gap: '3px', paddingLeft: '4px', marginBottom: '6px' }}>
              {items.filter(i => i.item_type === 'SELL').map((it, idx) => {
                const details = getItemDetails(it);
                return (
                  <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
                    <span>{idx === 0 ? '  ' : '+ '} {it.product_name || (it.metal_type + ' Item')}:</span>
                    <span>₹{details.lineTotal.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #94a3b8' }}>
              <div>
                <div>GRAND TOTAL:</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569' }}>
                  (Customer should pay)
                </div>
              </div>
              <div>₹{totalSellValue.toLocaleString('en-IN')}</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 700, color: '#b45309' }}>
              <span>Gross Selling Total:</span>
              <span>₹{totalSellValue.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 700, color: '#0369a1' }}>
              <span>Less Item Exchange Credit:</span>
              <span>- ₹{totalBuyCredit.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #94a3b8', marginTop: '4px' }}>
              <div>
                <div>GRAND TOTAL:</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: totalBuyCredit > totalSellValue ? '#0369a1' : '#475569' }}>
                  {totalBuyCredit > totalSellValue ? '(Need to pay to customer)' : '(Customer should pay)'}
                </div>
              </div>
              <div>₹{Math.abs(totalSellValue - totalBuyCredit).toLocaleString('en-IN')}</div>
            </div>
          </>
        )}
      </div>

      {/* Thermal Barcode Graphic Footer */}
      <div style={{ textAlign: 'center', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed #94a3b8' }}>
        <div style={{ letterSpacing: '4px', fontSize: '1.1rem', fontFamily: 'monospace', color: '#334155', opacity: 0.8 }}>
          ||||| ||| |||| ||||| ||
        </div>
        <small style={{ fontSize: '0.7rem', color: '#181f30ff', display: 'block', marginTop: '4px' }}>
          Thank you for visiting Jaya Bhavani Jewellers!
        </small>
      </div>
    </div>
  );
};
