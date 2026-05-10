import Dexie, { type Table } from 'dexie';

// ===== Database Schema Types =====

export interface CachedProduct {
  id: string;
  name: string;
  price: number;
  purchase_price: number;
  sale_price?: number;
  barcode: string;
  category_id: string;
  category_name?: string;
  stock_quantity: number;
  critical_stock: number;
  image_url?: string;
  expiry_date?: string;
  discount_type?: string;
  discount_value?: number;
  excise_required?: boolean;
  cached_at: number; // timestamp
}

export interface PendingSale {
  id?: number; // auto-increment
  local_id: string; // UUID generated locally
  user_id: string;
  total_amount: number;
  tax_amount: number;
  payment_method: 'cash' | 'card' | 'split';
  discount_amount: number;
  discount_type: string;
  split_cash: number;
  split_card: number;
  items: PendingSaleItem[];
  created_at: string; // ISO string
  synced: boolean;
  sync_error?: string;
  retry_count: number;
}

export interface PendingSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_sale: number;
  base_price: number;
  discount_amount: number;
  discount_type: string;
  excise_stamp?: string | null;
}

export interface SyncLogEntry {
  id?: number;
  action: 'sale_synced' | 'sale_failed' | 'products_cached' | 'full_sync';
  details: string;
  timestamp: number;
  local_id?: string;
}

// ===== Dexie Database =====

class MerkezOfflineDB extends Dexie {
  products!: Table<CachedProduct, string>;
  pendingSales!: Table<PendingSale, number>;
  syncLog!: Table<SyncLogEntry, number>;

  constructor() {
    super('MerkezOfflineDB');

    this.version(1).stores({
      // Primary key is 'id', indexed fields after comma
      products: 'id, barcode, name, category_id, cached_at',
      // Auto-increment primary key
      pendingSales: '++id, local_id, synced, created_at, user_id',
      syncLog: '++id, action, timestamp',
    });
  }
}

// Singleton instance
export const offlineDB = new MerkezOfflineDB();

// ===== Helper Methods =====

/** Save a sale locally (offline-first) */
export async function saveSaleLocally(sale: Omit<PendingSale, 'id'>): Promise<number> {
  const id = await offlineDB.pendingSales.add(sale as PendingSale);
  await offlineDB.syncLog.add({
    action: 'sale_synced',
    details: `Sale ${sale.local_id} saved locally (${sale.total_amount} ₼)`,
    timestamp: Date.now(),
    local_id: sale.local_id,
  });
  return id;
}

/** Get all unsynced sales */
export async function getUnsyncedSales(): Promise<PendingSale[]> {
  return offlineDB.pendingSales
    .where('synced')
    .equals(0) // Dexie stores booleans as 0/1
    .toArray();
}

/** Mark a sale as synced */
export async function markSaleSynced(localId: string): Promise<void> {
  await offlineDB.pendingSales
    .where('local_id')
    .equals(localId)
    .modify({ synced: true, sync_error: undefined });
}

/** Mark a sale sync as failed */
export async function markSaleFailed(localId: string, error: string): Promise<void> {
  await offlineDB.pendingSales
    .where('local_id')
    .equals(localId)
    .modify((sale: PendingSale) => {
      sale.sync_error = error;
      sale.retry_count = (sale.retry_count || 0) + 1;
    });
}

/** Get count of pending (unsynced) sales */
export async function getPendingCount(): Promise<number> {
  return offlineDB.pendingSales
    .where('synced')
    .equals(0)
    .count();
}

/** Search products in local cache by barcode or name */
export async function searchProductsOffline(query: string): Promise<CachedProduct[]> {
  const lowerQuery = query.toLowerCase();

  // First try exact barcode match
  const barcodeMatch = await offlineDB.products
    .where('barcode')
    .equals(query)
    .toArray();

  if (barcodeMatch.length > 0) return barcodeMatch;

  // Otherwise fuzzy search by name
  return offlineDB.products
    .filter(p => p.name.toLowerCase().includes(lowerQuery))
    .limit(10)
    .toArray();
}

/** Find product by exact barcode */
export async function findProductByBarcode(barcode: string): Promise<CachedProduct | undefined> {
  return offlineDB.products
    .where('barcode')
    .equals(barcode)
    .first();
}

/** Clear and refresh the entire product cache */
export async function refreshProductCache(products: CachedProduct[]): Promise<void> {
  await offlineDB.transaction('rw', offlineDB.products, offlineDB.syncLog, async () => {
    await offlineDB.products.clear();
    await offlineDB.products.bulkAdd(products);
    await offlineDB.syncLog.add({
      action: 'products_cached',
      details: `${products.length} products cached`,
      timestamp: Date.now(),
    });
  });
}

/** Get the last cache timestamp */
export async function getLastCacheTime(): Promise<number | null> {
  const lastLog = await offlineDB.syncLog
    .where('action')
    .equals('products_cached')
    .last();
  return lastLog?.timestamp || null;
}
