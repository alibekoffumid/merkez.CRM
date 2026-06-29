import { supabase } from '../supabaseClient';
import { db } from './offlineDB';
import { RetailProduct } from '../types/retail';

export const syncProductsToLocal = async (userId: string) => {
  if (!userId || !navigator.onLine) return false;

  try {
    // Fetch all active products for the user
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .not('barcode', 'is', null)
      .neq('barcode', '');

    if (error) {
      console.error('Error fetching products from Supabase:', error);
      return false;
    }

    if (products && products.length > 0) {
      // Use a transaction for bulk operations
      await db.transaction('rw', db.products, async () => {
        // We could clear and rewrite, or bulkPut to update/insert. bulkPut is better.
        await db.products.clear(); // Clear old to handle deleted items
        await db.products.bulkAdd(products as RetailProduct[]);
      });
      console.log(`Locally cached ${products.length} products.`);
      return true;
    }
    return true;
  } catch (err) {
    console.error('Failed to sync products locally:', err);
    return false;
  }
};

export const searchLocalProducts = async (query: string): Promise<RetailProduct[]> => {
  if (query.length < 2) return [];

  // Dexie case-insensitive search is a bit manual, but we can filter the collection
  const lowerQuery = query.toLowerCase();
  
  return await db.products
    .filter(product => 
      (product.name && product.name.toLowerCase().includes(lowerQuery)) ||
      (product.barcode && product.barcode.toLowerCase().includes(lowerQuery))
    )
    .limit(5)
    .toArray();
};

export const getLocalProductByBarcode = async (barcode: string): Promise<RetailProduct | undefined> => {
  return await db.products.where('barcode').equals(barcode).first();
};
