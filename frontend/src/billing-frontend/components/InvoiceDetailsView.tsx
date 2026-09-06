import React from 'react';
import type { CustomerDirectoryRecord, GlobalRates } from '../types';
import { ReceiptPreview, downloadReceiptAsPNG, printReceipt80mm } from './ReceiptPreview';
import { translations } from '../../utils/translations';
import type { Language } from '../../utils/translations';
import { getTeluguTransliterationSync } from '../../utils/transliterate';

interface InvoiceDetailsViewProps {
  customerRecord: CustomerDirectoryRecord;
  rates: GlobalRates | null;
  lang?: Language;
  onBack: () => void;
  onEdit: (invoice: any) => void;
}

export const InvoiceDetailsView: React.FC<InvoiceDetailsViewProps> = ({
  customerRecord,
  rates,
  lang = 'EN',
  onBack,
  onEdit,
}) => {
  const t = translations[lang] || translations.EN;
  const inv = customerRecord.latestInvoice;
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

  const mode = (inv?.transaction_type || storedPayload?.transaction_type || 'SELL').toUpperCase() as 'SELL' | 'BUY' | 'EXCHANGE';

  const itemsList: any[] = storedPayload?.items && Array.isArray(storedPayload.items)
    ? storedPayload.items
    : [
        {
          id: 'item-1',
          metal_type: (inv?.metal_type === 'SILVER' ? 'SILVER' : 'GOLD'),
          product_name: inv?.product_name || customerRecord.products.join(', ') || 'Gold Jewellery Item',
          weight_grams: inv?.weight_grams || customerRecord.totalWeight || 0,
          purity_percentage: inv?.purity_percentage || 91.6,
          making_charges_per_gram: inv?.making_charges_per_gram || 0,
          gst_percent: inv?.gst_percent || 0,
          item_type: (mode === 'BUY' ? 'BUY' : 'SELL'),
        },
      ];

  const effectiveRates: GlobalRates | null = storedPayload?.rates || (inv?.gold_sell_rate_snapshot ? {
    gold_sell_value: Number(inv.gold_sell_rate_snapshot) || 0,
    gold_buy_value: Number(inv.gold_buy_rate_snapshot || inv.gold_sell_rate_snapshot) || 0,
    silver_sell_value: Number(inv.silver_sell_rate_snapshot) || 0,
    silver_buy_value: Number(inv.silver_buy_rate_snapshot || inv.silver_sell_rate_snapshot) || 0,
    created_at: inv.created_at || new Date().toISOString(),
  } : rates);

  const totalSellValue = storedPayload?.totalSellValue ?? (mode === 'BUY' ? 0 : (inv?.final_amount || customerRecord.totalSpent || 0));
  const totalBuyCredit = storedPayload?.totalBuyCredit ?? (mode === 'BUY' ? (inv?.final_amount || customerRecord.totalSpent || 0) : 0);
  const netPayable = storedPayload?.netPayable ?? Math.abs(totalSellValue - totalBuyCredit);

  const createdAtDate = inv?.created_at || customerRecord.lastDate;
  const updatedAtDate = inv?.updated_at || storedPayload?.updated_at;
  const updateHistory: string[] = storedPayload?.update_history && Array.isArray(storedPayload.update_history)
    ? storedPayload.update_history
    : (updatedAtDate ? [updatedAtDate] : []);

  const formatDateTime = (isoOrStr?: string) => {
    if (!isoOrStr) return 'N/A';
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

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '3rem', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── Top Navigation & Action Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '9px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <i className="fa-solid fa-arrow-left"></i> {t.backToHistoryBtn}
        </button>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          {inv && (
            <button
              type="button"
              onClick={() => onEdit(inv)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #93c5fd',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fa-solid fa-pen-to-square"></i> {t.editInvoiceBtn}
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadReceiptAsPNG(`centered-details-receipt-${inv?.id || '1'}`, customerRecord.name)}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(180,83,9,0.25)',
            }}
          >
            <i className="fa-solid fa-download"></i> {t.downloadPngBtn}
          </button>

          <button
            type="button"
            onClick={() => printReceipt80mm(`centered-details-receipt-${inv?.id || '1'}`)}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #4f46e5',
              background: '#eef2ff',
              color: '#4338ca',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-print"></i> {lang === 'TE' ? 'ప్రింట్ బిల్లు' : 'Print Bill'}
          </button>
        </div>
      </div>

      {/* ── CENTERED OFFICIAL BILL RECEIPT CARD ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '1.5rem', boxShadow: '0 12px 35px rgba(0,0,0,0.06)' }}>
        
        <ReceiptPreview
          receiptId={`centered-details-receipt-${inv?.id || '1'}`}
          mode={mode}
          customerName={customerRecord.name}
          customerPhone={customerRecord.phone}
          customerAddress={customerRecord.address || inv?.customer_address || inv?.receipt_json_data?.customer_address}
          teluguCustomerName={getTeluguTransliterationSync(customerRecord.name)}
          teluguCustomerAddress={getTeluguTransliterationSync(customerRecord.address || inv?.customer_address || inv?.receipt_json_data?.customer_address || '')}
          rates={effectiveRates}
          items={itemsList}
          totalSellValue={totalSellValue}
          totalBuyCredit={totalBuyCredit}
          netPayable={netPayable}
          paymentType={(storedPayload?.paymentType || ((inv?.due_amount || 0) === 0 ? 'FULL' : 'PARTIAL')) as any}
          advancePaidAmount={storedPayload?.advancePaidAmount ?? inv?.paid_amount ?? (mode === 'BUY' ? 0 : netPayable)}
          balanceDueAmount={storedPayload?.balanceDueAmount ?? inv?.due_amount ?? 0}
          paymentHistory={storedPayload?.payment_history || []}
          createdDate={createdAtDate}
          updatedDate={updatedAtDate}
          lang={lang}
          onDownloadPNG={() => downloadReceiptAsPNG(`centered-details-receipt-${inv?.id || '1'}`, customerRecord.name)}
        />

      </div>

      {/* ── BOTTOM UPDATE HISTORY & AUDIT TRAIL CARD ── */}
      <div style={{ marginTop: '1.5rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.92rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-timeline" style={{ color: '#6366f1' }}></i>
          {t.auditTrailTitle} ({updateHistory.length} {t.auditTrailEdits})
        </h4>

        {updateHistory.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: '6px', color: '#0284c7' }}></i>
            {t.auditTrailOriginalMsg} <strong>{formatDateTime(createdAtDate)}</strong> {t.auditTrailNotModifiedMsg}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <span style={{ background: '#0f172a', color: '#ffffff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>1</span>
              <span>{t.originalBillCreated} <strong>{formatDateTime(createdAtDate)}</strong></span>
            </div>

            {updateHistory.map((updIso: string, uIdx: number) => (
              <div key={uIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', background: '#fffbeb', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <span style={{ background: '#b45309', color: '#ffffff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>{uIdx + 2}</span>
                <span>{t.revisionLabel} #{uIdx + 1} {t.editedAndUpdatedMsg} <strong style={{ color: '#92400e' }}>{formatDateTime(updIso)}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
