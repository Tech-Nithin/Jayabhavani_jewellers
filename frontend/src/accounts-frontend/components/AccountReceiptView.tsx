import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import type { Language } from '../../utils/translations';
import type { GlobalRates } from '../../billing-frontend/types';

interface AccountReceiptViewProps {
  item: any;
  rates: GlobalRates | null;
  lang?: Language;
  onBack: () => void;
  onNavigateToBilling?: (item?: any) => void;
}

export const AccountReceiptView: React.FC<AccountReceiptViewProps> = ({
  item,
  rates,
  lang = 'EN',
  onBack,
  onNavigateToBilling,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const itemType = (item.type || 'SELL').toUpperCase();
  const isOrder = itemType === 'ORDER';
  const isSell = itemType === 'SELL';
  const isBuy = itemType === 'BUY';
  const isExchange = itemType === 'EXCHANGE';
  const isKarigar = itemType === 'KARIGAR';

  const rawOrd = item.raw_order || {};
  const rawInv = item.raw_invoice || {};

  // Extract cleanest info
  const customerName = item.title || rawOrd.customer_name || rawInv.customer_name || 'Customer';
  const customerPhone = item.customer_phone || rawOrd.customer_phone || rawInv.customer_phone || 'N/A';
  const customerAddress = rawOrd.customer_address || rawInv.customer_address || 'Siddipet, Telangana';

  const itemName = rawOrd.item_name || rawInv.product_name || item.details || 'Jewellery Item';
  const metalType = (item.category || rawOrd.metal_type || rawInv.metal_type || 'GOLD').toUpperCase();
  const weightGrams = Number(item.weight_grams || rawOrd.net_weight || rawOrd.gross_weight || rawInv.weight_grams || 0);

  const totalAmount = Number(item.amount || rawOrd.total_amount || rawInv.final_amount || 0);
  const paidAmount = Number(item.paid_amount || rawOrd.paid_amount || rawInv.paid_amount || 0);
  const dueAmount = Number(item.due_amount || rawOrd.due_amount || rawInv.due_amount || 0);

  const formattedDate = item.created_at
    ? new Date(item.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : `${item.time || ''}`;

  // Thermal PNG Download Handler
  const handleDownloadPNG = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `DayBook_Receipt_${customerName}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download PNG:', err);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Source Sans 3', sans-serif", color: '#0f172a', maxWidth: '850px', margin: '0 auto' }}>
      {/* Top Action Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
          }}
        >
          <i className="fa-solid fa-arrow-left"></i>
          {lang === 'TE' ? 'తిరిగి వెళ్లు' : 'Back'}
        </button>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #d97706',
              background: '#fffbe6',
              color: '#b45309',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-print"></i>
            Print Thermal Receipt
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-download"></i>
            Download Image
          </button>

          {onNavigateToBilling && (
            <button
              type="button"
              onClick={() => onNavigateToBilling(item)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fa-solid fa-receipt"></i>
              Go to Billing Counter
            </button>
          )}
        </div>
      </div>

      {/* Main Printable Receipt Container */}
      <div
        ref={receiptRef}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px dashed #cbd5e1',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          fontFamily: "'Courier New', Courier, monospace",
          position: 'relative',
        }}
      >
        {/* Store Branding Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
            🏛️ JAYA BHAVANI JEWELLERS
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>
            4-3-4/A, Old busstand to kaman road, Patelpura, Siddipet, Telangana, 502103
          </p>
        </div>

        {/* Date & Mode Badge Header */}
        <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>DATE: {formattedDate}</span>
            <strong style={{ color: isOrder ? '#d97706' : isSell ? '#15803d' : isBuy ? '#1d4ed8' : isExchange ? '#7e22ce' : '#475569' }}>
              [{isOrder ? 'JBJ CUSTOM ORDER BILL' : isSell ? 'JBJ SELLING BILL' : isBuy ? 'JBJ SCRAP BUYING BILL' : isExchange ? 'JBJ EXCHANGE BILL' : 'GOLDSMITH KARIGAR RECORD'}]
            </strong>
          </div>
        </div>

        {/* Customer Details Box */}
        <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>CUSTOMER:</span>
            <strong style={{ color: '#0f172a' }}>{customerName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>PHONE:</span>
            <strong style={{ color: '#0f172a' }}>{customerPhone}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>ADDRESS:</span>
            <strong style={{ color: '#0f172a' }}>{customerAddress}</strong>
          </div>
        </div>

        {/* Metal Rates Snapshot Box */}
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700, marginBottom: '2px' }}>
            <span>JBJ GOLD SELL/BUY:</span>
            <span>₹{rates?.gold_sell_value || 14500} / ₹{rates?.gold_buy_value || 14300}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700 }}>
            <span>JBJ SILVER SELL/BUY:</span>
            <span>₹{rates?.silver_sell_value || 270} / ₹{rates?.silver_buy_value || 250}</span>
          </div>
        </div>

        {/* Item Breakdown Box */}
        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem', border: '1px solid #94a3b8', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, borderBottom: '1px dashed #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
            <span>#1 {itemName}</span>
            <span style={{ color: isOrder ? '#d97706' : isSell ? '#15803d' : '#1d4ed8' }}>
              {isOrder ? '[CUSTOM ORDER ITEM]' : isSell ? '[SHOP SELLING]' : '[CUST SELLING]'}
            </span>
          </div>

          <div style={{ display: 'grid', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Metal Category:</span>
              <strong>{metalType}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Item Weight:</span>
              <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{weightGrams > 0 ? `${weightGrams} gm` : 'As Per Order Specs'}</strong>
            </div>

            {rawOrd.delivery_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                <span style={{ fontWeight: 700 }}>Expected Delivery Date:</span>
                <strong>{rawOrd.delivery_date}</strong>
              </div>
            )}

            {rawOrd.notes && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span style={{ fontWeight: 700 }}>Order Notes:</span>
                <strong>{rawOrd.notes}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Financial Totals & Balance Summary */}
        <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '1rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isOrder ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>
                <span>TOTAL CUSTOM ORDER VALUE:</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#15803d', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px' }}>
                <span>ADVANCE PAID AMOUNT:</span>
                <span>₹{paidAmount.toLocaleString('en-IN')}</span>
              </div>
              {dueAmount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>BALANCE DUE AT DELIVERY:</span>
                  <span>₹{dueAmount.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#15803d' }}>
                  <span>STATUS:</span>
                  <span>FULL ADVANCE PAID (NIL DUE)</span>
                </div>
              )}
            </>
          ) : isKarigar ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>
              <span>FINE GOLD WEIGHT MOVEMENT:</span>
              <span>{weightGrams} grams</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#0f172a' }}>
                <span>GROSS TRANSACTION AMOUNT:</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#15803d' }}>
                <span>AMOUNT PAID:</span>
                <span>₹{paidAmount.toLocaleString('en-IN')}</span>
              </div>
              {dueAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#b91c1c' }}>
                  <span>BALANCE DUE:</span>
                  <span>₹{dueAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.85rem', fontSize: '0.65rem', color: '#64748b' }}>
          Thank you for choosing Jaya Bhavani Jewellers! • Computer Generated EOD Day Book Record
        </div>
      </div>
    </div>
  );
};
