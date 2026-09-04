import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { calculateDynamicCashBalance } from '../../utils/cashLedgerHelper';
import { getOrInitOpeningRecord } from '../../utils/openingRecordHelper';
import { matchesDateFilterIST } from './logbookRoutes';

const router = Router();

/**
 * Tab 3: GET /api/accounts/cash-register
 * Returns dynamic cash in/out balances, cash transactions, and drawer totals.
 */
router.get('/cash-register', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const [{ data: dbCashLedger }, { data: dbPaymentHistory }, { data: dbInvoices }] = await Promise.all([
      supabase.from('cash_transaction_ledger').select('*').order('created_at', { ascending: false }),
      supabase.from('billing_payment_history').select('*').order('created_at', { ascending: false }),
      supabase.from('customer_billing').select('*').order('created_at', { ascending: false }),
    ]);

    const cashLedgerToday = (dbCashLedger || []).filter((tx) => matchesDateFilterIST(tx.created_at, targetDate, startDate, endDate));

    const { totalCash: liveClosingCash } = await calculateDynamicCashBalance(targetDate === 'all' ? undefined : targetDate);

    let openingCash = liveClosingCash;
    if (targetDate !== 'all') {
      const yesterdayObj = new Date(`${targetDate}T12:00:00Z`);
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = yesterdayObj.toISOString().split('T')[0];
      const { totalCash: prevDayCash } = await calculateDynamicCashBalance(yesterdayStr);
      openingCash = prevDayCash;
    }

    const openingRecord = await getOrInitOpeningRecord(
      targetDate,
      { goldGrams: 0, silverGrams: 0, cashAmount: Number(openingCash.toFixed(2)) },
      { goldGrams: 0, silverGrams: 0 }
    );

    let totalCashIn = 0;
    let totalCashOut = 0;

    cashLedgerToday.forEach((tx: any) => {
      const amt = Number(tx.transaction_cash_total || tx.amount || 0);
      const isFlowIn = (tx.flow_type || '').toUpperCase() === 'IN';
      if (isFlowIn) totalCashIn += amt;
      else totalCashOut += amt;
    });

    const cashSummary = {
      openingCash: Number(openingRecord.openingCashAmount.toFixed(2)),
      expectedClosingCash: Number(liveClosingCash.toFixed(2)),
      current_cash: Number(liveClosingCash.toFixed(2)),
      totalCashIn,
      totalCashOut,
      netCashFlow: Number((totalCashIn - totalCashOut).toFixed(2)),
    };

    res.json({
      success: true,
      date: targetDate,
      cashSummary,
      cashLedgerRecords: cashLedgerToday,
    });
  } catch (err: any) {
    console.error('Error fetching cash register:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
