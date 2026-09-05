import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { matchesDateFilterIST, round3Decimals } from './logbookRoutes';

const router = Router();

/**
 * Tab 4: GET /api/accounts/scrap-vault
 * Returns all scrap buy records, gold/silver weights, purities, and customer payout history.
 */
router.get('/scrap-vault', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const [{ data: dbInvoices }, { data: dbBillingRecords }] = await Promise.all([
      supabase.from('customer_billing').select('customer_billing_uuid, billing_id, customer_name, customer_phone'),
      supabase.from('billing_sell_buy_records').select('*').order('created_at', { ascending: false }),
    ]);

    const customerMap = new Map<string, any>();
    (dbInvoices || []).forEach((inv: any) => {
      if (inv.customer_billing_uuid) customerMap.set(String(inv.customer_billing_uuid).toLowerCase(), inv);
      if (inv.billing_id) customerMap.set(String(inv.billing_id).toLowerCase(), inv);
    });

    const oldMetalVaultItems: any[] = [];
    let oldGoldBoughtWeight = 0;
    let oldSilverBoughtWeight = 0;
    let totalScrapPayout = 0;

    (dbBillingRecords || []).forEach((r: any) => {
      const type = (r.transaction_type || '').toUpperCase();
      if (type !== 'BUY' && type !== 'EXCHANGE_BUY') return;

      const isDateMatch = matchesDateFilterIST(r.bill_date || (r.created_at ? String(r.created_at).split('T')[0] : null), targetDate, startDate, endDate);
      if (!isDateMatch) return;

      const metal = (r.metal_type || 'GOLD').toUpperCase();
      const wt = Number(r.item_weight || 0);
      const purity = Number(r.item_quality_percentage || r.purity_percentage || 100);
      const pureWt = Number(r.pure_metal_weight || round3Decimals(wt * (purity / 100)));
      const payout = Number(r.total_item_price || 0);

      if (metal.includes('SILVER')) {
        oldSilverBoughtWeight += wt;
      } else {
        oldGoldBoughtWeight += wt;
      }
      totalScrapPayout += payout;

      const custUuid = String(r.customer_billing_uuid || '').toLowerCase();
      const matchedCust = customerMap.get(custUuid);

      oldMetalVaultItems.push({
        id: `scrap-${r.record_uuid || r.id || Math.random()}`,
        record_uuid: r.record_uuid,
        customer_billing_uuid: r.customer_billing_uuid,
        customer_name: matchedCust?.customer_name || 'Customer',
        customer_phone: matchedCust?.customer_phone || '-',
        bill_date: r.bill_date || (r.created_at ? String(r.created_at).split('T')[0] : targetDate),
        created_at: r.created_at,
        item_name: r.item_name || `${metal.includes('SILVER') ? 'Silver' : 'Gold'} Scrap`,
        metal_type: metal.includes('SILVER') ? 'SILVER' : 'GOLD',
        gross_weight: wt,
        only_metal_weight: Number(r.only_metal_weight || wt),
        purity_percentage: purity,
        pure_weight: pureWt,
        payout_amount: payout,
      });
    });

    res.json({
      success: true,
      date: targetDate,
      scrapSummary: {
        oldGoldBoughtWeight: round3Decimals(oldGoldBoughtWeight),
        oldSilverBoughtWeight: round3Decimals(oldSilverBoughtWeight),
        totalScrapPayout,
      },
      oldMetalVaultItems,
    });
  } catch (err: any) {
    console.error('Error fetching scrap vault:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
