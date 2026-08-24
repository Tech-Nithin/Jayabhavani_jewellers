import { supabase } from '../config/supabase';
import { getClosingRecord } from './closingRecordHelper';

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
    // 1. Try reading from daily_opening_records table
    const { data: existing } = await supabase
      .from('daily_opening_records')
      .select('*')
      .eq('record_date', dateStr)
      .maybeSingle();

    if (existing) {
      let gold = Number(existing.opening_gold ?? existing.opening_gold_grams ?? 0);
      let silver = Number(existing.opening_silver ?? existing.opening_silver_grams ?? 0);
      let cash = Number(existing.opening_cash ?? existing.opening_cash_amount ?? 0);

      return {
        recordDate: dateStr,
        openingGoldGrams: gold,
        openingSilverGrams: silver,
        openingCashAmount: cash,
        loadedGoldGrams: Number(existing.loaded_gold_grams || 0),
        loadedSilverGrams: Number(existing.loaded_silver_grams || 0),
      };
    }

    // 2. Otherwise calculate read-only fallback values WITHOUT inserting into daily_opening_records
    const prevDateObj = new Date(dateStr);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split('T')[0];

    const prevClosingRecord = await getClosingRecord(prevDateStr);
    const prevGold = prevClosingRecord?.closing_data?.goldStock?.totalGrams ?? fallbackStock.goldGrams;
    const prevSilver = prevClosingRecord?.closing_data?.silverStock?.totalGrams ?? fallbackStock.silverGrams;
    const prevCash = prevClosingRecord?.closing_data?.cashInHand ?? fallbackStock.cashAmount;

    const openingGoldGrams = Number((prevGold + loadedToday.goldGrams).toFixed(3));
    const openingSilverGrams = Number((prevSilver + loadedToday.silverGrams).toFixed(3));
    const openingCashAmount = Number(prevCash.toFixed(2));

    return {
      recordDate: dateStr,
      openingGoldGrams,
      openingSilverGrams,
      openingCashAmount,
      loadedGoldGrams: loadedToday.goldGrams,
      loadedSilverGrams: loadedToday.silverGrams,
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
 * Dynamically adds loaded stock/cash into today's opening_records row
 */
export async function updateOpeningOnLoad(
  dateStr: string,
  load: { goldGrams?: number; silverGrams?: number; cashAmount?: number }
): Promise<void> {
  try {
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
          updated_at: new Date().toISOString(),
        }], { onConflict: 'record_date' });

      console.log(`✨ [Opening Record Updated for ${dateStr}]: Gold ${existing.openingGoldGrams}g + ${load.goldGrams || 0}g -> ${newGold}g, Cash ₹${existing.openingCashAmount} + ₹${load.cashAmount || 0} -> ₹${newCash}`);
    } catch {
      // Table may not exist yet
    }
  } catch (err: any) {
    console.warn(`⚠️ Failed to update opening record on load:`, err?.message);
  }
}
