import { supabase } from '../config/supabase';
import { getTodayIST, getNowISTISO, toISTTimestamp } from './dateHelper';

export interface CashTransactionParams {
  transaction_id?: string;
  transaction_type: 'SELL' | 'BUY' | 'ORDER' | 'EXCHANGE' | 'WORKER' | 'FINANCE' | 'LOADING';
  flow_type: 'IN' | 'OUT';
  amount: number;
  metal_type?: 'GOLD' | 'SILVER' | 'N/A';
  item_type?: string;
  notes?: string;
  date?: string; // Format: YYYY-MM-DD
}

/**
 * Returns today's date string (YYYY-MM-DD) in Indian Standard Time (IST, UTC+5:30)
 */
export function getTodayISTString(): string {
  return getTodayIST();
}

/**
 * Returns IST timestamp string
 */
export function getISTTimestamp(targetDateStr?: string): string {
  if (!targetDateStr) return getNowISTISO();
  return toISTTimestamp(targetDateStr);
}

/**
 * Automatically records a cash transaction into daily cash_history and cash_transaction_ledger
 */
export async function recordCashTransaction(params: CashTransactionParams): Promise<{
  success: boolean;
  cash_history_uuid?: string;
  new_balance?: number;
  error?: string;
}> {
  try {
    const todayStr = params.date || getTodayISTString();
    const amount = Number(params.amount) || 0;
    if (amount <= 0) {
      return { success: false, error: 'Transaction amount must be greater than 0' };
    }

    const recordTimestamp = getISTTimestamp(params.date);

    // 1. Get existing row(s) for the target date in cash_history
    const { data: existingRows } = await supabase
      .from('cash_history')
      .select('*')
      .eq('date', todayStr)
      .order('created_at', { ascending: false });

    let currentDayRow = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    if (!currentDayRow) {
      // Find the most recent previous day's closing cash to carry forward
      const { data: prevRows } = await supabase
        .from('cash_history')
        .select('*')
        .lt('date', todayStr)
        .order('date', { ascending: false })
        .limit(1);

      const startingCash = Number(prevRows?.[0]?.current_cash || 0);
      const initialBalance = params.flow_type === 'IN'
        ? Number((startingCash + amount).toFixed(2))
        : Number((startingCash - amount).toFixed(2));

      const { data: newDayRow, error: createErr } = await supabase
        .from('cash_history')
        .insert([{
          date: todayStr,
          current_cash: initialBalance,
          no_of_transactions: 1,
          created_at: recordTimestamp,
          updated_at: getNowISTISO(),
        }])
        .select('*')
        .single();

      if (createErr) {
        console.warn('⚠️ Error creating daily cash_history record:', createErr.message);
      }
      currentDayRow = newDayRow;
    } else {
      // Update existing day row with accumulated balance and incremented transaction count
      const currentBalance = Number(currentDayRow.current_cash || 0);
      const updatedBalance = params.flow_type === 'IN'
        ? Number((currentBalance + amount).toFixed(2))
        : Number((currentBalance - amount).toFixed(2));
      const newTxnCount = (currentDayRow.no_of_transactions || 0) + 1;

      const { error: updateErr } = await supabase
        .from('cash_history')
        .update({
          current_cash: updatedBalance,
          no_of_transactions: newTxnCount,
          updated_at: getNowISTISO(),
        })
        .eq('cash_history_uuid', currentDayRow.cash_history_uuid);

      if (updateErr) {
        console.warn('⚠️ Error updating cash_history:', updateErr.message);
      }
      currentDayRow.current_cash = updatedBalance;
      currentDayRow.no_of_transactions = newTxnCount;
    }

    if (!currentDayRow) {
      return { success: false, error: 'Could not initialize cash_history' };
    }

    // [STATIC TABLE DISCONNECTED] - Cash loading transactions are automatically factored into dynamic ledger calculations
    /*
    if (params.transaction_type === 'LOADING' || (params.flow_type === 'IN' && (params.item_type || '').toUpperCase().includes('LOAD'))) {
      try {
        const { updateOpeningOnLoad } = await import('./openingRecordHelper');
        await updateOpeningOnLoad(todayStr, { cashAmount: amount });
      } catch (opErr: any) {
        console.warn('⚠️ Notice updating opening record on cash load:', opErr?.message);
      }
    }
    */

    // 2. Insert into cash_transaction_ledger
    const { error: ledgerErr } = await supabase
      .from('cash_transaction_ledger')
      .insert([{
        cash_history_uuid: currentDayRow.cash_history_uuid,
        transaction_id: params.transaction_id || null,
        transaction_type: params.transaction_type,
        flow_type: params.flow_type,
        transaction_cash_total: amount,
        metal_type: params.metal_type || 'N/A',
        item_type: params.item_type || params.transaction_type,
        notes: params.notes || null,
        created_at: recordTimestamp,
      }]);

    if (ledgerErr) {
      console.warn('⚠️ Error inserting into cash_transaction_ledger:', ledgerErr.message);
    }

    return {
      success: true,
      cash_history_uuid: currentDayRow.cash_history_uuid,
      new_balance: Number(currentDayRow.current_cash),
    };
  } catch (err: any) {
    console.error('Exception in recordCashTransaction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Recalculates and synchronizes cash_history for a specific cash_history_uuid
 * directly by summing all active ledger rows for that day: SUM(IN) - SUM(OUT).
 */
export async function syncCashHistoryDayRow(cashHistoryUuid: string): Promise<void> {
  if (!cashHistoryUuid) return;
  try {
    const { data: dayEntries, error } = await supabase
      .from('cash_transaction_ledger')
      .select('transaction_cash_total, flow_type')
      .eq('cash_history_uuid', cashHistoryUuid);

    if (error) {
      console.warn('⚠️ Error fetching day entries for sync:', error.message);
      return;
    }

    let netCash = 0;
    const count = dayEntries ? dayEntries.length : 0;
    (dayEntries || []).forEach((e) => {
      const amt = Number(e.transaction_cash_total || 0);
      const flow = String(e.flow_type || '').toUpperCase();
      if (flow === 'IN') netCash += amt;
      else if (flow === 'OUT') netCash -= amt;
    });

    await supabase
      .from('cash_history')
      .update({
        current_cash: Number(netCash.toFixed(2)),
        no_of_transactions: count,
        updated_at: getNowISTISO(),
      })
      .eq('cash_history_uuid', cashHistoryUuid);
  } catch (err) {
    console.warn('⚠️ syncCashHistoryDayRow error:', err);
  }
}

/**
 * Calculates live/historical cash balance dynamically from cash_transaction_ledger
 * up to a given target date (or all-time if not specified).
 * Single Source of Truth: SUM(IN) - SUM(OUT)
 */
export async function calculateDynamicCashBalance(upToDateStr?: string): Promise<{
  totalCash: number;
  totalIn: number;
  totalOut: number;
  totalLoading: number;
}> {
  try {
    const { data: txns, error } = await supabase
      .from('cash_transaction_ledger')
      .select('transaction_cash_total, flow_type, transaction_type, created_at, cash_history_uuid, cash_history(date)');

    if (error || !txns) {
      return { totalCash: 0, totalIn: 0, totalOut: 0, totalLoading: 0 };
    }

    let totalIn = 0;
    let totalOut = 0;
    let totalLoading = 0;

    for (const t of txns) {
      const rowDate = (t as any).cash_history?.date || (t.created_at ? String(t.created_at).split('T')[0] : '');
      if (upToDateStr && upToDateStr !== 'all' && rowDate && rowDate > upToDateStr) {
        continue;
      }
      const amt = Number(t.transaction_cash_total) || 0;
      const flow = String(t.flow_type || '').toUpperCase();
      const type = String(t.transaction_type || '').toUpperCase();

      if (flow === 'IN') {
        totalIn += amt;
      } else if (flow === 'OUT') {
        totalOut += amt;
      }

      if (type === 'LOADING') {
        totalLoading += amt;
      }
    }

    const totalCash = Number((totalIn - totalOut).toFixed(2));
    return {
      totalCash,
      totalIn: Number(totalIn.toFixed(2)),
      totalOut: Number(totalOut.toFixed(2)),
      totalLoading: Number(totalLoading.toFixed(2)),
    };
  } catch (err) {
    console.error('Error calculating dynamic cash balance:', err);
    return { totalCash: 0, totalIn: 0, totalOut: 0, totalLoading: 0 };
  }
}

/**
 * Fetch current live cash status for today (in IST) computed dynamically from cash_transaction_ledger
 */
export async function getTodayCashStatus(): Promise<{
  current_cash: number;
  today_loaded_cash: number;
  today_transactions_count: number;
  date: string;
}> {
  const todayStr = getTodayISTString();

  try {
    // 1. Compute dynamic cash balance up to today
    const { totalCash, totalLoading } = await calculateDynamicCashBalance(todayStr);

    // 2. Count today's transactions from ledger
    const { data: todayTxns } = await supabase
      .from('cash_transaction_ledger')
      .select('uuid, transaction_cash_total, transaction_type, created_at, cash_history(date)');

    let todayLoadedCash = 0;
    let totalTxnsCount = 0;

    (todayTxns || []).forEach((t: any) => {
      const rowDate = t.cash_history?.date || (t.created_at ? String(t.created_at).split('T')[0] : '');
      if (rowDate === todayStr) {
        totalTxnsCount += 1;
        if (String(t.transaction_type || '').toUpperCase() === 'LOADING') {
          todayLoadedCash += Number(t.transaction_cash_total || 0);
        }
      }
    });

    return {
      current_cash: totalCash,
      today_loaded_cash: Number(todayLoadedCash.toFixed(2)),
      today_transactions_count: totalTxnsCount,
      date: todayStr,
    };
  } catch (err) {
    console.error('Error fetching today cash status:', err);
    return {
      current_cash: 0,
      today_loaded_cash: 0,
      today_transactions_count: 0,
      date: todayStr,
    };
  }
}

/**
 * Fetch list of all historical cash records grouped by unique date,
 * with running dynamic cash balances computed from the ledger.
 */
export async function getDailyCashHistoryList(): Promise<any[]> {
  try {
    const { data: allTxns, error } = await supabase
      .from('cash_transaction_ledger')
      .select('uuid, transaction_cash_total, flow_type, transaction_type, created_at, cash_history_uuid, cash_history(date, created_at)')
      .order('created_at', { ascending: true });

    if (error || !allTxns || allTxns.length === 0) return [];

    // Group transactions by date
    const dateMap: Record<string, {
      date: string;
      cash_history_uuid: string;
      inflow: number;
      outflow: number;
      loaded_cash: number;
      no_of_transactions: number;
      created_at: string;
    }> = {};

    for (const t of allTxns) {
      const dateKey = (t as any).cash_history?.date || (t.created_at ? String(t.created_at).split('T')[0] : getTodayISTString());
      const amt = Number(t.transaction_cash_total || 0);
      const flow = String(t.flow_type || '').toUpperCase();
      const type = String(t.transaction_type || '').toUpperCase();

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          date: dateKey,
          cash_history_uuid: t.cash_history_uuid || t.uuid,
          inflow: 0,
          outflow: 0,
          loaded_cash: 0,
          no_of_transactions: 0,
          created_at: t.created_at,
        };
      }

      dateMap[dateKey].no_of_transactions += 1;
      if (flow === 'IN') dateMap[dateKey].inflow += amt;
      else if (flow === 'OUT') dateMap[dateKey].outflow += amt;
      if (type === 'LOADING') dateMap[dateKey].loaded_cash += amt;
    }

    // Sort dates ascending to calculate running dynamic closing cash
    const sortedDates = Object.keys(dateMap).sort((a, b) => a.localeCompare(b));
    let runningBalance = 0;
    const resultList: any[] = [];

    for (const dateKey of sortedDates) {
      const d = dateMap[dateKey];
      runningBalance += (d.inflow - d.outflow);
      resultList.push({
        cash_history_uuid: d.cash_history_uuid,
        date: d.date,
        no_of_transactions: d.no_of_transactions,
        current_cash: Number(runningBalance.toFixed(2)),
        loaded_cash: Number(d.loaded_cash.toFixed(2)),
        total_cash: Number(runningBalance.toFixed(2)),
        created_at: d.created_at,
      });
    }

    // Return in descending order (newest date first)
    return resultList.reverse();
  } catch (err) {
    console.error('Error fetching dynamic cash history list:', err);
    return [];
  }
}
