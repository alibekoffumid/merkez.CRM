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
    const isOwnerOrAdmin = role === 'Admin' || role === 'Owner' || role === 'Manager';
    const canDeleteHistory = role === 'Admin' || role === 'Owner';
    const isManager = role === 'Manager';
    const isStoreman = role === 'Storeman';
    const isCashier = role === 'Cashier';
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
        return 'İdarəçi';
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
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'Manager':
        return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'Storeman':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'Cashier':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
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
};
