export interface OrderItem {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  metal_type: 'GOLD' | 'SILVER';
  item_name: string;
  quantity_unit?: 'PIECES' | 'PAIRS' | 'GRAMS';
  quantity_value?: number;
  item_length_inches?: string | number;
  gross_weight_grams: number;
  net_weight_grams: number;
  touch_percentage: number;
  fine_weight_grams: number;
  making_charges: number;
  estimated_delivery_date: string;
  notes: string;
  image_url?: string;
  // Rate applied at time of order
  applied_rate_per_gram?: number;
  // HMW & Additional Charges
  hmw_percentage?: number;
  hmw_weight?: number;
  additional_charge_name?: string;
  additional_charge_value?: number;
  // Return Purity Tracking (internal only)
  return_purity_percentage?: number;
  return_pure_gold?: number;
  // Full receipt JSON blob (used for See Bill)
  receipt_json_data?: any;
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED';
  sold_status?: 'DUE' | 'SOLD';
  submitted?: 'yes' | 'no';
  item_submitted_at?: string | null;
  paid_amount?: number;
  due_amount?: number;
  assigned_worker_id: string | null;
  assigned_worker_name: string | null;
  assigned_at?: string | null;
  returned_from_worker?: 'yes' | 'no';
  returned_at?: string | null;
  bill_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkerItem {
  id: string;
  name: string;
  phone: string;
  address?: string;
  specialization?: string;
  photo_url?: string;
  notes?: string;
}
