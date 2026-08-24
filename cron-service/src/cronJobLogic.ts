import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export const supabase = createClient(
  supabaseUrl !== '' ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseKey !== '' ? supabaseKey : 'placeholder-key'
);

function getTodayISTString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getTomorrowISTString(baseDateStr?: string): string {
  const baseDate = baseDateStr
    ? new Date(`${baseDateStr}T12:00:00.000Z`)
    : new Date();
  
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function round3(num: number): number {
  return Math.round((num + Number.EPSILON) * 1000) / 1000;
}

export interface EodExecutionResult {
  success: boolean;
  executedAt: string;
  targetClosingDate: string;
  tomorrowOpeningDate: string;
  closingSnapshot: {
    goldWeightGrams: number;
    silverWeightGrams: number;
    closingCash: number;
  };
  openingRecordSaved: {
    record_date: string;
    opening_gold: number;
    opening_silver: number;
    opening_cash: number;
  };
  error?: string;
}

/**
 * Core EOD Engine:
 * 1. Calculates Today's EOD Closing Stock & Cash (current_cash from cash_history)
 * 2. Saves today's row in daily_closing_records
 * 3. Saves tomorrow's row in daily_opening_records with today's closing flows
 */
export async function executeEodClosingAndTomorrowOpening(
  customDate?: string
): Promise<EodExecutionResult> {
  const executedAt = new Date().toISOString();
  const targetDate = customDate || getTodayISTString();
  const tomorrowDate = getTomorrowISTString(targetDate);

  console.log(`🚀 [EOD Cron] Starting calculation for Target Date: ${targetDate} (Tomorrow Date: ${tomorrowDate})`);

  try {
    // 1. Fetch Today's Ending Cash from cash_history table (current_cash column)
    const { data: latestCashRow, error: cashErr } = await supabase
      .from('cash_history')
      .select('*')
      .lte('date', targetDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cashErr) {
      console.warn('⚠️ [EOD Cron] Error fetching cash_history:', cashErr.message);
    }

    const todayClosingCash = Number(latestCashRow?.current_cash || 0);

    // 2. Fetch Target Date Opening Record (daily_opening_records)
    const { data: currentOpeningRow } = await supabase
      .from('daily_opening_records')
      .select('*')
      .eq('record_date', targetDate)
      .maybeSingle();

    const startGold = Number(currentOpeningRow?.opening_gold || 0);
    const startSilver = Number(currentOpeningRow?.opening_silver || 0);

    // 3. Fetch Net Metal Flow on Target Date from ALL 3 Sources:
    // Source A: Billing Invoices & Scrap Buys (billing_sell_buy_records)
    // Source B: Newly Loaded Stock from Wholesaler (inventory_products)
    // Source C: Worker Metal Transfers (worker_transactions)
    const [{ data: lineRecords }, { data: invProds }, { data: workerTxns }] = await Promise.all([
      supabase.from('billing_sell_buy_records').select('*'),
      supabase.from('inventory_products').select('*'),
      supabase.from('worker_transactions').select('*'),
    ]);

    let goldIn = 0, goldOut = 0;
    let silverIn = 0, silverOut = 0;

    // Source A: Customer Bills
    (lineRecords || []).forEach((r: any) => {
      const createdAtStr = r.created_at || '';
      const txDateStr = createdAtStr.split('T')[0];
      if (txDateStr === targetDate) {
        const metal = (r.metal_type || 'GOLD').toUpperCase();
        const type = (r.transaction_type || r.billing_mode || '').toUpperCase();
        const wt = Number(r.item_weight || r.only_metal_weight || 0);

        if (metal.includes('GOLD')) {
          if (type.includes('BUY')) goldIn += wt;
          else if (type.includes('SELL')) goldOut += wt;
        } else if (metal.includes('SILVER')) {
          if (type.includes('BUY')) silverIn += wt;
          else if (type.includes('SELL')) silverOut += wt;
        }
      }
    });

    // Source B: Newly Loaded Stock into Showcase Today
    (invProds || []).forEach((p: any) => {
      const pDate = (p.created_at || '').split('T')[0];
      if (pDate === targetDate) {
        const metal = (p.item_type || p.metal_type || '').toUpperCase();
        const wt = Number(p.stock_quantity || p.weight_grams || p.net_weight || 0);
        if (metal.includes('GOLD')) goldIn += wt;
        else if (metal.includes('SILVER')) silverIn += wt;
      }
    });

    // Source C: Worker Metal Transfers Today
    (workerTxns || []).forEach((w: any) => {
      const wDate = (w.created_at || '').split('T')[0];
      if (wDate === targetDate) {
        const metal = (w.metal_type || 'GOLD').toUpperCase();
        const type = (w.transaction_type || '').toUpperCase();
        const wt = Number(w.weight_grams || w.issue_weight || 0);
        if (metal.includes('GOLD')) {
          if (type === 'TAKEN' || type === 'WORKER_TO_ADMIN') goldIn += wt;
          else if (type === 'GIVEN' || type === 'ADMIN_TO_WORKER') goldOut += wt;
        } else if (metal.includes('SILVER')) {
          if (type === 'TAKEN' || type === 'WORKER_TO_ADMIN') silverIn += wt;
          else if (type === 'GIVEN' || type === 'ADMIN_TO_WORKER') silverOut += wt;
        }
      }
    });

    // Net EOD Closing Gold & Silver = Start Opening + Net Metal Change (IN - OUT)
    const todayClosingGold = round3(startGold + goldIn - goldOut);
    const todayClosingSilver = round3(startSilver + silverIn - silverOut);

    console.log(`📊 [EOD Cron] Today's (${targetDate}) Closing Calculations:`);
    console.log(`   - Closing Gold: ${todayClosingGold}g`);
    console.log(`   - Closing Silver: ${todayClosingSilver}g`);
    console.log(`   - Closing Cash: ₹${todayClosingCash.toLocaleString('en-IN')}`);

    // 4. Save/Upsert Today's Snapshot into daily_closing_records table
    const closingPayload = {
      record_date: targetDate,
      closing_data: {
        closing_gold: todayClosingGold,
        closing_silver: todayClosingSilver,
        closing_cash: todayClosingCash,
      },
      updated_at: new Date().toISOString(),
    };

    const { error: closingSaveErr } = await supabase
      .from('daily_closing_records')
      .upsert(closingPayload, { onConflict: 'record_date' });

    if (closingSaveErr) {
      console.warn('⚠️ [EOD Cron] Error saving daily_closing_records:', closingSaveErr.message);
    } else {
      console.log(`✅ [EOD Cron] Successfully saved daily_closing_records for ${targetDate}`);
    }

    // 5. Save/Upsert Tomorrow's Opening Record into daily_opening_records table
    const openingPayload = {
      record_date: tomorrowDate,
      opening_gold: todayClosingGold,
      opening_silver: todayClosingSilver,
      opening_cash: todayClosingCash,
      updated_at: new Date().toISOString(),
    };

    const { error: openingSaveErr } = await supabase
      .from('daily_opening_records')
      .upsert(openingPayload, { onConflict: 'record_date' });

    if (openingSaveErr) {
      console.error('❌ [EOD Cron] Error saving daily_opening_records:', openingSaveErr.message);
      return {
        success: false,
        executedAt,
        targetClosingDate: targetDate,
        tomorrowOpeningDate: tomorrowDate,
        closingSnapshot: {
          goldWeightGrams: todayClosingGold,
          silverWeightGrams: todayClosingSilver,
          closingCash: todayClosingCash,
        },
        openingRecordSaved: openingPayload,
        error: openingSaveErr.message,
      };
    }

    console.log(`🎉 [EOD Cron] SUCCESS! Populated daily_opening_records for ${tomorrowDate}:`, openingPayload);

    return {
      success: true,
      executedAt,
      targetClosingDate: targetDate,
      tomorrowOpeningDate: tomorrowDate,
      closingSnapshot: {
        goldWeightGrams: todayClosingGold,
        silverWeightGrams: todayClosingSilver,
        closingCash: todayClosingCash,
      },
      openingRecordSaved: openingPayload,
    };
  } catch (err: any) {
    console.error('❌ [EOD Cron] Uncaught Exception:', err);
    return {
      success: false,
      executedAt,
      targetClosingDate: targetDate,
      tomorrowOpeningDate: tomorrowDate,
      closingSnapshot: {
        goldWeightGrams: 0,
        silverWeightGrams: 0,
        closingCash: 0,
      },
      openingRecordSaved: {
        record_date: tomorrowDate,
        opening_gold: 0,
        opening_silver: 0,
        opening_cash: 0,
      },
      error: err?.message || String(err),
    };
  }
}
