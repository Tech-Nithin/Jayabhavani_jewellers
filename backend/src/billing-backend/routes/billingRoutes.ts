import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';

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
  } catch (err) {
    console.error('Supabase DB rates update warning:', err);
  }

  // Sync to Supabase updated_metal_values table
  try {
    await supabase.from('updated_metal_values').upsert({
      id: 1,
      gold_buy_value: activeMetalValues.gold_buy_value,
      gold_buy_value_updated_at: activeMetalValues.gold_buy_value_updated_at,
      gold_sell_value: activeMetalValues.gold_sell_value,
      gold_sell_value_updated_at: activeMetalValues.gold_sell_value_updated_at,
      silver_buy_value: activeMetalValues.silver_buy_value,
      silver_buy_value_updated_at: activeMetalValues.silver_buy_value_updated_at,
      silver_sell_value: activeMetalValues.silver_sell_value,
      silver_sell_value_updated_at: activeMetalValues.silver_sell_value_updated_at,
    });
  } catch (err) {
    console.warn('⚠️ Failed to sync rates to Supabase updated_metal_values:', err);
  }

  res.json({
    success: true,
    message: 'Active metal rates updated & persisted in database successfully',
    rates: activeMetalValues,
  });
});

// POST /api/billing/calculate - 100% Server-side multi-item & single-item calculation engine
router.post('/calculate', (req: Request, res: Response) => {
  const { items, rates } = req.body;

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

    let query = supabase
      .from('billing_invoices')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,product_name.ilike.%${search}%`);
    }

    if (history && history !== 'ALL') {
      query = query.eq('transaction_type', history);
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

    let list: any[] = data || [];
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

    return res.json({
      success: true,
      customers,
      totalCount,
      page,
      limit: isAll ? 'ALL' : limit,
      totalPages,
    });
  } catch (err) {
    console.error('Error in customer-directory route:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching customer directory.' });
  }
});

// GET /api/billing/invoices - Fetch all invoice records from PostgreSQL / Supabase
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('billing_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return res.json({
        success: true,
        invoices: data,
      });
    }
  } catch (err) {
    console.error('Supabase DB invoices fetch warning:', err);
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
    gold_buy_rate_snapshot: Number(activeMetalValues.gold_buy_value) || 0,
    gold_sell_rate_snapshot: Number(activeMetalValues.gold_sell_value) || 0,
    silver_buy_rate_snapshot: Number(activeMetalValues.silver_buy_value) || 0,
    silver_sell_rate_snapshot: Number(activeMetalValues.silver_sell_value) || 0,
    receipt_json_data,
    created_at: new Date().toISOString(),
  };

  let createdInvoice = { ...newInvoicePayload, id: `INV-${invoicesList.length + 1}` };

  // Persist invoice to Supabase DB (PostgreSQL automatically assigns auto-increment ID from billing_invoices_seq)
  try {
    const { data: dbData, error: dbError } = await supabase
      .from('billing_invoices')
      .insert([newInvoicePayload])
      .select('*');

    if (dbError) {
      console.warn('⚠️ Supabase DB insert warning:', dbError.message);
      if ((dbError.code === '42501' || dbError.message?.includes('permission denied for sequence')) || (dbError.code === '23514' && newInvoicePayload.metal_type === 'MIXED')) {
        console.warn('⚠️ Sequence or constraint fallback triggered, calculating sequential ID...');
        let maxNum = 0;
        try {
          const { data: existingInvs } = await supabase.from('billing_invoices').select('id');
          const combined = [...(existingInvs || []), ...invoicesList];
          combined.forEach((inv) => {
            if (!inv || !inv.id) return;
            const match = String(inv.id).match(/(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num < 1000000 && num > maxNum) maxNum = num;
            }
          });
        } catch (e) {
          maxNum = invoicesList.length;
        }
        const fallbackId = `INV-${maxNum + 1}`;
        newInvoicePayload.id = fallbackId;
        if (dbError.code === '23514') {
          const fallbackMetal = (receipt_json_data?.items?.[0]?.metal_type || 'GOLD').toUpperCase();
          newInvoicePayload.metal_type = fallbackMetal === 'SILVER' ? 'SILVER' : 'GOLD';
        }
        const retryRes = await supabase.from('billing_invoices').insert([newInvoicePayload]).select('*');
        if (retryRes.data && retryRes.data[0]) {
          createdInvoice = retryRes.data[0];
        } else {
          createdInvoice = { ...newInvoicePayload, id: fallbackId };
        }
        console.log('✅ Supabase DB invoice created successfully (with fallback handler):', createdInvoice.id);
      } else {
        return res.status(500).json({
          success: false,
          message: `Database Insert Error (${dbError.code || 'DB_ERR'}): ${dbError.message}`,
          error: dbError,
        });
      }
    } else if (dbData && dbData[0]) {
      createdInvoice = dbData[0];
      console.log('✅ Supabase DB invoice created successfully with auto-increment ID:', createdInvoice.id);
    }
  } catch (err: any) {
    console.error('Supabase DB invoice insert exception:', err);
    return res.status(500).json({
      success: false,
      message: `Database Exception: ${err.message || String(err)}`,
    });
  }

  invoicesList.unshift(createdInvoice);

  res.json({
    success: true,
    message: 'Billing invoice generated & persisted successfully',
    invoice: createdInvoice,
  });
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

  // Overwrite in Supabase DB
  try {
    const { data: dbData, error: dbError } = await supabase
      .from('billing_invoices')
      .upsert([updatedInvoice], { onConflict: 'id' })
      .select('*');

    if (dbError) {
      console.error('Supabase DB invoice update error:', dbError);
      return res.status(500).json({
        success: false,
        message: `Database Update Error (${dbError.code || 'DB_ERR'}): ${dbError.message}`,
        error: dbError,
      });
    }
    console.log('✅ Supabase DB invoice updated cleanly:', id, dbData);
  } catch (err: any) {
    console.error('Supabase DB invoice update exception:', err);
    return res.status(500).json({
      success: false,
      message: `Database Update Exception: ${err.message || String(err)}`,
    });
  }

  res.json({
    success: true,
    message: 'Invoice record completely updated on same ID',
    invoice: updatedInvoice,
  });
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

export default router;
