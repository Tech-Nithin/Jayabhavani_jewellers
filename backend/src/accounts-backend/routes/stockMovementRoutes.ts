import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { matchesDateFilterIST, round3Decimals } from './logbookRoutes';

const router = Router();

/**
 * Tab 2: GET /api/accounts/stock-movement
 * Returns detailed Metal In & Outs stock balances, showcase stock, loaded stock, and reorder lists.
 */
router.get('/stock-movement', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const [{ data: dbProducts }, { data: dbBillingRecords }, { data: workerTxns }] = await Promise.all([
      supabase.from('inventory_products').select('*').order('created_at', { ascending: true }),
      supabase.from('billing_sell_buy_records').select('*').order('created_at', { ascending: true }),
      supabase.from('worker_transactions').select('*').order('created_at', { ascending: true }),
    ]);

    const addedProductsToday = (dbProducts || []).filter((p) => matchesDateFilterIST(p.created_at, targetDate, startDate, endDate));
    const matchedBillingRecords = (dbBillingRecords || []).filter((r) => matchesDateFilterIST(r.bill_date || r.created_at, targetDate, startDate, endDate));
    const matchedWorkerTxns = (workerTxns || []).filter((tx) => matchesDateFilterIST(tx.created_at, targetDate, startDate, endDate));

    let currentGoldShowcase = 0;
    let currentSilverShowcase = 0;
    (dbProducts || []).forEach((p: any) => {
      const metal = (p.item_type || p.metal_type || 'GOLD').toUpperCase();
      const wt = Number(p.stock_quantity || p.weight_grams || p.weight_from_grams || 0);
      if (metal.includes('SILVER')) currentSilverShowcase += wt;
      else currentGoldShowcase += wt;
    });

    let goldSoldToday = 0;
    let silverSoldToday = 0;
    let goldBoughtToday = 0;
    let silverBoughtToday = 0;

    matchedBillingRecords.forEach((r: any) => {
      const txType = (r.transaction_type || '').toUpperCase();
      const metal = (r.metal_type || 'GOLD').toUpperCase();
      const wt = Number(r.item_weight || r.weight_grams || 0);

      if (txType === 'SELL') {
        if (metal.includes('SILVER')) silverSoldToday += wt;
        else goldSoldToday += wt;
      } else if (txType === 'BUY' || txType === 'EXCHANGE_BUY') {
        if (metal.includes('SILVER')) silverBoughtToday += wt;
        else goldBoughtToday += wt;
      }
    });

    const goldLoadedToday = addedProductsToday
      .filter((p: any) => !(p.item_type || 'GOLD').toUpperCase().includes('SILVER'))
      .reduce((sum: number, p: any) => sum + Number(p.stock_quantity || p.weight_grams || 0), 0);

    const silverLoadedToday = addedProductsToday
      .filter((p: any) => (p.item_type || 'GOLD').toUpperCase().includes('SILVER'))
      .reduce((sum: number, p: any) => sum + Number(p.stock_quantity || p.weight_grams || 0), 0);

    const stockSummary = [
      {
        category: 'Gold Ornaments',
        openingWeight: round3Decimals(currentGoldShowcase + goldSoldToday - goldLoadedToday),
        loadedWeight: round3Decimals(goldLoadedToday),
        soldWeight: round3Decimals(goldSoldToday),
        boughtWeight: round3Decimals(goldBoughtToday),
        closingWeight: round3Decimals(currentGoldShowcase),
      },
      {
        category: 'Silver Articles & Ornaments',
        openingWeight: round3Decimals(currentSilverShowcase + silverSoldToday - silverLoadedToday),
        loadedWeight: round3Decimals(silverLoadedToday),
        soldWeight: round3Decimals(silverSoldToday),
        boughtWeight: round3Decimals(silverBoughtToday),
        closingWeight: round3Decimals(currentSilverShowcase),
      },
    ];

    const eodReorderList = (dbProducts || [])
      .filter((p: any) => Number(p.stock_quantity || p.weight_grams || 0) <= 5)
      .map((p: any) => ({
        id: p.id,
        item_name: p.item_name,
        category: p.category,
        metal_type: p.item_type || 'GOLD',
        current_weight: Number(p.stock_quantity || p.weight_grams || 0),
        reorder_status: Number(p.stock_quantity || p.weight_grams || 0) === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      }));

    res.json({
      success: true,
      date: targetDate,
      stockSummary,
      ornamentsStockList: dbProducts || [],
      eodReorderList,
      workerTransfers: matchedWorkerTxns,
    });
  } catch (err: any) {
    console.error('Error fetching stock movement:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
