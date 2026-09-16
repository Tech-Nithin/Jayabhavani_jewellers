-- Migration: Add is_converted and converted_at to billing_sell_buy_records
ALTER TABLE IF EXISTS public.billing_sell_buy_records 
ADD COLUMN IF NOT EXISTS is_converted VARCHAR(10) DEFAULT 'no';

ALTER TABLE IF EXISTS public.billing_sell_buy_records 
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_billing_records_conversion 
ON public.billing_sell_buy_records(is_converted);
