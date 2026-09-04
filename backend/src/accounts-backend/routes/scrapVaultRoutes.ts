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
      supabase.from('customer_billing').select('*').order('created_at', { ascending: false }),
      supabase.from('billing_sell_buy_records').select('*').eq('transaction_type', 'BUY').order('created_at', { ascending: false }),
    ]);

    const oldMetalVaultItems: any[] = [];
    let oldGoldBoughtWeight = 0;
    let oldSilverBoughtWeight = 0;
    let totalScrapPayout = 0;

    (dbInvoices || []).forEach((inv: any) => {
      const isDateMatch = matchesDateFilterIST(inv.bill_date || inv.created_at, targetDate, startDate, endDate);
      if (!isDateMatch) return;

      const receipt = typeof inv.bill_json === 'string' ? JSON.parse(inv.bill_json) : (inv.bill_json || {});
      const items = Array.isArray(receipt.items) ? receipt.items : [];
      const buyRecs = receipt.buy_records || receipt.old_metal || items.filter((it: any) => it.item_type === 'BUY' || it.item_type === 'EXCHANGE_BUY');

      (buyRecs || []).forEach((it: any) => {
        const wt = Number(it.weight_grams || it.item_weight || 0);
        const purity = Number(it.purity_percentage || it.purity || it.touch_percentage || 91.6);
        const pureWt = round3Decimals(wt * (purity / 100));
        const metal = (it.metal_type || 'GOLD').toUpperCase();
        const payout = Number(it.total_price || it.total_item_price || it.price || 0);

        if (metal.includes('SILVER')) {
          oldSilverBoughtWeight += wt;
        } else {
          oldGoldBoughtWeight += wt;
        }
        totalScrapPayout += payout;

        oldMetalVaultItems.push({
          id: `scrap-${inv.customer_billing_uuid || inv.billing_id}-${it.id || Math.random()}`,
          customer_name: inv.customer_name || 'Customer',
          customer_phone: inv.customer_phone || '-',
          bill_date: inv.bill_date || inv.created_at?.split('T')[0],
          created_at: inv.created_at,
          item_name: it.product_name || it.item_name || `${metal} Scrap`,
          metal_type: metal,
          gross_weight: wt,
          purity_percentage: purity,
          pure_weight: pureWt,
          payout_amount: payout,
        });
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
