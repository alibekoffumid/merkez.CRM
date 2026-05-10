import { supabase } from '../supabaseClient';
import {
  offlineDB,
  refreshProductCache,
  getLastCacheTime,
  type CachedProduct,
} from './offlineDB';

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * ProductCache — manages local caching of the products table.
 * On app start (or when cache is stale), downloads all products
 * with valid barcodes and stores them in IndexedDB.
 * All barcode/search lookups hit the local cache first.
 */

/** Fetch all retail products from Supabase and cache locally */
export async function cacheAllProducts(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('user_id', userId)
      .eq('archived', false)
      .not('barcode', 'is', null)
      .neq('barcode', '');

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const products: CachedProduct[] = data.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      purchase_price: p.purchase_price || 0,
      sale_price: p.price, // sale_price = price for retail
      barcode: p.barcode,
      category_id: p.category_id || '',
      category_name: p.categories?.name || '',
      stock_quantity: p.stock_quantity || 0,
      critical_stock: p.critical_stock || 5,
      image_url: p.image_url || '',
      expiry_date: p.expiry_date || null,
      discount_type: p.discount_type || null,
      discount_value: p.discount_value || 0,
      excise_required: p.excise_required || false,
      cached_at: Date.now(),
    }));

    await refreshProductCache(products);
    console.log(`[ProductCache] Cached ${products.length} products`);
    return products.length;
  } catch (err) {
    console.error('[ProductCache] Failed to cache products:', err);
    return -1;
  }
}

/** Check if cache is stale and refresh if needed */
export async function ensureCacheFresh(userId: string): Promise<void> {
  const lastCache = await getLastCacheTime();
  const now = Date.now();

  if (!lastCache || now - lastCache > CACHE_TTL) {
    if (navigator.onLine) {
      console.log('[ProductCache] Cache is stale, refreshing...');
      await cacheAllProducts(userId);
    } else {
      console.log('[ProductCache] Offline, using existing cache');
    }
  } else {
    console.log(`[ProductCache] Cache is fresh (${Math.round((now - lastCache) / 1000)}s old)`);
  }
}

/** Get total cached product count */
export async function getCachedProductCount(): Promise<number> {
  return offlineDB.products.count();
}
