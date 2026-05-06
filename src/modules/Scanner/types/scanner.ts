// Strict TypeScript interfaces for the Mobile Scanner module

export interface ScannerCartEvent {
  id: string;
  user_id: string;
  business_id: string;
  barcode: string;
  product_id: string | null;
  product_name: string | null;
  price: number | null;
  quantity: number;
  status: 'pending' | 'added' | 'not_found';
  created_at: string;
}

export interface ScannedProduct {
  id: string;
  user_id: string;
  name: string;
  barcode: string;
  price: number;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  critical_stock: number;
  category: string;
  excise_stamp_required: boolean;
}

export type ScannerMode = 'pos' | 'inventory';

export interface ScanFeedback {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  subtitle: string;
  productName?: string;
}

export interface NewProductForm {
  name: string;
  barcode: string;
  category: string;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  critical_stock: number;
}

export interface InventoryUpdate {
  product_id: string;
  new_quantity: number;
}
