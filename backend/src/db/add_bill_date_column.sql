-- ==============================================================================
-- UNIVERSAL 'bill_date' COLUMN MIGRATION FOR ALL JBJ TABLES
-- Run this in Supabase SQL Editor to enable custom/backdated date support
-- ==============================================================================

-- 1. Master Customer Invoices Table (customer_billing)
ALTER TABLE IF EXISTS public.customer_billing 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.customer_billing 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_billing_bill_date 
ON public.customer_billing(bill_date DESC);


-- 2. Line-Item Breakdown Table (billing_sell_buy_records)
ALTER TABLE IF EXISTS public.billing_sell_buy_records 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.billing_sell_buy_records 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_billing_sell_buy_bill_date 
ON public.billing_sell_buy_records(bill_date DESC);


-- 3. Billing Payment History (Multi-Installments & Settlements)
ALTER TABLE IF EXISTS public.billing_payment_history 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'FULL',
ADD COLUMN IF NOT EXISTS remaining_due NUMERIC(15, 2) DEFAULT 0.00;

UPDATE public.billing_payment_history 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_billing_payment_hist_bill_date 
ON public.billing_payment_history(bill_date DESC);


-- 4. Custom Orders Table (orders)
ALTER TABLE IF EXISTS public.orders 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.orders 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_bill_date 
ON public.orders(bill_date DESC);


-- 5. Finance Loans Table (finance)
ALTER TABLE IF EXISTS public.finance 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.finance 
SET bill_date = COALESCE(debt_date, (created_at AT TIME ZONE 'Asia/Kolkata')::DATE) 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_bill_date 
ON public.finance(bill_date DESC);


-- 6. Inventory Products Stock Table (inventory_products)
ALTER TABLE IF EXISTS public.inventory_products 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.inventory_products 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_products_bill_date 
ON public.inventory_products(bill_date DESC);


-- 7. Worker / Karigar Transfers Table (worker_transactions)
ALTER TABLE IF EXISTS public.worker_transactions 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.worker_transactions 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_worker_transactions_bill_date 
ON public.worker_transactions(bill_date DESC);


-- 8. Cash Drawer Transaction Ledger (cash_transaction_ledger)
ALTER TABLE IF EXISTS public.cash_transaction_ledger 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.cash_transaction_ledger 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_cash_ledger_bill_date 
ON public.cash_transaction_ledger(bill_date DESC);


-- 9. Secondary / Legacy Invoices Table (billing_invoices)
ALTER TABLE IF EXISTS public.billing_invoices 
ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;

UPDATE public.billing_invoices 
SET bill_date = (created_at AT TIME ZONE 'Asia/Kolkata')::DATE 
WHERE bill_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_billing_invoices_bill_date 
ON public.billing_invoices(bill_date DESC);
