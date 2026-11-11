import { supabase } from '../config/supabase';
import { WarehouseRepair, WarehouseMaster } from '../types';
import { getActiveUserId } from './productService';

export const repairService = {
  async getRepairs(): Promise<WarehouseRepair[]> {
    const userId = await getActiveUserId();
    const { data, error } = await supabase
      .from('warehouse_repairs')
      .select('*, warehouse_masters(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not load repairs:', error);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      master_name: r.warehouse_masters?.name || '',
    }));
  },

  async getMasters(): Promise<WarehouseMaster[]> {
    const userId = await getActiveUserId();
    const { data, error } = await supabase
      .from('warehouse_masters')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.warn('Could not load masters:', error);
      return [];
    }
    return data || [];
  },

  async createRepair(repair: {
    item_name: string;
    quantity?: number;
    serial_number?: string;
    issue_description?: string;
    type: 'INTERNAL_STOCK' | 'CLIENT_ITEM';
    master_id?: string;
    product_id?: string;
  }): Promise<WarehouseRepair> {
    const userId = await getActiveUserId();
    const repairCode = `REP-${Date.now().toString().slice(-6)}`;
    const qty = repair.quantity && repair.quantity > 0 ? Math.floor(repair.quantity) : 1;
    const cleanName = repair.item_name.replace(/\s*\(x\d+\)\s*/g, '').trim();
    const formattedName = qty > 1 ? `${cleanName} (x${qty})` : cleanName;

    const insertPayload: any = {
      ...repair,
      item_name: formattedName,
      quantity: qty,
      repair_code: repairCode,
      status: 'SENT_TO_WORKSHOP',
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('warehouse_repairs')
      .insert([insertPayload])
      .select()
      .single();

    if (error && (error.code === '42703' || error.message?.includes('quantity'))) {
      delete insertPayload.quantity;
      const res = await supabase
        .from('warehouse_repairs')
        .insert([insertPayload])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) throw error;
    return data;
  },

  async updateQuantity(
    repairId: string,
    quantity: number,
    itemName: string,
    status: string = 'BEING_REPAIRED'
  ): Promise<void> {
    const userId = await getActiveUserId();
    const payload: any = {
      quantity,
      item_name: itemName,
      status,
      updated_at: new Date().toISOString(),
    };
    let { error } = await supabase
      .from('warehouse_repairs')
      .update(payload)
      .eq('id', repairId)
      .eq('user_id', userId);

    if (error && (error.code === '42703' || error.message?.includes('quantity'))) {
      delete payload.quantity;
      await supabase
        .from('warehouse_repairs')
        .update(payload)
        .eq('id', repairId)
        .eq('user_id', userId);
    }
  },

  async createMaster(name: string, phone?: string): Promise<WarehouseMaster> {
    const userId = await getActiveUserId();
    const { data, error } = await supabase
      .from('warehouse_masters')
      .insert([{
        user_id: userId,
        name: name.trim(),
        phone: phone?.trim() || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRepair(repairId: string): Promise<void> {
    const userId = await getActiveUserId();
    const { error } = await supabase
      .from('warehouse_repairs')
      .delete()
      .eq('id', repairId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async updateStatus(repairId: string, status: string): Promise<void> {
    const userId = await getActiveUserId();
    const { error } = await supabase
      .from('warehouse_repairs')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', repairId)
      .eq('user_id', userId);

    if (error) throw error;
  }
};
