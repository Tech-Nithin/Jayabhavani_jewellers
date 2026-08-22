-- ==============================================================================
-- JAYA BHAVANI JEWELLERS — COMPLETE LIVE SUPABASE OPENAPI SCHEMA BACKUP
-- Generated At: 2026-08-22T17:58:28.956Z
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- TABLE: public.finance
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance (
  finance_uuid UUID NOT NULL PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  debt_category TEXT NOT NULL,
  item_name TEXT,
  item_weight NUMERIC(15, 3) NOT NULL,
  item_deduction_name TEXT,
  item_deduction_weight NUMERIC(15, 3) NOT NULL,
  touch NUMERIC(15, 3) NOT NULL,
  pure_metal_weight NUMERIC(15, 3) NOT NULL,
  metal_value_per_gram NUMERIC(15, 3) NOT NULL,
  total_value_of_item NUMERIC(15, 3) NOT NULL,
  item_image_url TEXT,
  customer_debt_money NUMERIC(15, 3) NOT NULL,
  interest_rate_percent NUMERIC(15, 3) NOT NULL,
  timeline_months INTEGER NOT NULL,
  debt_date DATE NOT NULL,
  current_principal NUMERIC(15, 3) NOT NULL,
  interest_start_from DATE NOT NULL,
  payment_status TEXT NOT NULL,
  receipt_json TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  any_balance NUMERIC(15, 3)
);

-- ------------------------------------------------------------------------------
-- TABLE: public.daily_closing_records
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_closing_records (
  id UUID NOT NULL PRIMARY KEY,
  record_date DATE NOT NULL,
  closing_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.finance_debt_ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_debt_ledger (
  id TEXT NOT NULL PRIMARY KEY,
  item_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  debt_principal NUMERIC(15, 3) NOT NULL,
  item_weight_grams NUMERIC(15, 3) NOT NULL,
  interest_rate_per_month NUMERIC(15, 3) NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.updated_metal_values
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.updated_metal_values (
  id INTEGER NOT NULL PRIMARY KEY,
  gold_buy_value NUMERIC(15, 3) NOT NULL,
  gold_buy_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  gold_sell_value NUMERIC(15, 3) NOT NULL,
  gold_sell_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  silver_buy_value NUMERIC(15, 3) NOT NULL,
  silver_buy_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  silver_sell_value NUMERIC(15, 3) NOT NULL,
  silver_sell_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ------------------------------------------------------------------------------
-- TABLE: public.orders
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT NOT NULL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  metal_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  gross_weight_grams NUMERIC(15, 3) NOT NULL,
  net_weight_grams NUMERIC(15, 3) NOT NULL,
  touch_percentage NUMERIC(15, 3) NOT NULL,
  fine_weight_grams NUMERIC(15, 3),
  making_charges NUMERIC(15, 3),
  estimated_delivery_date DATE,
  notes TEXT,
  status TEXT NOT NULL,
  sold_status TEXT NOT NULL,
  paid_amount NUMERIC(15, 3),
  due_amount NUMERIC(15, 3),
  assigned_worker_id TEXT,
  assigned_worker_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  applied_rate_per_gram NUMERIC(15, 3),
  pure_metal_weight NUMERIC(15, 3),
  metal_value NUMERIC(15, 3),
  gst_amount NUMERIC(15, 3),
  final_amount NUMERIC(15, 3),
  gold_buy_rate_snapshot NUMERIC(15, 3),
  gold_sell_rate_snapshot NUMERIC(15, 3),
  silver_buy_rate_snapshot NUMERIC(15, 3),
  silver_sell_rate_snapshot NUMERIC(15, 3),
  receipt_json_data TEXT,
  submitted TEXT,
  returned_from_worker TEXT,
  returned_at TIMESTAMP WITH TIME ZONE,
  item_length_inches TEXT,
  quantity_unit TEXT,
  quantity_value NUMERIC(15, 3),
  assigned_at TIMESTAMP WITH TIME ZONE,
  hmw_percentage NUMERIC(15, 3),
  hmw_weight NUMERIC(15, 3),
  additional_charge_name TEXT,
  additional_charge_value NUMERIC(15, 3),
  return_purity_percentage NUMERIC(15, 3),
  return_pure_gold NUMERIC(15, 3),
  image_url TEXT
);

-- ------------------------------------------------------------------------------
-- TABLE: public.inventory_category
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_category (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.app_versions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_versions (
  app_id TEXT NOT NULL PRIMARY KEY,
  version_code INTEGER NOT NULL,
  version_name TEXT NOT NULL,
  apk_url TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.products
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(15, 3) NOT NULL,
  old_price NUMERIC(15, 3),
  badge TEXT,
  img TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  weight_grams NUMERIC(15, 3),
  stock_quantity INTEGER
);

-- ------------------------------------------------------------------------------
-- TABLE: public.billing_sell_buy_records
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_sell_buy_records (
  record_uuid UUID NOT NULL PRIMARY KEY,
  customer_billing_uuid UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  metal_type TEXT NOT NULL,
  metal_rate NUMERIC(15, 3) NOT NULL,
  item_name TEXT NOT NULL,
  item_weight NUMERIC(15, 3) NOT NULL,
  deduction_name TEXT,
  deduction_weight NUMERIC(15, 3),
  only_metal_weight NUMERIC(15, 3) NOT NULL,
  hallmark_percentage NUMERIC(15, 3),
  item_quality_percentage NUMERIC(15, 3),
  pure_metal_weight NUMERIC(15, 3),
  additional_charges TEXT,
  additional_cost NUMERIC(15, 3),
  making_charges NUMERIC(15, 3),
  total_item_price NUMERIC(15, 3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  quantity_unit TEXT,
  item_length_inches TEXT,
  image_url TEXT,
  notes TEXT,
  billing_mode TEXT
);

-- ------------------------------------------------------------------------------
-- TABLE: public.cash_transaction_ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_transaction_ledger (
  uuid UUID NOT NULL PRIMARY KEY,
  cash_history_uuid UUID NOT NULL,
  transaction_id TEXT,
  transaction_type TEXT NOT NULL,
  flow_type TEXT NOT NULL,
  transaction_cash_total NUMERIC(15, 3) NOT NULL,
  metal_type TEXT,
  item_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.customer_billing
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_billing (
  customer_billing_uuid UUID NOT NULL PRIMARY KEY,
  billing_id TEXT NOT NULL,
  bill_type TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  total_amount NUMERIC(15, 3) NOT NULL,
  paid_amount NUMERIC(15, 3) NOT NULL,
  due_amount NUMERIC(15, 3) NOT NULL,
  payment_status TEXT NOT NULL,
  bill_json TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ------------------------------------------------------------------------------
-- TABLE: public.user_settings
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  id TEXT NOT NULL PRIMARY KEY,
  message_preview_enabled BOOLEAN,
  image_preview_enabled BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.inventory_ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id INTEGER NOT NULL PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  weight_delta_grams NUMERIC(15, 3) NOT NULL,
  weight_after_grams NUMERIC(15, 3) NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  notes TEXT,
  recorded_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ------------------------------------------------------------------------------
-- TABLE: public.inventory_daily_snapshots
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_daily_snapshots (
  id INTEGER NOT NULL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  opening_weight_grams NUMERIC(15, 3) NOT NULL,
  closing_weight_grams NUMERIC(15, 3) NOT NULL,
  total_sold_grams NUMERIC(15, 3) NOT NULL,
  total_added_grams NUMERIC(15, 3) NOT NULL,
  sell_count INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ------------------------------------------------------------------------------
-- TABLE: public.cash_history
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_history (
  cash_history_uuid UUID NOT NULL PRIMARY KEY,
  date DATE NOT NULL,
  current_cash NUMERIC(15, 3) NOT NULL,
  no_of_transactions INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.finance_payment_history
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_payment_history (
  payment_uuid UUID NOT NULL PRIMARY KEY,
  finance_uuid UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  payment_type TEXT NOT NULL,
  payment_transaction_amount NUMERIC(15, 3) NOT NULL,
  interest_paying_amount NUMERIC(15, 3) NOT NULL,
  principal_paying_amount NUMERIC(15, 3) NOT NULL,
  interest_months_covered NUMERIC(15, 3) NOT NULL,
  interest_accrual_reset DATE NOT NULL,
  notes TEXT,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ------------------------------------------------------------------------------
-- TABLE: public.metal_history_rates
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.metal_history_rates (
  id INTEGER NOT NULL PRIMARY KEY,
  metal_type TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  old_value NUMERIC(15, 3),
  new_value NUMERIC(15, 3) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ------------------------------------------------------------------------------
-- TABLE: public.worker_transactions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worker_transactions (
  id TEXT NOT NULL PRIMARY KEY,
  worker_id TEXT NOT NULL,
  order_id TEXT,
  direction TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_cash NUMERIC(15, 3),
  weight_grams NUMERIC(15, 3),
  touch_percentage NUMERIC(15, 3),
  fine_weight_grams NUMERIC(15, 3),
  item_name TEXT,
  photos TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  cash_metal_link TEXT,
  applied_rate_per_gram NUMERIC(15, 3),
  equivalent_metal_grams NUMERIC(15, 3),
  edited_at_history TEXT,
  is_deleted BOOLEAN,
  reply_to TEXT,
  status_state TEXT,
  is_seen TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  seen_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.workers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  specialization TEXT,
  photo_url TEXT,
  notes TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  fcm_token TEXT
);

-- ------------------------------------------------------------------------------
-- TABLE: public.inventory_products
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_products (
  id TEXT NOT NULL PRIMARY KEY,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  weight_from_grams NUMERIC(15, 3) NOT NULL,
  weight_to_grams NUMERIC(15, 3) NOT NULL,
  img TEXT NOT NULL,
  category TEXT,
  price NUMERIC(15, 3),
  created_at TIMESTAMP WITH TIME ZONE,
  sold_quantity NUMERIC(15, 3),
  current_stock_weight NUMERIC(15, 3),
  sell_count INTEGER
);

-- ------------------------------------------------------------------------------
-- TABLE: public.billing_presets
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_presets (
  id INTEGER NOT NULL PRIMARY KEY,
  preset_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- TABLE: public.billing_payment_history
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_payment_history (
  payment_uuid UUID NOT NULL PRIMARY KEY,
  customer_billing_uuid UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  amount_paid NUMERIC(15, 3) NOT NULL,
  payment_mode TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ------------------------------------------------------------------------------
-- TABLE: public.inventory_stock_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_stock_logs (
  id UUID NOT NULL PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT,
  previous_stock_weight NUMERIC(15, 3) NOT NULL,
  new_stock_weight NUMERIC(15, 3) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  metal_category TEXT,
  item_category TEXT
);

