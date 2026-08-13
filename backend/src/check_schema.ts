import { supabase } from './config/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkWorkersSchema() {
  console.log('Checking Supabase "workers" table...');
  const { data, error } = await supabase.from('workers').select('*').limit(1);
  if (error) {
    console.error('❌ Supabase Workers Table Error:', error.code, error.message, error.details, error.hint);
  } else if (data && data.length > 0) {
    console.log('--- EXISTING COLUMNS IN SUPABASE WORKERS TABLE ---');
    console.log(JSON.stringify(Object.keys(data[0]), null, 2));
    console.log('--------------------------------------------------');
  } else {
    console.log('✅ Table "workers" exists in Supabase but contains 0 rows.');
  }
}

checkWorkersSchema();
