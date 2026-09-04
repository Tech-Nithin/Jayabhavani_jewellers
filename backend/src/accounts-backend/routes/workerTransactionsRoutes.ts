import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { matchesDateFilterIST, round3Decimals } from './logbookRoutes';

const router = Router();

/**
 * Tab 6: GET /api/accounts/worker-transactions
 * Returns Karigar / Worker transaction logs, active fine gold/silver issued vs received, and cash balances.
 */
router.get('/worker-transactions', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const [{ data: dbWorkers }, { data: dbWorkerTxns }] = await Promise.all([
      supabase.from('workers').select('id, name, specialization, phone'),
      supabase.from('worker_transactions').select('*').order('created_at', { ascending: false }),
    ]);

    const workerMap = new Map<string, any>();
    (dbWorkers || []).forEach((w: any) => {
      if (w.id) {
        workerMap.set(String(w.id).toLowerCase(), w);
        workerMap.set(String(w.id), w);
      }
    });

    const filteredTxns = (dbWorkerTxns || []).filter((tx) => matchesDateFilterIST(tx.created_at, targetDate, startDate, endDate));

    let goldIssued = 0;
    let goldReceived = 0;
    let silverIssued = 0;
    let silverReceived = 0;
    let cashIssued = 0;
    let cashReceived = 0;

    const formattedList = filteredTxns.map((tx: any) => {
      const rawWorkerId = String(tx.worker_id || tx.workerId || '').toLowerCase();
      const matchedWorker = workerMap.get(rawWorkerId);
      const workerName = tx.worker_name || tx.karigar_name || tx.workerName || matchedWorker?.name || (tx.worker_id ? `Worker (${tx.worker_id})` : 'Karigar');

      const directionStr = String(tx.direction || tx.transfer_direction || tx.type || '').toUpperCase();
      const isAdminToWorker = directionStr.includes('OUTGOING') || directionStr.includes('ADMIN') || directionStr.includes('SEND') || directionStr.includes('ISSUE');
      const itemMode = (tx.category || tx.item_type || tx.metal_type || tx.transfer_mode || 'GOLD').toUpperCase();
      const wt = Number(tx.weight_grams || tx.net_weight || tx.fine_weight_grams || tx.fine_weight || 0);
      const amt = Number(tx.amount || tx.cash_amount || tx.amount_cash || 0);

      if (itemMode.includes('GOLD')) {
        if (isAdminToWorker) goldIssued += wt;
        else goldReceived += wt;
      } else if (itemMode.includes('SILVER')) {
        if (isAdminToWorker) silverIssued += wt;
        else silverReceived += wt;
      } else if (itemMode.includes('CASH')) {
        if (isAdminToWorker) cashIssued += amt;
        else cashReceived += amt;
      }

      return {
        id: tx.id,
        worker_id: tx.worker_id,
        worker_name: workerName,
        worker_phone: matchedWorker?.phone || '-',
        order_id: tx.order_id || null,
        direction: isAdminToWorker ? 'ADMIN_TO_WORKER' : 'WORKER_TO_ADMIN',
        category: itemMode,
        weight_grams: wt,
        amount: amt,
        cash_metal_link: tx.cash_metal_link || null,
        notes: tx.notes || tx.description || '',
        created_at: tx.created_at,
      };
    });

    res.json({
      success: true,
      date: targetDate,
      summary: {
        goldIssued: round3Decimals(goldIssued),
        goldReceived: round3Decimals(goldReceived),
        netGoldWithWorkers: round3Decimals(goldIssued - goldReceived),
        silverIssued: round3Decimals(silverIssued),
        silverReceived: round3Decimals(silverReceived),
        netSilverWithWorkers: round3Decimals(silverIssued - silverReceived),
        cashIssued: Math.round(cashIssued),
        cashReceived: Math.round(cashReceived),
        netCashWithWorkers: Math.round(cashIssued - cashReceived),
        totalTransactions: formattedList.length,
      },
      transactions: formattedList,
    });
  } catch (err: any) {
    console.error('Error fetching worker transactions:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
