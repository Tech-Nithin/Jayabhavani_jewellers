const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);

async function dumpOrders() {
  const { data: bills } = await supabase.from('customer_billing').select('*').order('created_at', { ascending: false }).limit(10);
  const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10);

  console.log('=== DUMPING CUSTOMER BILLS JSON ===');
  (bills || []).forEach(b => {
    if ((b.bill_type || '').toUpperCase() === 'ORDER') {
      console.log(`\nBill ID: ${b.billing_id || b.id} | UUID: ${b.customer_billing_uuid} | Customer: ${b.customer_name}`);
      console.log('receipt_json_data:', JSON.stringify(b.receipt_json_data, null, 2));
    }
  });

  console.log('\n=== DUMPING ORDERS TABLE ===');
  (orders || []).forEach(o => {
    console.log(`Order ID: ${o.id || o.order_id} | Customer: ${o.customer_name} | GrossWt: ${o.gross_weight_grams} | NetWt: ${o.net_weight_grams} | Metal: ${o.metal_type} | Submitted: ${o.submitted}`);
  });
}

dumpOrders();
