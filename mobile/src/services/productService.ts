import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { Product, Category, Supplier, Warehouse } from '../types';
import { cleanAttributesForSave, formatAttributesForDescription } from '../utils/productAttributes';

export const DEFAULT_USER_ID = '8929ea5f-d6b8-46e9-9873-dd67e65046f0';
const WAREHOUSE_STORAGE_KEY = '@merkez_active_warehouse_id';

export async function getActiveUserId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) return sessionData.session.user.id;
  } catch (e) {
    // fallback
  }

  return DEFAULT_USER_ID;
}

export function extractFactoryPrice(desc?: string): string {
  if (!desc) return '';
  if (desc.includes('Zavod qiyməti:')) {
    return desc.split('Zavod qiyməti:')[1].split('\n')[0].trim();
  }
  if (desc.includes('Zavod qiym?ti:')) {
    return desc.split('Zavod qiym?ti:')[1].split('\n')[0].trim();
  }
  const match = desc.match(/zavod(?:\s*qiym[əe\?]ti)?\s*:\s*([^\n\r]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
}

export function formatDescriptionWithFactoryPrice(
  originalDesc: string | undefined | null,
  newFactoryPrice: string | undefined
): string {
  const current = (originalDesc || '').trim();
  const lines = current
    ? current.split('\n').filter(
        (line) =>
          !line.toLowerCase().startsWith('zavod qiyməti:') &&
          !line.toLowerCase().startsWith('zavod qiym?ti:') &&
          !line.toLowerCase().startsWith('zavod:')
      )
    : [];

  if (newFactoryPrice && newFactoryPrice.trim()) {
    lines.unshift(`Zavod qiyməti: ${newFactoryPrice.trim()}`);
  }

  return lines.join('\n');
}

let cachedProducts: Product[] | null = null;
let cachedProductsWarehouseId: string | null = null;
let cachedCategories: Category[] | null = null;
let cachedSuppliers: Supplier[] | null = null;
let cachedWarehouses: Warehouse[] | null = null;
let activeWarehouseId: string | null = null;
let activeFetchPromise: Promise<Product[]> | null = null;

export const productService = {
  getCachedProducts(): Product[] | null {
    return cachedProducts;
  },

  getCachedCategories(): Category[] | null {
    return cachedCategories;
  },

  getCachedSuppliers(): Supplier[] | null {
    return cachedSuppliers;
  },

  getCachedWarehouses(): Warehouse[] | null {
    return cachedWarehouses;
  },

  invalidateCache(): void {
    cachedProducts = null;
    cachedProductsWarehouseId = null;
    cachedCategories = null;
    cachedSuppliers = null;
    cachedWarehouses = null;
  },

  async getWarehouses(forceRefresh = false): Promise<Warehouse[]> {
    if (!forceRefresh && cachedWarehouses && cachedWarehouses.length > 0) {
      return cachedWarehouses;
    }
    try {
      const userId = await getActiveUserId();
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching warehouses:', error);
        return cachedWarehouses || [];
      }
      cachedWarehouses = data || [];
      return cachedWarehouses;
    } catch (e) {
      console.error('getWarehouses exception:', e);
      return cachedWarehouses || [];
    }
  },

  async getActiveWarehouseId(): Promise<string> {
    if (activeWarehouseId) return activeWarehouseId;
    try {
      const saved = await AsyncStorage.getItem(WAREHOUSE_STORAGE_KEY);
      if (saved) {
        activeWarehouseId = saved;
        return saved;
      }
    } catch (e) {}

    const warehouses = await this.getWarehouses();
    if (warehouses && warehouses.length > 0) {
      const def = warehouses.find((w) => w.is_default) || warehouses[0];
      activeWarehouseId = def.id;
      try {
        await AsyncStorage.setItem(WAREHOUSE_STORAGE_KEY, def.id);
      } catch (e) {}
      return def.id;
    }
    return '';
  },

  async setActiveWarehouseId(id: string): Promise<void> {
    if (activeWarehouseId === id) return;
    activeWarehouseId = id;
    cachedProducts = null;
    cachedProductsWarehouseId = null;
    try {
      await AsyncStorage.setItem(WAREHOUSE_STORAGE_KEY, id);
    } catch (e) {}
  },

  async createWarehouse(name: string, address = ''): Promise<Warehouse> {
    const userId = await getActiveUserId();
    const { data, error } = await supabase
      .from('warehouses')
      .insert([
        {
          name: name.trim(),
          address: address.trim(),
          user_id: userId,
          is_default: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    cachedWarehouses = null;
    await this.getWarehouses(true);
    return data;
  },

  async getProducts(forceRefresh = false, targetWarehouseId?: string): Promise<Product[]> {
    const wId = targetWarehouseId || (await this.getActiveWarehouseId());

    if (!forceRefresh && cachedProducts && cachedProductsWarehouseId === wId && cachedProducts.length > 0) {
      return cachedProducts;
    }

    if (activeFetchPromise && cachedProductsWarehouseId === wId) {
      return activeFetchPromise;
    }

    cachedProductsWarehouseId = wId;

    activeFetchPromise = (async () => {
      try {
        const userId = await getActiveUserId();
        const PAGE_SIZE = 1000;
        let allData: any[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from('products')
            .select('*, suppliers(name)')
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .order('name', { ascending: true });

          if (wId) {
            query = query.eq('warehouse_id', wId);
          }

          const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

          if (error) {
            console.error('Error fetching products batch:', error);
            throw error;
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < PAGE_SIZE) {
              hasMore = false;
            } else {
              from += PAGE_SIZE;
            }
          } else {
            hasMore = false;
          }
        }

        const [catsData, suppliersData, warehousesData] = await Promise.all([
          productService.getCategories(forceRefresh),
          productService.getSuppliers(forceRefresh),
          productService.getWarehouses(forceRefresh),
        ]);
        const catMap = new Map((catsData || []).map((c: any) => [c.id, c.name]));
        const supMap = new Map((suppliersData || []).map((s: any) => [s.id, s.name]));
        const warehouseMap = new Map((warehousesData || []).map((w: any) => [w.id, w.name]));

        const mapped: Product[] = allData.map((p: any) => ({
          ...p,
          factory_price: extractFactoryPrice(p.description),
          price: p.price ?? p.sale_price ?? 0,
          sale_price: p.price ?? p.sale_price ?? 0,
          purchase_price: p.purchase_price ?? 0,
          stock_quantity: p.stock_quantity ?? 0,
          category: (p.category_id ? catMap.get(p.category_id) : '') || p.category || '',
          supplier_name: p.suppliers?.name || (p.supplier_id ? supMap.get(p.supplier_id) : '') || p.supplier_name || '',
          warehouse_name: p.warehouse_id ? warehouseMap.get(p.warehouse_id) : undefined,
        }));

        cachedProducts = mapped;
        return mapped;
      } finally {
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  },

  async lookupByBarcode(barcode: string): Promise<Product | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    if (cachedProducts) {
      const match = cachedProducts.find(
        (p) => p.barcode === cleanBarcode || p.article_number === cleanBarcode
      );
      if (match) return match;
    }

    const userId = await getActiveUserId();
    const [cats, prodRes] = await Promise.all([
      productService.getCategories(),
      supabase
        .from('products')
        .select('*, suppliers(name)')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('barcode', cleanBarcode)
        .limit(1)
        .maybeSingle(),
    ]);

    const { data, error } = prodRes;
    if (error || !data) return null;

    const catMap = new Map(cats.map((c) => [c.id, c.name]));

    return {
      ...data,
      factory_price: extractFactoryPrice(data.description),
      price: data.price ?? data.sale_price ?? 0,
      sale_price: data.price ?? data.sale_price ?? 0,
      purchase_price: data.purchase_price ?? 0,
      stock_quantity: data.stock_quantity ?? 0,
      category: (data.category_id ? catMap.get(data.category_id) : '') || data.category || '',
      supplier_name: data.suppliers?.name || data.supplier_name || '',
    };
  },

  async getCategories(forceRefresh = false): Promise<Category[]> {
    if (!forceRefresh && cachedCategories && cachedCategories.length > 0) {
      return cachedCategories;
    }

    const userId = await getActiveUserId();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.warn('Could not load categories:', error);
      return cachedCategories || [];
    }
    cachedCategories = data || [];
    return cachedCategories;
  },

  async getSuppliers(forceRefresh = false): Promise<Supplier[]> {
    if (!forceRefresh && cachedSuppliers && cachedSuppliers.length > 0) {
      return cachedSuppliers;
    }

    const userId = await getActiveUserId();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.warn('Could not load suppliers:', error);
      return cachedSuppliers || [];
    }
    cachedSuppliers = data || [];
    return cachedSuppliers;
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    const userId = await getActiveUserId();
    const currentWarehouseId = product.warehouse_id || (await productService.getActiveWarehouseId()) || null;

    const cleanAttrs = cleanAttributesForSave(product.attributes || []);
    let finalDesc = product.description ?? '';
    if (product.factory_price !== undefined) {
      finalDesc = formatDescriptionWithFactoryPrice(
        finalDesc,
        String(product.factory_price)
      );
    }
    if (cleanAttrs.length > 0) {
      const attrDesc = formatAttributesForDescription(cleanAttrs);
      finalDesc = (finalDesc || '')
        .replace(/(?:xarakteristika(?:lar)?|xüsusiyyət(?:lər)?|характеристик[аи]|attributes?|specs?)\s*:[\s\S]*/gi, '')
        .trim();
      finalDesc = (finalDesc ? finalDesc + '\n' : '') + attrDesc;
    }

    const payload: any = {
      name: product.name,
      barcode: product.barcode || null,
      warehouse_id: currentWarehouseId,
      category_id: product.category_id || null,
      price: product.price ?? product.sale_price ?? 0,
      purchase_price: product.purchase_price ?? 0,
      stock_quantity: product.stock_quantity ?? 0,
      critical_stock: product.critical_stock ?? 5,
      unit: product.unit || 'pcs',
      supplier_id: product.supplier_id || null,
      description: finalDesc.trim() || null,
      attributes: cleanAttrs,
      user_id: userId,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    };

    if (product.image_url !== undefined) {
      payload.image_url = product.image_url;
    }
    if ((product as any).color !== undefined) {
      payload.color = (product as any).color;
    }

    const runWithSchemaCacheFallback = async (queryFn: () => PromiseLike<any>) => {
      let res = await queryFn();
      while (res.error && (res.error.message.includes('schema cache') || res.error.message.includes('column'))) {
        const match = res.error.message.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && payload[match[1]] !== undefined) {
          delete payload[match[1]];
          res = await queryFn();
        } else if (payload.attributes !== undefined) {
          delete payload.attributes;
          res = await queryFn();
        } else {
          break;
        }
      }
      return res;
    };

    let savedProd: Product;

    if (product.id) {
      const { data, error } = await runWithSchemaCacheFallback(() =>
        Promise.resolve(
          supabase
            .from('products')
            .update(payload)
            .eq('id', product.id)
            .eq('user_id', userId)
            .select()
            .single()
        )
      );

      if (error) throw error;
      savedProd = {
        ...data,
        factory_price: extractFactoryPrice(data.description),
        price: data.price ?? data.sale_price ?? 0,
        sale_price: data.price ?? data.sale_price ?? 0,
        purchase_price: data.purchase_price ?? 0,
        stock_quantity: data.stock_quantity ?? 0,
        attributes: data.attributes || cleanAttrs,
      };

      if (cachedProducts) {
        cachedProducts = cachedProducts.map((p) =>
          p.id === product.id ? { ...p, ...savedProd } : p
        );
      }
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await runWithSchemaCacheFallback(() =>
        Promise.resolve(
          supabase
            .from('products')
            .insert([payload])
            .select()
            .single()
        )
      );

      if (error) throw error;
      savedProd = {
        ...data,
        factory_price: extractFactoryPrice(data.description),
        price: data.price ?? data.sale_price ?? 0,
        sale_price: data.price ?? data.sale_price ?? 0,
        purchase_price: data.purchase_price ?? 0,
        stock_quantity: data.stock_quantity ?? 0,
        attributes: data.attributes || cleanAttrs,
      };

      if (cachedProducts) {
        cachedProducts = [savedProd, ...cachedProducts];
      }
    }

    return savedProd;
  },

  async updateStock(productId: string, newQuantity: number): Promise<void> {
    const userId = await getActiveUserId();
    let { error } = await supabase
      .from('products')
      .update({ 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString() 
      })
      .eq('id', productId)
      .eq('user_id', userId);

    if (error) {
      const { error: err2 } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString() 
        })
        .eq('id', productId);
      if (err2) throw err2;
    }

    if (cachedProducts) {
      cachedProducts = cachedProducts.map((p) =>
        p.id === productId ? { ...p, stock_quantity: newQuantity } : p
      );
    }
  }
};
