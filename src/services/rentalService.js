import { supabase } from '../supabaseClient';

const STORAGE_CACHE_KEY = 'merkez_warehouse_rentals_cache_v1';

function getLocalCache() {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalCache(list) {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('saveLocalCache error:', e);
  }
}

export const rentalService = {
  /**
   * Upload an image or video to Supabase Storage (repairs bucket), fallback to Base64 data URL
   */
  async uploadMedia(file, folder = 'rentals') {
    if (!file) return null;
    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const cleanExt = (fileExt || 'jpg').toLowerCase();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;

      const { data, error } = await supabase.storage
        .from('repairs')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: pub } = supabase.storage.from('repairs').getPublicUrl(fileName);
        if (pub?.publicUrl) return pub.publicUrl;
      }
    } catch (err) {
      console.warn('Storage upload error, falling back to FileReader:', err);
    }

    // Fallback to Base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Fetch all rentals for a specific warehouse
   */
  async getRentals(warehouseId) {
    let cloudList = [];
    let hasTable = true;

    // 1. Try querying dedicated warehouse_rentals table
    try {
      const query = supabase
        .from('warehouse_rentals')
        .select('*')
        .order('created_at', { ascending: false });

      if (warehouseId) {
        query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;
      if (!error && data) {
        cloudList = data;
      } else {
        hasTable = false;
      }
    } catch (e) {
      hasTable = false;
    }

    // 2. Query dispatches fallback if table doesn't exist
    if (!hasTable || cloudList.length === 0) {
      try {
        const dQuery = supabase
          .from('stock_dispatches')
          .select('*, products(name, barcode, price, image_url)')
          .eq('reason', 'RENTAL')
          .order('created_at', { ascending: false });

        if (warehouseId) {
          dQuery.eq('warehouse_id', warehouseId);
        }

        const { data: dispatches, error: dErr } = await dQuery;
        if (!dErr && dispatches && dispatches.length > 0) {
          const fromDispatches = dispatches
            .map((d) => {
              try {
                const parsed = typeof d.notes === 'string' && d.notes.startsWith('{') ? JSON.parse(d.notes) : null;
                if (!parsed) return null;
                return {
                  id: d.id,
                  dispatch_id: d.id,
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
                };
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);

          if (fromDispatches.length > 0) {
            cloudList = fromDispatches;
          }
        }
      } catch (err) {
        console.warn('Fallback dispatches query failed:', err);
      }
    }

    // 3. Merge with local cache
    const local = getLocalCache().filter((r) => !warehouseId || r.warehouse_id === warehouseId);
    const map = new Map();
    cloudList.forEach((r) => map.set(r.id || r.rental_code, r));
    local.forEach((r) => {
      const key = r.id || r.rental_code;
      if (!map.has(key)) {
        map.set(key, r);
      } else {
        // Local might have newer update if offline
        const existing = map.get(key);
        if (new Date(r.updated_at || r.created_at) > new Date(existing.updated_at || existing.created_at)) {
          map.set(key, { ...existing, ...r });
        }
      }
    });

    const merged = Array.from(map.values());

    // Auto-compute OVERDUE status for active rentals
    const now = new Date();
    const finalResult = merged.map((item) => {
      if (item.status === 'ACTIVE' && item.due_date && new Date(item.due_date) < now) {
        return { ...item, isOverdue: true };
      }
      return { ...item, isOverdue: false };
    });

    saveLocalCache(finalResult);
    return finalResult;
  },

  /**
   * Create a new rental transaction
   */
  async createRental(rentalData) {
    const {
      warehouseId,
      productId,
      productName,
      productBarcode,
      quantity = 1,
      clientName,
      clientPhone,
      clientIdSerial,
      clientFin,
      clientIdPhotoFront,
      clientIdPhotoBack,
      instrumentPhotoBefore,
      instrumentConditionNotes,
      depositAmount,
      rentalFee = 0,
      paymentMethod = 'Nağd',
      startDate,
      dueDate,
      notes = '',
      userId,
    } = rentalData;

    const rentalCode = `ICR-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : `rnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      rental_code: rentalCode,
      user_id: userId,
      warehouse_id: warehouseId,
      product_id: productId || null,
      product_name: productName,
      product_barcode: productBarcode || null,
      quantity: Number(quantity) || 1,
      client_name: clientName,
      client_phone: clientPhone,
      client_id_serial: clientIdSerial || null,
      client_fin: clientFin || null,
      client_id_photo_front: clientIdPhotoFront || null,
      client_id_photo_back: clientIdPhotoBack || null,
      instrument_photo_before: instrumentPhotoBefore || null,
      instrument_condition_notes: instrumentConditionNotes || null,
      deposit_amount: Number(depositAmount) || 0,
      rental_fee: Number(rentalFee) || 0,
      payment_method: paymentMethod,
      start_date: startDate || nowIso,
      due_date: dueDate,
      return_date: null,
      status: 'ACTIVE',
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 1. Try insert into warehouse_rentals table
    let savedToTable = false;
    try {
      const { data, error } = await supabase
        .from('warehouse_rentals')
        .insert([record])
        .select()
        .single();

      if (!error && data) {
        record.id = data.id;
        savedToTable = true;
      }
    } catch (e) {
      savedToTable = false;
    }

    // 2. Also log to stock_dispatches (decreases available stock and keeps audit trail)
    try {
      const dispatchPayload = {
        user_id: userId,
        warehouse_id: warehouseId,
        product_id: productId || null,
        quantity: Number(quantity) || 1,
        reason: 'RENTAL',
        notes: JSON.stringify(record),
        issued_at: startDate || nowIso,
        created_at: nowIso,
      };

      const { data: dData } = await supabase
        .from('stock_dispatches')
        .insert([dispatchPayload])
        .select()
        .single();

      if (dData && !savedToTable) {
        record.id = dData.id;
        record.dispatch_id = dData.id;
      }
    } catch (dErr) {
      console.warn('Logging to stock_dispatches error:', dErr);
    }

    // 3. Deduct product stock in warehouse
    if (productId) {
      try {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .single();

        if (currentProduct) {
          const newQty = Math.max(0, (Number(currentProduct.stock_quantity) || 0) - (Number(quantity) || 1));
          await supabase
            .from('products')
            .update({ stock_quantity: newQty, updated_at: nowIso })
            .eq('id', productId);
        }
      } catch (stkErr) {
        console.warn('Deducting stock error:', stkErr);
      }
    }

    // 4. Update local cache
    const cached = getLocalCache();
    saveLocalCache([record, ...cached]);

    return record;
  },

  /**
   * Return an item from rental (Accept return, check condition, refund deposit, restore stock)
   */
  async returnRental(rentalId, returnDetails = {}) {
    const {
      returnedByStaff = '',
      returnConditionNotes = '',
      instrumentPhotoAfter = null,
      returnedDepositAmount,
      conditionStatus = 'GOOD', // 'GOOD' | 'DAMAGED'
      productId,
      quantity = 1,
      warehouseId,
      userId,
    } = returnDetails;

    const nowIso = new Date().toISOString();

    const updates = {
      status: 'RETURNED',
      return_date: nowIso,
      returned_by_staff: returnedByStaff || null,
      return_condition_notes: `${conditionStatus === 'DAMAGED' ? '[QÜSURLU/ZƏDƏLİ] ' : '[SAZ] '}${returnConditionNotes || ''}`.trim(),
      instrument_photo_after: instrumentPhotoAfter || null,
      returned_deposit_amount: returnedDepositAmount !== undefined ? Number(returnedDepositAmount) : null,
      updated_at: nowIso,
    };

    // 1. Try update warehouse_rentals table
    try {
      await supabase
        .from('warehouse_rentals')
        .update(updates)
        .eq('id', rentalId);
    } catch (e) {
      console.warn('Update warehouse_rentals failed:', e);
    }

    // 2. Also log to stock_receipts (return back to warehouse)
    if (productId && warehouseId) {
      try {
        const receiptPayload = {
          user_id: userId,
          warehouse_id: warehouseId,
          product_id: productId,
          quantity: Number(quantity) || 1,
          purchase_price: 0,
          received_at: nowIso,
          notes: `[İCARƏDƏN QAYTARIŞ] Rental ID: #${String(rentalId).slice(0, 8)}. Vəziyyət: ${updates.return_condition_notes}. Qaytarılan girov: ₼${returnedDepositAmount || 0}`,
          created_at: nowIso,
        };

        await supabase.from('stock_receipts').insert([receiptPayload]);

        // Restore stock (+ quantity)
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .single();

        if (currentProduct) {
          const newQty = (Number(currentProduct.stock_quantity) || 0) + (Number(quantity) || 1);
          await supabase
            .from('products')
            .update({ stock_quantity: newQty, updated_at: nowIso })
            .eq('id', productId);
        }
      } catch (retErr) {
        console.warn('Restoring stock from rental return error:', retErr);
      }
    }

    // 3. Update local cache
    const cached = getLocalCache();
    const updatedCache = cached.map((r) => (r.id === rentalId ? { ...r, ...updates, isOverdue: false } : r));
    saveLocalCache(updatedCache);

    return { success: true };
  },

  /**
   * Cancel or Delete rental
   */
  async deleteRental(rentalId, productId, quantity, warehouseId) {
    try {
      await supabase.from('warehouse_rentals').delete().eq('id', rentalId);
    } catch (e) {}

    // Restore stock if active
    if (productId) {
      try {
        const { data: cur } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
        if (cur) {
          await supabase.from('products').update({ stock_quantity: (Number(cur.stock_quantity) || 0) + Number(quantity || 1) }).eq('id', productId);
        }
      } catch (e) {}
    }

    const cached = getLocalCache().filter((r) => r.id !== rentalId);
    saveLocalCache(cached);
    return { success: true };
  },
};

