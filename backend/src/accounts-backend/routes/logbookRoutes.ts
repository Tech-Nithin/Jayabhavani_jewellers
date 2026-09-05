import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { calculateDynamicCashBalance } from '../../utils/cashLedgerHelper';
import { getOrInitOpeningRecord } from '../../utils/openingRecordHelper';
import { getTodayIST, getNowISTISO, toISTTimestamp, toISTDateOnly } from '../../utils/dateHelper';
import { getHistoricalInventoryStock } from '../../utils/inventoryLedgerHelper';

const router = Router();

// Helper: Checks if a date/timestamp matches date filter (all, single date, or date range) without timezone conversion
export function matchesDateFilterIST(created_at: any, targetDate: string, startDate?: string, endDate?: string): boolean {
  if (targetDate === 'all' || targetDate === 'ALL') return true;
  if (!created_at) return false;

  const rawStr = String(created_at).trim();
  const datePart = rawStr.includes('T') ? rawStr.split('T')[0] : rawStr.split(' ')[0];

  if ((targetDate === 'range' || (startDate && endDate)) && startDate && endDate) {
    return datePart >= startDate && datePart <= endDate;
  }

  return datePart === targetDate;
}

export function round3Decimals(num: number): number {
  return Number((Math.round(num * 1000) / 1000).toFixed(3));
}

export const formatCustomerBillingToInvoice = (b: any) => {
  const receipt = typeof b.bill_json === 'string' ? JSON.parse(b.bill_json) : (b.bill_json || {});
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const primaryItem = items[0] || {};
  const productNames = items.length > 0
    ? items.map((i: any) => i.product_name || i.item_name || i.name).filter(Boolean).join(', ')
    : (primaryItem.product_name || primaryItem.item_name || `${b.bill_type || 'SELL'} Item`);

  const totalWeight = items.reduce((acc: number, i: any) => acc + Number(i.weight_grams || i.gross_weight_grams || i.item_weight || 0), 0);

  return {
    id: b.billing_id || b.customer_billing_uuid,
    customer_billing_uuid: b.customer_billing_uuid,
    customer_name: b.customer_name,
    customer_phone: b.customer_phone || '-',
    customer_address: b.customer_address || receipt.customer_address || '',
    transaction_type: b.bill_type || 'SELL',
    metal_type: primaryItem.metal_type || 'GOLD',
    product_name: productNames,
    weight_grams: totalWeight || Number(primaryItem.weight_grams || 0),
    purity_percentage: Number(primaryItem.purity_percentage || primaryItem.touch_percentage || 91.6),
    applied_rate_per_gram: Number(primaryItem.applied_rate_per_gram || primaryItem.appliedRate || receipt.rates?.gold_sell_value || 0),
    pure_metal_weight: Number(primaryItem.pure_metal_weight || primaryItem.pure_weight_grams || 0),
    metal_value: Number(receipt.totalSellValue || b.total_amount || 0),
    making_charges: Number(primaryItem.making_charges || primaryItem.making_charges_per_gram || 0),
    gst_amount: Number(receipt.gstVal || 0),
    final_amount: Number(b.total_amount || 0),
    paid_amount: Number(b.paid_amount || 0),
    due_amount: Number(b.due_amount || 0),
    bill_date: b.bill_date || receipt.bill_date || (b.created_at ? b.created_at.split('T')[0] : null),
    payment_status: b.payment_status || (Number(b.due_amount || 0) <= 0 ? 'PAID' : 'PARTIAL'),
    image_url: primaryItem.image_url || receipt.image_url || null,
    receipt_json_data: receipt,
    created_at: b.created_at,
    updated_at: b.updated_at,
  };
};

/**
 * Tab 1: GET /api/accounts/day-book or /api/accounts/logbook
 * Returns chronological timeline entries and summary metrics for the given date filter.
 */
router.get(['/day-book', '/logbook'], async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const todayIST = getTodayIST();
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const section = ((req.query.section as string) || 'all').toLowerCase();

    // 1. Fetch DB records in parallel
    const [
      { data: dbInvoices },
      { data: dbPaymentHistory },
      { data: dbOrdersList },
      { data: dbWorkers },
      { data: workerTxns },
      { data: dbProducts },
      { data: dbLoans },
      { data: dbCashLedger },
      { data: dbCustomerBills },
      { data: dbBillingRecords }
    ] = await Promise.all([
      supabase.from('customer_billing').select('*').order('created_at', { ascending: true }),
      supabase.from('billing_payment_history').select('*').order('created_at', { ascending: true }),
      supabase.from('orders').select('*').order('created_at', { ascending: true }),
      supabase.from('workers').select('id, name'),
      supabase.from('worker_transactions').select('*').order('created_at', { ascending: true }),
      supabase.from('inventory_products').select('*').order('created_at', { ascending: true }),
      supabase.from('finance').select('*').order('created_at', { ascending: true }),
      supabase.from('cash_transaction_ledger').select('*, cash_history(date)').order('created_at', { ascending: true }),
      supabase.from('customer_billing').select('*').order('created_at', { ascending: true }),
      supabase.from('billing_sell_buy_records').select('*').order('created_at', { ascending: true }),
    ]);

    const formattedDbInvoices = (dbInvoices || []).map(formatCustomerBillingToInvoice);
    const combinedInvoicesMap = new Map<string, any>();
    formattedDbInvoices.forEach((inv: any) => combinedInvoicesMap.set(String(inv.id), inv));

    const invoices = Array.from(combinedInvoicesMap.values()).filter((inv) => {
      const orderKey = String(inv.id || inv.receipt_json_data?.order_id || '').toLowerCase();
      const matchedOrd = (dbOrdersList || []).find((o: any) => String(o.id || o.order_id || '').toLowerCase() === orderKey);
      const isOrderType = (inv.receipt_json_data?.transaction_type || inv.transaction_type || '').toUpperCase() === 'ORDER';
      const isSubmitted = (matchedOrd?.submitted || inv.submitted || 'no').toLowerCase() === 'yes';

      const bookingDate = inv.bill_date || inv.receipt_json_data?.bill_date;
      const deliveryDate = isOrderType && isSubmitted && matchedOrd?.item_submitted_at ? matchedOrd.item_submitted_at : null;

      const matchesBooking = matchesDateFilterIST(bookingDate, targetDate, startDate, endDate);
      const matchesDelivery = deliveryDate ? matchesDateFilterIST(deliveryDate, targetDate, startDate, endDate) : false;

      return matchesBooking || matchesDelivery;
    });

    const workerNameMap = new Map<string, string>();
    (dbWorkers || []).forEach((w: any) => {
      if (w.id && w.name) {
        workerNameMap.set(String(w.id).toLowerCase(), w.name);
        workerNameMap.set(String(w.id), w.name);
      }
    });

    const workerTransactions = (workerTxns || []).filter((tx) => matchesDateFilterIST(tx.created_at, targetDate, startDate, endDate));
    const addedProductsToday = (dbProducts || []).filter((p) => matchesDateFilterIST(p.bill_date, targetDate, startDate, endDate));
    const loansToday = (dbLoans || []).filter((fl) => matchesDateFilterIST(fl.debt_date || fl.loan_date, targetDate, startDate, endDate));
    const cashLedgerToday = (dbCashLedger || []).filter((tx) => {
      const effectiveCashDate = (tx as any).cash_history?.date || tx.bill_date || (tx.created_at ? String(tx.created_at).split('T')[0] : null);
      return matchesDateFilterIST(effectiveCashDate, targetDate, startDate, endDate);
    });
    
    // Filter billing records strictly by their transaction nature:
    // BUY (scrap metal received) -> bill_date (when scrap was taken into shop)
    // SELL (counter direct sale) -> bill_date
    // SELL (custom order)        -> ONLY when submitted=yes (delivery date item_submitted_at)
    const billingRecordsToday = (dbBillingRecords || []).filter((r: any) => {
      const type = (r.transaction_type || '').toUpperCase();
      const isOrderMode = (r.billing_mode || '').toUpperCase() === 'ORDER';
      const isSubmitted = (r.is_item_submitted || 'no').toLowerCase() === 'yes';

      if (type === 'BUY' || type === 'EXCHANGE_BUY') {
        return matchesDateFilterIST(r.bill_date, targetDate, startDate, endDate);
      }

      if (type === 'SELL') {
        if (isOrderMode) {
          if (!isSubmitted) return false; // Order in production - NOT sold yet!
          const deliveryDate = r.item_submitted_at || r.bill_date;
          return matchesDateFilterIST(deliveryDate, targetDate, startDate, endDate);
        }
        return matchesDateFilterIST(r.bill_date, targetDate, startDate, endDate);
      }

      return matchesDateFilterIST(r.bill_date, targetDate, startDate, endDate);
    });

    // Calculate live Metal Turnover & Purity from billing_sell_buy_records
    let goldBoughtGross = 0;
    let goldBoughtNet = 0;
    let goldBoughtPure = 0;
    let goldSoldGross = 0;
    let goldSoldNet = 0;
    let goldSoldPure = 0;

    let silverBoughtGross = 0;
    let silverBoughtNet = 0;
    let silverBoughtPure = 0;
    let silverSoldGross = 0;
    let silverSoldNet = 0;
    let silverSoldPure = 0;

    let totalScrapPayoutFromRecords = 0;

    if (billingRecordsToday.length > 0) {
      billingRecordsToday.forEach((r: any) => {
        const type = (r.transaction_type || '').toUpperCase();
        const metal = (r.metal_type || 'GOLD').toUpperCase();
        const gross = Number(r.item_weight || 0);
        const net = Number(r.only_metal_weight || gross);
        const pure = Number(r.pure_metal_weight || gross);
        const price = Number(r.total_item_price || 0);

        const isBuy = type === 'BUY' || type === 'EXCHANGE_BUY';
        const isSell = type === 'SELL';

        if (metal.includes('SILVER')) {
          if (isBuy) {
            silverBoughtGross += gross;
            silverBoughtNet += net;
            silverBoughtPure += pure;
            totalScrapPayoutFromRecords += price;
          } else if (isSell) {
            silverSoldGross += gross;
            silverSoldNet += net;
            silverSoldPure += pure;
          }
        } else {
          // GOLD
          if (isBuy) {
            goldBoughtGross += gross;
            goldBoughtNet += net;
            goldBoughtPure += pure;
            totalScrapPayoutFromRecords += price;
          } else if (isSell) {
            goldSoldGross += gross;
            goldSoldNet += net;
            goldSoldPure += pure;
          }
        }
      });
    } else if (invoices.length > 0) {
      invoices.forEach((inv: any) => {
        const items: any[] = Array.isArray(inv.receipt_json_data?.items) ? inv.receipt_json_data.items : [];
        const isOrderType = (inv.receipt_json_data?.transaction_type || inv.transaction_type || '').toUpperCase() === 'ORDER';
        const matchedOrd = (dbOrdersList || []).find((o: any) => String(o.id || o.order_id || '').toLowerCase() === String(inv.id || '').toLowerCase());
        const isSubmitted = (matchedOrd?.submitted || inv.submitted || 'no').toLowerCase() === 'yes';
        const isStockDebited = !isOrderType || isSubmitted;

        items.forEach((it: any) => {
          const type = (it.item_type || inv.transaction_type || 'SELL').toUpperCase();
          const metal = (it.metal_type || inv.metal_type || 'GOLD').toUpperCase();
          const gross = Number(it.gross_weight_grams || it.weight_grams || it.weight || 0);
          const net = Number(it.net_weight_grams || it.net_weight || gross);
          const pure = Number(it.pure_metal_weight || it.pure_weight_grams || gross);
          const price = Number(it.lineTotal || it.line_total || it.total_item_price || it.metalVal || 0);

          const isBuy = type === 'BUY';
          const isSell = type === 'SELL';

          if (metal.includes('SILVER')) {
            if (isBuy) {
              silverBoughtGross += gross;
              silverBoughtNet += net;
              silverBoughtPure += pure;
              totalScrapPayoutFromRecords += price;
            } else if (isSell && isStockDebited) {
              silverSoldGross += gross;
              silverSoldNet += net;
              silverSoldPure += pure;
            }
          } else {
            // GOLD
            if (isBuy) {
              goldBoughtGross += gross;
              goldBoughtNet += net;
              goldBoughtPure += pure;
              totalScrapPayoutFromRecords += price;
            } else if (isSell && isStockDebited) {
              goldSoldGross += gross;
              goldSoldNet += net;
              goldSoldPure += pure;
            }
          }
        });
      });
    }

    const overallMetalPuritySummary = {
      gold: {
        soldGross: Number(goldSoldGross.toFixed(3)),
        soldNet: Number(goldSoldNet.toFixed(3)),
        soldPure: Number(goldSoldPure.toFixed(3)),
        boughtGross: Number(goldBoughtGross.toFixed(3)),
        boughtNet: Number(goldBoughtNet.toFixed(3)),
        boughtPure: Number(goldBoughtPure.toFixed(3)),
        netPureFlow: Number((goldBoughtGross - goldSoldGross).toFixed(3)),
      },
      silver: {
        soldGross: Number(silverSoldGross.toFixed(3)),
        soldNet: Number(silverSoldNet.toFixed(3)),
        soldPure: Number(silverSoldPure.toFixed(3)),
        boughtGross: Number(silverBoughtGross.toFixed(3)),
        boughtNet: Number(silverBoughtNet.toFixed(3)),
        boughtPure: Number(silverBoughtPure.toFixed(3)),
        netPureFlow: Number((silverBoughtGross - silverSoldGross).toFixed(3)),
      },
    };

    // --- Chronological Log Book Timeline ---
    const logBookTimeline: any[] = [];
    let totalSalesCash = 0;
    let totalSalesUPI = 0;
    let totalSalesCard = 0;
    let totalSalesValue = 0;
    let totalGoldWeightSold = 0;
    let totalSilverWeightSold = 0;
    let totalGoldWeightBought = 0;
    let totalSilverWeightBought = 0;
    let totalScrapPayout = 0;
    let newDuesCreated = 0;
    let oldDuesCollected = 0;
    let makingChargesProfit = 0;
    const oldMetalVaultItems: any[] = [];

    const customerMap = new Map<string, any>();
    (dbCustomerBills || []).forEach((b: any) => {
      if (b.customer_billing_uuid) customerMap.set(String(b.customer_billing_uuid).toLowerCase(), b);
      if (b.billing_id) customerMap.set(String(b.billing_id).toLowerCase(), b);
    });

    if (billingRecordsToday.length > 0) {
      billingRecordsToday.forEach((r: any) => {
        const type = (r.transaction_type || '').toUpperCase();
        if (type !== 'BUY' && type !== 'EXCHANGE_BUY') return;

        const wt = Number(r.item_weight || 0);
        const purity = Number(r.item_quality_percentage || r.purity_percentage || 100);
        const pureWt = Number(r.pure_metal_weight || round3Decimals(wt * (purity / 100)));
        const metal = (r.metal_type || 'GOLD').toUpperCase();
        const payout = Number(r.total_item_price || 0);

        const custUuid = String(r.customer_billing_uuid || '').toLowerCase();
        const matchedCust = customerMap.get(custUuid);

        oldMetalVaultItems.push({
          id: `scrap-${r.record_uuid || r.id || Math.random()}`,
          record_uuid: r.record_uuid,
          customer_billing_uuid: r.customer_billing_uuid,
          customer_name: matchedCust?.customer_name || 'Customer',
          customer_phone: matchedCust?.customer_phone || '-',
          bill_date: r.bill_date || targetDate,
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
    }

    // 1. Process Inventory
    addedProductsToday.forEach((p: any) => {
      const formattedTime = p.created_at
        ? new Date(p.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '12:00 PM';
      const wt = Number(p.current_stock_weight ?? p.weight_grams ?? p.stock_quantity ?? p.weight_from_grams ?? 0);
      const pcs = Number(p.initial_quantity || 0);

      logBookTimeline.push({
        id: `log-inv-prod-${p.id}`,
        time: formattedTime,
        created_at: p.created_at,
        type: 'INVENTORY',
        title: p.item_name || 'Inventory Item',
        details: `${(p.item_type || 'GOLD').toUpperCase()} ${p.category || 'Stock'} · Total Net Weight: ${wt}g ${pcs > 0 ? `(${pcs} pcs)` : ''}`,
        category: (p.item_type || 'GOLD').toUpperCase(),
        weight_grams: wt,
        amount: Number(p.price || 0),
        paid_amount: 0,
        due_amount: 0,
        payment_mode: 'INVENTORY_STOCK',
      });
    });

    // 2. Process Finance Loans
    loansToday.forEach((fl: any) => {
      const formattedTime = fl.created_at
        ? new Date(fl.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '01:30 PM';
      const wt = Number(fl.item_weight ?? fl.item_weight_grams ?? fl.net_weight ?? fl.gross_weight ?? 0);
      const loanAmt = Number(fl.customer_debt_money ?? fl.current_principal ?? fl.amount ?? 0);
      const fullName = (fl.customer_name || 'Finance Customer').trim();

      logBookTimeline.push({
        id: `log-fin-${fl.finance_uuid || fl.id || Math.random()}`,
        time: formattedTime,
        created_at: fl.created_at || fl.debt_date || fl.loan_date || getNowISTISO(),
        type: 'FINANCE',
        title: fullName || 'Finance Customer',
        details: `Gold Loan Finance · ${fl.item_name || 'Gold Item'} (${wt}g)`,
        category: (fl.debt_category || fl.item_metal_type || 'GOLD').toUpperCase(),
        weight_grams: wt,
        amount: loanAmt,
        paid_amount: loanAmt,
        due_amount: 0,
        payment_mode: 'FINANCE_LOAN',
        customer_phone: fl.customer_phone,
      });
    });

    // 3. Process Worker Transactions
    workerTransactions.forEach((tx: any) => {
      const formattedTime = tx.created_at
        ? new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '02:00 PM';
      const wt = Number(tx.weight_grams || tx.net_weight || tx.fine_weight_grams || tx.fine_weight || 0);
      const amt = Number(tx.amount || tx.cash_amount || tx.amount_cash || 0);

      const rawWorkerId = String(tx.worker_id || tx.workerId || '').toLowerCase();
      const resolvedWorkerName = tx.worker_name || tx.karigar_name || tx.workerName || workerNameMap.get(rawWorkerId) || (tx.worker_id ? `Worker (${tx.worker_id})` : 'Karigar');

      const directionStr = String(tx.direction || tx.transfer_direction || tx.type || '').toUpperCase();
      const isAdminToWorker = directionStr.includes('OUTGOING') || directionStr.includes('ADMIN') || directionStr.includes('SEND') || directionStr.includes('ISSUE');
      const itemMode = (tx.category || tx.item_type || tx.metal_type || tx.transfer_mode || 'GOLD').toUpperCase();
      const isWorkAssign = Boolean(tx.order_id) || itemMode === 'ORDER' || (tx.notes && tx.notes.includes('Order #'));

      const directionTitle = isAdminToWorker
        ? `Admin → Worker (${resolvedWorkerName})`
        : `Worker (${resolvedWorkerName}) → Admin`;

      const directionIcon = isAdminToWorker ? '↑ Given' : '↓ Returned';
      const rawNotes = (tx.notes || tx.item_name || tx.description || tx.item_description || '').replace(/\n/g, ' · ');
      const itemDesc = rawNotes || `${itemMode} Transfer`;
      const details = `${directionIcon} : ${itemDesc} ${wt > 0 ? `(${wt}g)` : ''} ${amt > 0 ? `· ₹${amt.toLocaleString('en-IN')}` : ''} ${tx.order_id ? `· Order #${tx.order_id}` : ''}`;

      logBookTimeline.push({
        id: `log-worker-${tx.id || Math.random()}`,
        time: formattedTime,
        created_at: tx.created_at || getNowISTISO(),
        type: isWorkAssign ? 'WORK ASSIGN' : 'WORKER TX',
        title: directionTitle,
        details: details,
        category: itemMode,
        cash_metal_link: tx.cash_metal_link || null,
        weight_grams: wt,
        amount: amt,
        paid_amount: amt,
        due_amount: 0,
        payment_mode: 'WORKER_TRANSFER',
        direction: isAdminToWorker ? 'ADMIN_TO_WORKER' : 'WORKER_TO_ADMIN',
        transfer_item_mode: itemMode,
        raw_worker_txn: tx,
      });
    });

    // 4. Process Cash Ledger Entries
    cashLedgerToday.forEach((tx: any) => {
      const type = (tx.transaction_type || '').toUpperCase();
      const formattedTime = tx.created_at
        ? new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '12:00 PM';
      const amt = Number(tx.transaction_cash_total || 0);
      const isFlowIn = (tx.flow_type || '').toUpperCase() === 'IN';

      if (type === 'FINANCE') {
        const isRepayment = isFlowIn || (tx.item_type || '').toLowerCase().includes('payment') || (tx.item_type || '').toLowerCase().includes('repay') || (tx.notes || '').toLowerCase().includes('received');
        if (isRepayment) {
          logBookTimeline.push({
            id: `log-fin-repay-${tx.id || tx.uuid || tx.cash_history_uuid || Math.random()}`,
            time: formattedTime,
            created_at: tx.created_at || getNowISTISO(),
            type: 'FINANCE_REPAYMENT',
            title: tx.notes ? (tx.notes.includes('from ') ? tx.notes.split('from ')?.[1] : tx.notes) : 'Finance Payment',
            details: `💰 Finance Repayment · ${tx.item_type || 'Loan Payment'}: ${tx.notes || ''}`,
            category: (tx.metal_type || 'GOLD').toUpperCase(),
            weight_grams: 0,
            amount: amt,
            paid_amount: amt,
            due_amount: 0,
            payment_mode: 'REPAYMENT',
            flow_type: 'IN',
            raw_cash_ledger: tx,
          });
        }
        return;
      }

      if (type === 'SELL' || type === 'BUY' || type === 'EXCHANGE' || type === 'ORDER') return;

      logBookTimeline.push({
        id: `log-cash-${tx.cash_history_uuid || tx.id || Math.random()}`,
        time: formattedTime,
        created_at: tx.created_at || getNowISTISO(),
        type: 'CASH_REGISTER',
        title: type === 'LOADING' ? 'Cash Loaded to Drawer' : (tx.notes || 'Cash Entry'),
        details: `${isFlowIn ? '💵 Cash IN (Loaded to Drawer)' : '💸 Cash OUT'} · Amount: ₹${amt.toLocaleString('en-IN')}${tx.notes ? ` (${tx.notes})` : ''}`,
        category: 'CASH',
        weight_grams: 0,
        amount: amt,
        paid_amount: isFlowIn ? amt : 0,
        due_amount: 0,
        payment_mode: isFlowIn ? 'CASH_IN' : 'CASH_OUT',
        raw_cash_ledger: tx,
      });
    });

    // 5. Process Invoices (Day 1 initial payment + compute live balances)
    invoices.forEach((inv: any) => {
      const formattedTime = inv.created_at
        ? new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '10:00 AM';

      const jsonMode = (inv.receipt_json_data?.transaction_type || inv.transaction_type || 'SELL').toUpperCase();
      const items = inv.receipt_json_data?.items || [];
      const netAmount = Number(inv.final_amount ?? inv.receipt_json_data?.netPayable ?? 0);

      const billPayments = (dbPaymentHistory || []).filter((p: any) =>
        (String(p.customer_billing_uuid || '').toLowerCase() === String(inv.customer_billing_uuid || inv.id || '').toLowerCase() ||
         String(p.billing_id || '').toLowerCase() === String(inv.id || '').toLowerCase())
      ).sort((a: any, b: any) => Number(a.installment_number || 1) - Number(b.installment_number || 1));

      const inst1 = billPayments.find((p: any) => Number(p.installment_number || 1) === 1);
      const latestPayment = billPayments.length > 0 ? billPayments[billPayments.length - 1] : null;

      const paidAmount = inst1
        ? Number(inst1.amount_paid)
        : Number(inv.receipt_json_data?.payment_history?.[0]?.amount ?? inv.receipt_json_data?.advancePaidAmount ?? inv.paid_amount ?? netAmount);

      const dueAmount = inst1 && inst1.remaining_due !== undefined && inst1.remaining_due !== null
        ? Number(inst1.remaining_due)
        : (inv.due_amount !== undefined && inv.due_amount !== null
            ? Number(inv.due_amount)
            : (inv.receipt_json_data?.balanceDueAmount !== undefined && inv.receipt_json_data?.balanceDueAmount !== null
                ? Number(inv.receipt_json_data.balanceDueAmount)
                : Math.max(0, netAmount - paidAmount)));

      const currentActiveDue = latestPayment && latestPayment.remaining_due !== undefined && latestPayment.remaining_due !== null
        ? Number(latestPayment.remaining_due)
        : (inv.due_amount !== undefined && inv.due_amount !== null
            ? Number(inv.due_amount)
            : Math.max(0, netAmount - Number(inv.paid_amount || paidAmount)));

      const currentTotalPaid = latestPayment
        ? billPayments.reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0)
        : Number(inv.paid_amount ?? paidAmount);

      inv.due_amount = currentActiveDue;
      inv.paid_amount = currentTotalPaid;

      const orderKey = String(inv.id || inv.receipt_json_data?.order_id || '').toLowerCase();
      const matchedDbOrder = (dbOrdersList || []).find((o: any) => String(o.id || o.order_id || '').toLowerCase() === orderKey);
      const isSubmitted = (matchedDbOrder?.submitted || inv.submitted || inv.receipt_json_data?.submitted || 'no').toLowerCase() === 'yes';
      const isOrderType = jsonMode === 'ORDER';
      const isStockDebited = !isOrderType || isSubmitted;

      const isSell = jsonMode === 'SELL' || jsonMode === 'EXCHANGE' || jsonMode === 'TRADE_IN' || isOrderType;

      if (isSell) {
        totalSalesValue += netAmount;
        newDuesCreated += dueAmount;
        totalSalesCash += paidAmount;
      }

      if (dueAmount === 0 && paidAmount > 0 && inv.created_at) {
        oldDuesCollected += (inv.receipt_json_data?.payment_history?.length > 1 ? paidAmount : 0);
      }

      items.forEach((item: any) => {
        const wt = Number(item.weight_grams || 0);
        const isGold = (item.metal_type || '').toUpperCase() !== 'SILVER';

        if (item.item_type === 'SELL') {
          if (isStockDebited) {
            if (isGold) totalGoldWeightSold += wt;
            else totalSilverWeightSold += wt;
          }
          makingChargesProfit += Number(item.making_charges_per_gram || 0) * wt;
        } else if (item.item_type === 'BUY' || item.item_type === 'EXCHANGE_BUY') {
          if (isGold) totalGoldWeightBought += wt;
          else totalSilverWeightBought += wt;
          totalScrapPayout += Number(item.total_price || 0);
        }
      });

      const sellItems = items.filter((it: any) => it.item_type === 'SELL');
      const buyItems = items.filter((it: any) => it.item_type === 'BUY' || it.item_type === 'EXCHANGE_BUY');
      
      const allScrapItems = [
        ...buyItems,
        ...(jsonMode === 'BUY' ? items.filter((it: any) => !buyItems.includes(it)) : [])
      ];

      if (billingRecordsToday.length === 0) {
        allScrapItems.forEach((it: any) => {
          const wt = Number(it.weight_grams || it.item_weight || it.gross_weight_grams || 0);
          const purity = Number(it.purity_percentage || it.purity || it.touch_percentage || it.item_quality_percentage || 100);
          const pureWt = round3Decimals(wt * (purity / 100));
          const metal = (it.metal_type || inv.metal_type || 'GOLD').toUpperCase();
          const payout = Number(it.total_price || it.total_item_price || it.line_total || it.price || 0);

          oldMetalVaultItems.push({
            id: `scrap-${inv.customer_billing_uuid || inv.billing_id || inv.id}-${it.id || Math.random()}`,
            customer_name: inv.customer_name || 'Customer',
            customer_phone: inv.customer_phone || '-',
            bill_date: inv.bill_date || inv.receipt_json_data?.bill_date || (inv.created_at ? inv.created_at.split('T')[0] : targetDate),
            created_at: inv.created_at,
            item_name: it.product_name || it.item_name || `${metal.includes('SILVER') ? 'Silver' : 'Gold'} Scrap`,
            metal_type: metal.includes('SILVER') ? 'SILVER' : 'GOLD',
            gross_weight: wt,
            purity_percentage: purity,
            pure_weight: pureWt,
            payout_amount: payout,
          });
        });
      }

      let detailsText = `${inv.product_name || 'Jewellery'} · Weight: ${inv.weight_grams || 0}g`;
      if (sellItems.length > 0 && buyItems.length > 0) {
        const sellStr = sellItems.map((i: any) => `${i.product_name || 'Item'} (${i.weight_grams || 0}g)`).join(', ');
        const buyStr = buyItems.map((i: any) => `${i.product_name || 'Scrap'} (${i.weight_grams || 0}g)`).join(', ');
        detailsText = `📦 Sold: ${sellStr} | ⚖️ Bought: ${buyStr}`;
      } else if (sellItems.length > 0 && isOrderType) {
        const sellStr = sellItems.map((i: any) => `${i.product_name || 'Item'} (${i.weight_grams || 0}g)`).join(', ');
        detailsText = `📦 Custom Order: ${sellStr}${isSubmitted ? ' (Delivered to Customer)' : ' (Pending Delivery)'}`;
      }

      const totalBuyCredit = Number(inv.total_buy_credit || inv.receipt_json_data?.totalBuyCredit || inv.receipt_json_data?.total_buy_credit || 0);
      const totalSellValue = Number(inv.total_sell_value || inv.receipt_json_data?.totalSellValue || inv.receipt_json_data?.total_sell_value || 0);

      const isOutflow = 
        String(inv.flow_type || inv.receipt_json_data?.flow_type || '').toUpperCase() === 'OUT' ||
        Boolean(inv.shop_pays_customer || inv.receipt_json_data?.shop_pays_customer) ||
        (totalBuyCredit > totalSellValue && totalBuyCredit > 0);

      const matchesDeliveryOnTarget = isOrderType && isSubmitted && matchedDbOrder?.item_submitted_at && matchesDateFilterIST(matchedDbOrder.item_submitted_at, targetDate, startDate, endDate);
      const effectiveCreatedAt = matchesDeliveryOnTarget
        ? (matchedDbOrder.item_submitted_at || matchedDbOrder.updated_at)
        : (inv.created_at || (inv.bill_date ? toISTTimestamp(inv.bill_date) : getNowISTISO()));

      logBookTimeline.push({
        id: `log-inv-${inv.id}`,
        time: formattedTime,
        created_at: effectiveCreatedAt,
        bill_date: inv.bill_date || inv.receipt_json_data?.bill_date || (inv.created_at ? String(inv.created_at).split('T')[0] : null),
        type: jsonMode === 'TRADE_IN' ? 'EXCHANGE' : jsonMode,
        title: inv.customer_name || 'Walk-in Customer',
        details: detailsText,
        category: inv.metal_type || 'GOLD',
        weight_grams: Number(inv.weight_grams || 0),
        amount: netAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        current_due: currentActiveDue,
        current_paid: currentTotalPaid,
        latest_due_amount: currentActiveDue,
        latest_paid_amount: currentTotalPaid,
        submitted: isSubmitted ? 'yes' : 'no',
        stock_debited: isStockDebited,
        payment_mode: inv.receipt_json_data?.paymentType || (dueAmount <= 0.01 ? 'FULL' : 'PARTIAL'),
        customer_phone: inv.customer_phone,
        flow_type: isOutflow ? 'OUT' : 'IN',
        direction: isOutflow ? 'SHOP_TO_CUSTOMER' : 'CUSTOMER_TO_SHOP',
        raw_invoice: inv,
      });
    });

    // 6. Process Subsequent Due Settlements & Installments
    (dbPaymentHistory || []).forEach((p: any) => {
      if (Number(p.installment_number || 1) <= 1) return;

      const pDate = p.bill_date || p.payment_date;
      if (!matchesDateFilterIST(pDate, targetDate, startDate, endDate)) return;

      const formattedTime = p.created_at
        ? new Date(p.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '12:00 PM';

      const matchedBill = (dbCustomerBills || []).find((b: any) => 
        String(b.customer_billing_uuid || '').toLowerCase() === String(p.customer_billing_uuid || '').toLowerCase() ||
        String(b.billing_id || '').toLowerCase() === String(p.billing_id || '').toLowerCase()
      );

      const custName = matchedBill?.customer_name || 'Customer';
      const billId = matchedBill?.billing_id || p.billing_id || 'BILL';
      const amt = Number(p.amount_paid || 0);
      const remainingDue = Number(p.remaining_due || 0);
      const isCleared = remainingDue <= 0.01;

      totalSalesCash += amt;
      oldDuesCollected += amt;

      logBookTimeline.push({
        id: `log-pay-${p.id || p.customer_billing_uuid || Math.random()}-${p.installment_number}`,
        time: formattedTime,
        created_at: p.created_at || (p.bill_date ? toISTTimestamp(p.bill_date) : getNowISTISO()),
        bill_date: pDate ? String(pDate).split('T')[0] : targetDate,
        type: 'SETTLEMENT',
        title: custName,
        details: `💵 Due Payment (Installment #${p.installment_number}) · Bill #${billId}${p.notes ? ` (${p.notes})` : ''}`,
        category: (matchedBill?.metal_type || 'GOLD').toUpperCase(),
        weight_grams: 0,
        amount: amt,
        paid_amount: amt,
        due_amount: remainingDue,
        current_due: remainingDue,
        current_paid: amt,
        payment_status: isCleared ? 'FULL' : 'PARTIAL',
        payment_mode: p.payment_mode || 'CASH',
        customer_phone: matchedBill?.customer_phone || '',
        flow_type: 'IN',
        direction: 'CUSTOMER_TO_SHOP',
        raw_payment: p,
      });
    });

    // Deduplicate
    const seenTimelineIds = new Set<string>();
    const deduplicatedTimeline: any[] = [];
    logBookTimeline.forEach((item: any) => {
      const dedupKey = String(item.id || `${item.type}_${item.created_at}_${item.amount}`);
      if (!seenTimelineIds.has(dedupKey)) {
        seenTimelineIds.add(dedupKey);
        deduplicatedTimeline.push(item);
      }
    });

    deduplicatedTimeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    deduplicatedTimeline.forEach((item, index) => {
      item.sNo = index + 1;
      const isFullyPaid = Number(item.due_amount || 0) <= 0.01 || (Number(item.paid_amount || 0) >= Number(item.amount || 0) && Number(item.amount || 0) > 0);
      if (item.type !== 'SETTLEMENT') {
        item.payment_status = isFullyPaid ? 'FULL' : 'PARTIAL';
      }
      if (isFullyPaid) {
        item.due_amount = 0;
      }
    });

    // Dynamic cash & opening balances
    const { totalCash: liveClosingCash } = await calculateDynamicCashBalance(targetDate === 'all' ? undefined : targetDate);
    let openingCash = liveClosingCash;
    let openingGold = 0;
    let openingSilver = 0;

    if (targetDate !== 'all') {
      const yesterdayObj = new Date(`${targetDate}T12:00:00Z`);
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterdayStr = toISTDateOnly(yesterdayObj);
      const { totalCash: prevDayCash } = await calculateDynamicCashBalance(yesterdayStr);
      openingCash = prevDayCash;

      try {
        const { goldStockGrams, silverStockGrams } = await getHistoricalInventoryStock(yesterdayStr);
        openingGold = goldStockGrams;
        openingSilver = silverStockGrams;
      } catch (e) {
        console.warn('⚠️ Error fetching historical inventory stock for opening:', e);
      }
    }

    const openingRecord = await getOrInitOpeningRecord(
      targetDate,
      { goldGrams: openingGold, silverGrams: openingSilver, cashAmount: Number(openingCash.toFixed(2)) },
      { goldGrams: 0, silverGrams: 0 }
    );

    const dayBookStockSummary = [
      {
        category: 'Gold Showcase Stock',
        openingWeight: Number(openingRecord.openingGoldGrams.toFixed(3)),
        loadedWeight: Number(openingRecord.loadedGoldGrams.toFixed(3)),
      },
      {
        category: 'Silver Showcase Stock',
        openingWeight: Number(openingRecord.openingSilverGrams.toFixed(3)),
        loadedWeight: Number(openingRecord.loadedSilverGrams.toFixed(3)),
      },
    ];

    const cashSummary = {
      openingCash: Number(openingRecord.openingCashAmount.toFixed(2)),
      salesCashCollected: totalSalesCash,
      oldDuesCollected,
      scrapPayout: totalScrapPayout,
      dailyExpenses: 0,
      expectedClosingCash: Number(liveClosingCash.toFixed(2)),
      current_cash: Number(liveClosingCash.toFixed(2)),
      upiCollected: totalSalesUPI,
      cardCollected: totalSalesCard,
    };

    const scrapSummary = {
      oldGoldBoughtWeight: Number(goldBoughtGross.toFixed(3)),
      oldSilverBoughtWeight: Number(silverBoughtGross.toFixed(3)),
      totalScrapPayout: totalScrapPayoutFromRecords || totalScrapPayout,
    };

    const udhaariSummary = {
      newDuesCreated,
      oldDuesCollected,
      karigarGoldIssued: 0,
      karigarGoldReceived: 0,
    };

    return res.json({
      success: true,
      date: targetDate,
      section,
      logBookTimeline: deduplicatedTimeline,
      cashSummary,
      scrapSummary,
      oldMetalVaultItems,
      udhaariSummary,
      cashLedgerRecords: cashLedgerToday || [],
      dayBookStockSummary,
      openingRecord,
      billingActivitySummary: {
        overallMetalPuritySummary,
      },
    });
  } catch (err: any) {
    console.error('Error fetching day book logbook:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
