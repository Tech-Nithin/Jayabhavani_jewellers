import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { matchesDateFilterIST } from './logbookRoutes';

const router = Router();

/**
 * Tab 5: GET /api/accounts/customer-dues
 * Returns customer dues fetched exclusively from customer_billing table based on bill_date.
 */
router.get('/customer-dues', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || 'all';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const { data: dbBills, error } = await supabase
      .from('customer_billing')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const duesRecords: any[] = [];
    (dbBills || []).forEach((b: any) => {
      const activeDue = Number(b.due_amount || 0);
      const paidAmount = Number(b.paid_amount || 0);
      const totalAmount = Number(b.total_amount || (paidAmount + activeDue));

      // Filter only bills with active dues
      if (activeDue <= 0.01) return;

      // Filter by bill_date matching targetDate / range
      if (targetDate !== 'all' && targetDate !== 'ALL') {
        const isMatch = matchesDateFilterIST(b.bill_date, targetDate, startDate, endDate);
        if (!isMatch) return;
      }

      duesRecords.push({
        id: b.billing_id || b.customer_billing_uuid,
        customer_billing_uuid: b.customer_billing_uuid,
        billing_id: b.billing_id,
        customer_name: b.customer_name || 'Customer',
        customer_phone: b.customer_phone || '-',
        customer_address: b.customer_address || '',
        bill_type: b.bill_type || 'SELL',
        metal_type: b.metal_type || 'GOLD',
        bill_date: b.bill_date || (b.created_at ? b.created_at.split('T')[0] : todayIST),
        created_at: b.created_at,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: activeDue,
        payment_status: 'PARTIAL',
        raw_bill: b,
      });
    });

    // Sort by bill_date / created_at descending
    duesRecords.sort((a, b) => {
      const timeA = new Date(a.bill_date || a.created_at).getTime();
      const timeB = new Date(b.bill_date || b.created_at).getTime();
      return timeB - timeA;
    });

    // Aggregate summary metrics
    let totalPendingDue = 0;
    let totalPaidSoFar = 0;
    let totalGrossValue = 0;
    const customerSet = new Set<string>();

    duesRecords.forEach((d) => {
      totalPendingDue += d.due_amount;
      totalPaidSoFar += d.paid_amount;
      totalGrossValue += d.total_amount;
      customerSet.add((d.customer_name || 'Customer').trim().toLowerCase());
    });

    res.json({
      success: true,
      date: targetDate,
      metrics: {
        totalDue: totalPendingDue,
        totalPaid: totalPaidSoFar,
        totalBillVal: totalGrossValue,
        customerCount: customerSet.size,
        totalDueRecords: duesRecords.length,
      },
      duesRecords,
    });
  } catch (err: any) {
    console.error('Error fetching customer dues:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
