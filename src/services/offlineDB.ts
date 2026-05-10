import Dexie, { Table } from 'dexie';
import { RetailProduct, CartItem } from '../types/retail';

export interface PendingSale {
  id?: number;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  discount_amount: number;
  discount_type: string;
  split_cash: number;
  split_card: number;
  items: any[];
  created_at: string;
  synced: boolean;
}

export class MerkezOfflineDB extends Dexie {
  products!: Table<RetailProduct>;
  pendingSales!: Table<PendingSale>;

  constructor() {
    super('MerkezOfflineDB');
    this.version(1).stores({
      products: 'id, barcode, name, category_id, user_id', // Indexed fields
      pendingSales: '++id, user_id, synced, created_at'
    });
  }
}

export const db = new MerkezOfflineDB();
