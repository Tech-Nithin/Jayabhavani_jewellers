import { supabase } from '../config/supabase';

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
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().split('T')[0];
}

/**
 * Returns ISO timestamp string:
 * - If targetDateStr is today (or empty), returns the exact current live timestamp
 * - If targetDateStr is a custom/past date (YYYY-MM-DD), sets the timestamp to that date in IST
 */
export function getISTTimestamp(targetDateStr?: string): string {
  const todayIST = getTodayISTString();
  const now = new Date();

  if (!targetDateStr || targetDateStr === todayIST) {
    return now.toISOString();
  }

  // Parse YYYY-MM-DD for custom backdated entry
  const parts = targetDateStr.split('-').map(Number);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    // Set to 12:00:00 PM IST (which is 06:30:00 UTC)
    return new Date(Date.UTC(year, month - 1, day, 6, 30, 0)).toISOString();
  }

  return now.toISOString();
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
          updated_at: new Date().toISOString(),
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
          updated_at: new Date().toISOString(),
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
 * Fetch current live cash status for today (in IST)
 */
export async function getTodayCashStatus(): Promise<{
  current_cash: number;
  today_loaded_cash: number;
  today_transactions_count: number;
  date: string;
}> {
  const todayStr = getTodayISTString();

  try {
    const { data: todayRows } = await supabase
      .from('cash_history')
      .select('*')
      .eq('date', todayStr)
      .order('created_at', { ascending: false });

    let todayRow = todayRows && todayRows.length > 0 ? todayRows[0] : null;
    let currentCash = Number(todayRow?.current_cash || 0);

    // If today has no row yet, get the latest previous day's balance
    if (!todayRow) {
      const { data: latestRows } = await supabase
        .from('cash_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(1);

      currentCash = Number(latestRows?.[0]?.current_cash || 0);
    }

    // Calculate total cash loaded today across any matching history rows
    let todayLoadedCash = 0;
    let totalTxnsCount = todayRow?.no_of_transactions || 0;

    if (todayRows && todayRows.length > 0) {
      const uuids = todayRows.map((r) => r.cash_history_uuid);
      const { data: loadLedger } = await supabase
        .from('cash_transaction_ledger')
        .select('transaction_cash_total')
        .in('cash_history_uuid', uuids)
        .eq('transaction_type', 'LOADING');

      if (loadLedger) {
        todayLoadedCash = loadLedger.reduce(
          (sum, row) => sum + Number(row.transaction_cash_total || 0),
          0
        );
      }
    }

    return {
      current_cash: currentCash,
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
 * Fetch list of all historical cash records grouped by unique date
 */
export async function getDailyCashHistoryList(): Promise<any[]> {
  try {
    const { data: historyRows, error } = await supabase
      .from('cash_history')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !historyRows) return [];

    // Fetch all loading transactions to calculate loaded cash per history row
    const { data: allLoadings } = await supabase
      .from('cash_transaction_ledger')
      .select('cash_history_uuid, transaction_cash_total')
      .eq('transaction_type', 'LOADING');

    const loadedMap: Record<string, number> = {};
    (allLoadings || []).forEach((item) => {
      loadedMap[item.cash_history_uuid] = (loadedMap[item.cash_history_uuid] || 0) + Number(item.transaction_cash_total || 0);
    });

    // Group by unique date to prevent duplicate date rows in the UI
    const dateMap: Record<string, any> = {};
    for (const row of historyRows) {
      const dateKey = row.date;
      const loadedCash = loadedMap[row.cash_history_uuid] || 0;

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          cash_history_uuid: row.cash_history_uuid,
          date: row.date,
          no_of_transactions: row.no_of_transactions || 0,
          current_cash: Number(row.current_cash || 0),
          loaded_cash: Number(loadedCash.toFixed(2)),
          total_cash: Number(row.current_cash || 0),
          created_at: row.created_at,
        };
      } else {
        // If an older duplicate row exists for the same date, accumulate loaded cash & transaction count
        dateMap[dateKey].loaded_cash += Number(loadedCash.toFixed(2));
        dateMap[dateKey].no_of_transactions += (row.no_of_transactions || 0);
      }
    }

    return Object.values(dateMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  } catch (err) {
    console.error('Error fetching cash history list:', err);
    return [];
  }
}
