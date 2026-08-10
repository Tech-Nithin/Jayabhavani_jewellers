export interface LoanRecord {
  id: string;
  customer_id: string;
  loan_date: string;
  customer_name: string;
  customer_surname: string;
  customer_phone: string;
  customer_address?: string;
  amount: number;
  interest_rate_percent: number;
  timeline_months: number;
  monthly_interest: number;
  total_interest: number;
  total_payable: number;
  item_name: string;
  item_weight_grams: number;
  item_deduction_name?: string;
  item_deduction_weight?: number;
  item_deduction_weight_grams?: number;
  item_purity_percent: number;
  item_metal_type: 'gold' | 'silver' | 'cash';
  item_pure_weight: number;
  item_metal_rate_per_gram: number;
  item_total_value: number;
  item_image_url?: string;
  status: 'OPEN' | 'CLOSED';
  actual_timeline_till_date?: string;
  total_interest_till_today?: number;
  total_payable_till_today?: number;
  month_wise_count?: number;
  month_wise_interest?: number;
  final_consideration_interest_amount?: number;
  closing_date?: string;
  considered_type?: string;
  record_action?: string | null;
}

export interface MetalRates {
  gold_rate_per_gram: number;
  silver_rate_per_gram: number;
}

export const INTEREST_RATES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
export const TIMELINE_MONTHS = Array.from({ length: 24 }, (_, i) => i + 1);
