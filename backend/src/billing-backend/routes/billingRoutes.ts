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

  // Trigger automatic stock deduction & cash tracking
  deductInventoryStockOnSale(createdInvoice).catch(() => {});
  recordInvoiceCashTransaction(createdInvoice).catch(() => {});

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
    const finalAmount = Number(invoice.final_amount || 0);
    if (finalAmount <= 0) return;

    const { recordCashTransaction } = await import('../../utils/cashLedgerHelper');

    let flowType: 'IN' | 'OUT' = 'IN';
    if (txnType === 'BUY') {
      flowType = 'OUT'; // Shop pays customer cash for scrap gold
    } else if (txnType === 'SELL' || txnType === 'ORDER') {
      flowType = 'IN'; // Customer pays shop
    } else if (txnType === 'EXCHANGE') {
      flowType = 'IN';
    }

    await recordCashTransaction({
      transaction_id: String(invoice.id),
      transaction_type: txnType as any,
      flow_type: flowType,
      amount: finalAmount,
      metal_type: invoice.metal_type || 'GOLD',
      item_type: invoice.product_name || `${txnType} Invoice`,
      notes: `${txnType} Invoice #${invoice.id} - ${invoice.customer_name || 'Walk-in'}`,
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

    res.json({ success: true, summary });
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
  try {
    const targetDate = (req.query.date as string) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
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

    const invoices = Array.from(combinedInvoicesMap.values()).filter((inv) =>
      matchesDateFilterIST(inv.created_at, targetDate, startDate, endDate)
    );

    // 2. Fetch Orders for targetDate
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true });

    const orders = (ordersData || []).filter((ord) => matchesDateFilterIST(ord.created_at, targetDate, startDate, endDate));

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

    // 5. Fetch Finance Loans from Supabase 'interests' table for targetDate
    const { data: dbLoans } = await supabase
      .from('interests')
      .select('*')
      .order('created_at', { ascending: true });

    const loansToday = (dbLoans || []).filter((fl) => matchesDateFilterIST(fl.created_at || fl.loan_date, targetDate, startDate, endDate));

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
      const wt = Number(p.stock_quantity || p.weight_grams || p.weight_from_grams || 0);
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
      const wt = Number(fl.item_weight_grams || fl.net_weight || fl.gross_weight || fl.weight_grams || 0);
      const loanAmt = Number(fl.amount || fl.principal_amount || fl.loan_amount || 0);
      const fullName = `${fl.customer_name || 'Finance'} ${fl.customer_surname || ''}`.trim();

      logBookTimeline.push({
        id: `log-fin-${fl.id || Math.random()}`,
        time: formattedTime,
        created_at: fl.created_at || fl.loan_date || new Date().toISOString(),
        type: 'FINANCE',
        title: fullName || 'Finance Customer',
        details: `Gold Loan Finance · ${fl.item_name || fl.ornament_description || 'Gold Item'} (${wt}g)`,
        category: (fl.item_metal_type || 'GOLD').toUpperCase(),
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

      const directionTitle = isAdminToWorker
        ? `Admin → Worker (${resolvedWorkerName})`
        : `Worker (${resolvedWorkerName}) → Admin`;

      const directionIcon = isAdminToWorker ? '📤 Sent' : '📥 Received';
      const rawNotes = (tx.notes || tx.item_name || tx.description || tx.item_description || '').replace(/\n/g, ' · ');
      const itemDesc = rawNotes || `${itemMode} Transfer`;
      const details = `${directionIcon} ${itemDesc} ${wt > 0 ? `(${wt}g)` : ''} ${amt > 0 ? `· ₹${amt.toLocaleString('en-IN')}` : ''} ${tx.order_id ? `· Order #${tx.order_id}` : ''}`;

      logBookTimeline.push({
        id: `log-worker-${tx.id || Math.random()}`,
        time: formattedTime,
        created_at: tx.created_at || new Date().toISOString(),
        type: 'KARIGAR',
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

    // Process Invoices
    invoices.forEach((inv: any) => {
      const formattedTime = inv.created_at
        ? new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '10:00 AM';

      const jsonMode = inv.receipt_json_data?.transaction_type || inv.transaction_type || 'SELL';
      const items = inv.receipt_json_data?.items || [];
      const netAmount = Number(inv.final_amount || inv.receipt_json_data?.netPayable || 0);
      const paidAmount = Number(inv.paid_amount || inv.receipt_json_data?.advancePaidAmount || netAmount);
      const dueAmount = Number(inv.due_amount || inv.receipt_json_data?.balanceDueAmount || 0);

      const isSell = jsonMode === 'SELL' || jsonMode === 'EXCHANGE';

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
        const isGold = item.metal_type !== 'SILVER';

        if (item.item_type === 'SELL') {
          if (isGold) totalGoldWeightSold += wt;
          else totalSilverWeightSold += wt;
          makingChargesProfit += Number(item.making_charges_per_gram || 0) * wt;
        } else if (item.item_type === 'BUY') {
          if (isGold) totalGoldWeightBought += wt;
          else totalSilverWeightBought += wt;
          totalScrapPayout += Number(item.total_price || 0);
        }
      });

      logBookTimeline.push({
        id: `log-inv-${inv.id}`,
        time: formattedTime,
        created_at: inv.created_at,
        type: jsonMode,
        title: inv.customer_name || 'Walk-in Customer',
        details: `${inv.product_name || 'Jewellery'} · Weight: ${inv.weight_grams || 0}g`,
        category: inv.metal_type || 'GOLD',
        weight_grams: Number(inv.weight_grams || 0),
        amount: netAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        payment_mode: inv.receipt_json_data?.paymentType || 'CASH',
        customer_phone: inv.customer_phone,
        raw_invoice: inv,
      });
    });

    // Process Orders
    orders.forEach((ord: any) => {
      const formattedTime = ord.created_at
        ? new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '11:00 AM';

      const ordTotal = Number(ord.total_amount || ord.grand_total || ord.final_amount || 0);
      const ordPaid = Number(ord.paid_amount || ord.advance_amount || 0);
      const ordDue = Number(ord.due_amount || (ordTotal > ordPaid ? ordTotal - ordPaid : 0));
      const ordWeight = Number(ord.net_weight || ord.gross_weight || ord.weight_grams || 0);

      // Build complete receipt_json_data for order if not already stored in DB
      let ordReceiptJson = ord.receipt_json_data;
      if (typeof ordReceiptJson === 'string') {
        try { ordReceiptJson = JSON.parse(ordReceiptJson); } catch (e) {}
      }

      if (!ordReceiptJson) {
        ordReceiptJson = {
          transaction_type: 'ORDER',
          customer_name: ord.customer_name || 'Customer',
          customer_phone: ord.customer_phone || '',
          customer_address: ord.customer_address || 'Siddipet, Telangana',
          items: Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : [
            {
              id: 'ord-item-1',
              product_name: ord.item_name || 'Custom Jewellery',
              metal_type: (ord.metal_type || 'GOLD').toUpperCase(),
              weight_grams: ordWeight,
              total_price: ordTotal,
              item_type: 'SELL',
              making_charges_per_gram: Number(ord.making_charges || 0),
              wastage_percent: Number(ord.wastage_percent || 0),
            }
          ],
          totalSellValue: ordTotal,
          netPayable: ordTotal,
          advancePaidAmount: ordPaid,
          balanceDueAmount: ordDue,
          paymentType: ordDue === 0 ? 'FULL' : 'PARTIAL',
          notes: ord.notes || '',
          delivery_date: ord.delivery_date || '',
        };
      }

      // Build detailed Order card description for both-way SELL & BUY orders
      let orderDetailsText = '';
      const orderItems = ordReceiptJson?.items || [];
      const sellItems = orderItems.filter((it: any) => it.item_type === 'SELL');
      const buyItems = orderItems.filter((it: any) => it.item_type === 'BUY' || it.item_type === 'EXCHANGE_BUY');

      if (sellItems.length > 0 && buyItems.length > 0) {
        const sellStr = sellItems.map((i: any) => `${i.product_name || 'Item'} (${i.weight_grams || 0}g)`).join(', ');
        const buyStr = buyItems.map((i: any) => `${i.product_name || 'Scrap'} (${i.weight_grams || 0}g)`).join(', ');
        orderDetailsText = `📦 Sold: ${sellStr} | ⚖️ Bought: ${buyStr} · Advance Paid: ₹${ordPaid.toLocaleString('en-IN')}`;
      } else if (sellItems.length > 0) {
        const sellStr = sellItems.map((i: any) => `${i.product_name || 'Item'} (${i.weight_grams || 0}g)`).join(', ');
        orderDetailsText = `📦 Sold: ${sellStr} · Advance Paid: ₹${ordPaid.toLocaleString('en-IN')}`;
      } else {
        orderDetailsText = `📦 Sold: ${ord.item_name || 'Custom Jewellery'} (${ordWeight}g) · Advance Paid: ₹${ordPaid.toLocaleString('en-IN')}`;
      }

      const isBothWay = sellItems.length > 0 && buyItems.length > 0;

      logBookTimeline.push({
        id: `log-ord-${ord.id}`,
        time: formattedTime,
        created_at: ord.created_at,
        type: 'ORDER',
        title: ord.customer_name || 'Customer',
        details: orderDetailsText,
        category: (ord.metal_type || 'GOLD').toUpperCase(),
        weight_grams: ordWeight,
        amount: ordTotal,
        paid_amount: ordPaid,
        due_amount: ordDue,
        payment_mode: 'ADVANCE',
        customer_phone: ord.customer_phone,
        raw_order: { ...ord, receipt_json_data: ordReceiptJson },
      });
    });

    // Sort timeline by created_at ascending and assign S.No + Payment Status Badges
    logBookTimeline.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    logBookTimeline.forEach((item, index) => {
      item.sNo = index + 1;
      item.payment_status = item.due_amount > 0 ? 'PARTIAL' : 'FULL';
    });

    // --- Category Stock Balance Summary ---
    const stockSummary = [
      { category: 'Gold Ornaments (22K)', openingWeight: 1000.000, loadedWeight: 0, soldWeight: totalGoldWeightSold, closingWeight: round3Decimals(1000.000 - totalGoldWeightSold) },
      { category: 'Silver Articles & Ornaments (92.5)', openingWeight: 40000.000, loadedWeight: 0, soldWeight: totalSilverWeightSold, closingWeight: round3Decimals(40000.000 - totalSilverWeightSold) },
    ];

    // --- Cash & Register Summary ---
    const openingCash = 800000;
    const dailyExpenses = 1500;
    const expectedClosingCash = openingCash + totalSalesCash + oldDuesCollected - totalScrapPayout - dailyExpenses;

    const cashSummary = {
      openingCash,
      salesCashCollected: totalSalesCash,
      oldDuesCollected,
      scrapPayout: totalScrapPayout,
      dailyExpenses,
      expectedClosingCash: Math.max(0, expectedClosingCash),
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
        try { rData = JSON.parse(rData); } catch (e) {}
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
      logBookTimeline,
      stockSummary,
      cashSummary,
      scrapSummary,
      oldMetalVaultItems,
      udhaariSummary,
      profitSummary,
    });
  } catch (err: any) {
    console.error('Error fetching day book accounts:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error fetching day book accounts' });
  }
});

export default router;
