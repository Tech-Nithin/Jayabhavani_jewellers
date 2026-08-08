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
  weight_grams: number | string;
  purity_percentage: number | string;
  making_charges_per_gram: number | string;
  gst_percent: number | string;
  item_type: 'SELL' | 'BUY';
  custom_rate_per_gram?: number | string;
  customRate?: number;
  appliedRate?: number;
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
  purity_percentage?: number;
  pure_metal_weight?: number;
  making_charges_per_gram?: number;
  gst_percent?: number;
  final_amount: number;
  gold_buy_rate_snapshot?: number;
  gold_sell_rate_snapshot?: number;
  silver_buy_rate_snapshot?: number;
  silver_sell_rate_snapshot?: number;
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
