import { supabase } from './config/supabase';

function matchesDateFilterIST(dateStr: string | null | undefined, targetDate: string) {
  if (!dateStr) return false;
  const istDate = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return istDate === targetDate;
}

const round3Decimals = (val: number) => Number(val.toFixed(3));

async function verifyOrderKpiCard() {
  const targetDate = '2026-08-25'; // Today's IST Date
  console.log(`=== TESTING ENHANCED ORDER KPI CARD BACKEND LOGIC FOR DATE: ${targetDate} ===\n`);

  // 1. Fetch live DB tables
  const [{ data: dbOrdersList }, { data: dbCustomerBills }, { data: dbBillingRecords }] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: true }),
    supabase.from('customer_billing').select('*').order('created_at', { ascending: true }),
    supabase.from('billing_sell_buy_records').select('*').order('created_at', { ascending: true }),
  ]);

  const matchedCustomerBills = (dbCustomerBills || []).filter((b) => matchesDateFilterIST(b.created_at, targetDate));

  const matchedBillingRecords = (dbBillingRecords || []).filter((r: any) => {
    const mode = (r.billing_mode || '').toUpperCase();
    const txType = (r.transaction_type || '').toUpperCase();

    let isSub = true;
    let effectiveDate = r.created_at;

    if (mode === 'ORDER' && txType === 'SELL') {
      if (r.is_item_submitted !== undefined && r.is_item_submitted !== null && String(r.is_item_submitted).trim() !== '') {
        isSub = String(r.is_item_submitted).toLowerCase() === 'yes';
      } else {
        const orderKey = String(r.customer_billing_uuid || r.billing_id || '').toLowerCase();
        const matchedOrd = (dbOrdersList || []).find((o: any) => String(o.id || o.order_id || '').toLowerCase() === orderKey);
        isSub = (matchedOrd?.submitted || 'no').toLowerCase() === 'yes';
        effectiveDate = matchedOrd?.item_submitted_at || matchedOrd?.updated_at || r.created_at;
      }
    }

    if (!isSub) return false;
    return matchesDateFilterIST(effectiveDate, targetDate);
  });

  const billTypeMap = new Map<string, string>();
  matchedCustomerBills.forEach((b: any) => {
    const type = (b.bill_type || '').toUpperCase();
    const uuid = String(b.customer_billing_uuid || b.billing_id || '');
    if (uuid) billTypeMap.set(uuid, type);
  });

  const uuidToBillingIdMap = new Map<string, string>();
  matchedCustomerBills.forEach((b: any) => {
    const u = String(b.customer_billing_uuid || '').toLowerCase();
    const idStr = String(b.billing_id || b.id || '').toLowerCase();
    if (u && idStr) {
      uuidToBillingIdMap.set(u, idStr);
      uuidToBillingIdMap.set(idStr, u);
    }
  });

  const getCanonicalKey = (rawId: string) => {
    const lower = String(rawId || '').toLowerCase();
    return uuidToBillingIdMap.get(lower) || lower;
  };

  const billMap = new Map<string, { mode: string; items: any[]; billData?: any }>();

  matchedBillingRecords.forEach((r: any) => {
    const rawUuid = String(r.customer_billing_uuid || r.billing_id || r.id || '');
    if (!rawUuid) return;
    const uuid = getCanonicalKey(rawUuid);
    let mode = (r.billing_mode || (r.customer_billing_uuid ? billTypeMap.get(r.customer_billing_uuid) : '') || 'SELL').toUpperCase();
    if (mode === 'EXCHANGE') mode = 'TRADE_IN';

    if (!billMap.has(uuid)) {
      billMap.set(uuid, { mode, items: [] });
    }
    billMap.get(uuid)!.items.push(r);
  });

  matchedCustomerBills.forEach((b: any) => {
    const rawUuid = String(b.customer_billing_uuid || b.billing_id || b.id || '');
    if (!rawUuid) return;
    const uuid = getCanonicalKey(rawUuid);
    let mode = (b.bill_type || 'SELL').toUpperCase();
    if (mode === 'EXCHANGE') mode = 'TRADE_IN';

    if (!billMap.has(uuid)) {
      billMap.set(uuid, { mode, items: [], billData: b });
    } else {
      billMap.get(uuid)!.billData = b;
    }

    const existingEntry = billMap.get(uuid)!;
    const hasSellItem = existingEntry.items.some((it) => (it.transaction_type || it.item_type || '').toUpperCase() === 'SELL');

    // If SELL ornament item is missing and mode === 'ORDER', extract from receipt_json_data or dbOrdersList
    if (!hasSellItem && mode === 'ORDER') {
      if (b.receipt_json_data && Array.isArray(b.receipt_json_data.items)) {
        const sellJsonItems = b.receipt_json_data.items.filter((it: any) => (it.item_type || 'SELL').toUpperCase() === 'SELL');
        sellJsonItems.forEach((it: any) => {
          existingEntry.items.push({
            transaction_type: 'SELL',
            metal_type: (it.metal_type || b.metal_type || 'GOLD').toUpperCase(),
            item_weight: Number(it.weight_grams || it.item_weight || 0),
            only_metal_weight: Number(it.net_weight_grams || it.weight_grams || 0),
            pure_metal_weight: Number(it.fine_weight_grams || it.weight_grams || 0),
          });
        });
      }

      const stillHasSellItem = existingEntry.items.some((it) => (it.transaction_type || it.item_type || '').toUpperCase() === 'SELL');
      if (!stillHasSellItem) {
        const orderKey = String(uuid).toLowerCase();
        const matchedOrd = (dbOrdersList || []).find((o: any) => 
          String(o.id || o.order_id || '').toLowerCase() === orderKey ||
          (b.billing_id && String(o.id || o.order_id || '').toLowerCase() === String(b.billing_id).toLowerCase())
        );
        if (matchedOrd) {
          const ordAny = matchedOrd as any;
          existingEntry.items.push({
            transaction_type: 'SELL',
            metal_type: (ordAny.metal_type || 'GOLD').toUpperCase(),
            item_weight: Number(ordAny.gross_weight_grams || ordAny.net_weight_grams || 0),
            only_metal_weight: Number(ordAny.net_weight_grams || ordAny.gross_weight_grams || 0),
            pure_metal_weight: Number(ordAny.fine_weight_grams || ordAny.net_weight_grams || 0),
          });
        }
      }
    }
  });

  const createDetailedWeightTracker = () => ({
    goldSoldGross: 0,
    goldSoldNet: 0,
    goldSoldPure: 0,
    goldBoughtGross: 0,
    goldBoughtNet: 0,
    goldBoughtPure: 0,
    silverSoldGross: 0,
    silverSoldNet: 0,
    silverSoldPure: 0,
    silverBoughtGross: 0,
    silverBoughtNet: 0,
    silverBoughtPure: 0,
    sellsCount: 0,
    buysCount: 0,
  });

  const orderTracker = createDetailedWeightTracker();
  let finalOrderCount = 0;

  const recordItemToTracker = (r: any, tracker: any) => {
    const txType = (r.transaction_type || r.item_type || '').toUpperCase();
    const metal = (r.metal_type || 'GOLD').toUpperCase();
    const gross = Number(r.item_weight) || 0;
    const net = Number(r.only_metal_weight ?? Math.max(0, gross - (Number(r.deduction_weight) || 0)));
    const pure = Number(r.pure_metal_weight) || net;

    if (txType === 'SELL') {
      tracker.sellsCount++;
      if (metal.includes('SILVER')) {
        tracker.silverSoldGross += gross;
        tracker.silverSoldNet += net;
        tracker.silverSoldPure += pure;
      } else {
        tracker.goldSoldGross += gross;
        tracker.goldSoldNet += net;
        tracker.goldSoldPure += pure;
      }
    } else {
      tracker.buysCount++;
      if (metal.includes('SILVER')) {
        tracker.silverBoughtGross += gross;
        tracker.silverBoughtNet += net;
        tracker.silverBoughtPure += pure;
      } else {
        tracker.goldBoughtGross += gross;
        tracker.goldBoughtNet += net;
        tracker.goldBoughtPure += pure;
      }
    }
  };

  console.log(`=== DETAILED BREAKDOWN WITH SELL ITEM ENHANCEMENT ===`);
  billMap.forEach(({ mode, items, billData }, uuid) => {
    if (mode === 'ORDER') {
      finalOrderCount++;
      const custName = billData?.customer_name || 'Customer';
      console.log(`\n🛍️ ORDER BILL #${finalOrderCount} [Key: ${uuid}] - Customer: ${custName}`);
      console.log(`   Line Items Count: ${items.length}`);

      const orderKey = String(uuid).toLowerCase();
      const matchedOrd = (dbOrdersList || []).find((o: any) => String(o.id || o.order_id || '').toLowerCase() === orderKey);
      const isSubmitted = (matchedOrd?.submitted || 'no').toLowerCase() === 'yes';
      console.log(`   Submitted to Cust: ${isSubmitted ? 'YES (Delivered)' : 'NO (Pending)'}`);

      items.forEach((it, idx) => {
        const itemType = (it.item_type || it.transaction_type || '').toUpperCase();
        const metal = (it.metal_type || 'GOLD').toUpperCase();
        const wt = Number(it.item_weight || it.weight_grams || 0);

        if (itemType === 'BUY' || itemType === 'EXCHANGE_BUY') {
          recordItemToTracker(it, orderTracker);
          console.log(`   -> [Item ${idx + 1}] ⚖️ ORDER-BUY (Scrap Received): ${metal} ${wt}g (${it.item_name || 'Scrap'}) - COUNTED IMMEDIATELY`);
        } else if (itemType === 'SELL') {
          if (isSubmitted) {
            recordItemToTracker(it, orderTracker);
            console.log(`   -> [Item ${idx + 1}] 📦 ORDER-SELL (Finished Ornament): ${metal} ${wt}g (${it.item_name || 'Ornament'}) - COUNTED ON DELIVERY`);
          } else {
            console.log(`   -> [Item ${idx + 1}] 🛡️ ORDER-SELL (Pending Delivery): ${metal} ${wt}g (${it.item_name || 'Ornament'}) - STOCK PRESERVED`);
          }
        }
      });
    }
  });

  console.log(`\n======================================================`);
  console.log(`🎯 ENHANCED ORDER KPI CARD RESULTS FOR TODAY (${targetDate}):`);
  console.log(`   - Order Bills Count: ${finalOrderCount} Bills`);
  console.log(`   - Sold Ornaments Count: ${orderTracker.sellsCount} items`);
  console.log(`   - Scrap Buys Count: ${orderTracker.buysCount} items`);
  console.log(`   - Gold Sold Gross: ${round3Decimals(orderTracker.goldSoldGross)}g sold`);
  console.log(`   - Gold Scrap Bought Gross: ${round3Decimals(orderTracker.goldBoughtGross)}g → ${round3Decimals(orderTracker.goldBoughtPure)}g Pure`);
  console.log(`   - Silver Sold Gross: ${round3Decimals(orderTracker.silverSoldGross)}g sold`);
  console.log(`   - Silver Scrap Bought Gross: ${round3Decimals(orderTracker.silverBoughtGross)}g → ${round3Decimals(orderTracker.silverBoughtPure)}g Pure`);
  console.log(`======================================================\n`);
}

verifyOrderKpiCard();
