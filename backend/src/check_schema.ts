import { supabase } from './config/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkTxSchema() {
  console.log('Checking Supabase "worker_transactions" table...');
  const { data, error } = await supabase.from('worker_transactions').select('*').limit(1);
  if (error) {
    console.error('❌ Supabase worker_transactions Error:', error.code, error.message, error.details, error.hint);
  } else if (data && data.length > 0) {
    console.log('--- EXISTING COLUMNS IN SUPABASE WORKER_TRANSACTIONS TABLE ---');
    console.log(JSON.stringify(Object.keys(data[0]), null, 2));
    console.log('--------------------------------------------------------------');
  } else {
    console.log('✅ Table "worker_transactions" exists in Supabase but contains 0 rows.');
  }
}

checkTxSchema();
