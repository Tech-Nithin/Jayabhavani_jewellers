-- ==============================================================================
-- Master SQL Schema for Jaya Bhavani Jewellers (Supabase PostgreSQL)
-- Auto-generated from live Supabase inspection on 2026-08-18T06:01:47.150Z
-- ==============================================================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  old_price NUMERIC(10, 2),
  badge VARCHAR(50),
  img TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#e8d4c0',
  weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  stock_quantity INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Metal Transactions Table (running ledger for KPI cards)
CREATE TABLE IF NOT EXISTS public.customer_metal_transactions (
  id SERIAL PRIMARY KEY,
  invoice_id VARCHAR(100) NULL,
  customer_id VARCHAR(100) NULL,
  customer_name VARCHAR(255) NULL,
  customer_phone VARCHAR(50) NULL,
  transaction_type VARCHAR(20) NULL,
  metal_type VARCHAR(20) NULL,
  item_type VARCHAR(20) NULL,
  product_name VARCHAR(255) NULL,
  weight_grams NUMERIC(12, 3) NULL DEFAULT 0,
  amount NUMERIC(15, 2) NULL DEFAULT 0,
  purity_percentage NUMERIC(6, 2) NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customer_metal_transactions_item_type_check CHECK (item_type IN ('SELL', 'BUY')),
  CONSTRAINT customer_metal_transactions_metal_type_check CHECK (metal_type IN ('GOLD', 'SILVER')),
  CONSTRAINT customer_metal_transactions_transaction_type_check CHECK (transaction_type IN ('SELL', 'BUY', 'EXCHANGE', 'ORDER'))
);

-- 2. Create Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tag VARCHAR(100),
  count VARCHAR(50),
  href VARCHAR(100),
  img TEXT NOT NULL,
  color VARCHAR(20) DEFAULT '#d4b8a0',
  large BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Current Active Metal Rates Table (updated_metal_values)
CREATE TABLE IF NOT EXISTS public.updated_metal_values (
  id INT PRIMARY KEY DEFAULT 1,
  gold_buy_value NUMERIC(12, 2) NOT NULL DEFAULT 14200.00,
  gold_buy_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gold_sell_value NUMERIC(12, 2) NOT NULL DEFAULT 14700.00,
  gold_sell_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  silver_buy_value NUMERIC(12, 2) NOT NULL DEFAULT 250.00,
  silver_buy_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  silver_sell_value NUMERIC(12, 2) NOT NULL DEFAULT 270.00,
  silver_sell_value_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- 4. Create Metal Rate History Table (metal_history_rates)
CREATE TABLE IF NOT EXISTS public.metal_history_rates (
  id SERIAL PRIMARY KEY,
  metal_type VARCHAR(20) NOT NULL CHECK (metal_type IN ('GOLD', 'SILVER')),
  rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('BUY', 'SELL')),
  old_value NUMERIC(12, 2),
  new_value NUMERIC(12, 2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Billing Invoices Table (billing_invoices)
CREATE SEQUENCE IF NOT EXISTS public.billing_invoices_seq START WITH 1 INCREMENT BY 1;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.billing_invoices_seq TO anon, authenticated, service_role, postgres;

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id VARCHAR(50) PRIMARY KEY DEFAULT ('INV-' || nextval('public.billing_invoices_seq')::TEXT),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address VARCHAR(500),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SELL', 'BUY', 'EXCHANGE')),
  metal_type VARCHAR(20) NOT NULL CHECK (metal_type IN ('GOLD', 'SILVER', 'MIXED')),
  product_name VARCHAR(255) NOT NULL,
  weight_grams NUMERIC(10, 3) NOT NULL,
  purity_percentage NUMERIC(5, 2) DEFAULT 91.60,
  applied_rate_per_gram NUMERIC(12, 2) NOT NULL,
  pure_metal_weight NUMERIC(10, 3),
  metal_value NUMERIC(12, 2) NOT NULL,
  making_charges NUMERIC(12, 2) DEFAULT 0.00,
  gst_amount NUMERIC(12, 2) DEFAULT 0.00,
  final_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) DEFAULT 0.00,
  due_amount NUMERIC(12, 2) DEFAULT 0.00,
  gold_buy_rate_snapshot NUMERIC(12, 2),
  gold_sell_rate_snapshot NUMERIC(12, 2),
  silver_buy_rate_snapshot NUMERIC(12, 2),
  silver_sell_rate_snapshot NUMERIC(12, 2),
  return_purity_percentage NUMERIC(5, 2),
  return_pure_gold NUMERIC(10, 3),
  image_url TEXT,
  receipt_json_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Billing Presets Table (billing_presets)
CREATE TABLE IF NOT EXISTS public.billing_presets (
  id SERIAL PRIMARY KEY,
  preset_name VARCHAR(255) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_preset_category UNIQUE(preset_name, category_name)
);

-- 7. Create Interests / Finance Loans Table (interests)
CREATE TABLE IF NOT EXISTS public.interests (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT GENERATED ALWAYS AS (('CUST-'::text || LPAD((id)::text, 4, '0'::text))) STORED NOT NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  customer_surname TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  interest_rate_percent NUMERIC(5, 2) NOT NULL,
  timeline_months INTEGER NOT NULL DEFAULT 1,
  monthly_interest NUMERIC GENERATED ALWAYS AS (ROUND(((amount * interest_rate_percent) / (100)::numeric), 2)) STORED NULL,
  total_interest NUMERIC GENERATED ALWAYS AS (ROUND((((amount * interest_rate_percent) / (100)::numeric) * (timeline_months)::numeric), 2)) STORED NULL,
  total_payable NUMERIC GENERATED ALWAYS AS ((amount + ROUND((((amount * interest_rate_percent) / (100)::numeric) * (timeline_months)::numeric), 2))) STORED NULL,
  item_name TEXT NOT NULL,
  item_weight_grams NUMERIC(10, 3) NOT NULL,
  item_deduction_name TEXT NULL,
  item_deduction_weight_grams NUMERIC(10, 3) NOT NULL DEFAULT 0,
  item_purity_percent NUMERIC(5, 2) NOT NULL,
  item_metal_type TEXT NOT NULL CHECK (item_metal_type = ANY (ARRAY['gold'::text, 'silver'::text, 'cash'::text])),
  item_pure_weight NUMERIC(10, 3) GENERATED ALWAYS AS (ROUND(((item_weight_grams - COALESCE(item_deduction_weight_grams, (0)::numeric)) * (item_purity_percent / (100)::numeric)), 3)) STORED NULL,
  item_metal_rate_per_gram NUMERIC(12, 2) NOT NULL,
  item_total_value NUMERIC(12, 2) GENERATED ALWAYS AS (ROUND((((item_weight_grams - COALESCE(item_deduction_weight_grams, (0)::numeric)) * (item_purity_percent / (100)::numeric)) * item_metal_rate_per_gram), 2)) STORED NULL,
  item_image_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'CLOSED'::text])),
  final_consideration_interest_amount NUMERIC(12, 2) NULL,
  closing_date DATE NULL,
  considered_type TEXT NULL,
  record_action TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Create Finance Debt Ledger Table (finance_debt_ledger)
CREATE TABLE IF NOT EXISTS public.finance_debt_ledger (
  id VARCHAR(50) PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  debt_principal NUMERIC(12, 2) NOT NULL,
  item_weight_grams NUMERIC(10, 3) NOT NULL,
  interest_rate_per_month NUMERIC(5, 2) NOT NULL DEFAULT 1.50,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create Custom Orders Table (orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address VARCHAR(500),
  metal_type VARCHAR(20) DEFAULT 'GOLD',
  item_name VARCHAR(255) NOT NULL,
  gross_weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  net_weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  touch_percentage NUMERIC(5, 2) DEFAULT 91.60,
  fine_weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  making_charges NUMERIC(12, 2) DEFAULT 0.00,
  estimated_delivery_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'COMPLETED')),
  sold_status VARCHAR(20) DEFAULT 'no',
  paid_amount NUMERIC(12, 2) DEFAULT 0.00,
  due_amount NUMERIC(12, 2) DEFAULT 0.00,
  assigned_worker_id VARCHAR(50),
  assigned_worker_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  applied_rate_per_gram NUMERIC(12, 2) DEFAULT 0.00,
  pure_metal_weight NUMERIC(10, 3) DEFAULT 0.000,
  metal_value NUMERIC(12, 2) DEFAULT 0.00,
  gst_amount NUMERIC(12, 2) DEFAULT 0.00,
  final_amount NUMERIC(12, 2) DEFAULT 0.00,
  gold_buy_rate_snapshot NUMERIC(12, 2),
  gold_sell_rate_snapshot NUMERIC(12, 2),
  silver_buy_rate_snapshot NUMERIC(12, 2),
  silver_sell_rate_snapshot NUMERIC(12, 2),
  receipt_json_data JSONB,
  submitted VARCHAR(10) DEFAULT 'no',
  returned_from_worker VARCHAR(10) DEFAULT 'no',
  returned_at TIMESTAMP WITH TIME ZONE,
  item_length_inches VARCHAR(20),
  quantity_unit VARCHAR(20) DEFAULT 'PIECES',
  quantity_value NUMERIC(10, 2) DEFAULT 1.00,
  assigned_at TIMESTAMP WITH TIME ZONE,
  hmw_percentage NUMERIC(5, 2) DEFAULT 0.00,
  hmw_weight NUMERIC(10, 3) DEFAULT 0.000,
  additional_charge_name VARCHAR(100),
  additional_charge_value NUMERIC(12, 2) DEFAULT 0.00,
  return_purity_percentage NUMERIC(5, 2),
  return_pure_gold NUMERIC(10, 3),
  image_url TEXT
);

-- 10. Create Worker Transactions / Chat Table (worker_transactions)
CREATE TABLE IF NOT EXISTS public.worker_transactions (
  id VARCHAR(50) PRIMARY KEY,
  worker_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('OUTGOING', 'INCOMING')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('GOLD', 'SILVER', 'CASH', 'ORNAMENT', 'CHAT', 'ORDER')),
  amount_cash NUMERIC(12, 2) DEFAULT 0.00,
  weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  touch_percentage NUMERIC(5, 2) DEFAULT 91.60,
  fine_weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  item_name VARCHAR(255),
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cash_metal_link VARCHAR(30),
  applied_rate_per_gram NUMERIC(12, 2) DEFAULT 0.00,
  equivalent_metal_grams NUMERIC(10, 3) DEFAULT 0.000,
  edited_at_history JSONB DEFAULT '[]'::jsonb,
  is_deleted BOOLEAN DEFAULT FALSE,
  reply_to JSONB,
  status_state VARCHAR(20) DEFAULT 'DELIVERED',
  is_seen VARCHAR(5) DEFAULT 'NO',
  read_at TIMESTAMP WITH TIME ZONE,
  seen_at TIMESTAMP WITH TIME ZONE
);

-- 11. Create Workers Table (workers)
CREATE TABLE IF NOT EXISTS public.workers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  specialization VARCHAR(100),
  photo_url TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  fcm_token TEXT
);

-- 12. Create Inventory Products Table (inventory_products)
CREATE TABLE IF NOT EXISTS public.inventory_products (
  id VARCHAR(50) PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(50),
  weight_from_grams NUMERIC(10, 3) DEFAULT 0.000,
  weight_to_grams NUMERIC(10, 3) DEFAULT 0.000,
  img TEXT,
  category VARCHAR(100),
  price NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Create Inventory Category Table (inventory_category)
CREATE TABLE IF NOT EXISTS public.inventory_category (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Create User Settings Table (user_settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'DEFAULT_USER',
  message_preview_enabled BOOLEAN DEFAULT TRUE,
  image_preview_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 15. Create Recommended Performance Indexes
-- ==============================================================================

-- 1. Orders Table Indexes (Speeds up Orders module, filtering & worker assignments)
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_worker ON public.orders(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_orders_submitted ON public.orders(submitted);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);

-- 2. Billing Invoices & Customer Directory Indexes (Speeds up Purchase History & Directory)
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON public.billing_invoices(customer_phone);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.billing_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_type ON public.billing_invoices(transaction_type);

-- 3. Worker Transactions / Chat Indexes (Speeds up Admin Chat & Worker Sidebars)
CREATE INDEX IF NOT EXISTS idx_worker_txns_worker_id ON public.worker_transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_txns_created_at ON public.worker_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_txns_order_id ON public.worker_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_worker_txns_direction ON public.worker_transactions(direction);
CREATE INDEX IF NOT EXISTS idx_worker_txns_is_seen ON public.worker_transactions(is_seen);

-- 4. Finance / Pledge Loans Indexes (Speeds up Girvi / Loan Account fetching)
CREATE INDEX IF NOT EXISTS idx_interests_status ON public.interests(status);
CREATE INDEX IF NOT EXISTS idx_interests_created_at ON public.interests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interests_customer_phone ON public.interests(customer_phone);

-- 5. Inventory Indexes (Speeds up Stock Inventory searching & category filters)
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory_products(created_at DESC);

-- 6. Workers Table Index
CREATE INDEX IF NOT EXISTS idx_workers_phone ON public.workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_status ON public.workers(status);

-- 7. Metal Rate History Index
CREATE INDEX IF NOT EXISTS idx_metal_history_updated_at ON public.metal_history_rates(updated_at DESC);

-- ── APP VERSIONS PERSISTENCE TABLE (AUTOSYNCED BY GITHUB ACTIONS ON MAIN BRANCH PUSH) ──
CREATE TABLE IF NOT EXISTS public.app_versions (
  app_id TEXT PRIMARY KEY,
  version_code INT NOT NULL,
  version_name TEXT NOT NULL,
  apk_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial records if empty
INSERT INTO public.app_versions (app_id, version_code, version_name, apk_url)
VALUES 
  ('ADMIN', 1, '1.0.0', 'https://wdlbeiqwbwnjywpqcfbq.supabase.co/storage/v1/object/public/apks/JayaBhavaniAdmin.apk'),
  ('WORKER', 1, '1.0.0', 'https://wdlbeiqwbwnjywpqcfbq.supabase.co/storage/v1/object/public/apks/JayaBhavaniWorker.apk')
ON CONFLICT (app_id) DO NOTHING;

-- Grant permissions to PostgREST roles (Fixes 403 Permission Denied)
GRANT ALL ON TABLE public.app_versions TO service_role, anon, authenticated, postgres;
ALTER TABLE public.app_versions DISABLE ROW LEVEL SECURITY;


