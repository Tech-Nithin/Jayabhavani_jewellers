-- SQL Schema for Jaya Bhavani Jewellers (Supabase PostgreSQL)

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  old_price NUMERIC(10, 2),
  badge VARCHAR(50),
  img TEXT NOT NULL,
  weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  color VARCHAR(20) DEFAULT '#e8d4c0',
  stock_quantity INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- 3. Create Current Active Metal Rates Table (updated_metal_values) with mandatory per-column timestamps
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

-- 4. Create Metal Rate History Table (metal_history_rates) - Append-Only Audit Ledger
CREATE TABLE IF NOT EXISTS public.metal_history_rates (
  id SERIAL PRIMARY KEY,
  metal_type VARCHAR(20) NOT NULL CHECK (metal_type IN ('GOLD', 'SILVER')),
  rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('BUY', 'SELL')),
  old_value NUMERIC(12, 2),
  new_value NUMERIC(12, 2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Billing Invoices Table (Gold & Silver Buy/Sell Transactions)
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('SELL', 'BUY', 'EXCHANGE')),
  metal_type VARCHAR(20) NOT NULL CHECK (metal_type IN ('GOLD', 'SILVER', 'MIXED')),
  product_name VARCHAR(255) NOT NULL,
  weight_grams NUMERIC(10, 3) NOT NULL,
  purity_percentage NUMERIC(5, 2) NOT NULL,
  applied_rate_per_gram NUMERIC(12, 2) NOT NULL,
  pure_metal_weight NUMERIC(10, 3) NOT NULL,
  metal_value NUMERIC(12, 2) NOT NULL,
  making_charges NUMERIC(12, 2) DEFAULT 0.00,
  gst_amount NUMERIC(12, 2) DEFAULT 0.00,
  final_amount NUMERIC(12, 2) NOT NULL,
  gold_buy_rate_snapshot NUMERIC(12, 2),
  gold_sell_rate_snapshot NUMERIC(12, 2),
  silver_buy_rate_snapshot NUMERIC(12, 2),
  silver_sell_rate_snapshot NUMERIC(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Finance Pledge & Debt Loan Ledger Table (Girvi / Loan Accounts)
CREATE TABLE IF NOT EXISTS public.finance_debt_ledger (
  id VARCHAR(50) PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  debt_principal NUMERIC(12, 2) NOT NULL, -- Loan amount issued
  item_weight_grams NUMERIC(10, 3) NOT NULL,
  interest_rate_per_month NUMERIC(5, 2) NOT NULL DEFAULT 1.50, -- % interest per month
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Seed Initial Active Metal Values
INSERT INTO public.updated_metal_values (
  id,
  gold_buy_value, gold_buy_value_updated_at,
  gold_sell_value, gold_sell_value_updated_at,
  silver_buy_value, silver_buy_value_updated_at,
  silver_sell_value, silver_sell_value_updated_at
) VALUES (
  1,
  14200.00, CURRENT_TIMESTAMP,
  14700.00, CURRENT_TIMESTAMP,
  250.00, CURRENT_TIMESTAMP,
  270.00, CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- 8. Seed Initial History Ledger Entries
INSERT INTO public.metal_history_rates (metal_type, rate_type, old_value, new_value, updated_at) VALUES
('GOLD', 'BUY', NULL, 14200.00, CURRENT_TIMESTAMP),
('GOLD', 'SELL', NULL, 14700.00, CURRENT_TIMESTAMP),
('SILVER', 'BUY', NULL, 250.00, CURRENT_TIMESTAMP),
('SILVER', 'SELL', NULL, 270.00, CURRENT_TIMESTAMP);

-- 9. Seed Finance Pledge Debt Loans Sample Data
INSERT INTO public.finance_debt_ledger (id, item_name, customer_name, customer_phone, debt_principal, item_weight_grams, interest_rate_per_month, start_date, status) VALUES
('LOAN-301', '22K Gold Bangle Set', 'Suresh Patel', '9876501234', 85000.00, 18.500, 1.50, '2026-01-10', 'OPEN'),
('LOAN-302', 'Gold Chain (24K)', 'Anitha Reddy', '9123456789', 50000.00, 10.200, 1.75, '2026-02-15', 'OPEN'),
('LOAN-303', 'Silver Utensils Set', 'Vikram Singh', '9988776655', 15000.00, 350.000, 2.00, '2025-11-01', 'CLOSED')
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Store Products
INSERT INTO public.products (id, name, category, price, old_price, badge, img, weight_grams, color) VALUES
('r1', 'Eternal Solitaire Ring', 'Diamond Ring', 89500, NULL, 'new', '/Eternal_Solitaire_Ring.jpg', 4.250, '#e8d4c0'),
('r2', 'Rose Gold Eternity Band', 'Gold Ring', 42000, 52000, 'sale', '/Rose_Gold_Eternity_Band.png', 5.100, '#d4b8a0'),
('r3', 'Floral Diamond Cluster', 'Diamond Ring', 135000, NULL, 'hot', '/Floral_Diamond_Cluster.png', 6.800, '#c8a88c'),
('r4', 'Classic Gold Band', 'Gold Ring', 28000, NULL, NULL, '/classic_gold_band_ring.jpeg', 3.500, '#e0c8b0')
ON CONFLICT (id) DO NOTHING;
