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

/**
 * GET /api/metal-rates (or /rates)
 * Fetch active metal values with per-column timestamps (from updated_metal_values)
 */
router.get('/', async (req: Request, res: Response) => {
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

router.get('/rates', async (req: Request, res: Response) => {
  const cachedRates = memoryCache.get<any>('metal_rates');
  if (cachedRates) {
    return res.json({ success: true, rates: cachedRates });
  }

  try {
    const { data } = await supabase.from('updated_metal_values').select('*').eq('id', 1).single();
    if (data) {
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
  } catch (e) {}

  res.json({ success: true, rates: activeMetalValues });
});

/**
 * GET /api/metal-rates/history (or /rates/history)
 * Fetch audit history from PostgreSQL / Supabase
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('metal_history_rates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      metalHistoryRates = data.map((item: any) => ({
        id: item.id,
        metal_type: item.metal_type,
        rate_type: item.rate_type,
        old_value: Number(item.old_value),
        new_value: Number(item.new_value),
        updated_at: item.updated_at,
      }));
    }
  } catch (err) {
    console.warn('⚠️ Supabase metal_history_rates fetch error:', err);
  }

  res.json({
    success: true,
    history: metalHistoryRates,
  });
});

router.get('/rates/history', async (req: Request, res: Response) => {
  try {
    const { data } = await supabase.from('metal_history_rates').select('*').order('updated_at', { ascending: false });
    if (data && data.length > 0) {
      metalHistoryRates = data.map((item: any) => ({
        id: item.id,
        metal_type: item.metal_type,
        rate_type: item.rate_type,
        old_value: Number(item.old_value),
        new_value: Number(item.new_value),
        updated_at: item.updated_at,
      }));
    }
  } catch (e) {}

  res.json({ success: true, history: metalHistoryRates });
});

/**
 * POST /api/metal-rates (or /rates)
 * Update metal values with audit logging
 */
router.post('/', handleUpdateRates);
router.post('/rates', handleUpdateRates);

async function handleUpdateRates(req: Request, res: Response) {
  const { gold_buy_value, gold_sell_value, silver_buy_value, silver_sell_value } = req.body;
  const nowISO = new Date().toISOString();
  const updates: any = {};
  const historyEntriesToInsert: any[] = [];

  if (gold_buy_value !== undefined && Number(gold_buy_value) !== activeMetalValues.gold_buy_value) {
    const newVal = Number(gold_buy_value);
    historyEntriesToInsert.push({
      metal_type: 'GOLD',
      rate_type: 'BUY',
      old_value: activeMetalValues.gold_buy_value,
      new_value: newVal,
      updated_at: nowISO,
    });
    activeMetalValues.gold_buy_value = newVal;
    activeMetalValues.gold_buy_value_updated_at = nowISO;
    updates.gold_buy_value = newVal;
    updates.gold_buy_value_updated_at = nowISO;
  }

  if (gold_sell_value !== undefined && Number(gold_sell_value) !== activeMetalValues.gold_sell_value) {
    const newVal = Number(gold_sell_value);
    historyEntriesToInsert.push({
      metal_type: 'GOLD',
      rate_type: 'SELL',
      old_value: activeMetalValues.gold_sell_value,
      new_value: newVal,
      updated_at: nowISO,
    });
    activeMetalValues.gold_sell_value = newVal;
    activeMetalValues.gold_sell_value_updated_at = nowISO;
    updates.gold_sell_value = newVal;
    updates.gold_sell_value_updated_at = nowISO;
  }

  if (silver_buy_value !== undefined && Number(silver_buy_value) !== activeMetalValues.silver_buy_value) {
    const newVal = Number(silver_buy_value);
    historyEntriesToInsert.push({
      metal_type: 'SILVER',
      rate_type: 'BUY',
      old_value: activeMetalValues.silver_buy_value,
      new_value: newVal,
      updated_at: nowISO,
    });
    activeMetalValues.silver_buy_value = newVal;
    activeMetalValues.silver_buy_value_updated_at = nowISO;
    updates.silver_buy_value = newVal;
    updates.silver_buy_value_updated_at = nowISO;
  }

  if (silver_sell_value !== undefined && Number(silver_sell_value) !== activeMetalValues.silver_sell_value) {
    const newVal = Number(silver_sell_value);
    historyEntriesToInsert.push({
      metal_type: 'SILVER',
      rate_type: 'SELL',
      old_value: activeMetalValues.silver_sell_value,
      new_value: newVal,
      updated_at: nowISO,
    });
    activeMetalValues.silver_sell_value = newVal;
    activeMetalValues.silver_sell_value_updated_at = nowISO;
    updates.silver_sell_value = newVal;
    updates.silver_sell_value_updated_at = nowISO;
  }

  if (Object.keys(updates).length > 0) {
    try {
      await supabase
        .from('updated_metal_values')
        .update({
          ...updates,
          updated_at: nowISO,
        })
        .eq('id', 1);

      if (historyEntriesToInsert.length > 0) {
        const { data: insertedHistory } = await supabase
          .from('metal_history_rates')
          .insert(historyEntriesToInsert)
          .select('*');

        if (insertedHistory) {
          metalHistoryRates = [...insertedHistory, ...metalHistoryRates];
        }
      }
      memoryCache.set('metal_rates', activeMetalValues, 86400);
    } catch (err) {
      console.warn('⚠️ Supabase sync error on metal values update:', err);
    }
  }

  res.json({
    success: true,
    rates: activeMetalValues,
    message: 'Metal rates updated successfully',
  });
}

export { activeMetalValues };
export default router;
