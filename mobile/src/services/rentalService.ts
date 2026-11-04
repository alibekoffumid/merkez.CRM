import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { WarehouseRental, Product } from '../types';

const STORAGE_KEY = '@merkez_rentals_cache_v1';

export const rentalService = {
  /**
   * Fetch all rentals, auto-calculating overdue flags
   */
  async getRentals(warehouseId?: string): Promise<WarehouseRental[]> {
    let cloudList: WarehouseRental[] = [];
    let hasTable = true;

    try {
      let query = supabase
        .from('warehouse_rentals')
        .select('*')
        .order('created_at', { ascending: false });

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;
      if (!error && data) {
        cloudList = data as WarehouseRental[];
      } else {
        hasTable = false;
      }
    } catch {
      hasTable = false;
    }

    // Fallback to stock_dispatches if table does not exist yet
    if (!hasTable || cloudList.length === 0) {
      try {
        let dQuery = supabase
          .from('stock_dispatches')
          .select('*, products(name, barcode, price, image_url)')
          .eq('reason', 'RENTAL')
          .order('created_at', { ascending: false });

        if (warehouseId) {
          dQuery = dQuery.eq('warehouse_id', warehouseId);
        }

        const { data: dispatches } = await dQuery;
        if (dispatches && dispatches.length > 0) {
          const fromDispatches = dispatches
            .map((d: any) => {
              try {
                const parsed = typeof d.notes === 'string' && d.notes.startsWith('{') ? JSON.parse(d.notes) : null;
                if (!parsed) return null;
                return {
                  id: d.id,
                  rental_code: parsed.rental_code || `ICR-${d.id.slice(0, 6).toUpperCase()}`,
                  warehouse_id: d.warehouse_id,
                  product_id: d.product_id,
                  product_name: parsed.product_name || d.products?.name || 'Məhsul',
                  product_barcode: parsed.product_barcode || d.products?.barcode || '',
                  quantity: d.quantity || 1,
                  client_name: parsed.client_name || 'Müştəri',
                  client_phone: parsed.client_phone || '',
                  client_id_serial: parsed.client_id_serial || '',
                  client_fin: parsed.client_fin || '',
                  client_id_photo_front: parsed.client_id_photo_front || null,
                  client_id_photo_back: parsed.client_id_photo_back || null,
                  instrument_photo_before: parsed.instrument_photo_before || null,
                  instrument_condition_notes: parsed.instrument_condition_notes || '',
                  deposit_amount: parsed.deposit_amount || d.products?.price || 0,
                  rental_fee: parsed.rental_fee || 0,
                  payment_method: parsed.payment_method || 'Nağd',
                  start_date: parsed.start_date || d.created_at,
                  due_date: parsed.due_date || new Date().toISOString(),
                  return_date: parsed.return_date || null,
                  status: parsed.status || 'ACTIVE',
                  returned_by_staff: parsed.returned_by_staff || null,
                  return_condition_notes: parsed.return_condition_notes || null,
                  instrument_photo_after: parsed.instrument_photo_after || null,
                  returned_deposit_amount: parsed.returned_deposit_amount || null,
                  notes: parsed.notes || '',
                  created_at: d.created_at,
                } as WarehouseRental;
              } catch {
                return null;
              }
            })
            .filter(Boolean) as WarehouseRental[];

          if (fromDispatches.length > 0) {
            cloudList = fromDispatches;
          }
        }
      } catch (err) {
        console.warn('Dispatches fallback error:', err);
      }
    }

    // Merge with local storage cache
    let localList: WarehouseRental[] = [];
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) localList = JSON.parse(raw);
    } catch {}

    const map = new Map<string, WarehouseRental>();
    cloudList.forEach((r) => map.set(r.id || r.rental_code, r));
    localList.forEach((r) => {
      const key = r.id || r.rental_code;
      if (!map.has(key)) map.set(key, r);
    });

    const now = new Date();
    const finalResult = Array.from(map.values()).map((item) => {
      const isOver = item.status === 'ACTIVE' && item.due_date && new Date(item.due_date) < now;
      return { ...item, isOverdue: !!isOver };
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalResult));
    } catch {}

    return finalResult;
  },

  /**
   * Upload image to Supabase storage or return data URI
   */
  async uploadImage(base64: string, folder = 'rentals'): Promise<string> {
    if (!base64) return '';

    try {
      // Clean base64 prefix if exists
      const cleanBase64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

      // Decode base64 to Uint8Array for Supabase storage
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { data, error } = await supabase.storage
        .from('repairs')
        .upload(fileName, bytes.buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!error && data) {
        const { data: pub } = supabase.storage.from('repairs').getPublicUrl(fileName);
        if (pub?.publicUrl) return pub.publicUrl;
      }
    } catch (err) {
      console.warn('Storage upload error, saving base64 URI:', err);
    }

    // Fallback: return data URI
    return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  },

  /**
   * Create new rental
   */
  async createRental(data: {
    product: Product;
    clientName: string;
    clientPhone: string;
    clientIdSerial?: string;
    clientFin?: string;
    idPhotoFront?: string;
    idPhotoBack?: string;
    toolPhotoBefore?: string;
    conditionNotes?: string;
    depositAmount: number;
    rentalFee?: number;
    paymentMethod?: string;
    startDate: string;
    dueDate: string;
    notes?: string;
    warehouseId?: string;
    userId?: string;
  }): Promise<WarehouseRental> {
    const {
      product,
      clientName,
      clientPhone,
      clientIdSerial = '',
      clientFin = '',
      idPhotoFront,
      idPhotoBack,
      toolPhotoBefore,
      conditionNotes = '',
      depositAmount,
      rentalFee = 0,
      paymentMethod = 'Nağd',
      startDate,
      dueDate,
      notes = '',
      warehouseId,
      userId,
    } = data;

    const rentalCode = `ICR-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const id = `rnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: WarehouseRental = {
      id,
      rental_code: rentalCode,
      warehouse_id: warehouseId,
      product_id: product.id,
      product_name: product.name,
      product_barcode: product.barcode || '',
      quantity: 1,
      client_name: clientName,
      client_phone: clientPhone,
      client_id_serial: clientIdSerial,
      client_fin: clientFin,
      client_id_photo_front: idPhotoFront || null,
      client_id_photo_back: idPhotoBack || null,
      instrument_photo_before: toolPhotoBefore || null,
      instrument_condition_notes: conditionNotes || null,
      deposit_amount: Number(depositAmount) || 0,
      rental_fee: Number(rentalFee) || 0,
      payment_method: paymentMethod,
      start_date: startDate || nowIso,
      due_date: dueDate,
      status: 'ACTIVE',
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
      isOverdue: false,
    };

    // 1. Insert into warehouse_rentals
    try {
      const { data: dbData } = await supabase
        .from('warehouse_rentals')
        .insert([{ ...record, user_id: userId }])
        .select()
        .single();
      if (dbData?.id) record.id = dbData.id;
    } catch (e) {
      console.warn('Insert warehouse_rentals error:', e);
    }

    // 2. Also record to stock_dispatches
    try {
      await supabase.from('stock_dispatches').insert([
        {
          user_id: userId,
          warehouse_id: warehouseId,
          product_id: product.id,
          quantity: 1,
          reason: 'RENTAL',
          notes: JSON.stringify(record),
          issued_at: startDate || nowIso,
          created_at: nowIso,
        },
      ]);
    } catch (dErr) {
      console.warn('Insert stock_dispatches error:', dErr);
    }

    // 3. Deduct stock quantity (-1)
    try {
      const { data: cur } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', product.id)
        .single();

      if (cur) {
        const newQty = Math.max(0, (Number(cur.stock_quantity) || 0) - 1);
        await supabase
          .from('products')
          .update({ stock_quantity: newQty, updated_at: nowIso })
          .eq('id', product.id);
      }
    } catch (stkErr) {
      console.warn('Deduct stock error:', stkErr);
    }

    // 4. Update local cache
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...list]));
    } catch {}

    return record;
  },

  /**
   * Accept return of rental
   */
  async returnRental(
    rental: WarehouseRental,
    details: {
      conditionStatus: 'GOOD' | 'DAMAGED';
      conditionNotes?: string;
      returnPhoto?: string;
      returnedDeposit: number;
      staffName?: string;
      userId?: string;
    }
  ): Promise<boolean> {
    const nowIso = new Date().toISOString();
    const updates = {
      status: 'RETURNED' as const,
      return_date: nowIso,
      returned_by_staff: details.staffName || 'Mobil Əməkdaş',
      return_condition_notes: `${details.conditionStatus === 'DAMAGED' ? '[QÜSURLU] ' : '[SAZ] '}${details.conditionNotes || ''}`.trim(),
      instrument_photo_after: details.returnPhoto || null,
      returned_deposit_amount: Number(details.returnedDeposit),
      updated_at: nowIso,
    };

    // 1. Update warehouse_rentals
    try {
      await supabase
        .from('warehouse_rentals')
        .update(updates)
        .eq('id', rental.id);
    } catch (e) {
      console.warn('Update warehouse_rentals error:', e);
    }

    // 2. Restore product stock (+1)
    if (rental.product_id) {
      try {
        const receiptPayload = {
          user_id: details.userId,
          warehouse_id: rental.warehouse_id,
          product_id: rental.product_id,
          quantity: rental.quantity || 1,
          purchase_price: 0,
          received_at: nowIso,
          notes: `[İCARƏDƏN QAYTARIŞ] Rental: ${rental.rental_code}. Qaytarılan girov: ₼${details.returnedDeposit}`,
          created_at: nowIso,
        };

        await supabase.from('stock_receipts').insert([receiptPayload]);

        const { data: cur } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', rental.product_id)
          .single();

        if (cur) {
          const newQty = (Number(cur.stock_quantity) || 0) + (rental.quantity || 1);
          await supabase
            .from('products')
            .update({ stock_quantity: newQty, updated_at: nowIso })
            .eq('id', rental.product_id);
        }
      } catch (retErr) {
        console.warn('Restore stock error:', retErr);
      }
    }

    // 3. Update local cache
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: WarehouseRental[] = JSON.parse(raw);
        const updated = list.map((r) =>
          r.id === rental.id ? { ...r, ...updates, isOverdue: false } : r
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}

    return true;
  },

  /**
   * Delete rental
   */
  async deleteRental(rentalId: string, productId?: string, quantity = 1): Promise<boolean> {
    try {
      await supabase.from('warehouse_rentals').delete().eq('id', rentalId);
    } catch {}

    if (productId) {
      try {
        const { data: cur } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .single();
        if (cur) {
          await supabase
            .from('products')
            .update({ stock_quantity: (Number(cur.stock_quantity) || 0) + quantity })
            .eq('id', productId);
        }
      } catch {}
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: WarehouseRental[] = JSON.parse(raw);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(list.filter((r) => r.id !== rentalId))
        );
      }
    } catch {}

    return true;
  },
};

