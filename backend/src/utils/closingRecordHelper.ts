import { supabase } from '../config/supabase';
import { getTodayISTString, calculateDynamicCashBalance } from './cashLedgerHelper';

/**
 * Generates a complete End-of-Day closing snapshot for a given date.
 * Fills all 3 gaps:
 *   Gap 1 — Old Metal Vault running balance (dynamic from billing_sell_buy_records)
 *   Gap 2 — Live karigar/workshop metal register (dynamic from worker_transactions)
 *   Gap 3 — EOD summary report (dynamic from cash_transaction_ledger)
 */
export async function generateClosingRecord(targetDate?: string): Promise<any> {
  const date = targetDate || getTodayISTString();
  const dateEndOfDayISO = `${date}T23:59:59.999Z`;

  // ─────────────────────────────────────────────────────────────
  // 1. CASH SUMMARY (100% Dynamic from cash_transaction_ledger)
  // ─────────────────────────────────────────────────────────────
  const { totalCash: dynamicCashInDrawer } = await calculateDynamicCashBalance(date);

  const { data: allCashTxns } = await supabase
    .from('cash_transaction_ledger')
    .select('transaction_cash_total, flow_type, transaction_type, created_at, cash_history(date)');

  let cashLoaded = 0, salesIn = 0, scrapOut = 0, loansOut = 0, loansIn = 0, workerOut = 0, workerIn = 0, exchangeIn = 0;
  let targetDateTxnCount = 0;

  (allCashTxns || []).forEach((t: any) => {
    const rowDate = t.cash_history?.date || (t.created_at ? String(t.created_at).split('T')[0] : '');
    if (rowDate === date) {
      targetDateTxnCount += 1;
      const amt = Number(t.transaction_cash_total || 0);
      const type = (t.transaction_type || '').toUpperCase();
      const flow = (t.flow_type || '').toUpperCase();
      if (type === 'LOADING') cashLoaded += amt;
      else if (type === 'SELL' && flow === 'IN') salesIn += amt;
      else if (type === 'BUY' && flow === 'OUT') scrapOut += amt;
      else if (type === 'FINANCE' && flow === 'OUT') loansOut += amt;
      else if (type === 'FINANCE' && flow === 'IN') loansIn += amt;
      else if (type === 'WORKER' && flow === 'OUT') workerOut += amt;
      else if (type === 'WORKER' && flow === 'IN') workerIn += amt;
      else if (type === 'EXCHANGE' && flow === 'IN') exchangeIn += amt;
    }
  });

  const cashSummary = {
    date,
    cash_in_drawer: dynamicCashInDrawer,
    cash_loaded_today: Number(cashLoaded.toFixed(2)),
    sales_cash_in: Number(salesIn.toFixed(2)),
    exchange_cash_in: Number(exchangeIn.toFixed(2)),
    scrap_purchase_cash_out: Number(scrapOut.toFixed(2)),
    loans_issued_out: Number(loansOut.toFixed(2)),
    loans_repaid_in: Number(loansIn.toFixed(2)),
    worker_wages_out: Number(workerOut.toFixed(2)),
    worker_cash_in: Number(workerIn.toFixed(2)),
    total_transactions: targetDateTxnCount,
  };

  // ─────────────────────────────────────────────────────────────
  // 2. SHOWCASE STOCK (from inventory_products)
  // ─────────────────────────────────────────────────────────────
  const { data: products } = await supabase
    .from('inventory_products')
    .select('id, item_name, item_type, current_stock_weight, sell_count, sold_quantity')
    .order('item_type', { ascending: true });

  let totalGoldShowcase = 0;
  let totalSilverShowcase = 0;
  const showcaseItems: any[] = [];

  (products || []).forEach((p: any) => {
    const metal = (p.item_type || 'GOLD').toUpperCase();
    const wt = Number(p.current_stock_weight || 0);
    showcaseItems.push({
      id: p.id,
      name: p.item_name,
      metal_type: metal,
      stock_weight_grams: wt,
      sell_count: Number(p.sell_count || 0),
      sold_grams: Number(p.sold_quantity || 0),
    });
    if (metal.includes('SILVER')) totalSilverShowcase += wt;
    else totalGoldShowcase += wt;
  });

  // ─────────────────────────────────────────────────────────────
  // 3. GAP 1 — OLD METAL VAULT BALANCE (Dynamic up to target date from billing_sell_buy_records BUY)
  // ─────────────────────────────────────────────────────────────
  const { data: scrapRecords } = await supabase
    .from('billing_sell_buy_records')
    .select('metal_type, only_metal_weight, pure_metal_weight, item_quality_percentage, bill_date, created_at')
    .eq('transaction_type', 'BUY');

  let vaultGoldNetGrams = 0;
  let vaultGoldPureGrams = 0;
  let vaultSilverNetGrams = 0;
  let vaultSilverPureGrams = 0;
  let totalScrapEntries = 0;

  (scrapRecords || []).forEach((r: any) => {
    const rowDate = r.bill_date || (r.created_at ? String(r.created_at).split('T')[0] : '');
    if (rowDate && rowDate > date) return;

    totalScrapEntries += 1;
    const metal = (r.metal_type || 'GOLD').toUpperCase();
    const net = Number(r.only_metal_weight || 0);
    const pure = Number(r.pure_metal_weight || 0);
    if (metal.includes('SILVER')) {
      vaultSilverNetGrams += net;
      vaultSilverPureGrams += pure;
    } else {
      vaultGoldNetGrams += net;
      vaultGoldPureGrams += pure;
    }
  });

  const vaultSummary = {
    gold_net_grams: Number(vaultGoldNetGrams.toFixed(3)),
    gold_pure_grams: Number(vaultGoldPureGrams.toFixed(3)),
    silver_net_grams: Number(vaultSilverNetGrams.toFixed(3)),
    silver_pure_grams: Number(vaultSilverPureGrams.toFixed(3)),
    total_scrap_entries: totalScrapEntries,
    note: `Running dynamic total of scrap metal purchased on or before ${date}`,
  };

  // ─────────────────────────────────────────────────────────────
  // 4. GAP 2 — KARIGAR WORKSHOP METAL REGISTER (Dynamic up to target date)
  // ─────────────────────────────────────────────────────────────
  const { data: workerTxns } = await supabase
    .from('worker_transactions')
    .select('worker_id, direction, category, weight_grams, fine_weight_grams, item_name, created_at')
    .in('category', ['GOLD', 'SILVER', 'ORNAMENT'])
    .lte('created_at', dateEndOfDayISO);

  const { data: workers } = await supabase
    .from('workers')
    .select('id, name');

  const workerNameMap: Record<string, string> = {};
  (workers || []).forEach((w: any) => { workerNameMap[w.id] = w.name; });

  const karigarRegister: Record<string, any> = {};

  (workerTxns || []).forEach((t: any) => {
    const wId = t.worker_id;
    if (!karigarRegister[wId]) {
      karigarRegister[wId] = {
        worker_id: wId,
        worker_name: workerNameMap[wId] || wId,
        gold_grams_with_karigar: 0,
        silver_grams_with_karigar: 0,
        transactions: [],
      };
    }
    const wt = Number(t.weight_grams || 0);
    const metal = (t.category || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';
    const isOut = (t.direction || '').toUpperCase() === 'OUTGOING'; // Admin → Worker
    const delta = isOut ? wt : -wt;

    if (metal === 'SILVER') {
      karigarRegister[wId].silver_grams_with_karigar = Math.max(0,
        Number((karigarRegister[wId].silver_grams_with_karigar + delta).toFixed(3))
      );
    } else {
      karigarRegister[wId].gold_grams_with_karigar = Math.max(0,
        Number((karigarRegister[wId].gold_grams_with_karigar + delta).toFixed(3))
      );
    }
    karigarRegister[wId].transactions.push({
      direction: t.direction,
      metal_type: metal,
      weight_grams: wt,
      item_name: t.item_name,
      date: t.created_at ? String(t.created_at).split('T')[0] : '',
    });
  });

  const karigarList = Object.values(karigarRegister);
  let totalGoldAtKarigars = 0;
  let totalSilverAtKarigars = 0;
  karigarList.forEach((k: any) => {
    totalGoldAtKarigars += k.gold_grams_with_karigar;
    totalSilverAtKarigars += k.silver_grams_with_karigar;
  });

  // ─────────────────────────────────────────────────────────────
  // 5. GAP 3 — TODAY'S BILLS & UDHAARI
  // ─────────────────────────────────────────────────────────────
  const { data: todayBills } = await supabase
    .from('customer_billing')
    .select('billing_id, bill_type, customer_name, total_amount, paid_amount, due_amount, payment_status, created_at')
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`);

  const { data: allUdhaari } = await supabase
    .from('customer_billing')
    .select('billing_id, customer_name, customer_phone, total_amount, paid_amount, due_amount, payment_status, created_at')
    .gt('due_amount', 0)
    .neq('payment_status', 'PAID')
    .order('due_amount', { ascending: false });

  let todaySellCount = 0, todayBuyCount = 0, todayOrderCount = 0, todayExchangeCount = 0;
  let todayTotalSales = 0, todayTotalScrapPaid = 0;

  (todayBills || []).forEach((b: any) => {
    const bt = (b.bill_type || '').toUpperCase();
    if (bt === 'SELL') { todaySellCount++; todayTotalSales += Number(b.total_amount || 0); }
    else if (bt === 'BUY') { todayBuyCount++; todayTotalScrapPaid += Number(b.total_amount || 0); }
    else if (bt === 'ORDER') { todayOrderCount++; }
    else if (bt === 'EXCHANGE') { todayExchangeCount++; }
  });

  const totalUdhaariDue = (allUdhaari || []).reduce((s: number, b: any) => s + Number(b.due_amount || 0), 0);

  const billsSummary = {
    date,
    sell_count: todaySellCount,
    buy_count: todayBuyCount,
    order_count: todayOrderCount,
    exchange_count: todayExchangeCount,
    total_sales_amount: Number(todayTotalSales.toFixed(2)),
    total_scrap_paid: Number(todayTotalScrapPaid.toFixed(2)),
    total_bills_today: (todayBills || []).length,
  };

  const udhaariList = (allUdhaari || []).map((b: any) => ({
    billing_id: b.billing_id,
    customer_name: b.customer_name,
    customer_phone: b.customer_phone,
    total_amount: Number(b.total_amount || 0),
    paid_amount: Number(b.paid_amount || 0),
    due_amount: Number(b.due_amount || 0),
    bill_date: b.created_at ? String(b.created_at).split('T')[0] : '',
  }));

  // ─────────────────────────────────────────────────────────────
  // 5. PLEDGE FINANCE REGISTER (Girvi Gold/Silver held as collateral)
  // ─────────────────────────────────────────────────────────────
  const { data: pledgeLoans } = await supabase
    .from('finance')
    .select('debt_category, item_weight, item_deduction_weight, touch, pure_metal_weight, customer_debt_money, customer_name, customer_phone, debt_date, payment_status')
    .in('payment_status', ['OPEN', 'PARTIAL']);

  let pledgeGoldGrams = 0;
  let pledgeSilverGrams = 0;
  let pledgeTotalCashOutstanding = 0;
  const pledgeList: any[] = [];

  (pledgeLoans || []).forEach((loan: any) => {
    const metal = (loan.debt_category || 'GOLD').toUpperCase();
    const netWeight = Number(loan.item_weight || 0) - Number(loan.item_deduction_weight || 0);
    const pureWeight = Number(loan.pure_metal_weight || 0);
    const principal = Number(loan.customer_debt_money || 0);

    if (metal === 'SILVER') {
      pledgeSilverGrams += netWeight;
    } else {
      pledgeGoldGrams += netWeight;
    }
    pledgeTotalCashOutstanding += principal;
    pledgeList.push({
      customer_name: loan.customer_name,
      customer_phone: loan.customer_phone,
      metal_type: metal,
      item_weight_grams: Number(netWeight.toFixed(3)),
      pure_metal_weight: Number(pureWeight.toFixed(3)),
      principal_outstanding: principal,
      debt_date: loan.debt_date,
      status: loan.payment_status,
    });
  });

  const pledgeRegister = {
    total_loans: (pledgeLoans || []).length,
    gold_collateral_grams: Number(pledgeGoldGrams.toFixed(3)),
    silver_collateral_grams: Number(pledgeSilverGrams.toFixed(3)),
    total_cash_outstanding: Number(pledgeTotalCashOutstanding.toFixed(2)),
    loans: pledgeList,
  };

  // ─────────────────────────────────────────────────────────────
  // 6. ACTIVE ORDERS METAL (Work In Progress at shop/karigars)
  // ─────────────────────────────────────────────────────────────
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, customer_name, item_name, metal_type, gross_weight_grams, net_weight_grams, fine_weight_grams, status, assigned_worker_name, created_at')
    .not('status', 'in', '("DELIVERED","CANCELLED","RETURNED")');

  let orderGoldGrams = 0;
  let orderSilverGrams = 0;
  const activeOrdersList: any[] = [];

  (activeOrders || []).forEach((order: any) => {
    const metal = (order.metal_type || 'GOLD').toUpperCase();
    const wt = Number(order.gross_weight_grams || 0);
    if (metal === 'SILVER') {
      orderSilverGrams += wt;
    } else {
      orderGoldGrams += wt;
    }
    activeOrdersList.push({
      order_id: order.id,
      customer_name: order.customer_name,
      item_name: order.item_name,
      metal_type: metal,
      gross_weight_grams: Number(wt.toFixed(3)),
      status: order.status,
      assigned_worker: order.assigned_worker_name || 'Unassigned',
    });
  });

  const activeOrdersMetal = {
    total_active_orders: (activeOrders || []).length,
    gold_in_orders_grams: Number(orderGoldGrams.toFixed(3)),
    silver_in_orders_grams: Number(orderSilverGrams.toFixed(3)),
    orders: activeOrdersList,
  };

  // ─────────────────────────────────────────────────────────────
  // 7. TOTAL METAL POSITION (Gold + Silver across ALL 5 locations)
  //    = Showcase + Scrap Vault + At Karigars + Pledged Girvi + Active Orders
  // ─────────────────────────────────────────────────────────────
  const totalGoldPosition = Number((
    totalGoldShowcase +
    vaultGoldNetGrams +
    totalGoldAtKarigars +
    pledgeGoldGrams +
    orderGoldGrams
  ).toFixed(3));

  const totalSilverPosition = Number((
    totalSilverShowcase +
    vaultSilverNetGrams +
    totalSilverAtKarigars +
    pledgeSilverGrams +
    orderSilverGrams
  ).toFixed(3));

  const metalPositionSummary = {
    gold: {
      showcase_grams: Number(totalGoldShowcase.toFixed(3)),
      vault_scrap_grams: Number(vaultGoldNetGrams.toFixed(3)),
      vault_pure_grams: Number(vaultGoldPureGrams.toFixed(3)),
      at_karigars_grams: Number(totalGoldAtKarigars.toFixed(3)),
      pledged_girvi_grams: Number(pledgeGoldGrams.toFixed(3)),
      active_orders_grams: Number(orderGoldGrams.toFixed(3)),
      total_gold_grams: totalGoldPosition,
    },
    silver: {
      showcase_grams: Number(totalSilverShowcase.toFixed(3)),
      vault_scrap_grams: Number(vaultSilverNetGrams.toFixed(3)),
      vault_pure_grams: Number(vaultSilverPureGrams.toFixed(3)),
      at_karigars_grams: Number(totalSilverAtKarigars.toFixed(3)),
      pledged_girvi_grams: Number(pledgeSilverGrams.toFixed(3)),
      active_orders_grams: Number(orderSilverGrams.toFixed(3)),
      total_silver_grams: totalSilverPosition,
    },
  };

  return {
    generated_at: new Date().toISOString(),
    record_date: date,
    cash: cashSummary,
    showcase_stock: { items: showcaseItems, total_gold_grams: Number(totalGoldShowcase.toFixed(3)), total_silver_grams: Number(totalSilverShowcase.toFixed(3)) },
    vault: vaultSummary,
    karigar_register: { karigars: karigarList, total_gold_at_karigars: Number(totalGoldAtKarigars.toFixed(3)), total_silver_at_karigars: Number(totalSilverAtKarigars.toFixed(3)) },
    pledge_register: pledgeRegister,
    active_orders_metal: activeOrdersMetal,
    bills: billsSummary,
    udhaari: { total_due: Number(totalUdhaariDue.toFixed(2)), customers: udhaariList },
    metal_position: metalPositionSummary,
  };
}

/**
 * Saves (upserts) the closing record for a date to daily_closing_records table
 */
export async function saveClosingRecord(date: string, data: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('daily_closing_records')
      .upsert([{
        record_date: date,
        closing_data: data,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'record_date' });

    if (error) {
      console.warn('⚠️ Error saving closing record:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetches the saved closing record for a specific date
 */
export async function getClosingRecord(date: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('daily_closing_records')
      .select('*')
      .eq('record_date', date)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Lists all saved closing records (most recent first)
 */
export async function listClosingRecords(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('daily_closing_records')
      .select('id, record_date, created_at, updated_at')
      .order('record_date', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}
