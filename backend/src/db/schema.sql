-- ==============================================================================
-- MASTER DATABASE SCHEMA - JAYA BHAVANI JEWELLERS (JBJ ERP)
-- Verified from live Supabase PostgreSQL (Total 20 Tables) on 2026-09-04
-- ==============================================================================

-- ==============================================================================
-- 1. BILLING & INVOICING DEPARTMENT
-- ==============================================================================

-- 1.1 Master Customer Invoices Table
CREATE TABLE IF NOT EXISTS public.customer_billing (
  customer_billing_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id VARCHAR(50) NOT NULL,
  bill_type VARCHAR(30) NOT NULL CHECK (bill_type IN ('SELL', 'BUY', 'ORDER', 'EXCHANGE', 'TRADE_IN')),
  bill_date DATE DEFAULT CURRENT_DATE,
  actual_date DATE DEFAULT CURRENT_DATE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_address TEXT,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  due_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(30) NOT NULL DEFAULT 'PAID',
  bill_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_billing_bill_date ON public.customer_billing(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_billing_phone ON public.customer_billing(customer_phone);
CREATE INDEX IF NOT EXISTS idx_customer_billing_created_at ON public.customer_billing(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_billing_type ON public.customer_billing(bill_type);

-- 1.2 Line-Item Breakdown Table (Itemized Metal Details)
CREATE TABLE IF NOT EXISTS public.billing_sell_buy_records (
  record_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_billing_uuid UUID NOT NULL REFERENCES public.customer_billing(customer_billing_uuid) ON DELETE CASCADE,
  billing_mode VARCHAR(30) DEFAULT 'SELL',
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SELL', 'BUY')),
  metal_type VARCHAR(20) NOT NULL CHECK (metal_type IN ('GOLD', 'SILVER')),
  metal_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  bill_date DATE DEFAULT CURRENT_DATE,
  item_name VARCHAR(255) NOT NULL,
  item_weight NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  deduction_name VARCHAR(100),
  deduction_weight NUMERIC(12, 3) DEFAULT 0.000,
  only_metal_weight NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  hallmark_percentage NUMERIC(6, 2) DEFAULT 0.00,
  item_quality_percentage NUMERIC(6, 2) DEFAULT 0.00,
  pure_metal_weight NUMERIC(12, 3) DEFAULT 0.000,
  additional_charges VARCHAR(100),
  additional_cost NUMERIC(12, 2) DEFAULT 0.00,
  making_charges NUMERIC(12, 2) DEFAULT 0.00,
  total_item_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  quantity_unit VARCHAR(20) DEFAULT 'PIECES',
  item_length_inches VARCHAR(20),
  image_url TEXT,
  notes TEXT,
  is_item_submitted VARCHAR(10) DEFAULT 'no',
  item_submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_records_billing_uuid ON public.billing_sell_buy_records(customer_billing_uuid);
CREATE INDEX IF NOT EXISTS idx_billing_records_bill_date ON public.billing_sell_buy_records(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_records_metal ON public.billing_sell_buy_records(metal_type);
CREATE INDEX IF NOT EXISTS idx_billing_records_type ON public.billing_sell_buy_records(transaction_type);

-- 1.3 Billing Payment History (Multi-Installments & Settlements Ledger)
CREATE TABLE IF NOT EXISTS public.billing_payment_history (
  payment_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_billing_uuid UUID NOT NULL REFERENCES public.customer_billing(customer_billing_uuid) ON DELETE CASCADE,
  installment_number INT NOT NULL DEFAULT 1,
  amount_paid NUMERIC(15, 2) NOT NULL,
  payment_mode VARCHAR(30) NOT NULL DEFAULT 'CASH',
  payment_status VARCHAR(20) DEFAULT 'FULL',
  remaining_due NUMERIC(15, 2) DEFAULT 0.00,
  bill_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_hist_billing_uuid ON public.billing_payment_history(customer_billing_uuid);
CREATE INDEX IF NOT EXISTS idx_payment_hist_bill_date ON public.billing_payment_history(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_hist_created_at ON public.billing_payment_history(created_at DESC);

-- 1.4 Billing Presets Table
CREATE TABLE IF NOT EXISTS public.billing_presets (
  id SERIAL PRIMARY KEY,
  preset_name VARCHAR(255) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_preset_category UNIQUE(preset_name, category_name)
);


-- ==============================================================================
-- 2. CUSTOM ORDERS & KARIGAR (WORKER) DEPARTMENT
-- ==============================================================================

-- 2.1 Custom Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_address VARCHAR(500),
  metal_type VARCHAR(20) NOT NULL DEFAULT 'GOLD',
  item_name VARCHAR(255) NOT NULL,
  gross_weight_grams NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  net_weight_grams NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  touch_percentage NUMERIC(5, 2) NOT NULL DEFAULT 91.60,
  fine_weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  making_charges NUMERIC(12, 2) DEFAULT 0.00,
  estimated_delivery_date DATE,
  bill_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'COMPLETED')),
  sold_status VARCHAR(20) NOT NULL DEFAULT 'no',
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
  returned_from_worker TEXT DEFAULT 'no',
  returned_at TIMESTAMP WITH TIME ZONE,
  item_length_inches TEXT,
  quantity_unit TEXT DEFAULT 'PIECES',
  quantity_value NUMERIC(10, 2) DEFAULT 1.00,
  assigned_at TIMESTAMP WITH TIME ZONE,
  hmw_percentage NUMERIC(5, 2) DEFAULT 0.00,
  hmw_weight NUMERIC(10, 3) DEFAULT 0.000,
  additional_charge_name TEXT,
  additional_charge_value NUMERIC(12, 2) DEFAULT 0.00,
  return_purity_percentage NUMERIC(5, 2),
  return_pure_gold NUMERIC(10, 3),
  image_url TEXT,
  item_submitted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_bill_date ON public.orders(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_worker ON public.orders(assigned_worker_id);

-- 2.2 Workers Master Table
CREATE TABLE IF NOT EXISTS public.workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  specialization TEXT,
  photo_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE',
  fcm_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workers_phone ON public.workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_status ON public.workers(status);

-- 2.3 Worker Transactions / Transfers Ledger
CREATE TABLE IF NOT EXISTS public.worker_transactions (
  id VARCHAR(50) PRIMARY KEY,
  worker_id VARCHAR(50) NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
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
  bill_date DATE DEFAULT CURRENT_DATE,
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

CREATE INDEX IF NOT EXISTS idx_worker_txns_worker_id ON public.worker_transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_txns_bill_date ON public.worker_transactions(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_worker_txns_created_at ON public.worker_transactions(created_at DESC);


-- ==============================================================================
-- 3. PLEDGE FINANCE & GOLD LOANS (GIRVI) DEPARTMENT
-- ==============================================================================

-- 3.1 Finance Master Loans Table
CREATE TABLE IF NOT EXISTS public.finance (
  finance_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(100),
  customer_name VARCHAR(255) NOT NULL,
  customer_surname VARCHAR(255),
  customer_phone VARCHAR(50) NOT NULL,
  customer_address TEXT,
  debt_category VARCHAR(20) NOT NULL DEFAULT 'GOLD' CHECK (debt_category IN ('GOLD', 'SILVER', 'CASH')),
  item_name VARCHAR(255) NOT NULL,
  item_weight NUMERIC(12, 3) DEFAULT 0.000,
  item_deduction_name VARCHAR(100),
  item_deduction_weight NUMERIC(12, 3) DEFAULT 0.000,
  touch NUMERIC(6, 2) DEFAULT 91.60,
  pure_metal_weight NUMERIC(12, 3) DEFAULT 0.000,
  metal_value_per_gram NUMERIC(12, 2) DEFAULT 0.00,
  total_value_of_item NUMERIC(15, 2) DEFAULT 0.00,
  item_image_url TEXT,
  customer_debt_money NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  interest_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.50,
  timeline_months INT DEFAULT 3,
  debt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_date DATE DEFAULT CURRENT_DATE,
  current_principal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  interest_start_from DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (payment_status IN ('OPEN', 'PARTIAL', 'CLOSED')),
  any_balance NUMERIC(15, 2) DEFAULT 0.00,
  receipt_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finance_phone ON public.finance(customer_phone);
CREATE INDEX IF NOT EXISTS idx_finance_bill_date ON public.finance(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_status ON public.finance(payment_status);
CREATE INDEX IF NOT EXISTS idx_finance_category ON public.finance(debt_category);

-- 3.2 Finance Payment History & Repayment Ledger
CREATE TABLE IF NOT EXISTS public.finance_payment_history (
  payment_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finance_uuid UUID NOT NULL REFERENCES public.finance(finance_uuid) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('FULL_CLOSE', 'INTEREST_ONLY', 'PARTIAL_SETTLEMENT')),
  payment_transaction_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  interest_paying_amount NUMERIC(15, 2) DEFAULT 0.00,
  principal_paying_amount NUMERIC(15, 2) DEFAULT 0.00,
  interest_months_covered INT DEFAULT 1,
  interest_accrual_reset DATE,
  bill_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finance_payment_history_finance_uuid ON public.finance_payment_history(finance_uuid);


-- ==============================================================================
-- 4. INVENTORY & SHOWCASE STOCK DEPARTMENT
-- ==============================================================================

-- 4.1 Live Inventory Products Table
CREATE TABLE IF NOT EXISTS public.inventory_products (
  id VARCHAR(50) PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('GOLD', 'SILVER')),
  weight_from_grams NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  weight_to_grams NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  img TEXT,
  category VARCHAR(100) DEFAULT 'General',
  price NUMERIC(12, 2) DEFAULT 0.00,
  sold_quantity NUMERIC(10, 3) DEFAULT 0.000,
  current_stock_weight NUMERIC(10, 3) DEFAULT 0.000,
  stock_quantity NUMERIC(10, 3) DEFAULT 0.000,
  sell_count INT DEFAULT 0,
  bill_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_bill_date ON public.inventory_products(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON public.inventory_products(created_at DESC);

-- 4.2 Inventory Stock Adjustment Logs
CREATE TABLE IF NOT EXISTS public.inventory_stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(50) NOT NULL,
  item_name VARCHAR(255),
  previous_stock_weight NUMERIC(12, 3) NOT NULL,
  new_stock_weight NUMERIC(12, 3) NOT NULL,
  notes TEXT,
  metal_category VARCHAR(50),
  item_category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_logs_item_id ON public.inventory_stock_logs(item_id);

-- 4.3 Inventory Categories
CREATE TABLE IF NOT EXISTS public.inventory_category (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==============================================================================
-- 5. CASH DRAWER & EOD CLOSING DEPARTMENT
-- ==============================================================================

-- 5.1 Cash Transaction Inflows & Outflows Ledger
CREATE TABLE IF NOT EXISTS public.cash_transaction_ledger (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_history_uuid UUID,
  transaction_id VARCHAR(100),
  transaction_type VARCHAR(40) NOT NULL,
  flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('IN', 'OUT')),
  transaction_cash_total NUMERIC(15, 2) NOT NULL,
  metal_type VARCHAR(20) DEFAULT 'N/A',
  item_type VARCHAR(100),
  bill_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_ledger_bill_date ON public.cash_transaction_ledger(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_created_at ON public.cash_transaction_ledger(created_at DESC);

-- 5.2 Daily Cash Summary Register
CREATE TABLE IF NOT EXISTS public.cash_history (
  cash_history_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  current_cash NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  no_of_transactions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_history_date ON public.cash_history(date DESC);

-- 5.3 Daily Opening Records
CREATE TABLE IF NOT EXISTS public.daily_opening_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL UNIQUE,
  opening_gold NUMERIC(15, 3) DEFAULT 0.000,
  opening_silver NUMERIC(15, 3) DEFAULT 0.000,
  opening_cash NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_opening_date ON public.daily_opening_records(record_date DESC);

-- 5.4 Daily Closing Records (EOD Frozen Day Book Snapshots)
CREATE TABLE IF NOT EXISTS public.daily_closing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL UNIQUE,
  closing_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_closing_date ON public.daily_closing_records(record_date DESC);


-- ==============================================================================
-- 6. METAL RATES & AUDIT LOGS
-- ==============================================================================

-- 6.1 Current Active Metal Rates
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

-- 6.2 Metal Rate Change History Audit
CREATE TABLE IF NOT EXISTS public.metal_history_rates (
  id SERIAL PRIMARY KEY,
  metal_type VARCHAR(20) NOT NULL CHECK (metal_type IN ('GOLD', 'SILVER')),
  rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('BUY', 'SELL')),
  old_value NUMERIC(12, 2),
  new_value NUMERIC(12, 2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metal_history_updated_at ON public.metal_history_rates(updated_at DESC);


-- ==============================================================================
-- 7. SYSTEM CONFIG & MOBILE APP VERSIONS
-- ==============================================================================

-- 7.1 User Settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'DEFAULT_USER',
  message_preview_enabled BOOLEAN DEFAULT TRUE,
  image_preview_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7.2 Mobile App Versions (Auto-updater)
CREATE TABLE IF NOT EXISTS public.app_versions (
  app_id TEXT PRIMARY KEY,
  version_code INT NOT NULL,
  version_name TEXT NOT NULL,
  apk_url TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==============================================================================
-- 8. SECURITY & ACCESS PERMISSIONS
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role, anon, authenticated, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, anon, authenticated, postgres;

ALTER TABLE public.customer_billing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_sell_buy_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payment_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transaction_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_opening_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closing_records DISABLE ROW LEVEL SECURITY;
