import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { memoryCache } from '../../config/memoryCache';

const router = Router();

// In-Memory Fallback State (matching updated_metal_values table)
let activeMetalValues = {
  gold_buy_value: 14200.00,
  gold_buy_value_updated_at: new Date().toISOString(),
  gold_sell_value: 14700.00,
  gold_sell_value_updated_at: new Date().toISOString(),
  silver_buy_value: 250.00,
  silver_buy_value_updated_at: new Date().toISOString(),
  silver_sell_value: 270.00,
  silver_sell_value_updated_at: new Date().toISOString(),
};

/**
 * JBJ Custom 3-Decimal Weight Rounding Rule:
 * Round up ONLY if the 4th decimal place is 6 or greater (> 0.5 remainder).
 * e.g., 4.4285 -> 4.428 (4th digit is 5 -> round down)
 * e.g., 4.4286 -> 4.429 (4th digit is 6 -> round up)
 */
const round3Decimals = (val: number): number => {
  if (isNaN(val)) return 0;
  const scaled = val * 1000;
  const floorVal = Math.floor(scaled);
  const diff = Number((scaled - floorVal).toFixed(6));
  return diff > 0.5 ? Math.ceil(scaled) / 1000 : floorVal / 1000;
};

interface HistoryEntry {
  id?: number;
  metal_type: 'GOLD' | 'SILVER';
  rate_type: 'BUY' | 'SELL';
  old_value: number | null;
  new_value: number;
  updated_at: string;
}

let metalHistoryRates: HistoryEntry[] = [
  { id: 1, metal_type: 'GOLD', rate_type: 'BUY', old_value: null, new_value: 14200.00, updated_at: new Date().toISOString() },
  { id: 2, metal_type: 'GOLD', rate_type: 'SELL', old_value: null, new_value: 14700.00, updated_at: new Date().toISOString() },
  { id: 3, metal_type: 'SILVER', rate_type: 'BUY', old_value: null, new_value: 250.00, updated_at: new Date().toISOString() },
  { id: 4, metal_type: 'SILVER', rate_type: 'SELL', old_value: null, new_value: 270.00, updated_at: new Date().toISOString() },
];

let invoicesList: any[] = [];

// GET /api/billing/rates - Fetch active metal values with per-column timestamps (from updated_metal_values)
router.get('/rates', async (req: Request, res: Response) => {
  const cachedRates = memoryCache.get<any>('metal_rates');
  if (cachedRates) {
    activeMetalValues = cachedRates;
    return res.json({
      success: true,
      rates: activeMetalValues,
    });
  }

  try {
    const { data, error } = await supabase
      .from('updated_metal_values')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      activeMetalValues = {
        gold_buy_value: Number(data.gold_buy_value),
        gold_buy_value_updated_at: data.gold_buy_value_updated_at || new Date().toISOString(),
        gold_sell_value: Number(data.gold_sell_value),
        gold_sell_value_updated_at: data.gold_sell_value_updated_at || new Date().toISOString(),
        silver_buy_value: Number(data.silver_buy_value),
        silver_buy_value_updated_at: data.silver_buy_value_updated_at || new Date().toISOString(),
        silver_sell_value: Number(data.silver_sell_value),
        silver_sell_value_updated_at: data.silver_sell_value_updated_at || new Date().toISOString(),
      };
      memoryCache.set('metal_rates', activeMetalValues, 86400);
    }
  } catch (err) {
    console.warn('⚠️ Supabase updated_metal_values fetch error:', err);
  }

  res.json({
    success: true,
    rates: activeMetalValues,
  });
});

// GET /api/billing/rates/history - Fetch audit history from PostgreSQL / Supabase
router.get('/rates/history', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('metal_history_rates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return res.json({
        success: true,
        history: data,
      });
    }
  } catch (err) {
    console.error('Supabase DB rates history fetch warning:', err);
  }

  res.json({
    success: true,
    history: metalHistoryRates,
  });
});

// POST /api/billing/rates - Update active metal values AND insert history log entry
router.post('/rates', async (req: Request, res: Response) => {
  const { gold_buy_value, gold_sell_value, silver_buy_value, silver_sell_value } = req.body;
  const now = new Date().toISOString();
  const dbHistoryInserts: any[] = [];

  // 1. Update Gold Buy Value if changed
  if (gold_buy_value !== undefined && Number(gold_buy_value) !== activeMetalValues.gold_buy_value) {
    const oldVal = activeMetalValues.gold_buy_value;
    const newVal = Number(gold_buy_value);
    activeMetalValues.gold_buy_value = newVal;
    activeMetalValues.gold_buy_value_updated_at = now;

    const entry: HistoryEntry = { metal_type: 'GOLD', rate_type: 'BUY', old_value: oldVal, new_value: newVal, updated_at: now };
    metalHistoryRates.unshift({ id: metalHistoryRates.length + 1, ...entry });
    dbHistoryInserts.push(entry);
  }

  // 2. Update Gold Sell Value if changed
  if (gold_sell_value !== undefined && Number(gold_sell_value) !== activeMetalValues.gold_sell_value) {
    const oldVal = activeMetalValues.gold_sell_value;
    const newVal = Number(gold_sell_value);
    activeMetalValues.gold_sell_value = newVal;
    activeMetalValues.gold_sell_value_updated_at = now;

    const entry: HistoryEntry = { metal_type: 'GOLD', rate_type: 'SELL', old_value: oldVal, new_value: newVal, updated_at: now };
    metalHistoryRates.unshift({ id: metalHistoryRates.length + 1, ...entry });
    dbHistoryInserts.push(entry);
  }

  // 3. Update Silver Buy Value if changed
  if (silver_buy_value !== undefined && Number(silver_buy_value) !== activeMetalValues.silver_buy_value) {
    const oldVal = activeMetalValues.silver_buy_value;
    const newVal = Number(silver_buy_value);
    activeMetalValues.silver_buy_value = newVal;
    activeMetalValues.silver_buy_value_updated_at = now;

    const entry: HistoryEntry = { metal_type: 'SILVER', rate_type: 'BUY', old_value: oldVal, new_value: newVal, updated_at: now };
    metalHistoryRates.unshift({ id: metalHistoryRates.length + 1, ...entry });
    dbHistoryInserts.push(entry);
  }

  // 4. Update Silver Sell Value if changed
  if (silver_sell_value !== undefined && Number(silver_sell_value) !== activeMetalValues.silver_sell_value) {
    const oldVal = activeMetalValues.silver_sell_value;
    const newVal = Number(silver_sell_value);
    activeMetalValues.silver_sell_value = newVal;
    activeMetalValues.silver_sell_value_updated_at = now;

    const entry: HistoryEntry = { metal_type: 'SILVER', rate_type: 'SELL', old_value: oldVal, new_value: newVal, updated_at: now };
    metalHistoryRates.unshift({ id: metalHistoryRates.length + 1, ...entry });
    dbHistoryInserts.push(entry);
  }

  // Persist to Supabase PostgreSQL DB
  try {
    const dbUpdateFields: Record<string, any> = { id: 1 };
    if (gold_buy_value !== undefined) {
      dbUpdateFields.gold_buy_value = activeMetalValues.gold_buy_value;
      dbUpdateFields.gold_buy_value_updated_at = activeMetalValues.gold_buy_value_updated_at;
    }
    if (gold_sell_value !== undefined) {
      dbUpdateFields.gold_sell_value = activeMetalValues.gold_sell_value;
      dbUpdateFields.gold_sell_value_updated_at = activeMetalValues.gold_sell_value_updated_at;
    }
    if (silver_buy_value !== undefined) {
      dbUpdateFields.silver_buy_value = activeMetalValues.silver_buy_value;
      dbUpdateFields.silver_buy_value_updated_at = activeMetalValues.silver_buy_value_updated_at;
    }
    if (silver_sell_value !== undefined) {
      dbUpdateFields.silver_sell_value = activeMetalValues.silver_sell_value;
      dbUpdateFields.silver_sell_value_updated_at = activeMetalValues.silver_sell_value_updated_at;
    }

    await supabase.from('updated_metal_values').upsert(dbUpdateFields);

    if (dbHistoryInserts.length > 0) {
      await supabase.from('metal_history_rates').insert(dbHistoryInserts);
    }

    console.log(` 🏛 [DB INSPECTION] updated_metal_values (id=1):`);
    console.log(`    Gold Buy: ₹${activeMetalValues.gold_buy_value} | Gold Sell: ₹${activeMetalValues.gold_sell_value}`);
    console.log(`    Silver Buy: ₹${activeMetalValues.silver_buy_value} | Silver Sell: ₹${activeMetalValues.silver_sell_value}`);
    if (dbHistoryInserts.length > 0) {
      console.log(` 📜 [DB INSPECTION] metal_history_rates (${dbHistoryInserts.length} new audit rows inserted into PostgreSQL)`);
    }
    memoryCache.set('metal_rates', activeMetalValues, 86400);
  } catch (err) {
    console.error('Supabase DB rates update warning:', err);
  }

  res.json({
    success: true,
    message: 'Active metal rates updated & persisted in database successfully',
    rates: activeMetalValues,
  });
});

// POST /api/billing/calculate - 100% Server-side multi-item & single-item calculation engine
router.post('/calculate', (req: Request, res: Response) => {
  const { items, rates, mode } = req.body;
  const isOrderMode = (mode || '').toUpperCase() === 'ORDER';

  const currentRates = rates || activeMetalValues;

  if (items && Array.isArray(items)) {
    const itemDetails: Record<string, { metalVal: number; netWeight: number; pureWeight: number; wastageVal: number; makingVal: number; additionalVal: number; lineTotal: number; rate: number }> = {};
    let totalSellValue = 0;
    let totalBuyCredit = 0;

    items.forEach((it: any) => {
      const isGold = (it.metal_type || 'GOLD').toUpperCase() === 'GOLD';
      const isSell = (it.item_type || 'SELL').toUpperCase() === 'SELL';
      const customRate = Number(it.custom_rate_per_gram || it.customRate || it.appliedRate);
      const defaultRate = isGold
        ? (isSell ? currentRates.gold_sell_value || 0 : currentRates.gold_buy_value || 0)
        : (isSell ? currentRates.silver_sell_value || 0 : currentRates.silver_buy_value || 0);
      const rate = customRate > 0 ? customRate : defaultRate;

      const grossWeight = Number(it.weight_grams) || 0;
      const deductionWeight = Number(it.deduction_weight_grams) || 0;
      const netWeight = Math.max(0, round3Decimals(grossWeight - deductionWeight));

      const purityPercent = isSell ? 100 : (Number(it.purity_percentage) || 100);
      const pureWeight = round3Decimals(netWeight * (purityPercent / 100));

      const wastagePercent = Number(it.wastage_percent) || 0;
      const wastageWeight = isSell ? round3Decimals((wastagePercent / 100) * netWeight) : 0;
      // SELL: totalChargedWeight = netWeight + HMW wastage weight (rate applied on this)
      // BUY:  pureWeight = netWeight * (purity/100) (rate applied on this)
      const totalChargedWeight = isSell ? round3Decimals(netWeight + wastageWeight) : pureWeight;

      const makingChargesPerGram = Number(it.making_charges_per_gram) || 0;
      const additionalCharges = Number(it.additional_charges_amount) || 0;

      const wastageVal = 0;
      let metalVal = 0;

      if (isSell) {
        // SELL / ORDER JBJ item / TRADE-IN new ornament: totalChargedWeight (after HMW) × rate
        metalVal = Number((totalChargedWeight * rate).toFixed(2));
      } else {
        // BUY items
        if (isOrderMode) {
          // ORDER customer old metal: netWeight × rate
          metalVal = Number((netWeight * rate).toFixed(2));
        } else {
          // BUY / TRADE-IN customer old item: pureWeight × rate
          metalVal = Number((pureWeight * rate).toFixed(2));
        }
      }

      // making charges added directly as flat amount
      const makingVal = isSell ? Number(makingChargesPerGram.toFixed(2)) : 0;
      const additionalVal = isSell ? Number(additionalCharges.toFixed(2)) : 0;

      const lineTotal = Number((metalVal + wastageVal + makingVal + additionalVal).toFixed(2));

      itemDetails[it.id] = { metalVal, netWeight, pureWeight, wastageVal, makingVal, additionalVal, lineTotal, rate };

      if (isSell) {
        totalSellValue += lineTotal;
      } else {
        totalBuyCredit += lineTotal;
      }
    });

    totalSellValue = Number(totalSellValue.toFixed(2));
    totalBuyCredit = Number(totalBuyCredit.toFixed(2));
    const netPayable = Number(Math.abs(totalSellValue - totalBuyCredit).toFixed(2));

    return res.json({
      success: true,
      itemDetails,
      totalSellValue,
      totalBuyCredit,
      netPayable,
    });
  }

  const {
    transaction_type,
    metal_type,
    weight_grams,
    purity_percentage,
    making_charges_per_gram = 0,
    gst_percent = 3,
  } = req.body;

  const weight = Number(weight_grams) || 0;
  const purity = Number(purity_percentage) || 100;
  const mcPerGram = Number(making_charges_per_gram) || 0;
  const gstRate = Number(gst_percent) || 0;

  let applied_rate_per_gram = 0;
  if (metal_type === 'GOLD') {
    applied_rate_per_gram = transaction_type === 'SELL' ? currentRates.gold_sell_value : currentRates.gold_buy_value;
  } else {
    applied_rate_per_gram = transaction_type === 'SELL' ? currentRates.silver_sell_value : currentRates.silver_buy_value;
  }

  const pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
  const weightUsed = transaction_type === 'SELL' ? weight : pure_metal_weight;
  const metal_value = Number((weightUsed * applied_rate_per_gram).toFixed(2));
  const making_charges = transaction_type === 'SELL' ? Number(mcPerGram.toFixed(2)) : 0;
  const subtotal = metal_value + making_charges;
  const gst_amount = transaction_type === 'SELL' ? Number((subtotal * (gstRate / 100)).toFixed(2)) : 0;
  const final_amount = Number((subtotal + gst_amount).toFixed(2));

  res.json({
    success: true,
    calculation: {
      transaction_type,
      metal_type,
      weight_grams: weight,
      purity_percentage: purity,
      applied_rate_per_gram,
      pure_metal_weight,
      metal_value,
      making_charges,
      gst_amount,
      final_amount,
    },
  });
});

const formatCustomerBillingToInvoice = (b: any) => {
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
    payment_status: b.payment_status || (Number(b.due_amount || 0) <= 0 ? 'PAID' : 'PARTIAL'),
    image_url: primaryItem.image_url || receipt.image_url || null,
    receipt_json_data: receipt,
    created_at: b.created_at,
    updated_at: b.updated_at,
  };
};

async function generateNextBillingId(billType: string): Promise<string> {
  const prefix = billType.toUpperCase() === 'ORDER' ? 'ORD' : 'INV';
  try {
    const { data } = await supabase
      .from('customer_billing')
      .select('billing_id')
      .order('created_at', { ascending: false })
      .limit(100);

    let maxNum = 0;
    (data || []).forEach((row: any) => {
      if (row.billing_id) {
        const match = String(row.billing_id).match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num < 1000000 && num > maxNum) maxNum = num;
        }
      }
    });
    return `${prefix}-${Math.max(maxNum + 1, 1001)}`;
  } catch (e) {
    return `${prefix}-${Date.now()}`;
  }
}

// GET /api/billing/invoices/:id - Fetch single invoice with full receipt_json_data on demand
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let dbInvoice: any = null;

    const { data: byBillingId } = await supabase
      .from('customer_billing')
      .select('*')
      .eq('billing_id', id)
      .maybeSingle();

    if (byBillingId) {
      dbInvoice = formatCustomerBillingToInvoice(byBillingId);
    } else {
      const { data: byUuid } = await supabase
        .from('customer_billing')
        .select('*')
        .eq('customer_billing_uuid', id)
        .maybeSingle();
      if (byUuid) {
        dbInvoice = formatCustomerBillingToInvoice(byUuid);
      }
    }

    if (dbInvoice) {
      return res.json({ success: true, invoice: dbInvoice });
    }
    const mockMatch = invoicesList.find((inv) => inv.id === id);
    return res.json({ success: true, invoice: mockMatch || null });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/billing/customer-directory - 1:1 Individual Invoice Directory Records with Server-Side Pagination
router.get('/customer-directory', async (req: Request, res: Response) => {
  try {
    const rawLimit = (req.query.limit as string) || '10';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const search = ((req.query.search as string) || '').trim();
    const history = ((req.query.history as string) || '').trim().toUpperCase();
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const isAll = rawLimit.toUpperCase() === 'ALL' || rawLimit === '0';
    const limit = isAll ? 0 : (parseInt(rawLimit, 10) || 10);

    const isDefaultDirQuery = page === 1 && limit === 10 && !search && (!history || history === 'ALL') && !from && !to;
    const cacheKey = isDefaultDirQuery ? 'customer_directory_page_1' : null;

    if (cacheKey) {
      const cached = memoryCache.get<any>(cacheKey);
      if (cached) return res.json(cached);
    }

    let query = supabase
      .from('customer_billing')
      .select('*', { count: 'estimated' });

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    if (history && history !== 'ALL') {
      query = query.eq('bill_type', history);
    }

    if (from) {
      query = query.gte('created_at', from);
    }

    if (to) {
      query = query.lte('created_at', to);
    }

    query = query.order('created_at', { ascending: false });

    if (!isAll && limit > 0) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, count, error } = await query;

    let list: any[] = data ? data.map(formatCustomerBillingToInvoice) : [];
    let totalCount = count !== null && count !== undefined ? count : list.length;

    if (error) {
      console.warn('Supabase DB fetch customer-directory warning:', error);
      list = invoicesList;
      totalCount = list.length;
    }

    const customers = list.map((inv) => ({
      name: inv.customer_name,
      phone: inv.customer_phone || '-',
      address: inv.customer_address || inv.receipt_json_data?.customer_address || 'N/A',
      products: inv.product_name ? [inv.product_name] : ['-'],
      totalWeight: Number(inv.weight_grams) || 0,
      totalSpent: Number(inv.final_amount) || (inv.receipt_json_data ? Math.abs(Number(inv.receipt_json_data.totalSellValue || 0) - Number(inv.receipt_json_data.totalBuyCredit || 0)) : 0),
      ordersCount: 1,
      lastDate: inv.created_at,
      latestInvoice: {
        ...inv,
        transaction_type: inv.transaction_type || inv.receipt_json_data?.transaction_type || 'SELL',
      },
    }));

    const totalPages = isAll || limit <= 0 ? 1 : Math.max(1, Math.ceil(totalCount / limit));

    const responseObj = {
      success: true,
      customers,
      totalCount,
      page,
      limit: isAll ? 'ALL' : limit,
      totalPages,
    };

    if (cacheKey) {
      memoryCache.set(cacheKey, responseObj, 300);
    }

    return res.json(responseObj);
  } catch (err) {
    console.error('Error in customer-directory route:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching customer directory.' });
  }
});

// GET /api/billing/invoices - Fetch all invoice records from PostgreSQL / Supabase
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('customer_billing')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return res.json({
        success: true,
        invoices: data.map(formatCustomerBillingToInvoice),
      });
    }
  } catch (err) {
    console.error('Supabase DB customer_billing fetch warning:', err);
  }

  res.json({
    success: true,
    invoices: invoicesList,
  });
});

// POST /api/billing/create - Create & save new invoice in PostgreSQL
router.post('/create', async (req: Request, res: Response) => {
  const {
    customer_name,
    customer_phone = '',
    customer_address = '',
    transaction_type,
    metal_type,
    product_name,
    weight_grams,
    purity_percentage,
    making_charges_per_gram = 0,
    gst_percent = 3,
    receipt_json_data = null,
  } = req.body;

  if (!customer_name || !transaction_type || !metal_type || !product_name || !weight_grams) {
    return res.status(400).json({
      success: false,
      message: 'Missing required billing fields',
    });
  }

  const weight = Number(weight_grams);
  const purity = Number(purity_percentage) || 100;
  const mcPerGram = Number(making_charges_per_gram) || 0;
  const gstRate = Number(gst_percent) || 0;

  let applied_rate_per_gram = 0;
  if (metal_type === 'GOLD') {
    applied_rate_per_gram = transaction_type === 'SELL' ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value;
  } else {
    applied_rate_per_gram = transaction_type === 'SELL' ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value;
  }

  let pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
  const weightUsed = transaction_type === 'SELL' ? weight : pure_metal_weight;
  let metal_value = Number((weightUsed * applied_rate_per_gram).toFixed(2));
  let making_charges = transaction_type === 'SELL' ? Number(mcPerGram.toFixed(2)) : 0;
  const subtotal = metal_value + making_charges;
  let gst_amount = transaction_type === 'SELL' ? Number((subtotal * (gstRate / 100)).toFixed(2)) : 0;

  let final_weight = weight;
  let final_product_name = product_name;
  let final_amount_val = Number((subtotal + gst_amount).toFixed(2));
  let resolvedMetalType = (metal_type || 'GOLD').toUpperCase();

  if (receipt_json_data && receipt_json_data.items && Array.isArray(receipt_json_data.items)) {
    let sumPureW = 0;
    let sumMetalVal = 0;
    let sumMaking = 0;
    let sumGst = 0;

    receipt_json_data.items = receipt_json_data.items.map((it: any) => {
      const isGold = (it.metal_type || 'GOLD').toUpperCase() === 'GOLD';
      const isSell = (it.item_type || 'SELL').toUpperCase() === 'SELL';
      const customRate = Number(it.custom_rate_per_gram || it.customRate || it.appliedRate);
      const defaultRate = isGold
        ? (isSell ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value)
        : (isSell ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value);
      const rate = customRate > 0 ? customRate : defaultRate;

      const grossWeight = Number(it.weight_grams) || 0;
      const deductionWeight = Number(it.deduction_weight_grams) || 0;
      const netWeight = Math.max(0, Number((grossWeight - deductionWeight).toFixed(3)));

      const purityPercent = isSell ? 100 : (Number(it.purity_percentage) || 100);
      const pureWeight = Number((netWeight * (purityPercent / 100)).toFixed(3));

      const wastagePercent = Number(it.wastage_percent) || 0;
      const makingCharges = Number(it.making_charges_per_gram) || 0;
      const additionalCharges = Number(it.additional_charges_amount) || 0;

      const metalVal = isSell
        ? Number((netWeight * rate).toFixed(2))
        : Number((pureWeight * rate).toFixed(2));

      const wastageVal = isSell ? Number(((wastagePercent / 100) * netWeight * rate).toFixed(2)) : 0;
      const makingVal = isSell ? Number(makingCharges.toFixed(2)) : 0;
      const additionalVal = isSell ? Number(additionalCharges.toFixed(2)) : 0;

      const lineTotal = Number((metalVal + wastageVal + makingVal + additionalVal).toFixed(2));

      sumPureW += pureWeight;
      sumMetalVal += metalVal;
      sumMaking += makingVal;
      sumGst += wastageVal;

      return {
        ...it,
        net_weight_grams: netWeight,
        netWeight,
        metalVal,
        wastageVal,
        makingVal,
        additionalVal,
        appliedRate: rate,
        applied_rate_per_gram: rate,
        lineTotal,
        line_total: lineTotal,
      };
    });

    if (transaction_type === 'BUY') {
      final_amount_val = Number(receipt_json_data.totalBuyCredit) || Number((subtotal + gst_amount).toFixed(2));
    } else if (transaction_type === 'EXCHANGE') {
      const sellVal = Number(receipt_json_data.totalSellValue) || 0;
      const buyVal = Number(receipt_json_data.totalBuyCredit) || 0;
      final_amount_val = Number(Math.abs(sellVal - buyVal).toFixed(2));
    } else if (receipt_json_data.netPayable !== undefined) {
      final_amount_val = Number(receipt_json_data.netPayable);
    }

    final_weight = receipt_json_data.items.reduce((acc: number, item: any) => acc + (Number(item.weight_grams) || 0), 0);
    pure_metal_weight = Number(sumPureW.toFixed(3));
    metal_value = Number(sumMetalVal.toFixed(2));
    making_charges = Number(sumMaking.toFixed(2));
    gst_amount = Number(sumGst.toFixed(2));

    const hasGold = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'GOLD');
    const hasSilver = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'SILVER');
    if (hasGold && hasSilver) {
      resolvedMetalType = 'MIXED';
    } else if (hasSilver && !hasGold) {
      resolvedMetalType = 'SILVER';
    } else if (hasGold && !hasSilver) {
      resolvedMetalType = 'GOLD';
    }
    receipt_json_data.metal_type = resolvedMetalType;
    if (!receipt_json_data.rates) {
      receipt_json_data.rates = activeMetalValues;
    }

    final_product_name = receipt_json_data.items
      .map((i: any) => `${i.product_name || (i.metal_type + ' Item')} (${i.weight_grams}g)`)
      .join(', ');
  } else if (transaction_type === 'BUY') {
    final_amount_val = Number((subtotal + gst_amount).toFixed(2));
  }

  const paidAmt = req.body.paid_amount !== undefined ? Number(req.body.paid_amount) : Number(receipt_json_data?.advancePaidAmount ?? final_amount_val);
  const dueAmt = req.body.due_amount !== undefined ? Number(req.body.due_amount) : Number(receipt_json_data?.balanceDueAmount ?? 0);

  const newInvoicePayload: any = {
    customer_name: customer_name || 'Walk-in Customer',
    customer_phone: customer_phone || '',
    customer_address: customer_address || '',
    transaction_type: transaction_type || 'SELL',
    metal_type: resolvedMetalType,
    product_name: (final_product_name || 'Jewellery Item').substring(0, 250),
    weight_grams: Number(final_weight) || 0,
    purity_percentage: Number(purity) || 100,
    applied_rate_per_gram: Number(applied_rate_per_gram) || 0,
    pure_metal_weight: Number(pure_metal_weight) || 0,
    metal_value: Number(metal_value) || 0,
    making_charges: Number(making_charges) || 0,
    gst_amount: Number(gst_amount) || 0,
    final_amount: Number(final_amount_val) || 0,
    paid_amount: Number(paidAmt) || 0,
    due_amount: Number(dueAmt) || 0,
    gold_buy_rate_snapshot: Number(activeMetalValues.gold_buy_value) || 0,
    gold_sell_rate_snapshot: Number(activeMetalValues.gold_sell_value) || 0,
    silver_buy_rate_snapshot: Number(activeMetalValues.silver_buy_value) || 0,
    silver_sell_rate_snapshot: Number(activeMetalValues.silver_sell_value) || 0,
    return_purity_percentage: Number(receipt_json_data?.items?.[0]?.return_purity_percentage) || 0,
    return_pure_gold: Number(receipt_json_data?.items?.[0]?.return_pure_gold) || 0,
    receipt_json_data,
    created_at: new Date().toISOString(),
  };

  const billingId = await generateNextBillingId(transaction_type || 'SELL');
  const createdInvoice = { ...newInvoicePayload, id: billingId, billing_id: billingId };

  invoicesList.unshift(createdInvoice);

  // Record cash movement only — inventory deduction is handled by storeBillingTransaction -> recordInventoryMovement (single source of truth)
  recordInvoiceCashTransaction(createdInvoice).catch(() => { });

  // Trigger 3-table billing storage (customer_billing, billing_sell_buy_records, billing_payment_history)
  try {
    const { storeBillingTransaction } = await import('../../utils/billingStorageHelper');
    const storeRes = await storeBillingTransaction({
      billing_id: billingId,
      bill_type: (createdInvoice.transaction_type || 'SELL').toUpperCase(),
      customer_name: createdInvoice.customer_name,
      customer_phone: createdInvoice.customer_phone,
      customer_address: createdInvoice.customer_address,
      total_amount: Number(createdInvoice.final_amount || 0),
      paid_amount: Number(createdInvoice.paid_amount ?? (createdInvoice.transaction_type === 'BUY' ? 0 : createdInvoice.final_amount)),
      due_amount: Number(createdInvoice.due_amount || 0),
      receipt_json_data: createdInvoice.receipt_json_data,
      created_at: createdInvoice.created_at,
      metal_type: createdInvoice.metal_type,
      weight_grams: Number(createdInvoice.weight_grams || 0),
      product_name: createdInvoice.product_name,
      image_url: createdInvoice.image_url,
    });

    if (!storeRes.success) {
      console.warn('⚠️ storeBillingTransaction notice:', storeRes.error);
    }
  } catch (e) {
    console.warn('⚠️ storeBillingTransaction invocation warning:', e);
  }

  // Invalidate RAM cache instantly so all admins get fresh customer & order records
  memoryCache.clear();

  res.json({
    success: true,
    message: 'Billing invoice generated & persisted successfully',
    invoice: createdInvoice,
  });
});

// Helper to record invoice cash transaction into cash_history & cash_transaction_ledger
async function recordInvoiceCashTransaction(invoice: any) {
  try {
    const txnType = (invoice.transaction_type || 'SELL').toUpperCase();

    // BUG FIX: Use paid_amount for SELL/ORDER/EXCHANGE (actual cash received, not full invoice value)
    // For BUY (scrap purchase), use final_amount — shop always pays the full amount in cash
    let cashAmount = Number(invoice.paid_amount || invoice.final_amount || 0);
    let flowType: 'IN' | 'OUT' = 'IN';

    // 1. BUY (Scrap purchases from customer): Shop pays cash OUT to customer
    if (txnType === 'BUY') {
      cashAmount = Math.abs(Number(invoice.final_amount || invoice.paid_amount || 0));
      flowType = 'OUT';
    } 
    // 2. ORDER, SELL, EXCHANGE: Check exact cash direction (IN vs OUT)
    else {
      const totalBuyCredit = Number(invoice.total_buy_credit || invoice.receipt_json_data?.totalBuyCredit || 0);
      const totalSellValue = Number(invoice.total_sell_value || invoice.receipt_json_data?.totalSellValue || 0);

      const isShopPayingCustomer = 
        String(invoice.flow_type || invoice.direction || '').toUpperCase().includes('OUT') ||
        Number(invoice.paid_amount || 0) < 0 ||
        Boolean(invoice.is_refund) ||
        Boolean(invoice.shop_pays_customer) ||
        (totalBuyCredit > totalSellValue && totalBuyCredit > 0);

      if (isShopPayingCustomer) {
        flowType = 'OUT';
        cashAmount = Math.abs(Number(invoice.paid_amount || invoice.final_amount || 0));
      } else {
        flowType = 'IN';
        cashAmount = Math.abs(Number(invoice.paid_amount || invoice.final_amount || 0));
      }
    }

    if (cashAmount <= 0) {
      console.log(`ℹ️ No cash movement for ${txnType} Invoice #${invoice.id} (paid_amount = 0, Udhaari/Credit sale)`);
      return;
    }

    const { recordCashTransaction } = await import('../../utils/cashLedgerHelper');
    await recordCashTransaction({
      transaction_id: String(invoice.id),
      transaction_type: txnType as any,
      flow_type: flowType,
      amount: cashAmount,
      metal_type: invoice.metal_type || 'GOLD',
      item_type: invoice.product_name || `${txnType} Invoice`,
      notes: `${txnType} Invoice #${invoice.id} - ${invoice.customer_name || 'Walk-in'} (${flowType === 'OUT' ? 'Paid to Customer' : 'Collected'}: ₹${cashAmount.toLocaleString('en-IN')})`,
      date: invoice.created_at ? String(invoice.created_at).split('T')[0] : undefined,
    });
  } catch (err) {
    console.warn('⚠️ Error recording invoice cash transaction:', err);
  }
}

// Helper to deduct sold items from inventory_products (current_stock_weight, sold_quantity, sell_count) & log SALE_DEDUCTION
async function deductInventoryStockOnSale(invoice: any) {
  try {
    let rawData = typeof invoice.receipt_json_data === 'string'
      ? JSON.parse(invoice.receipt_json_data)
      : (invoice.receipt_json_data || {});

    const items: any[] = Array.isArray(rawData?.items) ? rawData.items : [];
    for (const item of items) {
      if (item.item_type === 'SELL') {
        const pName = item.product_name || item.name;
        const pId = item.product_id || item.id;
        const qtySold = Number(item.quantity || 1);
        const weightSold = Number(item.weight_grams || item.gross_weight_grams || item.net_weight_grams || 0);

        if (pName || pId) {
          let query = supabase.from('inventory_products').select('*');
          if (pId && !String(pId).startsWith('item-')) {
            query = query.eq('id', pId);
          } else if (pName) {
            query = query.ilike('name', `%${String(pName).trim()}%`);
          }

          const { data: matchedProds } = await query.limit(1);
          if (matchedProds && matchedProds.length > 0) {
            const prod = matchedProds[0];
            const currentStock = Number(prod.stock_quantity || 1);
            const currentSold = Number(prod.sold_quantity || 0);
            const currentWeight = Number(prod.current_stock_weight || 0);
            const newStock = Math.max(0, currentStock - qtySold);
            const newSold = currentSold + qtySold;
            const newWeight = Math.max(0, Number((currentWeight - weightSold).toFixed(3)));
            const newSellCount = Number(prod.sell_count || 0) + 1;

            await supabase
              .from('inventory_products')
              .update({
                stock_quantity: newStock,
                sold_quantity: newSold,
                current_stock_weight: newWeight,
                sell_count: newSellCount,
                updated_at: new Date().toISOString(),
              })
              .eq('id', prod.id);

            await supabase.from('inventory_stock_logs').insert([{
              product_id: prod.id,
              product_name: prod.name || prod.category,
              log_type: 'SALE_DEDUCTION',
              quantity_change: -qtySold,
              weight_change_grams: -weightSold,
              previous_stock: currentStock,
              new_stock: newStock,
              notes: `Sold in ${invoice.transaction_type || 'SELL'} Invoice #${invoice.id} to ${invoice.customer_name || 'Customer'}`,
              created_at: new Date().toISOString(),
            }]);
          }
        }
      } else if (item.item_type === 'BUY') {
        // Scrap metal purchase log
        const scrapWeight = Number(item.weight_grams || item.gross_weight_grams || item.net_weight_grams || 0);
        const cleanMetal = (item.metal_type || invoice.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';
        if (scrapWeight > 0) {
          try {
            await supabase.from('inventory_stock_logs').insert([{
              product_id: null,
              product_name: `Old ${cleanMetal} Scrap / Buy-in`,
              log_type: 'OLD_GOLD_PURCHASE',
              quantity_change: 1,
              weight_change_grams: scrapWeight,
              previous_stock: 0,
              new_stock: 0,
              notes: `Scrap ${cleanMetal} received in ${invoice.transaction_type || 'BUY'} Invoice #${invoice.id} from ${invoice.customer_name || 'Customer'}`,
              created_at: new Date().toISOString(),
            }]);
          } catch (logErr) {
            console.warn('⚠️ Scrap purchase stock log error:', logErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Inventory auto-deduction error:', err);
  }
}

// GET /api/billing/kpi-summary - Calculate cumulative running totals directly from billing_sell_buy_records
router.get('/kpi-summary', async (req: Request, res: Response) => {
  try {
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let query = supabase.from('billing_sell_buy_records').select('*');
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: rows, error } = await query;
    if (error) {
      console.warn('⚠️ Error fetching billing_sell_buy_records for KPI:', error.message);
    }

    const summary = (rows || []).reduce(
      (acc: any, r: any) => {
        const w = Number(r.item_weight) || 0;
        const amt = Number(r.total_item_price) || 0;
        const purity = Number(r.item_quality_percentage || r.hallmark_percentage) || 0;
        const metal = (r.metal_type || '').toUpperCase();
        const itemType = (r.transaction_type || '').toUpperCase();

        const billingMode = (r.billing_mode || '').toUpperCase();
        if (billingMode === 'ORDER') acc.orderCount++;
        else if (billingMode === 'SELL') acc.sellCount++;
        else if (billingMode === 'TRADE_IN' || billingMode === 'EXCHANGE') acc.exchangeCount++;

        if (itemType === 'BUY' || billingMode === 'BUY') {
          acc.buyCount++;
        }

        if (metal === 'GOLD' && itemType === 'SELL') {
          acc.goldSoldWeight += w;
          acc.goldSoldAmount += amt;
        } else if (metal === 'GOLD' && itemType === 'BUY') {
          acc.goldBoughtWeight += w;
          acc.goldBoughtAmount += amt;
          acc.goldBoughtPurityWeightedSum += purity * w;
        } else if (metal === 'SILVER' && itemType === 'SELL') {
          acc.silverSoldWeight += w;
          acc.silverSoldAmount += amt;
        } else if (metal === 'SILVER' && itemType === 'BUY') {
          acc.silverBoughtWeight += w;
          acc.silverBoughtAmount += amt;
          acc.silverBoughtPurityWeightedSum += purity * w;
        }
        return acc;
      },
      {
        orderCount: 0,
        sellCount: 0,
        buyCount: 0,
        exchangeCount: 0,
        goldSoldWeight: 0,
        goldSoldAmount: 0,
        goldBoughtWeight: 0,
        goldBoughtAmount: 0,
        goldBoughtPurityWeightedSum: 0,
        silverSoldWeight: 0,
        silverSoldAmount: 0,
        silverBoughtWeight: 0,
        silverBoughtAmount: 0,
        silverBoughtPurityWeightedSum: 0,
      }
    );

    res.json({
      success: true,
      summary,
      activityCounts: {
        orderCount: summary.orderCount,
        sellCount: summary.sellCount,
        buyCount: summary.buyCount,
        exchangeCount: summary.exchangeCount,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/billing/update/:id - Completely overwrite existing invoice record on the same ID
router.put('/update/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    customer_name,
    customer_phone = '',
    customer_address = '',
    transaction_type,
    metal_type,
    product_name,
    weight_grams,
    purity_percentage,
    making_charges_per_gram = 0,
    gst_percent = 3,
    receipt_json_data = null,
  } = req.body;

  if (!customer_name) {
    return res.status(400).json({
      success: false,
      message: 'Missing customer name',
    });
  }

  const existingInv = invoicesList.find((i) => String(i.id) === String(id));
  const createdAt = existingInv?.created_at || new Date().toISOString();

  let final_weight = Number(weight_grams) || 0;
  let final_product_name = product_name || 'Jewellery Item';
  let final_amount_val = 0;
  let pure_metal_weight = 0;
  let metal_value = 0;
  let making_charges = 0;
  let gst_amount = 0;
  let resolvedUpdateMetalType = (metal_type || 'GOLD').toUpperCase();

  if (receipt_json_data && receipt_json_data.items && Array.isArray(receipt_json_data.items)) {
    let totalSell = 0;
    let totalBuy = 0;
    let sumWeight = 0;
    const names: string[] = [];

    receipt_json_data.items.forEach((it: any) => {
      const isGold = it.metal_type === 'GOLD';
      const isSell = it.item_type === 'SELL';
      const rate = isGold
        ? (isSell ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value)
        : (isSell ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value);

      const grossWeight = Number(it.weight_grams) || 0;
      const deductionWeight = Number(it.deduction_weight_grams) || 0;
      const netWeight = Math.max(0, Number((grossWeight - deductionWeight).toFixed(3)));

      const purityPercent = isSell ? 100 : (Number(it.purity_percentage) || 100);
      const pureWeight = Number((netWeight * (purityPercent / 100)).toFixed(3));

      const wastagePercent = Number(it.wastage_percent) || 0;
      const makingCharges = Number(it.making_charges_per_gram) || 0;
      const additionalCharges = Number(it.additional_charges_amount) || 0;

      const metalVal = isSell
        ? Number((netWeight * rate).toFixed(2))
        : Number((pureWeight * rate).toFixed(2));

      const wastageVal = isSell ? Number(((wastagePercent / 100) * netWeight * rate).toFixed(2)) : 0;
      const makingVal = isSell ? Number(makingCharges.toFixed(2)) : 0;
      const additionalVal = isSell ? Number(additionalCharges.toFixed(2)) : 0;

      const lineTotal = Number((metalVal + wastageVal + makingVal + additionalVal).toFixed(2));

      sumWeight += grossWeight;
      pure_metal_weight += pureWeight;
      metal_value += metalVal;
      making_charges += makingVal;
      gst_amount += wastageVal;

      if (isSell) totalSell += lineTotal;
      else totalBuy += lineTotal;

      it.netWeight = netWeight;
      it.net_weight_grams = netWeight;
      it.metalVal = metalVal;
      it.wastageVal = wastageVal;
      it.makingVal = makingVal;
      it.additionalVal = additionalVal;
      it.appliedRate = rate;
      it.applied_rate_per_gram = rate;
      it.lineTotal = lineTotal;
      it.line_total = lineTotal;

      const itemName = it.product_name || `${it.metal_type} Item`;
      names.push(`${itemName} (${grossWeight}g)`);
    });

    final_weight = Number(sumWeight.toFixed(3));
    final_product_name = names.join(', ');
    final_amount_val = (transaction_type === 'EXCHANGE')
      ? Number(Math.abs(totalSell - totalBuy).toFixed(2))
      : Math.max(0, Number((totalSell - totalBuy).toFixed(2)));
    pure_metal_weight = Number(pure_metal_weight.toFixed(3));
    metal_value = Number(metal_value.toFixed(2));
    making_charges = Number(making_charges.toFixed(2));
    gst_amount = Number(gst_amount.toFixed(2));

    const hasGold = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'GOLD');
    const hasSilver = receipt_json_data.items.some((i: any) => (i.metal_type || '').toUpperCase() === 'SILVER');
    if (hasGold && hasSilver) {
      resolvedUpdateMetalType = 'MIXED';
    } else if (hasSilver && !hasGold) {
      resolvedUpdateMetalType = 'SILVER';
    } else if (hasGold && !hasSilver) {
      resolvedUpdateMetalType = 'GOLD';
    }
    receipt_json_data.metal_type = resolvedUpdateMetalType;
  } else {
    const weight = Number(weight_grams) || 0;
    const purity = Number(purity_percentage) || 100;
    const mcPerGram = Number(making_charges_per_gram) || 0;
    const gstRate = Number(gst_percent) || 0;

    const applied_rate = metal_type === 'GOLD'
      ? (transaction_type === 'SELL' ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value)
      : (transaction_type === 'SELL' ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value);

    pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
    const weightUsed = transaction_type === 'SELL' ? weight : pure_metal_weight;
    metal_value = Number((weightUsed * applied_rate).toFixed(2));
    making_charges = transaction_type === 'SELL' ? Number(mcPerGram.toFixed(2)) : 0;
    const subtotal = metal_value + making_charges;
    gst_amount = transaction_type === 'SELL' ? Number((subtotal * (gstRate / 100)).toFixed(2)) : 0;
    final_amount_val = Number((subtotal + gst_amount).toFixed(2));
  }

  const nowIso = new Date().toISOString();
  const existingHistory = Array.isArray(receipt_json_data?.update_history) ? receipt_json_data.update_history : [];
  const updateHistoryList = [...existingHistory, nowIso];

  receipt_json_data.updated_at = nowIso;
  receipt_json_data.update_history = updateHistoryList;

  const updatedInvoice = {
    id,
    customer_name,
    customer_phone,
    customer_address,
    transaction_type: transaction_type || 'SELL',
    metal_type: resolvedUpdateMetalType,
    product_name: final_product_name,
    weight_grams: final_weight,
    purity_percentage: Number(purity_percentage) || 100,
    applied_rate_per_gram: activeMetalValues.gold_sell_value,
    pure_metal_weight,
    metal_value,
    making_charges,
    gst_amount,
    final_amount: final_amount_val,
    gold_buy_rate_snapshot: activeMetalValues.gold_buy_value,
    gold_sell_rate_snapshot: activeMetalValues.gold_sell_value,
    silver_buy_rate_snapshot: activeMetalValues.silver_buy_value,
    silver_sell_rate_snapshot: activeMetalValues.silver_sell_value,
    receipt_json_data,
    created_at: createdAt,
    updated_at: nowIso,
  };

  // Overwrite in memory list
  const index = invoicesList.findIndex((i) => String(i.id) === String(id));
  if (index !== -1) {
    invoicesList[index] = updatedInvoice;
  } else {
    invoicesList.unshift(updatedInvoice);
  }

  // Persist update to customer_billing & billing_sell_buy_records
  try {
    const { storeBillingTransaction } = await import('../../utils/billingStorageHelper');
    const storeRes = await storeBillingTransaction({
      billing_id: String(updatedInvoice.id),
      bill_type: (updatedInvoice.transaction_type || 'SELL').toUpperCase(),
      customer_name: updatedInvoice.customer_name,
      customer_phone: updatedInvoice.customer_phone,
      customer_address: updatedInvoice.customer_address,
      total_amount: Number(updatedInvoice.final_amount || 0),
      paid_amount: Number((updatedInvoice as any).paid_amount ?? (updatedInvoice.transaction_type === 'BUY' ? 0 : updatedInvoice.final_amount)),
      due_amount: Number((updatedInvoice as any).due_amount || 0),
      receipt_json_data: updatedInvoice.receipt_json_data,
      created_at: updatedInvoice.created_at,
      metal_type: updatedInvoice.metal_type,
      weight_grams: Number(updatedInvoice.weight_grams || 0),
      product_name: updatedInvoice.product_name,
      image_url: (updatedInvoice as any).image_url,
    });

    if (!storeRes.success) {
      console.warn('⚠️ storeBillingTransaction update notice:', storeRes.error);
    }
  } catch (e) {
    console.warn('⚠️ storeBillingTransaction update warning:', e);
  }

  // Invalidate cache
  memoryCache.clear();

  res.json({
    success: true,
    message: 'Invoice record completely updated in customer_billing',
    invoice: updatedInvoice,
  });
});

// POST /api/billing/invoices/:id/payment - Record an installment payment for an invoice
router.post('/invoices/:id/payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount_paid, payment_mode, notes } = req.body;

    const { recordAdditionalPayment } = await import('../../utils/billingStorageHelper');
    const result = await recordAdditionalPayment({
      billing_id: String(id),
      amount_paid: Number(amount_paid),
      payment_mode: payment_mode || 'CASH',
      notes: notes,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json(result);
  } catch (err: any) {
    console.error('Error recording installment payment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/billing/presets - Fetch presets 100% directly from billing_presets database table
router.get('/presets', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('billing_presets')
      .select('*')
      .order('preset_name', { ascending: true });

    if (error) {
      console.warn('⚠️ Supabase billing_presets fetch error:', error);
      return res.status(500).json({ success: false, message: error.message, presets: {} });
    }

    const grouped: Record<string, string[]> = {};

    (data || []).forEach((row: any) => {
      const cat = row.category_name;
      if (!grouped[cat]) grouped[cat] = [];
      if (!grouped[cat].includes(row.preset_name)) {
        grouped[cat].push(row.preset_name);
      }
    });

    res.json({ success: true, presets: grouped });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server Error', presets: {} });
  }
});

// POST /api/billing/presets - Insert new custom preset into database
router.post('/presets', async (req: Request, res: Response) => {
  try {
    const { preset_name, category_name } = req.body;
    if (!preset_name || !category_name) {
      return res.status(400).json({ success: false, message: 'preset_name and category_name are required' });
    }

    const cleanName = String(preset_name).trim();
    const cleanCat = String(category_name).trim().toLowerCase();

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'preset_name cannot be empty' });
    }

    const { data, error } = await supabase
      .from('billing_presets')
      .upsert([{ preset_name: cleanName, category_name: cleanCat }], { onConflict: 'preset_name,category_name' })
      .select('*');

    if (error) {
      console.warn('Supabase billing_presets insert error:', error);
    }

    res.json({ success: true, message: 'Preset saved successfully', preset: { preset_name: cleanName, category_name: cleanCat } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// PUT /api/billing/invoices/:id/settlement - Record installment/settlement payment on an invoice
router.put('/invoices/:id/settlement', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paid_now, note } = req.body;

    const pNow = Number(paid_now) || 0;
    if (pNow <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const { recordAdditionalPayment } = await import('../../utils/billingStorageHelper');
    const result = await recordAdditionalPayment({
      billing_id: String(id),
      amount_paid: pNow,
      payment_mode: 'CASH',
      notes: note,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // Invalidate cache
    memoryCache.clear();

    res.json({
      success: true,
      message: `Payment of ₹${pNow.toLocaleString('en-IN')} recorded successfully in billing_payment_history`,
      paid_amount: result.paid_amount,
      due_amount: result.due_amount,
      payment_history: result.payment_history,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record invoice settlement' });
  }
});

// Helper: Checks if a date/timestamp matches date filter (all, single date, or date range)
function matchesDateFilterIST(created_at: any, targetDate: string, startDate?: string, endDate?: string): boolean {
  if (targetDate === 'all' || targetDate === 'ALL') return true;
  if (!created_at) return false;

  const dateObj = new Date(created_at);
  if (isNaN(dateObj.getTime())) return false;

  const istDateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  if (startDate && endDate) {
    return istDateStr >= startDate && istDateStr <= endDate;
  }

  return istDateStr === targetDate;
}

// GET /api/accounts/day-book - Comprehensive EOD Day Book & Accounts Ledger
router.get('/accounts/day-book', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const section = ((req.query.section as string) || 'all').toLowerCase();

    // 1. Fetch Invoices from DB customer_billing and merge RAM invoicesList for instant visibility
    const { data: dbInvoices } = await supabase
      .from('customer_billing')
      .select('*')
      .order('created_at', { ascending: true });

    const formattedDbInvoices = (dbInvoices || []).map(formatCustomerBillingToInvoice);
    const combinedInvoicesMap = new Map<string, any>();
    formattedDbInvoices.forEach((inv: any) => combinedInvoicesMap.set(String(inv.id), inv));
    invoicesList.forEach((inv: any) => combinedInvoicesMap.set(String(inv.id), inv));

    // Fetch Orders table from Supabase to check submitted status ('yes' / 'no') and item_submitted_at delivery timestamp
    const { data: dbOrdersList } = await supabase
      .from('orders')
      .select('*');

    const invoices = Array.from(combinedInvoicesMap.values()).filter((inv) => {
      const orderKey = String(inv.id || inv.receipt_json_data?.order_id || '').toLowerCase();
      const matchedOrd = (dbOrdersList || []).find((o: any) => String(o.id || o.order_id || '').toLowerCase() === orderKey);
      const isOrderType = (inv.receipt_json_data?.transaction_type || inv.transaction_type || '').toUpperCase() === 'ORDER';
      const isSubmitted = (matchedOrd?.submitted || inv.submitted || 'no').toLowerCase() === 'yes';

      // Delivered custom orders filter by item_submitted_at (or updated_at); pending orders/direct sales filter by created_at
      const effectiveDate = isOrderType && isSubmitted && (matchedOrd?.item_submitted_at || matchedOrd?.updated_at)
        ? (matchedOrd.item_submitted_at || matchedOrd.updated_at)
        : inv.created_at;

      return matchesDateFilterIST(effectiveDate, targetDate, startDate, endDate);
    });

    // 3. Fetch Workers table & Worker Transactions for targetDate
    const { data: dbWorkers } = await supabase.from('workers').select('id, name');
    const workerNameMap = new Map<string, string>();
    (dbWorkers || []).forEach((w: any) => {
      if (w.id && w.name) {
        workerNameMap.set(String(w.id).toLowerCase(), w.name);
        workerNameMap.set(String(w.id), w.name);
      }
    });

    const { data: workerTxns } = await supabase
      .from('worker_transactions')
      .select('*')
      .order('created_at', { ascending: true });

    const workerTransactions = (workerTxns || []).filter((tx) => matchesDateFilterIST(tx.created_at, targetDate, startDate, endDate));

    // 4. Fetch Added Inventory Products for targetDate
    const { data: dbProducts } = await supabase
      .from('inventory_products')
      .select('*')
      .order('created_at', { ascending: true });

    const addedProductsToday = (dbProducts || []).filter((p) => matchesDateFilterIST(p.created_at, targetDate, startDate, endDate));

    // 5. Fetch Finance Loans from Supabase 'finance' table for targetDate
    const { data: dbLoans } = await supabase
      .from('finance')
      .select('*')
      .order('created_at', { ascending: true });

    const loansToday = (dbLoans || []).filter((fl) => matchesDateFilterIST(fl.created_at || fl.debt_date || fl.loan_date, targetDate, startDate, endDate));

    // 5.5 Fetch Cash Ledger transactions from Supabase 'cash_transaction_ledger'
    const { data: dbCashLedger } = await supabase
      .from('cash_transaction_ledger')
      .select('*')
      .order('created_at', { ascending: true });

    const cashLedgerToday = (dbCashLedger || []).filter((tx) => matchesDateFilterIST(tx.created_at, targetDate, startDate, endDate));

    // 6. Fetch customer_billing & billing_sell_buy_records for fast Transaction Activity calculation
    const [{ data: dbCustomerBills }, { data: dbBillingRecords }] = await Promise.all([
      supabase.from('customer_billing').select('*').order('created_at', { ascending: true }),
      supabase.from('billing_sell_buy_records').select('*').order('created_at', { ascending: true }),
    ]);

    const matchedCustomerBills = (dbCustomerBills || []).filter((b) => matchesDateFilterIST(b.created_at, targetDate, startDate, endDate));
    const matchedBillingRecords = (dbBillingRecords || []).filter((r) => {
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
      return matchesDateFilterIST(effectiveDate, targetDate, startDate, endDate);
    });

    const billTypeMap = new Map<string, string>();
    let customerBillsOrderCount = 0;
    let customerBillsSellCount = 0;
    let customerBillsBuyCount = 0;
    let customerBillsTradeInCount = 0;

    matchedCustomerBills.forEach((b: any) => {
      const type = (b.bill_type || '').toUpperCase();
      const uuid = String(b.customer_billing_uuid || b.billing_id || '');
      if (uuid) billTypeMap.set(uuid, type);

      if (type === 'ORDER') customerBillsOrderCount++;
      else if (type === 'SELL') customerBillsSellCount++;
      else if (type === 'BUY') customerBillsBuyCount++;
      else if (type === 'EXCHANGE' || type === 'TRADE_IN') customerBillsTradeInCount++;
    });

    // 1. Group records strictly by customer_billing_uuid / billing_id
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

    const billMap = new Map<string, { mode: string; items: any[] }>();

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

    // Include any customer_billing bills without line items, extracting items/buy_records from receipt_json_data or dbOrdersList
    matchedCustomerBills.forEach((b: any) => {
      const rawUuid = String(b.customer_billing_uuid || b.billing_id || b.id || '');
      if (!rawUuid) return;
      const uuid = getCanonicalKey(rawUuid);
      let mode = (b.bill_type || 'SELL').toUpperCase();
      if (mode === 'EXCHANGE') mode = 'TRADE_IN';

      if (!billMap.has(uuid)) {
        billMap.set(uuid, { mode, items: [] });
      }

      const existingEntry = billMap.get(uuid)!;
      if (existingEntry.items.length === 0) {
        if (b.receipt_json_data) {
          const jsonItems = b.receipt_json_data.items || b.receipt_json_data.line_items || [];
          const jsonBuyRecords = b.receipt_json_data.buy_records || b.receipt_json_data.old_metal || [];

          jsonItems.forEach((it: any) => {
            existingEntry.items.push({
              transaction_type: (it.item_type || 'SELL').toUpperCase(),
              metal_type: (it.metal_type || b.metal_type || 'GOLD').toUpperCase(),
              item_weight: Number(it.weight_grams || it.item_weight || 0),
              only_metal_weight: Number(it.net_weight_grams || it.weight_grams || 0),
              pure_metal_weight: Number(it.fine_weight_grams || it.weight_grams || 0),
            });
          });

          jsonBuyRecords.forEach((it: any) => {
            existingEntry.items.push({
              transaction_type: (it.item_type || 'BUY').toUpperCase(),
              metal_type: (it.metal_type || 'GOLD').toUpperCase(),
              item_weight: Number(it.weight_grams || it.item_weight || 0),
              only_metal_weight: Number(it.net_weight_grams || it.weight_grams || 0),
              pure_metal_weight: Number(it.fine_weight_grams || it.weight_grams || 0),
            });
          });
        }
      }

      // Ensure SELL ornament item is extracted if mode === 'ORDER' and not present in items yet
      const hasSellItem = existingEntry.items.some((it: any) => (it.transaction_type || it.item_type || '').toUpperCase() === 'SELL');
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

        const stillHasSellItem = existingEntry.items.some((it: any) => (it.transaction_type || it.item_type || '').toUpperCase() === 'SELL');
        if (!stillHasSellItem) {
          const bUuid = String(b.customer_billing_uuid || '').toLowerCase();
          const bId = String(b.billing_id || b.id || '').toLowerCase();
          const rawUuid = String(uuid).toLowerCase();

          const matchedOrd = (dbOrdersList || []).find((o: any) => {
            const oId = String(o.id || o.order_id || '').toLowerCase();
            const oUuid = String(o.customer_billing_uuid || '').toLowerCase();

            return (
              (oUuid && (oUuid === bUuid || oUuid === rawUuid)) ||
              (oId && (oId === bId || oId === rawUuid)) ||
              (o.customer_name && b.customer_name && o.customer_name.trim().toLowerCase() === b.customer_name.trim().toLowerCase() && Math.abs(new Date(o.created_at).getTime() - new Date(b.created_at).getTime()) < 86400000)
            );
          });

          if (matchedOrd) {
            const ordAny = matchedOrd as any;
            existingEntry.items.push({
              transaction_type: 'SELL',
              metal_type: (ordAny.metal_type || 'GOLD').toUpperCase(),
              item_weight: Number(ordAny.gross_weight_grams || ordAny.net_weight_grams || ordAny.weight_grams || 0),
              only_metal_weight: Number(ordAny.net_weight_grams || ordAny.gross_weight_grams || ordAny.weight_grams || 0),
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
    const sellTracker = createDetailedWeightTracker();
    const buyTracker = createDetailedWeightTracker();
    const tradeInTracker = createDetailedWeightTracker();

    const recordItemToTracker = (r: any, tracker: any) => {
      const txType = (r.transaction_type || r.item_type || '').toUpperCase();
      const metal = (r.metal_type || 'GOLD').toUpperCase();
      const gross = Number(r.item_weight || r.weight_grams || r.gross_weight_grams || 0) || 0;
      const net = Number(r.only_metal_weight ?? r.net_weight_grams ?? Math.max(0, gross - (Number(r.deduction_weight) || 0)));
      const pure = Number(r.pure_metal_weight ?? r.fine_weight_grams) || net;

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

    let finalOrderCount = 0;
    let finalSellCount = 0;
    let finalBuyCount = 0;
    let finalTradeInCount = 0;

    billMap.forEach(({ mode, items }, uuid) => {
      if (mode === 'ORDER') {
        finalOrderCount++;
        const matchedOrd = (dbOrdersList || []).find((o: any) => {
          const oId = String(o.id || o.order_id || '').toLowerCase();
          const oUuid = String(o.customer_billing_uuid || '').toLowerCase();
          const rawUuid = String(uuid).toLowerCase();
          return (
            (oUuid && oUuid === rawUuid) ||
            (oId && oId === rawUuid)
          );
        });
        const isSubmitted = matchedOrd ? (matchedOrd.submitted || 'no').toLowerCase() === 'yes' : true;

        items.forEach((it) => {
          const itemType = (it.item_type || it.transaction_type || '').toUpperCase();
          // Scrap/Old Metal bought from customer in ORDER is ALWAYS counted immediately on registration date!
          if (itemType === 'BUY' || itemType === 'EXCHANGE_BUY') {
            recordItemToTracker(it, orderTracker);
          } else if (itemType === 'SELL' && isSubmitted) {
            // Sold item in custom order is counted ONLY when submitted = 'yes'
            recordItemToTracker(it, orderTracker);
          }
        });
      } else if (mode === 'SELL') {
        finalSellCount++;
        items.forEach((it) => recordItemToTracker(it, sellTracker));
      } else if (mode === 'BUY') {
        finalBuyCount++;
        items.forEach((it) => recordItemToTracker(it, buyTracker));
      } else if (mode === 'TRADE_IN') {
        finalTradeInCount++;
        items.forEach((it) => recordItemToTracker(it, tradeInTracker));
      }
    });

    const totalTransactionsCount = finalOrderCount + finalSellCount + finalBuyCount + finalTradeInCount;

    const roundDetailedTracker = (t: any) => ({
      sellsCount: t.sellsCount,
      buysCount: t.buysCount,
      goldSoldGross: round3Decimals(t.goldSoldGross),
      goldSoldNet: round3Decimals(t.goldSoldNet),
      goldSoldPure: round3Decimals(t.goldSoldPure),
      goldBoughtGross: round3Decimals(t.goldBoughtGross),
      goldBoughtNet: round3Decimals(t.goldBoughtNet),
      goldBoughtPure: round3Decimals(t.goldBoughtPure),
      silverSoldGross: round3Decimals(t.silverSoldGross),
      silverSoldNet: round3Decimals(t.silverSoldNet),
      silverSoldPure: round3Decimals(t.silverSoldPure),
      silverBoughtGross: round3Decimals(t.silverBoughtGross),
      silverBoughtNet: round3Decimals(t.silverBoughtNet),
      silverBoughtPure: round3Decimals(t.silverBoughtPure),
    });

    const totalGoldSoldGross = round3Decimals(orderTracker.goldSoldGross + sellTracker.goldSoldGross + buyTracker.goldSoldGross + tradeInTracker.goldSoldGross);
    const totalGoldSoldNet = round3Decimals(orderTracker.goldSoldNet + sellTracker.goldSoldNet + buyTracker.goldSoldNet + tradeInTracker.goldSoldNet);
    const totalGoldSoldPure = round3Decimals(orderTracker.goldSoldPure + sellTracker.goldSoldPure + buyTracker.goldSoldPure + tradeInTracker.goldSoldPure);

    const totalGoldBoughtGross = round3Decimals(orderTracker.goldBoughtGross + sellTracker.goldBoughtGross + buyTracker.goldBoughtGross + tradeInTracker.goldBoughtGross);
    const totalGoldBoughtNet = round3Decimals(orderTracker.goldBoughtNet + sellTracker.goldBoughtNet + buyTracker.goldBoughtNet + tradeInTracker.goldBoughtNet);
    const totalGoldBoughtPure = round3Decimals(orderTracker.goldBoughtPure + sellTracker.goldBoughtPure + buyTracker.goldBoughtPure + tradeInTracker.goldBoughtPure);

    const totalSilverSoldGross = round3Decimals(orderTracker.silverSoldGross + sellTracker.silverSoldGross + buyTracker.silverSoldGross + tradeInTracker.silverSoldGross);
    const totalSilverSoldNet = round3Decimals(orderTracker.silverSoldNet + sellTracker.silverSoldNet + buyTracker.silverSoldNet + tradeInTracker.silverSoldNet);
    const totalSilverSoldPure = round3Decimals(orderTracker.silverSoldPure + sellTracker.silverSoldPure + buyTracker.silverSoldPure + tradeInTracker.silverSoldPure);

    const totalSilverBoughtGross = round3Decimals(orderTracker.silverBoughtGross + sellTracker.silverBoughtGross + buyTracker.silverBoughtGross + tradeInTracker.silverBoughtGross);
    const totalSilverBoughtNet = round3Decimals(orderTracker.silverBoughtNet + sellTracker.silverBoughtNet + buyTracker.silverBoughtNet + tradeInTracker.silverBoughtNet);
    const totalSilverBoughtPure = round3Decimals(orderTracker.silverBoughtPure + sellTracker.silverBoughtPure + buyTracker.silverBoughtPure + tradeInTracker.silverBoughtPure);

    const netPureGoldFlow = round3Decimals(totalGoldBoughtPure - totalGoldSoldPure);
    const netPureSilverFlow = round3Decimals(totalSilverBoughtPure - totalSilverSoldPure);

    const overallMetalPuritySummary = {
      gold: {
        soldGross: totalGoldSoldGross,
        soldNet: totalGoldSoldNet,
        soldPure: totalGoldSoldPure,
        boughtGross: totalGoldBoughtGross,
        boughtNet: totalGoldBoughtNet,
        boughtPure: totalGoldBoughtPure,
        netPureFlow: netPureGoldFlow,
      },
      silver: {
        soldGross: totalSilverSoldGross,
        soldNet: totalSilverSoldNet,
        soldPure: totalSilverSoldPure,
        boughtGross: totalSilverBoughtGross,
        boughtNet: totalSilverBoughtNet,
        boughtPure: totalSilverBoughtPure,
        netPureFlow: netPureSilverFlow,
      }
    };

    // --- All-Time Overall Stock & Cash Flow Calculation (Unfiltered by date) ---
    const allTimeOrderTracker = createDetailedWeightTracker();
    const allTimeSellTracker = createDetailedWeightTracker();
    const allTimeBuyTracker = createDetailedWeightTracker();
    const allTimeTradeInTracker = createDetailedWeightTracker();

    (dbBillingRecords || []).forEach((r: any) => {
      const mode = (r.billing_mode || '').toUpperCase();
      let tracker = allTimeSellTracker;
      if (mode === 'ORDER') tracker = allTimeOrderTracker;
      else if (mode === 'BUY') tracker = allTimeBuyTracker;
      else if (mode === 'TRADE_IN' || mode === 'EXCHANGE') tracker = allTimeTradeInTracker;
      recordItemToTracker(r, tracker);
    });

    const allTimeGoldSold = round3Decimals(allTimeOrderTracker.goldSoldGross + allTimeSellTracker.goldSoldGross + allTimeBuyTracker.goldSoldGross + allTimeTradeInTracker.goldSoldGross);
    const allTimeGoldBought = round3Decimals(allTimeOrderTracker.goldBoughtGross + allTimeSellTracker.goldBoughtGross + allTimeBuyTracker.goldBoughtGross + allTimeTradeInTracker.goldBoughtGross);
    const allTimeSilverSold = round3Decimals(allTimeOrderTracker.silverSoldGross + allTimeSellTracker.silverSoldGross + allTimeBuyTracker.silverSoldGross + allTimeTradeInTracker.silverSoldGross);
    const allTimeSilverBought = round3Decimals(allTimeOrderTracker.silverBoughtGross + allTimeSellTracker.silverBoughtGross + allTimeBuyTracker.silverBoughtGross + allTimeTradeInTracker.silverBoughtGross);

    let allTimeCashIn = 0;
    let allTimeCashOut = 0;
    let allTimeFinanceIssued = 0;
    let allTimeFinanceClearedCount = 0;
    let allTimeFinanceTakenCount = 0;

    (dbCustomerBills || []).forEach((b: any) => {
      allTimeCashIn += Number(b.paid_amount || b.final_amount || 0);
    });

    (dbLoans || []).forEach((fl: any) => {
      const isRepayment = (fl.status || '').toUpperCase() === 'CLEARED' || (fl.type || '').toUpperCase() === 'REPAYMENT';
      const amt = Number(fl.amount || fl.principal_amount || 0);
      if (isRepayment) {
        allTimeCashIn += amt;
        allTimeFinanceClearedCount++;
      } else {
        allTimeCashOut += amt;
        allTimeFinanceIssued += amt;
        allTimeFinanceTakenCount++;
      }
    });

    const allTimeSummary = {
      cashFlow: {
        totalCashCollected: round3Decimals(allTimeCashIn - allTimeCashOut),
        cashIn: round3Decimals(allTimeCashIn),
        cashOut: round3Decimals(allTimeCashOut),
      },
      finance: {
        totalFinanceIssued: round3Decimals(allTimeFinanceIssued),
        financeClearedCount: allTimeFinanceClearedCount,
        financeTakenCount: allTimeFinanceTakenCount,
        cashIn: round3Decimals(allTimeCashIn),
        cashOut: round3Decimals(allTimeCashOut),
      },
      goldFlow: {
        goldIn: allTimeGoldBought,
        goldOut: allTimeGoldSold,
        goldNetFlow: round3Decimals(allTimeGoldBought - allTimeGoldSold),
      },
      silverFlow: {
        silverIn: allTimeSilverBought,
        silverOut: allTimeSilverSold,
        silverNetFlow: round3Decimals(allTimeSilverBought - allTimeSilverSold),
      },
    };

    const billingActivitySummary = {
      totalTransactionsCount,
      orderMode: { count: finalOrderCount, ...roundDetailedTracker(orderTracker) },
      sellMode: { count: finalSellCount, ...roundDetailedTracker(sellTracker) },
      buyMode: { count: finalBuyCount, ...roundDetailedTracker(buyTracker) },
      tradeInMode: { count: finalTradeInCount, ...roundDetailedTracker(tradeInTracker) },
      overallMetalPuritySummary,
      allTimeSummary,
      activityCounts: {
        orderCount: finalOrderCount,
        sellCount: finalSellCount,
        buyCount: finalBuyCount,
        exchangeCount: finalTradeInCount,
      }
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

    // Process Added Inventory Products
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

    // Process Finance Loans
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
        created_at: fl.created_at || fl.debt_date || fl.loan_date || new Date().toISOString(),
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

    // Process Worker / Karigar Transactions (Admin <-> Worker Transfers)
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
        created_at: tx.created_at || new Date().toISOString(),
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

    // Process Cash Register Ledger Transactions (Cash Loaded / Manual Cash Entries)
    cashLedgerToday.forEach((tx: any) => {
      const type = (tx.transaction_type || '').toUpperCase();
      const formattedTime = tx.created_at
        ? new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '12:00 PM';
      const amt = Number(tx.transaction_cash_total || 0);
      const isFlowIn = (tx.flow_type || '').toUpperCase() === 'IN';

      // Handle Finance Loan Repayments/Installments recorded in cash drawer
      if (type === 'FINANCE') {
        const isRepayment = isFlowIn || (tx.item_type || '').toLowerCase().includes('payment') || (tx.item_type || '').toLowerCase().includes('repay') || (tx.notes || '').toLowerCase().includes('received');
        if (isRepayment) {
          logBookTimeline.push({
            id: `log-fin-repay-${tx.id || tx.uuid || tx.cash_history_uuid || Math.random()}`,
            time: formattedTime,
            created_at: tx.created_at || new Date().toISOString(),
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

      // Skip bill-based cash entries (SELL, BUY, EXCHANGE, ORDER) as they are logged via invoices below
      if (type === 'SELL' || type === 'BUY' || type === 'EXCHANGE' || type === 'ORDER') return;

      logBookTimeline.push({
        id: `log-cash-${tx.cash_history_uuid || tx.id || Math.random()}`,
        time: formattedTime,
        created_at: tx.created_at || new Date().toISOString(),
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

    // Process Invoices (Orders, Sells, Buys, Trade-ins from customer_billing)
    invoices.forEach((inv: any) => {
      const formattedTime = inv.created_at
        ? new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '10:00 AM';

      const jsonMode = (inv.receipt_json_data?.transaction_type || inv.transaction_type || 'SELL').toUpperCase();
      const items = inv.receipt_json_data?.items || [];
      const netAmount = Number(inv.final_amount || inv.receipt_json_data?.netPayable || 0);
      const paidAmount = Number(inv.paid_amount || inv.receipt_json_data?.advancePaidAmount || netAmount);
      const dueAmount = Number(inv.due_amount || inv.receipt_json_data?.balanceDueAmount || 0);

      const orderKey = String(inv.id || inv.receipt_json_data?.order_id || '').toLowerCase();
      const matchedDbOrder = (dbOrdersList || []).find((o: any) => String(o.id || o.order_id || '').toLowerCase() === orderKey);
      const isSubmitted = (matchedDbOrder?.submitted || inv.submitted || inv.receipt_json_data?.submitted || 'no').toLowerCase() === 'yes';
      const isOrderType = jsonMode === 'ORDER';
      const isStockDebited = !isOrderType || isSubmitted; // Custom orders debit stock ONLY when submitted = 'yes'

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

      // Build rich description if multi-item (Order or Exchange)
      const sellItems = items.filter((it: any) => it.item_type === 'SELL');
      const buyItems = items.filter((it: any) => it.item_type === 'BUY' || it.item_type === 'EXCHANGE_BUY');
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

      // Deduction timestamp: Use item_submitted_at (or updated_at) timestamp when submitted = 'yes', otherwise creation date
      const effectiveCreatedAt = isOrderType && isSubmitted && (matchedDbOrder?.item_submitted_at || matchedDbOrder?.updated_at)
        ? (matchedDbOrder.item_submitted_at || matchedDbOrder.updated_at)
        : inv.created_at;

      logBookTimeline.push({
        id: `log-inv-${inv.id}`,
        time: formattedTime,
        created_at: effectiveCreatedAt,
        type: jsonMode === 'TRADE_IN' ? 'EXCHANGE' : jsonMode,
        title: inv.customer_name || 'Walk-in Customer',
        details: detailsText,
        category: inv.metal_type || 'GOLD',
        weight_grams: Number(inv.weight_grams || 0),
        amount: netAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        submitted: isSubmitted ? 'yes' : 'no',
        stock_debited: isStockDebited,
        payment_mode: inv.receipt_json_data?.paymentType || (dueAmount === 0 ? 'FULL' : 'PARTIAL'),
        customer_phone: inv.customer_phone,
        flow_type: isOutflow ? 'OUT' : 'IN',
        direction: isOutflow ? 'SHOP_TO_CUSTOMER' : 'CUSTOMER_TO_SHOP',
        raw_invoice: inv,
      });
    });

    // Deduplicate logBookTimeline by unique ID
    const seenTimelineIds = new Set<string>();
    const deduplicatedTimeline: any[] = [];
    logBookTimeline.forEach((item: any) => {
      const dedupKey = String(item.id || `${item.type}_${item.created_at}_${item.amount}`);
      if (!seenTimelineIds.has(dedupKey)) {
        seenTimelineIds.add(dedupKey);
        deduplicatedTimeline.push(item);
      }
    });

    // Sort timeline by created_at ascending and assign S.No + Payment Status Badges
    deduplicatedTimeline.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    deduplicatedTimeline.forEach((item, index) => {
      item.sNo = index + 1;
      item.payment_status = item.due_amount > 0 ? 'PARTIAL' : 'FULL';
    });

    // --- Category Stock Balance Summary (100% Dynamic from inventory_products) ---
    let currentGoldShowcase = 0;
    let currentSilverShowcase = 0;
    (dbProducts || []).forEach((p: any) => {
      const metal = (p.item_type || p.metal_type || 'GOLD').toUpperCase();
      const wt = Number(p.stock_quantity || p.weight_grams || p.weight_from_grams || 0);
      if (metal.includes('SILVER')) {
        currentSilverShowcase += wt;
      } else {
        currentGoldShowcase += wt;
      }
    });

    const goldLoadedToday = addedProductsToday
      .filter((p: any) => !(p.item_type || 'GOLD').toUpperCase().includes('SILVER'))
      .reduce((sum: number, p: any) => sum + Number(p.stock_quantity || p.weight_grams || 0), 0);
    const silverLoadedToday = addedProductsToday
      .filter((p: any) => (p.item_type || 'GOLD').toUpperCase().includes('SILVER'))
      .reduce((sum: number, p: any) => sum + Number(p.stock_quantity || p.weight_grams || 0), 0);

    const goldWorkerOutToday = (workerTransactions || [])
      .filter((tx: any) => {
        const dir = String(tx.direction || tx.transfer_direction || tx.type || '').toUpperCase();
        const isAdminToWorker = dir.includes('OUTGOING') || dir.includes('ADMIN') || dir.includes('SEND') || dir.includes('ISSUE');
        const itemMode = (tx.category || tx.item_type || tx.metal_type || 'GOLD').toUpperCase();
        return isAdminToWorker && itemMode.includes('GOLD');
      })
      .reduce((sum: number, tx: any) => sum + Number(tx.weight_grams || tx.net_weight || tx.fine_weight_grams || 0), 0);

    const silverWorkerOutToday = (workerTransactions || [])
      .filter((tx: any) => {
        const dir = String(tx.direction || tx.transfer_direction || tx.type || '').toUpperCase();
        const isAdminToWorker = dir.includes('OUTGOING') || dir.includes('ADMIN') || dir.includes('SEND') || dir.includes('ISSUE');
        const itemMode = (tx.category || tx.item_type || tx.metal_type || 'GOLD').toUpperCase();
        return isAdminToWorker && itemMode.includes('SILVER');
      })
      .reduce((sum: number, tx: any) => sum + Number(tx.weight_grams || tx.net_weight || tx.fine_weight_grams || 0), 0);

    // --- Cash & Register Summary (100% Dynamic from cash_history) ---
    const { data: todayCashRow } = await supabase
      .from('cash_history')
      .select('*')
      .lte('date', targetDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let liveClosingCash = 0;
    let openingCash = 0;

    if (todayCashRow) {
      liveClosingCash = Number(todayCashRow.current_cash || 0);
      // Get opening cash from previous day
      const { data: prevCashRow } = await supabase
        .from('cash_history')
        .select('*')
        .lt('date', todayCashRow.date)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      openingCash = Number(prevCashRow?.current_cash || liveClosingCash);
    }

    const isHistoricalPastDate = targetDate !== 'all' && targetDate !== todayIST;
    const fallbackGoldGrams = isHistoricalPastDate ? 0 : round3Decimals(currentGoldShowcase + totalGoldWeightSold + goldWorkerOutToday);
    const fallbackSilverGrams = isHistoricalPastDate ? 0 : round3Decimals(currentSilverShowcase + totalSilverWeightSold + silverWorkerOutToday);

    const { getOrInitOpeningRecord } = await import('../../utils/openingRecordHelper');
    const openingRecord = await getOrInitOpeningRecord(
      targetDate,
      {
        goldGrams: fallbackGoldGrams,
        silverGrams: fallbackSilverGrams,
        cashAmount: Number(openingCash.toFixed(2))
      },
      { goldGrams: round3Decimals(goldLoadedToday), silverGrams: round3Decimals(silverLoadedToday) }
    );

    const goldOpeningWeight = round3Decimals(openingRecord.openingGoldGrams);
    const silverOpeningWeight = round3Decimals(openingRecord.openingSilverGrams);

    const stockSummary = [
      {
        category: 'Gold Ornaments',
        openingWeight: goldOpeningWeight,
        loadedWeight: round3Decimals(goldLoadedToday),
        soldWeight: totalGoldWeightSold,
        closingWeight: round3Decimals(currentGoldShowcase),
      },
      {
        category: 'Silver Articles & Ornaments',
        openingWeight: silverOpeningWeight,
        loadedWeight: round3Decimals(silverLoadedToday),
        soldWeight: totalSilverWeightSold,
        closingWeight: round3Decimals(currentSilverShowcase),
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

    // --- Scrap Vault Summary ---
    const scrapSummary = {
      oldGoldBoughtWeight: totalGoldWeightBought,
      oldSilverBoughtWeight: totalSilverWeightBought,
      totalScrapPayout,
    };

    // Extract Old Metal Vault Customer Items
    const oldMetalVaultItems: any[] = [];
    invoices.forEach((inv: any) => {
      let rData: any = inv.receipt_json_data;
      if (typeof rData === 'string') {
        try { rData = JSON.parse(rData); } catch (e) { }
      }

      if (rData && Array.isArray(rData.items)) {
        rData.items.forEach((it: any) => {
          if (it.item_type === 'BUY' || it.item_type === 'EXCHANGE_BUY') {
            const wt = Number(it.weight_grams || 0);
            const purity = Number(it.purity_percentage || it.purity || 91.6);
            const pureWt = round3Decimals(wt * (purity / 100));
            oldMetalVaultItems.push({
              id: `scrap-${inv.id}-${it.id || Math.random()}`,
              customer_name: inv.customer_name || 'Customer',
              customer_phone: inv.customer_phone || 'N/A',
              created_at: inv.created_at,
              item_name: it.product_name || (it.metal_type + ' Scrap Item'),
              metal_type: (it.metal_type || 'GOLD').toUpperCase(),
              gross_weight: wt,
              purity_percentage: purity,
              pure_weight: pureWt,
              payout_amount: Number(it.total_price || 0),
            });
          }
        });
      }
    });

    // --- Udhaari & Karigar Summary ---
    const karigarGoldIssued = workerTransactions.reduce((sum: number, tx: any) =>
      tx.direction === 'OUTGOING' ? sum + Number(tx.weight_grams || tx.fine_gold_grams || 0) : sum, 0);
    const karigarGoldReceived = workerTransactions.reduce((sum: number, tx: any) =>
      tx.direction !== 'OUTGOING' ? sum + Number(tx.weight_grams || tx.fine_gold_grams || 0) : sum, 0);

    const udhaariSummary = {
      newDuesCreated,
      oldDuesCollected,
      karigarGoldIssued,
      karigarGoldReceived,
    };


    // --- Profit Summary ---
    const dailyExpenses = 0;
    const netProfit = makingChargesProfit - dailyExpenses;
    const profitSummary = {
      makingChargesProfit,
      metalMarginProfit: round3Decimals(totalSalesValue * 0.05),
      grossProfit: makingChargesProfit + round3Decimals(totalSalesValue * 0.05),
      dailyExpenses,
      netProfit: Math.max(0, netProfit + round3Decimals(totalSalesValue * 0.05)),
    };

    return res.json({
      success: true,
      date: targetDate,
      section,
      logBookTimeline: deduplicatedTimeline,
      stockSummary,
      cashSummary,
      cashLedgerRecords: cashLedgerToday || [],
      scrapSummary,
      oldMetalVaultItems,
      udhaariSummary,
      profitSummary,
      billingActivitySummary,
      activityCounts: billingActivitySummary.activityCounts,
    });
  } catch (err: any) {
    console.error('Error fetching day book accounts:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error fetching day book accounts' });
  }
});

export default router;
