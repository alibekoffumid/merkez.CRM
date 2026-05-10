import { db } from './offlineDB';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export const isElectron = () => {
  return navigator.userAgent.toLowerCase().includes('electron');
};

export const processOfflineSales = async () => {
  if (!navigator.onLine) return;

  const pendingSales = await db.pendingSales.where('synced').equals('false').toArray();
  // Note: Boolean indexed in Dexie 3+ needs string or number usually if not handled correctly, but boolean works in Dexie 3+.
  // Let's get all and filter to be safe if index type is boolean.
  const allPending = await db.pendingSales.toArray();
  const unsynced = allPending.filter(s => !s.synced);

  if (unsynced.length === 0) return;

  console.log(`Starting sync for ${unsynced.length} pending sales...`);

  for (const sale of unsynced) {
    try {
      // Use the same RPC call as RetailPOS.tsx
      const { error } = await supabase.rpc('process_retail_sale', {
        p_user_id: sale.user_id,
        p_total_amount: sale.total_amount,
        p_tax_amount: sale.tax_amount,
        p_payment_method: sale.payment_method,
        p_discount_amount: sale.discount_amount,
        p_discount_type: sale.discount_type,
        p_split_cash: sale.split_cash,
        p_split_card: sale.split_card,
        p_items: sale.items
      });

      if (error) {
        console.error('Sync failed for sale:', sale.id, error);
        // Continue with others, maybe this one has an issue
      } else {
        // Mark as synced
        if (sale.id) {
          await db.pendingSales.update(sale.id, { synced: true });
        }
      }
    } catch (err) {
      console.error('Unexpected error syncing sale:', err);
    }
  }

  // Check how many left
  const remaining = await db.pendingSales.toArray();
  const remainingUnsynced = remaining.filter(s => !s.synced);
  
  if (remainingUnsynced.length === 0) {
    toast.success('Все оффлайн-продажи синхронизированы!');
    // Optional: cleanup old synced sales to save space
    const syncedSales = remaining.filter(s => s.synced);
    for (const s of syncedSales) {
      if (s.id) await db.pendingSales.delete(s.id);
    }
  } else {
    toast.error(`Синхронизация завершена с ошибками. Осталось чеков: ${remainingUnsynced.length}`);
  }
};

// Setup listeners for online/offline events
export const initSyncManager = () => {
  if (!isElectron()) return;

  window.addEventListener('online', () => {
    console.log('App is online. Processing offline sales...');
    processOfflineSales();
  });

  window.addEventListener('offline', () => {
    console.log('App is offline.');
  });
};
