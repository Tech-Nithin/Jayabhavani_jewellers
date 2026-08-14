-- SQL Migration Script to Create worker_transactions Table in Supabase PostgreSQL

-- Create Worker Transactions Table (WhatsApp Chat Ledger)
CREATE TABLE IF NOT EXISTS public.worker_transactions (
  id VARCHAR(50) PRIMARY KEY,
  worker_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('OUTGOING', 'INCOMING')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('GOLD', 'SILVER', 'CASH', 'ORNAMENT')),
  amount_cash NUMERIC(12, 2) DEFAULT 0.00,
  weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  touch_percentage NUMERIC(5, 2) DEFAULT 91.60,
  fine_weight_grams NUMERIC(10, 3) DEFAULT 0.000,
  item_name VARCHAR(255),
  cash_metal_link VARCHAR(30),
  applied_rate_per_gram NUMERIC(12, 2) DEFAULT 0.00,
  equivalent_metal_grams NUMERIC(10, 3) DEFAULT 0.000,
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add New Cash Settlement Columns (If Table Already Exists)
ALTER TABLE public.worker_transactions ADD COLUMN IF NOT EXISTS cash_metal_link VARCHAR(30);
ALTER TABLE public.worker_transactions ADD COLUMN IF NOT EXISTS applied_rate_per_gram NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.worker_transactions ADD COLUMN IF NOT EXISTS equivalent_metal_grams NUMERIC(10, 3) DEFAULT 0.000;

-- Disable Row Level Security & Grant Permissions
ALTER TABLE public.worker_transactions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.worker_transactions TO postgres, anon, authenticated, service_role;

