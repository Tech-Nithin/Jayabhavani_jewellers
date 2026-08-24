import { supabase } from './config/supabase';

async function inspectTables() {
  console.log('--- INSPECTING FINANCE TABLE ---');
  const { data: financeData, error: financeErr } = await supabase.from('finance').select('*').limit(1);
  if (financeErr) {
    console.error('Finance fetch error:', financeErr);
  } else if (financeData && financeData.length > 0) {
    console.log('Finance Columns:', Object.keys(financeData[0]));
    console.log('Sample Record:', JSON.stringify(financeData[0], null, 2));
  } else {
    console.log('Finance table empty');
  }

  console.log('\n--- INSPECTING FINANCE_PAYMENT_HISTORY TABLE ---');
  const { data: historyData, error: historyErr } = await supabase.from('finance_payment_history').select('*').limit(1);
  if (historyErr) {
    console.error('History fetch error:', historyErr);
  } else if (historyData && historyData.length > 0) {
    console.log('History Columns:', Object.keys(historyData[0]));
    console.log('Sample Record:', JSON.stringify(historyData[0], null, 2));
  } else {
    console.log('History table empty');
  }
}

inspectTables();
