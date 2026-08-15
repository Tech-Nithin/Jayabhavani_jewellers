export interface WorkerProfile {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  photo_url?: string;
  specialization?: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface ReplyMessageData {
  id: string;
  senderName: string;
  notes: string;
  photos?: string[];
}

export type TransactionCategory = 'CASH' | 'GOLD' | 'SILVER' | 'ORNAMENT';

export interface WorkerTransaction {
  id: string;
  worker_id: string;
  order_id?: string | null;
  direction: 'OUTGOING' | 'INCOMING';
  category: TransactionCategory;
  amount_cash?: number;
  weight_grams?: number;
  touch_percentage?: number;
  item_name?: string;
  photos: string[];
  notes: string;
  created_at: string;
  edited_at_history?: string[];
  is_deleted?: boolean;
  reply_to?: ReplyMessageData | null;
  status_state?: 'SENDING' | 'FAILED' | 'SENT' | 'DELIVERED' | 'READ';
  is_seen?: 'YES' | 'NO';
  read_at?: string;
  seen_at?: string;
}
