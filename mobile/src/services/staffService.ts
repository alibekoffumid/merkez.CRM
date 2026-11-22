import { supabase } from '../config/supabase';
import { StaffMember, StaffPermissions, StaffRole } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_STAFF_STORAGE_KEY = '@merkez_current_staff_session_v1';

export const staffService = {
  async getActiveStaff(userId: string): Promise<StaffMember[]> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .order('name', { ascending: true });

      if (error) {
        console.warn('Could not fetch active staff:', error.message);
        return [];
      }
      return (data || []) as StaffMember[];
    } catch (e) {
      console.error('getActiveStaff error:', e);
      return [];
    }
  },

  verifyPin(staff: StaffMember | 'owner', pin: string, ownerPin?: string): boolean {
    const enteredPin = pin.trim();
    if (staff === 'owner') {
      const targetPin = (ownerPin || '0000').trim();
      return enteredPin === targetPin;
    }
    const staffPin = (staff.pin || '0000').trim();
    return enteredPin === staffPin;
  },

  computePermissions(staff: StaffMember | 'owner' | null): StaffPermissions {
    if (staff === 'owner' || staff === null) {
      return {
        canViewCostPrices: true,
        canManageProducts: true,
        canPerformMovements: true,
        canDeleteHistory: true,
        canViewSupplier: true,
        canViewStockStats: true,
        isOwnerOrAdmin: true,
        isManager: true,
        isStoreman: false,
        isCashier: false,
        isMaster: false,
      };
    }

    const role = staff.role;
    const isOwnerOrAdmin = 
      role === 'Admin' || 
      role === 'Owner' || 
      role === 'Manager' || 
      role === 'Direktor' || 
      role === 'Adminstrator' || 
      role === 'Baş menecer' || 
      role === 'Mağaza müdiri';

    const canDeleteHistory = role === 'Admin' || role === 'Owner' || role === 'Direktor' || role === 'Adminstrator';
    const isManager = role === 'Manager' || role === 'Baş menecer' || role === 'Mağaza müdiri' || role === 'Direktor';
    const isStoreman = role === 'Storeman';
    const isCashier = role === 'Cashier' || role === 'Baş Kassir' || role === 'Kreditor';
    const isMaster = role === 'Master';

    return {
      canViewCostPrices: isOwnerOrAdmin, // Maya and Zavod prices strictly for Owner/Admin/Manager
      canManageProducts: isOwnerOrAdmin, // Add, edit or delete products
      canPerformMovements: isOwnerOrAdmin || isStoreman, // Warehouse receipts (Qəbul) and dispatches (Silinmə)
      canDeleteHistory,
      canViewSupplier: isOwnerOrAdmin, // Təchizatçı only visible to Admin/Owner/Manager
      canViewStockStats: isOwnerOrAdmin, // Total goods and low stock items only visible to Admin/Owner/Manager
      isOwnerOrAdmin,
      isManager,
      isStoreman,
      isCashier,
      isMaster,
    };
  },

  getRoleLabel(role: StaffRole): string {
    switch (role) {
      case 'Owner':
        return 'Sahib';
      case 'Admin':
      case 'Adminstrator':
        return 'Adminstrator';
      case 'Direktor':
        return 'Direktor';
      case 'Baş menecer':
        return 'Baş menecer';
      case 'Mağaza müdiri':
        return 'Mağaza müdiri';
      case 'Baş Kassir':
        return 'Baş Kassir';
      case 'Kreditor':
        return 'Kreditor';
      case 'Operator':
        return 'Operator';
      case 'Online Media':
        return 'Online Media';
      case 'Manager':
        return 'Menecer';
      case 'Storeman':
        return 'Anbardar';
      case 'Cashier':
        return 'Kassir';
      case 'Master':
        return 'Usta';
      case 'Staff':
        return 'İşçi';
      default:
        return role;
    }
  },

  getRoleBadgeColor(role: StaffRole): { bg: string; text: string; border: string } {
    switch (role) {
      case 'Owner':
      case 'Admin':
      case 'Adminstrator':
      case 'Direktor':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'Baş menecer':
      case 'Mağaza müdiri':
      case 'Manager':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'Baş Kassir':
      case 'Cashier':
      case 'Kreditor':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'Operator':
      case 'Online Media':
        return { bg: '#FDF2F8', text: '#DB2777', border: '#FBCFE8' };
      case 'Storeman':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'Master':
        return { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' };
      case 'Staff':
      default:
        return { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
    }
  },

  async saveCurrentStaffSession(staff: StaffMember | 'owner' | null): Promise<void> {
    try {
      if (staff === null) {
        await AsyncStorage.removeItem(CURRENT_STAFF_STORAGE_KEY);
      } else if (staff === 'owner') {
        await AsyncStorage.setItem(CURRENT_STAFF_STORAGE_KEY, JSON.stringify({ type: 'owner' }));
      } else {
        await AsyncStorage.setItem(CURRENT_STAFF_STORAGE_KEY, JSON.stringify({ type: 'staff', data: staff }));
      }
    } catch (e) {
      console.warn('saveCurrentStaffSession error:', e);
    }
  },

  async loadSavedStaffSession(): Promise<StaffMember | 'owner' | null> {
    try {
      const raw = await AsyncStorage.getItem(CURRENT_STAFF_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.type === 'owner') return 'owner';
      if (parsed.type === 'staff' && parsed.data) return parsed.data as StaffMember;
      return null;
    } catch (e) {
      console.warn('loadSavedStaffSession error:', e);
      return null;
    }
  },

  async getAllStaff(userId: string): Promise<StaffMember[]> {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as StaffMember[];
    } catch (e) {
      console.error('getAllStaff error:', e);
      return [];
    }
  },

  async saveStaff(staff: Partial<StaffMember>, userId: string): Promise<StaffMember> {
    if (staff.id) {
      const { data, error } = await supabase
        .from('staff')
        .update({
          name: staff.name,
          role: staff.role,
          pin: staff.pin,
          phone: staff.phone,
          status: staff.status || 'Active'
        })
        .eq('id', staff.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as StaffMember;
    } else {
      const { data, error } = await supabase
        .from('staff')
        .insert([{
          name: staff.name,
          role: staff.role || 'Staff',
          pin: staff.pin || '0000',
          phone: staff.phone || null,
          status: staff.status || 'Active',
          user_id: userId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data as StaffMember;
    }
  },

  async deleteStaff(staffId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId)
      .eq('user_id', userId);

    if (error) throw error;
  }
};
