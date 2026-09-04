import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { matchesDateFilterIST } from './logbookRoutes';

const router = Router();

/**
 * Tab 5: GET /api/accounts/customer-dues
 * Returns the exact live outstanding customer dues & udhaari register.
 * Queries customer_billing and orders, merges latest installments from billing_payment_history,
 * and filters only records with live pending due > 0.01.
 */
router.get('/customer-dues', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || 'all';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const [
      { data: dbBills },
      { data: dbOrders },
      { data: dbPayments }
    ] = await Promise.all([
      supabase.from('customer_billing').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('billing_payment_history').select('*').order('created_at', { ascending: true }),
    ]);

    // Group payment history by customer_billing_uuid and billing_id
    const paymentsByBillKey = new Map<string, any[]>();
    (dbPayments || []).forEach((p: any) => {
      const keys = [
        String(p.customer_billing_uuid || '').toLowerCase(),
        String(p.billing_id || '').toLowerCase()
      ].filter(Boolean);

      keys.forEach((k) => {
        if (!paymentsByBillKey.has(k)) paymentsByBillKey.set(k, []);
        paymentsByBillKey.get(k)!.push(p);
      });
    });

    const duesRecords: any[] = [];
    const processedIds = new Set<string>();

    const ordersMap = new Map<string, any>();
    (dbOrders || []).forEach((o: any) => {
      const oId = String(o.id || o.order_id || '').toLowerCase();
      const oUuid = String(o.customer_billing_uuid || '').toLowerCase();
      if (oId) ordersMap.set(oId, o);
      if (oUuid) ordersMap.set(oUuid, o);
    });

    // 1. Process customer_billing records
    (dbBills || []).forEach((b: any) => {
      const bUuid = String(b.customer_billing_uuid || '').toLowerCase();
      const bId = String(b.billing_id || '').toLowerCase();
      if ((bUuid && processedIds.has(bUuid)) || (bId && processedIds.has(bId))) return;

      const billHistory = paymentsByBillKey.get(bUuid) || paymentsByBillKey.get(bId) || [];
      const latestPayment = billHistory.length > 0 ? billHistory[billHistory.length - 1] : null;
      const matchedOrd = ordersMap.get(bId) || ordersMap.get(bUuid);

      const billReceipt = typeof b.bill_json === 'string' ? JSON.parse(b.bill_json) : (b.bill_json || {});
      const ordReceipt = typeof matchedOrd?.receipt_json_data === 'string' ? JSON.parse(matchedOrd.receipt_json_data) : (matchedOrd?.receipt_json_data || {});

      const totalAmount = Number(
        billReceipt.grandTotal ||
        billReceipt.netPayable ||
        billReceipt.totalSellValue ||
        ordReceipt.grandTotal ||
        ordReceipt.netPayable ||
        b.total_amount ||
        matchedOrd?.final_amount ||
        matchedOrd?.total_amount ||
        0
      );

      // Live remaining due from order record, latest installment, or master bill
      const activeDue = matchedOrd && matchedOrd.due_amount !== undefined && matchedOrd.due_amount !== null
        ? Number(matchedOrd.due_amount)
        : (latestPayment && latestPayment.remaining_due !== undefined && latestPayment.remaining_due !== null
            ? Number(latestPayment.remaining_due)
            : Number(b.due_amount || 0));

      const totalPaid = latestPayment
        ? billHistory.reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0)
        : (matchedOrd && matchedOrd.paid_amount !== undefined
            ? Number(matchedOrd.paid_amount)
            : Number(b.paid_amount || 0));

      // Mark processed immediately
      if (bUuid) processedIds.add(bUuid);
      if (bId) processedIds.add(bId);

      // Only include records with active due > 0.01
      if (activeDue <= 0.01) return;

      // Filter by date if specified (otherwise 'all' returns all active dues)
      if (targetDate !== 'all' && targetDate !== 'ALL') {
        const isMatch = matchesDateFilterIST(b.bill_date || b.created_at, targetDate, startDate, endDate);
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
        total_amount: totalAmount || (totalPaid + activeDue),
        paid_amount: totalPaid,
        due_amount: activeDue,
        payment_status: 'PARTIAL',
        raw_bill: b,
      });
    });

    // 2. Process any remaining custom orders from 'orders' table
    (dbOrders || []).forEach((o: any) => {
      const oId = String(o.id || o.order_id || '').toLowerCase();
      const oUuid = String(o.customer_billing_uuid || '').toLowerCase();
      if ((oId && processedIds.has(oId)) || (oUuid && processedIds.has(oUuid))) return;

      if (oId) processedIds.add(oId);
      if (oUuid) processedIds.add(oUuid);

      const orderHistory = paymentsByBillKey.get(oId) || (oUuid ? paymentsByBillKey.get(oUuid) : []) || [];
      const latestPayment = orderHistory.length > 0 ? orderHistory[orderHistory.length - 1] : null;

      const totalAmt = Number(o.final_amount || o.total_amount || 0);
      const activeDue = latestPayment && latestPayment.remaining_due !== undefined && latestPayment.remaining_due !== null
        ? Number(latestPayment.remaining_due)
        : Number(o.due_amount || 0);

      const totalPaid = latestPayment
        ? orderHistory.reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0)
        : Number(o.paid_amount || 0);

      if (activeDue <= 0.01) return;

      if (targetDate !== 'all' && targetDate !== 'ALL') {
        const isMatch = matchesDateFilterIST(o.created_at, targetDate, startDate, endDate);
        if (!isMatch) return;
      }

      duesRecords.push({
        id: o.id || o.order_id,
        billing_id: o.id || o.order_id,
        customer_name: o.customer_name || 'Customer',
        customer_phone: o.customer_phone || '-',
        customer_address: o.customer_address || '',
        bill_type: 'ORDER',
        metal_type: o.metal_type || 'GOLD',
        bill_date: o.created_at ? o.created_at.split('T')[0] : todayIST,
        created_at: o.created_at,
        total_amount: totalAmt || (totalPaid + activeDue),
        paid_amount: totalPaid,
        due_amount: activeDue,
        payment_status: 'PARTIAL',
        raw_order: o,
      });
    });

    // Sort by latest created_at descending
    duesRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Aggregate summary metrics
    let totalPendingDue = 0;
    let totalPaidSoFar = 0;
    let totalGrossValue = 0;
    const customerSet = new Set<string>();

    duesRecords.forEach((d) => {
      totalPendingDue += d.due_amount;
      totalPaidSoFar += d.paid_amount;
      totalGrossValue += d.total_amount;
      customerSet.add(d.customer_name.trim().toLowerCase());
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
