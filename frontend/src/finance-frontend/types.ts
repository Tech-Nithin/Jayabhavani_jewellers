// ─── Master Loan Record (finance table) ─────────────────────────────────────
export interface LoanRecord {
  // Primary Key
  finance_uuid: string;

  // Customer
  customer_id?: string;
  customer_name: string;
  customer_surname: string;
  customer_phone: string;
  customer_address?: string;

  // Item
  debt_category: 'GOLD' | 'SILVER' | 'CASH';
  item_name?: string;
  item_weight: number;
  item_deduction_name?: string;
  item_deduction_weight: number;
  touch: number;
  pure_metal_weight: number;
  metal_value_per_gram: number;
  total_value_of_item: number;
  item_image_url?: string;

  // Loan Financials — PERMANENT ORIGINAL (never changes)
  customer_debt_money: number;
  interest_rate_percent: number;
  timeline_months: number;
  debt_date: string;

  // Live State (updated on payments)
  current_principal: number;
  interest_start_from: string;
  payment_status: 'OPEN' | 'PARTIAL' | 'CLOSED';
  any_balance: number;

  // Computed live fields (returned by API)
  current_interest_due?: number;
  months_elapsed?: number;
  days_elapsed?: number;
  total_payable_now?: number;
  total_interest_paid?: number;
  total_principal_paid?: number;

  // Receipt JSON snapshot
  receipt_json?: any;

  created_at: string;
  updated_at: string;

  // ── Legacy compat fields ──
  id?: string;
  loan_date?: string;
  amount?: number;
  status?: 'OPEN' | 'CLOSED';
  closing_date?: string;
  item_metal_type?: string;
  item_weight_grams?: number;
  item_purity_percent?: number;
  item_pure_weight?: number;
  item_metal_rate_per_gram?: number;
  item_total_value?: number;
  item_deduction_weight_grams?: number;
  month_wise_interest?: number;
  month_wise_count?: number;
  final_consideration_interest_amount?: number;
  total_interest_till_today?: number;
  record_action?: string | null;
}

// ─── Installment Payment History (finance_payment_history table) ─────────────
export interface LoanPayment {
  payment_uuid: string;
  finance_uuid: string;
  installment_number: number;
  payment_type: 'INTEREST_ONLY' | 'PARTIAL_SETTLEMENT' | 'FULL_CLOSE';
  payment_transaction_amount: number;
  interest_paying_amount: number;
  principal_paying_amount: number;
  notes?: string;
  paid_at: string;
  // Compat aliases
  paying_amount?: number;
  amount?: number;
  interest_component?: number;
  principal_component?: number;
  principal_after?: number;
}

// ─── Metal Rates ─────────────────────────────────────────────────────────────
export interface MetalRates {
  gold_rate_per_gram: number;
  silver_rate_per_gram: number;
}

export const INTEREST_RATES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
export const TIMELINE_MONTHS = Array.from({ length: 24 }, (_, i) => i + 1);
