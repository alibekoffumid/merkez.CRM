export interface ETaxesSettings {
  id?: string;
  user_id: string;
  api_endpoint: string;
  merchant_id: string;
  terminal_id: string;
  api_key: string;
  shift_status: 'open' | 'closed';
  last_shift_open_at?: string;
  last_shift_close_at?: string;
}

export interface FiscalTransaction {
  id: string;
  order_id: string;
  fiscal_id: string;
  fiscal_status: 'pending' | 'success' | 'error' | 'refunded';
  payment_type: 'cash' | 'card' | 'bonus';
  fiscal_at: string;
  total_amount: number;
}

export interface FiscalStats {
  todayCash: number;
  todayCard: number;
  todayRefunds: number;
  shiftStatus: 'open' | 'closed';
}
