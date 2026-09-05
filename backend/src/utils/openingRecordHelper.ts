import { supabase } from '../config/supabase';
import { getClosingRecord } from './closingRecordHelper';
import { getNowISTISO, toISTDateOnly } from './dateHelper';

export interface DailyOpeningData {
  recordDate: string;
  openingGoldGrams: number;
  openingSilverGrams: number;
  openingCashAmount: number;
  loadedGoldGrams: number;
  loadedSilverGrams: number;
}

/**
 * Gets or initializes the opening stock and cash balances for a given date.
 * Rule: Day Opening = Yesterday Closing + Today Loaded Stock/Cash.
 * Stores in `daily_opening_records` table. NO DEDUCTIONS subtracted.
 */
export async function getOrInitOpeningRecord(
  dateStr: string,
  fallbackStock: { goldGrams: number; silverGrams: number; cashAmount: number },
  loadedToday: { goldGrams: number; silverGrams: number }
): Promise<DailyOpeningData> {
  try {
    if (!dateStr || dateStr === 'all' || dateStr === 'ALL' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return {
        recordDate: dateStr || 'all',
        openingGoldGrams: fallbackStock.goldGrams,
        openingSilverGrams: fallbackStock.silverGrams,
        openingCashAmount: fallbackStock.cashAmount,
        loadedGoldGrams: loadedToday.goldGrams,
        loadedSilverGrams: loadedToday.silverGrams,
      };
    }

    // 1. Fetch yesterday's closing data and fallback calculations
    const prevDateObj = new Date(`${dateStr}T12:00:00Z`);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = toISTDateOnly(prevDateObj);

    const prevClosingRecord = await getClosingRecord(prevDateStr);
    const prevGold = Number(
      prevClosingRecord?.closing_data?.metal_position?.gold?.total_gold_grams
      ?? prevClosingRecord?.closing_data?.showcase_stock?.total_gold_grams
      ?? fallbackStock.goldGrams
      ?? 0
    );
    const prevSilver = Number(
      prevClosingRecord?.closing_data?.metal_position?.silver?.total_silver_grams
      ?? prevClosingRecord?.closing_data?.showcase_stock?.total_silver_grams
      ?? fallbackStock.silverGrams
      ?? 0
    );
    const prevCash = Number(
      prevClosingRecord?.closing_data?.cash?.cash_in_drawer
      ?? fallbackStock.cashAmount
      ?? 0
    );

    // [STATIC TABLE DISCONNECTED] - Dynamic Calculation Engine replaces static daily_opening_records table
    /*
    const { data: existing } = await supabase
      .from('daily_opening_records')
      .select('*')
      .eq('record_date', dateStr)
      .maybeSingle();

    if (existing) {
      let gold = Number(existing.opening_gold ?? existing.opening_gold_grams ?? 0);
      let silver = Number(existing.opening_silver ?? existing.opening_silver_grams ?? 0);
      let cash = Number(existing.opening_cash ?? existing.opening_cash_amount ?? 0);

      if (gold === 0 && prevGold > 0) gold = prevGold;
      if (silver === 0 && prevSilver > 0) silver = prevSilver;
      if (cash === 0 && prevCash !== 0) cash = prevCash;

      return {
        recordDate: dateStr,
        openingGoldGrams: Number(gold.toFixed(3)),
        openingSilverGrams: Number(silver.toFixed(3)),
        openingCashAmount: Number(cash.toFixed(2)),
        loadedGoldGrams: Number(existing.loaded_gold_grams || loadedToday.goldGrams || 0),
        loadedSilverGrams: Number(existing.loaded_silver_grams || loadedToday.silverGrams || 0),
      };
    }
    */

    const openingGoldGrams = Number((prevGold + (loadedToday.goldGrams || 0)).toFixed(3));
    const openingSilverGrams = Number((prevSilver + (loadedToday.silverGrams || 0)).toFixed(3));
    const openingCashAmount = Number(prevCash.toFixed(2));

    return {
      recordDate: dateStr,
      openingGoldGrams,
      openingSilverGrams,
      openingCashAmount,
      loadedGoldGrams: loadedToday.goldGrams || 0,
      loadedSilverGrams: loadedToday.silverGrams || 0,
    };
  } catch (err: any) {
    console.warn(`⚠️ Error in getOrInitOpeningRecord for ${dateStr}:`, err?.message);
    return {
      recordDate: dateStr,
      openingGoldGrams: fallbackStock.goldGrams,
      openingSilverGrams: fallbackStock.silverGrams,
      openingCashAmount: fallbackStock.cashAmount,
      loadedGoldGrams: loadedToday.goldGrams,
      loadedSilverGrams: loadedToday.silverGrams,
    };
  }
}

/**
 * Dynamically adds loaded stock/cash into today's opening balances (100% Dynamic in-memory / ledger)
 */
export async function updateOpeningOnLoad(
  dateStr: string,
  load: { goldGrams?: number; silverGrams?: number; cashAmount?: number }
): Promise<void> {
  try {
    // [STATIC TABLE DISCONNECTED] - Static upserts commented out in favor of dynamic ledger queries
    /*
    const existing = await getOrInitOpeningRecord(
      dateStr,
      { goldGrams: 0, silverGrams: 0, cashAmount: 0 },
      { goldGrams: 0, silverGrams: 0 }
    );

    const newGold = Number((existing.openingGoldGrams + (load.goldGrams || 0)).toFixed(3));
    const newSilver = Number((existing.openingSilverGrams + (load.silverGrams || 0)).toFixed(3));
    const newCash = Number((existing.openingCashAmount + (load.cashAmount || 0)).toFixed(2));

    try {
      await supabase
        .from('daily_opening_records')
        .upsert([{
          record_date: dateStr,
          opening_gold: newGold,
          opening_silver: newSilver,
          opening_cash: newCash,
          updated_at: getNowISTISO(),
        }], { onConflict: 'record_date' });

      console.log(`✨ [Opening Record Updated for ${dateStr}]: Gold ${existing.openingGoldGrams}g + ${load.goldGrams || 0}g -> ${newGold}g, Cash ₹${existing.openingCashAmount} + ₹${load.cashAmount || 0} -> ₹${newCash}`);
    } catch {
      // Table may not exist yet
    }
    */
  } catch (err: any) {
    console.warn(`⚠️ Failed to update opening record on load:`, err?.message);
  }
}
