import { supabase } from '../supabaseClient';
import {
  getUnsyncedSales,
  markSaleSynced,
  markSaleFailed,
  getPendingCount,
  type PendingSale,
} from './offlineDB';
import { cacheAllProducts } from './productCache';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'syncing';

type SyncListener = (status: SyncStatus, pendingCount: number) => void;

/**
 * SyncManager — handles background synchronization of offline data.
 *
 * Responsibilities:
 * 1. Monitor network status (online/offline)
 * 2. When online: push all pending sales to Supabase
 * 3. Refresh product cache periodically
 * 4. Notify UI of sync status changes
 */
class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = 'synced';
  private pendingCount: number = 0;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing: boolean = false;
  private userId: string | null = null;

  /** Initialize the sync manager */
  async init(userId: string): Promise<void> {
    this.userId = userId;

    // Listen for network changes
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Check initial status
    await this.updatePendingCount();

    if (navigator.onLine) {
      this.setStatus(this.pendingCount > 0 ? 'pending' : 'synced');
      // Initial sync attempt
      await this.syncAll();
    } else {
      this.setStatus('offline');
    }

    // Start periodic sync (every 30 seconds)
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncAll();
      }
    }, 30_000);
  }

  /** Clean up */
  destroy(): void {
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  /** Subscribe to sync status changes */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately send current status
    listener(this.status, this.pendingCount);
    return () => this.listeners.delete(listener);
  }

  /** Get current status */
  getStatus(): { status: SyncStatus; pendingCount: number } {
    return { status: this.status, pendingCount: this.pendingCount };
  }

  // ===== Private Methods =====

  private setStatus(newStatus: SyncStatus): void {
    this.status = newStatus;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn(this.status, this.pendingCount));
  }

  private async updatePendingCount(): Promise<void> {
    this.pendingCount = await getPendingCount();
  }

  private async handleOnline(): Promise<void> {
    console.log('[SyncManager] Network online — starting sync');
    await this.syncAll();
  }

  private handleOffline(): void {
    console.log('[SyncManager] Network offline');
    this.setStatus('offline');
  }

  /** Main sync: push pending sales + refresh product cache */
  async syncAll(): Promise<void> {
    if (this.isSyncing || !navigator.onLine || !this.userId) return;

    this.isSyncing = true;
    this.setStatus('syncing');

    try {
      // 1. Push pending sales
      await this.pushPendingSales();

      // 2. Update pending count
      await this.updatePendingCount();

      // 3. Refresh product cache
      await cacheAllProducts(this.userId);

      // 4. Update status
      this.setStatus(this.pendingCount > 0 ? 'pending' : 'synced');
    } catch (err) {
      console.error('[SyncManager] Sync failed:', err);
      this.setStatus(this.pendingCount > 0 ? 'pending' : 'synced');
    } finally {
      this.isSyncing = false;
    }
  }

  /** Push all unsynced sales to Supabase */
  private async pushPendingSales(): Promise<void> {
    const unsyncedSales = await getUnsyncedSales();

    if (unsyncedSales.length === 0) {
      console.log('[SyncManager] No pending sales to sync');
      return;
    }

    console.log(`[SyncManager] Syncing ${unsyncedSales.length} pending sales...`);

    for (const sale of unsyncedSales) {
      // Skip sales with too many retries
      if (sale.retry_count >= 5) {
        console.warn(`[SyncManager] Sale ${sale.local_id} exceeded retry limit, skipping`);
        continue;
      }

      try {
        await this.pushSingleSale(sale);
        await markSaleSynced(sale.local_id);
        console.log(`[SyncManager] ✅ Sale ${sale.local_id} synced`);
      } catch (err: any) {
        console.error(`[SyncManager] ❌ Sale ${sale.local_id} failed:`, err.message);
        await markSaleFailed(sale.local_id, err.message);
      }
    }
  }

  /** Push a single sale to Supabase using the existing RPC */
  private async pushSingleSale(sale: PendingSale): Promise<void> {
    const { error } = await supabase.rpc('process_retail_sale', {
      p_user_id: sale.user_id,
      p_total_amount: sale.total_amount,
      p_tax_amount: sale.tax_amount,
      p_payment_method: sale.payment_method,
      p_discount_amount: sale.discount_amount,
      p_discount_type: sale.discount_type,
      p_split_cash: sale.split_cash,
      p_split_card: sale.split_card,
      p_items: sale.items,
    });

    if (error) throw error;
  }
}

// Singleton
export const syncManager = new SyncManager();
