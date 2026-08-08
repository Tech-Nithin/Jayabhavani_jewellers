import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';

const router = Router();

// 1. Current Active Rates (matching updated_metal_values table with mandatory individual timestamps)
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

// 2. Rate History Ledger (matching metal_history_rates table)
interface HistoryEntry {
  id: number;
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

// In-memory / DB state for Billing Invoices
let invoicesList = [
  {
    id: 'INV-1001',
    customer_name: 'Rajesh Kumar',
    customer_phone: '9876543210',
    transaction_type: 'SELL',
    metal_type: 'GOLD',
    product_name: '22K Gold Chain',
    weight_grams: 15.500,
    purity_percentage: 91.60,
    applied_rate_per_gram: 14700.00,
    pure_metal_weight: 14.198,
    metal_value: 208710.60,
    making_charges: 6200.00,
    gst_amount: 6447.32,
    final_amount: 221357.92,
    gold_buy_rate_snapshot: 14200.00,
    gold_sell_rate_snapshot: 14700.00,
    silver_buy_rate_snapshot: 250.00,
    silver_sell_rate_snapshot: 270.00,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'INV-1002',
    customer_name: 'Priya Sharma',
    customer_phone: '9123456789',
    transaction_type: 'BUY',
    metal_type: 'SILVER',
    product_name: 'Old Raw Silver Coins',
    weight_grams: 250.000,
    purity_percentage: 99.90,
    applied_rate_per_gram: 250.00,
    pure_metal_weight: 249.750,
    metal_value: 62437.50,
    making_charges: 0.00,
    gst_amount: 0.00,
    final_amount: 62437.50,
    gold_buy_rate_snapshot: 14200.00,
    gold_sell_rate_snapshot: 14700.00,
    silver_buy_rate_snapshot: 250.00,
    silver_sell_rate_snapshot: 270.00,
    created_at: new Date(Date.now() - 43200000).toISOString(),
  },
];

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

// GET /api/billing/rates/history - Fetch history log (from metal_history_rates)
router.get('/rates/history', (req: Request, res: Response) => {
  res.json({
    success: true,
    history: metalHistoryRates,
  });
});

// POST /api/billing/rates - Update active metal values AND insert history log entry
router.post('/rates', async (req: Request, res: Response) => {
  const { gold_buy_value, gold_sell_value, silver_buy_value, silver_sell_value } = req.body;
  const now = new Date().toISOString();

  // 1. Update Gold Buy Value if changed
  if (gold_buy_value !== undefined && Number(gold_buy_value) !== activeMetalValues.gold_buy_value) {
    const oldVal = activeMetalValues.gold_buy_value;
    const newVal = Number(gold_buy_value);
    activeMetalValues.gold_buy_value = newVal;
    activeMetalValues.gold_buy_value_updated_at = now;

    // Record into metal_history_rates
    metalHistoryRates.unshift({
      id: metalHistoryRates.length + 1,
      metal_type: 'GOLD',
      rate_type: 'BUY',
      old_value: oldVal,
      new_value: newVal,
      updated_at: now,
    });
  }

  // 2. Update Gold Sell Value if changed
  if (gold_sell_value !== undefined && Number(gold_sell_value) !== activeMetalValues.gold_sell_value) {
    const oldVal = activeMetalValues.gold_sell_value;
    const newVal = Number(gold_sell_value);
    activeMetalValues.gold_sell_value = newVal;
    activeMetalValues.gold_sell_value_updated_at = now;

    // Record into metal_history_rates
    metalHistoryRates.unshift({
      id: metalHistoryRates.length + 1,
      metal_type: 'GOLD',
      rate_type: 'SELL',
      old_value: oldVal,
      new_value: newVal,
      updated_at: now,
    });
  }

  // 3. Update Silver Buy Value if changed
  if (silver_buy_value !== undefined && Number(silver_buy_value) !== activeMetalValues.silver_buy_value) {
    const oldVal = activeMetalValues.silver_buy_value;
    const newVal = Number(silver_buy_value);
    activeMetalValues.silver_buy_value = newVal;
    activeMetalValues.silver_buy_value_updated_at = now;

    // Record into metal_history_rates
    metalHistoryRates.unshift({
      id: metalHistoryRates.length + 1,
      metal_type: 'SILVER',
      rate_type: 'BUY',
      old_value: oldVal,
      new_value: newVal,
      updated_at: now,
    });
  }

  // 4. Update Silver Sell Value if changed
  if (silver_sell_value !== undefined && Number(silver_sell_value) !== activeMetalValues.silver_sell_value) {
    const oldVal = activeMetalValues.silver_sell_value;
    const newVal = Number(silver_sell_value);
    activeMetalValues.silver_sell_value = newVal;
    activeMetalValues.silver_sell_value_updated_at = now;

    // Record into metal_history_rates
    metalHistoryRates.unshift({
      id: metalHistoryRates.length + 1,
      metal_type: 'SILVER',
      rate_type: 'SELL',
      old_value: oldVal,
      new_value: newVal,
      updated_at: now,
    });
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
    message: 'Active metal rates updated & history logged successfully',
    rates: activeMetalValues,
  });
});

// POST /api/billing/calculate - Server-side calculation engine
router.post('/calculate', (req: Request, res: Response) => {
  const {
    transaction_type, // 'SELL' | 'BUY'
    metal_type,       // 'GOLD' | 'SILVER'
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
    applied_rate_per_gram = transaction_type === 'SELL' ? activeMetalValues.gold_sell_value : activeMetalValues.gold_buy_value;
  } else {
    applied_rate_per_gram = transaction_type === 'SELL' ? activeMetalValues.silver_sell_value : activeMetalValues.silver_buy_value;
  }

  const pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
  const metal_value = Number((pure_metal_weight * applied_rate_per_gram).toFixed(2));
  const making_charges = transaction_type === 'SELL' ? Number((mcPerGram * weight).toFixed(2)) : 0;
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

// GET /api/billing/invoices - Fetch all invoice records
router.get('/invoices', (req: Request, res: Response) => {
  res.json({
    success: true,
    invoices: invoicesList,
  });
});

// POST /api/billing/create - Create & save new invoice with rate snapshots
router.post('/create', (req: Request, res: Response) => {
  const {
    customer_name,
    customer_phone = '',
    transaction_type,
    metal_type,
    product_name,
    weight_grams,
    purity_percentage,
    making_charges_per_gram = 0,
    gst_percent = 3,
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

  const pure_metal_weight = Number((weight * (purity / 100)).toFixed(3));
  const metal_value = Number((pure_metal_weight * applied_rate_per_gram).toFixed(2));
  const making_charges = transaction_type === 'SELL' ? Number((mcPerGram * weight).toFixed(2)) : 0;
  const subtotal = metal_value + making_charges;
  const gst_amount = transaction_type === 'SELL' ? Number((subtotal * (gstRate / 100)).toFixed(2)) : 0;
  const final_amount = Number((subtotal + gst_amount).toFixed(2));

  const newInvoice = {
    id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    customer_name,
    customer_phone,
    transaction_type,
    metal_type,
    product_name,
    weight_grams: weight,
    purity_percentage: purity,
    applied_rate_per_gram,
    pure_metal_weight,
    metal_value,
    making_charges,
    gst_amount,
    final_amount,
    gold_buy_rate_snapshot: activeMetalValues.gold_buy_value,
    gold_sell_rate_snapshot: activeMetalValues.gold_sell_value,
    silver_buy_rate_snapshot: activeMetalValues.silver_buy_value,
    silver_sell_rate_snapshot: activeMetalValues.silver_sell_value,
    created_at: new Date().toISOString(),
  };

  invoicesList.unshift(newInvoice);

  res.json({
    success: true,
    message: 'Billing invoice generated successfully',
    invoice: newInvoice,
  });
});

export default router;
