-- ==============================================================================
-- ADD DISCOUNT_AMOUNT COLUMN TO CUSTOMER_BILLING & BILLING_PAYMENT_HISTORY
-- ==============================================================================

-- 1. Add discount_amount to customer_billing
ALTER TABLE public.customer_billing
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) DEFAULT 0.00;

-- 2. Add discount_amount to billing_payment_history (for settlement discounts)
ALTER TABLE public.billing_payment_history
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) DEFAULT 0.00;

-- 3. Comment for documentation
COMMENT ON COLUMN public.customer_billing.discount_amount IS 'Dedicated discount deducted from actual product subtotal to arrive at total_amount';
COMMENT ON COLUMN public.billing_payment_history.discount_amount IS 'Settlement discount given when recording an installment or clearing due balance';
