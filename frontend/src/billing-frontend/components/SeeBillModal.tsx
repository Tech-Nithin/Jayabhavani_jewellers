import React from 'react';
import type { CustomerDirectoryRecord, GlobalRates } from '../types';
import { ReceiptPreview, downloadReceiptAsPNG } from './ReceiptPreview';

interface SeeBillModalProps {
  customer: CustomerDirectoryRecord | null;
  rates: GlobalRates | null;
  onClose: () => void;
}

export const SeeBillModal: React.FC<SeeBillModalProps> = ({ customer, rates, onClose }) => {
  if (!customer) return null;

  // Construct items from stored receipt_json_data JSON column or invoice fallback
  const inv = customer.latestInvoice;
  let storedPayload: any = null;
  if (inv?.receipt_json_data) {
    try {
      storedPayload = typeof inv.receipt_json_data === 'string'
        ? JSON.parse(inv.receipt_json_data)
        : inv.receipt_json_data;
    } catch (err) {
      console.warn('Failed to parse receipt_json_data:', err);
    }
  }

  const itemsList = storedPayload?.items && Array.isArray(storedPayload.items)
    ? storedPayload.items
    : [
        {
          id: 'modal-item-1',
          metal_type: (inv?.metal_type === 'SILVER' ? 'SILVER' : 'GOLD') as any,
          product_name: inv?.product_name || customer.products.join(', ') || 'Gold Jewellery Item',
          weight_grams: inv?.weight_grams || customer.totalWeight || 5,
          purity_percentage: inv?.purity_percentage || 91.6,
          making_charges_per_gram: inv?.making_charges_per_gram || 500,
          gst_percent: inv?.gst_percent || 3,
          item_type: (inv?.transaction_type === 'BUY' ? 'BUY' : 'SELL') as any,
        },
      ];

  const totalSellValue = storedPayload?.totalSellValue ?? (inv?.transaction_type === 'BUY' ? 0 : (inv?.final_amount || customer.totalSpent || 0));
  const totalBuyCredit = storedPayload?.totalBuyCredit ?? (inv?.transaction_type === 'BUY' ? (inv?.final_amount || customer.totalSpent || 0) : inv?.transaction_type === 'EXCHANGE' ? 5000 : 0);
  const netPayable = storedPayload?.netPayable ?? Math.max(0, totalSellValue - totalBuyCredit);

  // Priority: 1) storedPayload.rates, 2) DB rate snapshot columns, 3) live rates prop
  const effectiveRates: GlobalRates | null = storedPayload?.rates || (inv?.gold_sell_rate_snapshot ? {
    gold_sell_value: Number(inv.gold_sell_rate_snapshot) || 0,
    gold_buy_value: Number(inv.gold_buy_rate_snapshot || inv.gold_sell_rate_snapshot) || 0,
    silver_sell_value: Number(inv.silver_sell_rate_snapshot) || 0,
    silver_buy_value: Number(inv.silver_buy_rate_snapshot || inv.silver_sell_rate_snapshot) || 0,
    created_at: inv.created_at || new Date().toISOString(),
  } : rates);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '1.25rem',
          position: 'relative',
        }}
      >
        {/* Modal Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#6366f1' }}></i> Official Receipt - {customer.name}
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Customer Phone: {customer.phone}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#64748b',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-xmark"></i> Close
          </button>
        </div>

        {/* Embedded Receipt Component */}
        <ReceiptPreview
          receiptId="see-bill-modal-receipt"
          mode={inv?.transaction_type || 'SELL'}
          customerName={customer.name}
          customerPhone={customer.phone}
          customerAddress={inv?.customer_address || inv?.receipt_json_data?.customer_address || customer.address}
          rates={effectiveRates}
          items={itemsList}
          totalSellValue={totalSellValue}
          totalBuyCredit={totalBuyCredit}
          netPayable={netPayable}
          createdDate={inv?.created_at}
          updatedDate={inv?.updated_at || storedPayload?.updated_at}
          onDownloadPNG={() => downloadReceiptAsPNG('see-bill-modal-receipt', customer.name)}
        />
      </div>
    </div>
  );
};
