import { supabase } from '../config/supabase';
import { Product, Category, Supplier } from '../types';

export const DEFAULT_USER_ID = '8929ea5f-d6b8-46e9-9873-dd67e65046f0';

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
let cachedCategories: Category[] | null = null;
let cachedSuppliers: Supplier[] | null = null;
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

  invalidateCache(): void {
    cachedProducts = null;
    cachedCategories = null;
    cachedSuppliers = null;
  },

  async getProducts(forceRefresh = false): Promise<Product[]> {
    if (!forceRefresh && cachedProducts && cachedProducts.length > 0) {
      return cachedProducts;
    }

    if (activeFetchPromise) {
      return activeFetchPromise;
    }

    activeFetchPromise = (async () => {
      try {
        const userId = await getActiveUserId();
        const PAGE_SIZE = 1000;
        let allData: any[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('products')
            .select('*, suppliers(name)')
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .order('name', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

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

        const [catsData, suppliersData] = await Promise.all([
          productService.getCategories(forceRefresh),
          productService.getSuppliers(forceRefresh),
        ]);
        const catMap = new Map((catsData || []).map((c: any) => [c.id, c.name]));
        const supMap = new Map((suppliersData || []).map((s: any) => [s.id, s.name]));

        const mapped: Product[] = allData.map((p: any) => ({
          ...p,
          factory_price: extractFactoryPrice(p.description),
          price: p.price ?? p.sale_price ?? 0,
          sale_price: p.price ?? p.sale_price ?? 0,
          purchase_price: p.purchase_price ?? 0,
          stock_quantity: p.stock_quantity ?? 0,
          category: (p.category_id ? catMap.get(p.category_id) : '') || p.category || '',
          supplier_name: p.suppliers?.name || (p.supplier_id ? supMap.get(p.supplier_id) : '') || p.supplier_name || '',
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
        .or(`barcode.eq.${cleanBarcode},article_number.eq.${cleanBarcode}`)
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

    let finalDesc = product.description ?? null;
    if (product.factory_price !== undefined) {
      finalDesc = formatDescriptionWithFactoryPrice(
        product.description,
        String(product.factory_price)
      );
    }

    const payload: any = {
      name: product.name,
      article_number: product.article_number || null,
      barcode: product.barcode || null,
      category_id: product.category_id || null,
      sale_price: product.sale_price ?? product.price ?? 0,
      price: product.sale_price ?? product.price ?? 0,
      purchase_price: product.purchase_price ?? 0,
      stock_quantity: product.stock_quantity ?? 0,
      critical_stock: product.critical_stock ?? 5,
      unit: product.unit || 'pcs',
      supplier_id: product.supplier_id || null,
      description: finalDesc,
      user_id: userId,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    };

    let savedProd: Product;

    if (product.id) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', product.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      savedProd = {
        ...data,
        factory_price: extractFactoryPrice(data.description),
        price: data.price ?? data.sale_price ?? 0,
        sale_price: data.sale_price ?? data.price ?? 0,
        purchase_price: data.purchase_price ?? 0,
        stock_quantity: data.stock_quantity ?? 0,
      };

      if (cachedProducts) {
        cachedProducts = cachedProducts.map((p) =>
          p.id === product.id ? { ...p, ...savedProd } : p
        );
      }
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      savedProd = {
        ...data,
        factory_price: extractFactoryPrice(data.description),
        price: data.price ?? data.sale_price ?? 0,
        sale_price: data.sale_price ?? data.price ?? 0,
        purchase_price: data.purchase_price ?? 0,
        stock_quantity: data.stock_quantity ?? 0,
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
