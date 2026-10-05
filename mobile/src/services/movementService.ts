import { supabase } from '../config/supabase';
import { StockMovement } from '../types';
import { getActiveUserId, productService } from './productService';

let cachedReceipts: any[] | null = null;
let cachedDispatchesSales: { sales: any[]; dispatches: any[] } | null = null;
let cachedTransfers: any[] | null = null;
let cachedDefaultWarehouseId: string | null = null;

export async function getDefaultWarehouseId(): Promise<string | null> {
  if (cachedDefaultWarehouseId) return cachedDefaultWarehouseId;
  try {
    const userId = await getActiveUserId();
    const { data } = await supabase
      .from('warehouses')
      .select('id')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      cachedDefaultWarehouseId = data.id;
      return data.id;
    }
  } catch (e) {
    console.warn('Error fetching default warehouse:', e);
  }
  return null;
}

export const movementService = {
  invalidateCache(): void {
    cachedReceipts = null;
    cachedDispatchesSales = null;
    cachedTransfers = null;
  },

  getCachedData(): {
    receipts: any[] | null;
    dispatchesSales: { sales: any[]; dispatches: any[] } | null;
    transfers: any[] | null;
  } {
    return {
      receipts: cachedReceipts,
      dispatchesSales: cachedDispatchesSales,
      transfers: cachedTransfers,
    };
  },

  async recordReceipt(
    items: Array<{ productId: string; quantity: number; unitPrice?: number; warehouseId?: string }>,
    supplierId?: string,
    notes?: string,
    warehouseId?: string
  ): Promise<void> {
    movementService.invalidateCache();
    const userId = await getActiveUserId();
    const fallbackWarehouseId = warehouseId || (await getDefaultWarehouseId());

    for (const item of items) {
      const itemWarehouseId = item.warehouseId || fallbackWarehouseId;
      // 1. Insert receipt
      const { error: receiptErr } = await supabase
        .from('stock_receipts')
        .insert([{
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice || null,
          supplier_id: supplierId || null,
          notes: notes || 'Mobil mədaxil',
          received_at: new Date().toISOString(),
          user_id: userId,
          warehouse_id: itemWarehouseId || null,
        }]);

      if (receiptErr) {
        console.warn('Could not write to stock_receipts:', receiptErr);
      }

      // 2. Increment stock quantity in products
      const { data: prod } = await supabase
        .from('products')
        .select('stock_quantity, purchase_price')
        .eq('id', item.productId)
        .eq('user_id', userId)
        .single();

      if (prod) {
        const curQty = Number(prod.stock_quantity || 0);
        const newQty = curQty + item.quantity;
        const updatePayload: any = {
          stock_quantity: newQty,
          updated_at: new Date().toISOString(),
        };

        if (item.unitPrice && item.unitPrice > 0) {
          const curCost = Number(prod.purchase_price || 0);
          if (curQty > 0 && curCost > 0) {
            updatePayload.purchase_price = parseFloat(
              (((curQty * curCost) + (item.quantity * item.unitPrice)) / newQty).toFixed(2)
            );
          } else {
            updatePayload.purchase_price = item.unitPrice;
          }
        }

        await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', item.productId)
          .eq('user_id', userId);
      }
    }
  },

  async recordDispatch(
    items: Array<{ productId: string; quantity: number; warehouseId?: string }>,
    reason: string = 'Mobil terminal ilə silinmə',
    notes?: string,
    warehouseId?: string,
    discountAmount: number = 0,
    discountType: string = 'fixed',
    totalAmount?: number
  ): Promise<void> {
    movementService.invalidateCache();
    const userId = await getActiveUserId();
    const fallbackWarehouseId = warehouseId || (await getDefaultWarehouseId());

    for (const item of items) {
      const itemWarehouseId = item.warehouseId || fallbackWarehouseId;
      // 1. Insert dispatch
      const basePayload: any = {
        product_id: item.productId,
        quantity: item.quantity,
        reason: reason || 'Mobil terminal ilə silinmə',
        notes: notes || '',
        issued_at: new Date().toISOString(),
        user_id: userId,
        warehouse_id: itemWarehouseId || null,
      };

      const payloadWithDiscount = {
        ...basePayload,
        discount_amount: discountAmount || 0,
        discount_type: discountType || 'fixed',
        total_amount: totalAmount || null,
      };

      let { error: dispatchErr } = await supabase
        .from('stock_dispatches')
        .insert([payloadWithDiscount]);

      if (dispatchErr) {
        // Fallback without extra columns in case migration hasn't run yet
        const retry = await supabase
          .from('stock_dispatches')
          .insert([basePayload]);
        if (retry.error) {
          console.warn('Could not write to stock_dispatches:', retry.error);
        }
      }

      // 2. Decrement stock
      const { data: prod } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.productId)
        .eq('user_id', userId)
        .single();

      if (prod) {
        const curQty = Number(prod.stock_quantity || 0);
        const newQty = Math.max(0, curQty - item.quantity);
        await supabase
          .from('products')
          .update({
            stock_quantity: newQty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.productId)
          .eq('user_id', userId);
      }
    }
  },

  async getReceipts(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && cachedReceipts) {
      return cachedReceipts;
    }

    try {
      const userId = await getActiveUserId();
      const { data, error } = await supabase
        .from('stock_receipts')
        .select('*, products(name, barcode), suppliers(name)')
        .eq('user_id', userId)
        .order('received_at', { ascending: false });

      if (error) {
        console.error('getReceipts error:', error);
        return cachedReceipts || [];
      }

      const res = (data || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.products?.name || 'Məhsul',
        barcode: r.products?.barcode || '',
        quantity: Number(r.quantity || 0),
        unit_price: Number(r.unit_price || 0),
        supplier_name: r.suppliers?.name || '',
        notes: r.notes || '',
        received_at: r.received_at,
      }));

      cachedReceipts = res;
      return res;
    } catch (e) {
      console.error('getReceipts exception:', e);
      return cachedReceipts || [];
    }
  },

  async getDispatchesAndSales(forceRefresh = false): Promise<{ sales: any[]; dispatches: any[] }> {
    if (!forceRefresh && cachedDispatchesSales) {
      return cachedDispatchesSales;
    }

    try {
      const userId = await getActiveUserId();
      let records: any[] = [];

      // 1. Try join with products table using existing valid columns
      const { data, error } = await supabase
        .from('stock_dispatches')
        .select('*, products(id, name, barcode, category_id, price, purchase_price, unit, image_url, stock_quantity)')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      if (error) {
        console.warn('getDispatchesAndSales join error, falling back to raw select:', error);
        const { data: rawData, error: rawError } = await supabase
          .from('stock_dispatches')
          .select('*')
          .eq('user_id', userId)
          .order('issued_at', { ascending: false });

        if (rawError) {
          console.error('getDispatchesAndSales raw error:', rawError);
          return cachedDispatchesSales || { sales: [], dispatches: [] };
        }
        records = rawData || [];
      } else {
        records = data || [];
      }

      // Sort by actual transaction timestamp (newest first)
      records.sort((a, b) => {
        const timeA = new Date(a.created_at || a.issued_at || 0).getTime();
        const timeB = new Date(b.created_at || b.issued_at || 0).getTime();
        return timeB - timeA;
      });

      const cachedProds = productService.getCachedProducts() || [];
      const cachedSuppliers = productService.getCachedSuppliers() || [];
      const supMap = new Map(cachedSuppliers.map((s: any) => [s.id, s.name]));

      const sales: any[] = [];
      const dispatches: any[] = [];

      records.forEach((d: any) => {
        const prod = d.products || cachedProds.find((p) => p.id === d.product_id);
        const supplierName = prod?.supplier_name || (prod?.supplier_id ? supMap.get(prod.supplier_id) : '') || '';

        const item = {
          id: d.id,
          product_id: d.product_id,
          product_name: prod?.name || d.product_name || 'Məhsul',
          barcode: prod?.barcode || d.barcode || '',
          quantity: Number(d.quantity || 0),
          notes: d.notes || '',
          issued_at: d.issued_at,
          created_at: d.created_at,
          discount_amount: Number(d.discount_amount || 0),
          discount_type: d.discount_type || 'fixed',
          product: prod ? {
            ...prod,
            price: prod.price ?? prod.sale_price ?? 0,
            sale_price: prod.price ?? prod.sale_price ?? 0,
            purchase_price: prod.purchase_price ?? 0,
            stock_quantity: prod.stock_quantity ?? 0,
            supplier_name: supplierName,
          } : undefined,
        };

        if (
          d.reason === 'sale' ||
          (typeof d.reason === 'string' && d.reason.toLowerCase().includes('satış')) ||
          (typeof d.notes === 'string' && d.notes.toLowerCase().includes('satış'))
        ) {
          sales.push(item);
        } else {
          dispatches.push({
            ...item,
            reason: d.reason || 'Silinmə',
          });
        }
      });

      const res = { sales, dispatches };
      cachedDispatchesSales = res;
      return res;
    } catch (e) {
      console.error('getDispatchesAndSales exception:', e);
      return cachedDispatchesSales || { sales: [], dispatches: [] };
    }
  },

  async getTransfers(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && cachedTransfers) {
      return cachedTransfers;
    }

    try {
      const userId = await getActiveUserId();
      const { data, error } = await supabase
        .from('stock_transfers')
        .select('*, stock_transfer_items(*, products(name, barcode))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('getTransfers error:', error);
        return cachedTransfers || [];
      }

      const res = (data || []).map((t: any) => ({
        id: t.id,
        from_warehouse_id: t.from_warehouse_id,
        to_warehouse_id: t.to_warehouse_id,
        notes: t.notes || '',
        created_at: t.created_at,
        items: (t.stock_transfer_items || []).map((i: any) => ({
          product_name: i.products?.name || 'Məhsul',
          barcode: i.products?.barcode || '',
          quantity: Number(i.quantity || 0),
        })),
      }));

      cachedTransfers = res;
      return res;
    } catch (e) {
      console.error('getTransfers exception:', e);
      return cachedTransfers || [];
    }
  },

  async deleteDispatchOrSale(
    dispatchId: string,
    reason?: string,
    note?: string
  ): Promise<{ success: boolean; restoredQuantity: number; productName: string }> {
    movementService.invalidateCache();
    productService.invalidateCache();

    // 1. Fetch dispatch details
    const { data: record, error: getErr } = await supabase
      .from('stock_dispatches')
      .select('*')
      .eq('id', dispatchId)
      .maybeSingle();

    if (getErr || !record) {
      throw new Error(getErr?.message || 'Əməliyyat tapılmadı');
    }

    const qtyToAdd = Number(record.quantity || 0);
    const productId = record.product_id;

    // 2. Delete dispatch record from stock_dispatches
    const { error: delErr } = await supabase
      .from('stock_dispatches')
      .delete()
      .eq('id', dispatchId);

    if (delErr) {
      throw delErr;
    }

    // 3. Restore product stock in products table
    let productName = 'Məhsul';
    if (productId) {
      const { data: prod } = await supabase
        .from('products')
        .select('name, stock_quantity')
        .eq('id', productId)
        .maybeSingle();

      if (prod) {
        productName = prod.name || 'Məhsul';
        if (qtyToAdd > 0) {
          const currentQty = Number(prod.stock_quantity || 0);
          const newQty = currentQty + qtyToAdd;
          try {
            await productService.updateStock(productId, newQty);
          } catch (updateErr) {
            console.warn('Update stock fallback:', updateErr);
            await supabase
              .from('products')
              .update({
                stock_quantity: newQty,
                updated_at: new Date().toISOString(),
              })
              .eq('id', productId);
          }
        }
      }
    }

    movementService.invalidateCache();
    productService.invalidateCache();

    return { success: true, restoredQuantity: qtyToAdd, productName };
  },

  async deleteReceipt(
    receiptId: string,
    reason?: string,
    note?: string
  ): Promise<{ success: boolean; deductedQuantity: number; productName: string }> {
    movementService.invalidateCache();
    productService.invalidateCache();

    // 1. Fetch receipt details
    const { data: record, error: getErr } = await supabase
      .from('stock_receipts')
      .select('*')
      .eq('id', receiptId)
      .maybeSingle();

    if (getErr || !record) {
      throw new Error(getErr?.message || 'Qəbul yazısı tapılmadı');
    }

    const qtyToDeduct = Number(record.quantity || 0);
    const productId = record.product_id;

    // 2. Delete receipt from stock_receipts
    const { error: delErr } = await supabase
      .from('stock_receipts')
      .delete()
      .eq('id', receiptId);

    if (delErr) {
      throw delErr;
    }

    // 3. Subtract stock in products table
    let productName = 'Məhsul';
    if (productId) {
      const { data: prod } = await supabase
        .from('products')
        .select('name, stock_quantity')
        .eq('id', productId)
        .maybeSingle();

      if (prod) {
        productName = prod.name || 'Məhsul';
        if (qtyToDeduct > 0) {
          const currentQty = Number(prod.stock_quantity || 0);
          const newQty = Math.max(0, currentQty - qtyToDeduct);
          try {
            await productService.updateStock(productId, newQty);
          } catch (updateErr) {
            console.warn('Update stock fallback:', updateErr);
            await supabase
              .from('products')
              .update({
                stock_quantity: newQty,
                updated_at: new Date().toISOString(),
              })
              .eq('id', productId);
          }
        }
      }
    }

    movementService.invalidateCache();
    productService.invalidateCache();

    return { success: true, deductedQuantity: qtyToDeduct, productName };
  },

  async getRecentMovements(): Promise<StockMovement[]> {
    try {
      const userId = await getActiveUserId();
      const [receiptsRes, dispatchesRes] = await Promise.all([
        supabase
          .from('stock_receipts')
          .select('*, products(name)')
          .eq('user_id', userId)
          .order('received_at', { ascending: false })
          .limit(20),
        supabase
          .from('stock_dispatches')
          .select('*, products(name)')
          .eq('user_id', userId)
          .order('issued_at', { ascending: false })
          .limit(20)
      ]);

      const receipts: StockMovement[] = (receiptsRes.data || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.products?.name || 'Məhsul',
        type: 'RECEIVE',
        quantity: Number(r.quantity),
        cost_price: Number(r.unit_price || 0),
        comment: r.notes,
        created_at: r.received_at,
      }));

      const dispatches: StockMovement[] = (dispatchesRes.data || []).map((d: any) => ({
        id: d.id,
        product_id: d.product_id,
        product_name: d.products?.name || 'Məhsul',
        type: 'DISPATCH',
        quantity: Number(d.quantity),
        comment: d.reason || d.notes,
        created_at: d.issued_at,
      }));

      return [...receipts, ...dispatches].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (e) {
      console.error('getRecentMovements error:', e);
      return [];
    }
  }
};
