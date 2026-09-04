import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { memoryCache } from '../../config/memoryCache';

const router = Router();

/**
 * GET /api/dashboard/overview
 * Unified dashboard overview aggregating metrics from Billing, Orders, Workers, and Finance
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const cached = memoryCache.get<any>('dashboard_overview');
    if (cached) {
      return res.json({ success: true, ...cached });
    }

    const [
      { data: bills },
      { data: orders },
      { data: loans },
      { data: workers },
    ] = await Promise.all([
      supabase.from('customer_billing').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('finance').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('workers').select('id, name, phone, specialization, photo_url'),
    ]);

    // Compute Turnover & Sales Metrics
    let totalSalesRevenue = 0;
    let totalGoldSoldWeight = 0;
    let totalSilverSoldWeight = 0;
    let totalScrapBoughtWeight = 0;

    (bills || []).forEach((b: any) => {
      totalSalesRevenue += Number(b.final_amount || b.total_amount || 0);
      const items = b.receipt_json_data?.items || [];
      items.forEach((it: any) => {
        const wt = Number(it.weight_grams || 0);
        const isGold = (it.metal_type || 'GOLD').toUpperCase() !== 'SILVER';
        if ((it.item_type || 'SELL').toUpperCase() === 'SELL') {
          if (isGold) totalGoldSoldWeight += wt;
          else totalSilverSoldWeight += wt;
        } else {
          totalScrapBoughtWeight += wt;
        }
      });
    });

    const activeOrdersCount = (orders || []).filter((o: any) => o.status === 'ASSIGNED' || o.status === 'PENDING').length;
    const completedOrdersCount = (orders || []).filter((o: any) => o.status === 'COMPLETED' || o.sold_status === 'SOLD').length;

    const openLoansCount = (loans || []).filter((l: any) => l.status !== 'CLOSED' && l.payment_status !== 'CLOSED' && l.record_action !== 'deleted').length;
    const totalLoanDisbursed = (loans || []).reduce((sum: number, l: any) => sum + Number(l.amount || l.customer_debt_money || 0), 0);

    const payload = {
      kpis: {
        totalSalesRevenue: Math.round(totalSalesRevenue),
        totalGoldSoldWeight: Number(totalGoldSoldWeight.toFixed(3)),
        totalSilverSoldWeight: Number(totalSilverSoldWeight.toFixed(3)),
        totalScrapBoughtWeight: Number(totalScrapBoughtWeight.toFixed(3)),
        activeOrdersCount,
        completedOrdersCount,
        openLoansCount,
        totalLoanDisbursed: Math.round(totalLoanDisbursed),
        workersCount: (workers || []).length,
      },
      recentInvoices: (bills || []).slice(0, 15),
      recentOrders: (orders || []).slice(0, 15),
      recentLoans: (loans || []).slice(0, 15),
      workers: workers || [],
    };

    memoryCache.set('dashboard_overview', payload, 30); // 30s cache
    res.json({ success: true, ...payload });
  } catch (err: any) {
    console.error('Dashboard overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/dashboard/invoices
 * Returns customer invoices formatted for dashboard activity charts
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { data: bills, error } = await supabase
      .from('customer_billing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      invoices: bills || [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/dashboard/stats
 * High-level summary stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [{ count: billCount }, { count: orderCount }, { count: loanCount }] = await Promise.all([
      supabase.from('customer_billing').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('finance').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      success: true,
      module: 'dashboard-backend',
      stats: {
        totalInvoices: billCount || 0,
        totalOrders: orderCount || 0,
        totalLoans: loanCount || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
