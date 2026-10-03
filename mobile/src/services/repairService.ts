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
    serial_number?: string;
    issue_description?: string;
    type: 'INTERNAL_STOCK' | 'CLIENT_ITEM';
    master_id?: string;
    product_id?: string;
  }): Promise<WarehouseRepair> {
    const userId = await getActiveUserId();
    const repairCode = `REP-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase
      .from('warehouse_repairs')
      .insert([{
        ...repair,
        repair_code: repairCode,
        status: 'SENT_TO_MASTER',
        user_id: userId,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(repairId: string, status: 'SENT_TO_MASTER' | 'READY' | 'RETURNED_TO_STOCK'): Promise<void> {
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
