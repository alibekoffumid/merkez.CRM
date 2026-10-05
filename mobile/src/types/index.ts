export interface Product {
  id: string;
  name: string;
  article_number?: string;
  barcode?: string;
  category_id?: string;
  category?: string;
  price?: number;
  sale_price?: number;
  purchase_price?: number;
  factory_price?: string | number;
  discount_type?: 'none' | 'percent' | 'fixed';
  discount_value?: number;
  stock_quantity: number;
  critical_stock?: number;
  unit?: string;
  image_url?: string;
  description?: string;
  supplier_id?: string;
  supplier_name?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  user_id?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  user_id?: string;
  created_at?: string;
}

export interface StockReceiptItem {
  id: string;
  product_id: string;
  product_name: string;
  barcode?: string;
  quantity: number;
  unit_price?: number;
  supplier_name?: string;
  notes?: string;
  received_at: string;
}

export interface StockSaleItem {
  id: string;
  product_id: string;
  product_name: string;
  barcode?: string;
  quantity: number;
  sale_price?: number;
  discount_amount?: number;
  discount_type?: string;
  notes?: string;
  issued_at: string;
  created_at?: string;
  product?: Product;
}

export interface StockDispatchItem {
  id: string;
  product_id: string;
  product_name: string;
  barcode?: string;
  quantity: number;
  reason: string;
  notes?: string;
  issued_at: string;
  created_at?: string;
}

export interface StockTransferItem {
  id: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  from_warehouse_name?: string;
  to_warehouse_name?: string;
  notes?: string;
  created_at: string;
  items?: Array<{ product_name: string; quantity: number }>;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  type: 'RECEIVE' | 'DISPATCH' | 'TRANSFER' | 'ADJUSTMENT' | 'SALE';
  quantity: number;
  cost_price?: number;
  sale_price?: number;
  supplier_id?: string;
  supplier_name?: string;
  comment?: string;
  created_at: string;
  user_id?: string;
}

export interface WarehouseMaster {
  id: string;
  name: string;
  phone?: string;
  balance?: number;
  user_id?: string;
}

export interface WarehouseRepair {
  id: string;
  repair_code: string;
  type: 'INTERNAL_STOCK' | 'CLIENT_ITEM';
  product_id?: string;
  item_name: string;
  serial_number?: string;
  master_id?: string;
  master_name?: string;
  issue_description?: string;
  status: 'SENT_TO_MASTER' | 'READY' | 'RETURNED_TO_STOCK';
  master_fee?: number;
  parts_cost?: number;
  created_at?: string;
}

export interface POSCartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
  discount?: number;
  discountType?: 'percent' | 'fixed';
}

export interface ScanResult {
  barcode: string;
  type?: string;
  timestamp: number;
}

export type StaffRole = 'Owner' | 'Admin' | 'Manager' | 'Storeman' | 'Cashier' | 'Master' | 'Staff';

export interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  role: StaffRole;
  pin?: string;
  phone?: string;
  status?: string;
}

export interface StaffPermissions {
  canViewCostPrices: boolean;
  canManageProducts: boolean;
  canPerformMovements: boolean;
  canDeleteHistory: boolean;
  canViewSupplier: boolean;
  canViewStockStats: boolean;
  isOwnerOrAdmin: boolean;
  isManager: boolean;
  isStoreman: boolean;
  isCashier: boolean;
  isMaster: boolean;
}

