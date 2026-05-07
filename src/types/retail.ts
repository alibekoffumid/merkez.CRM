/**
 * Retail Module Types
 */

export interface RetailProduct {
  id: string;
  user_id: string;
  barcode: string;
  name: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  price?: number; // Main price column from unified products table
  stock_quantity: number;
  critical_stock: number;
  excise_stamp_required: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RetailSale {
  id: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: 'cash' | 'card';
  cashier_id: string;
  fiscal_receipt_number?: string;
  created_at: string;
}

export interface RetailSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number;
  excise_stamp?: string;
  total: number;
  created_at: string;
}

export interface CartItem extends RetailProduct {
  quantity: number;
  excise_stamp?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number;
}
