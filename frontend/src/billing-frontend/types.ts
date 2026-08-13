export interface GlobalRates {
  gold_buy_value: number;
  gold_buy_value_updated_at: string;
  gold_sell_value: number;
  gold_sell_value_updated_at: string;
  silver_buy_value: number;
  silver_buy_value_updated_at: string;
  silver_sell_value: number;
  silver_sell_value_updated_at: string;
}

export interface BillItem {
  id: string;
  metal_type: 'GOLD' | 'SILVER';
  product_name: string;
  weight_grams: number | string; // Gross Weight
  deduction_name?: string;
  deduction_weight_grams?: number | string;
  net_weight_grams?: number | string;
  wastage_percent?: number | string;
  wastage_amount?: number;
  making_charges_per_gram?: number | string; // Making Charges amount
  additional_charges_name?: string;
  additional_charges_amount?: number | string;
  item_type: 'SELL' | 'BUY';
  custom_rate_per_gram?: number | string;
  customRate?: number;
  appliedRate?: number;
  purity_percentage?: number | string;
  gst_percent?: number | string;
  quantity_unit?: 'PIECES' | 'PAIRS' | 'GRAMS';
  quantity_value?: number | string;
  item_length_inches?: string | number;
  return_purity_percentage?: number | string;
  return_pure_gold?: number | string;
}

export interface InvoiceRecord {
  id: number | string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  transaction_type: 'SELL' | 'BUY' | 'EXCHANGE';
  metal_type: string;
  product_name: string;
  weight_grams: number;
  deduction_name?: string;
  deduction_weight_grams?: number;
  net_weight_grams?: number;
  wastage_percent?: number;
  wastage_amount?: number;
  making_charges_per_gram?: number;
  additional_charges_name?: string;
  additional_charges_amount?: number;
  purity_percentage?: number;
  pure_metal_weight?: number;
  gst_percent?: number;
  final_amount: number;
  paid_amount?: number;
  due_amount?: number;
  gold_buy_rate_snapshot?: number;
  gold_sell_rate_snapshot?: number;
  silver_buy_rate_snapshot?: number;
  silver_sell_rate_snapshot?: number;
  return_purity_percentage?: number;
  return_pure_gold?: number;
  receipt_json_data?: any;
  created_at: string;
  updated_at?: string;
}

export interface CustomerDirectoryRecord {
  name: string;
  phone: string;
  address?: string;
  products: string[];
  totalWeight: number;
  totalSpent: number;
  ordersCount: number;
  lastDate: string;
  latestInvoice?: InvoiceRecord;
}
