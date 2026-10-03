import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { User, Session } from '@supabase/supabase-js';
import { StaffMember, StaffPermissions } from '../types';
import { staffService } from '../services/staffService';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  business_id?: string;
  admin_pin?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  currentStaff: StaffMember | 'owner' | null;
  permissions: StaffPermissions;
  isStaffLocked: boolean;
  staffList: StaffMember[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectStaff: (staff: StaffMember | 'owner', pin: string) => Promise<{ success: boolean; error?: string }>;
  lockStaff: () => void;
  refreshStaffList: () => Promise<void>;
}

const defaultPermissions: StaffPermissions = {
  canViewCostPrices: true,
  canManageProducts: true,
  canPerformMovements: true,
  canDeleteHistory: true,
  isOwnerOrAdmin: true,
  isManager: true,
  isStoreman: false,
  isCashier: false,
  isMaster: false,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  currentStaff: null,
  permissions: defaultPermissions,
  isStaffLocked: false,
  staffList: [],
  login: async () => ({ success: false }),
  logout: async () => {},
  selectStaff: async () => ({ success: false }),
  lockStaff: () => {},
  refreshStaffList: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Staff and Role state
  const [currentStaff, setCurrentStaff] = useState<StaffMember | 'owner' | null>(null);
  const [isStaffLocked, setIsStaffLocked] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    // Restore existing session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await initUserAndStaff(initialSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await initUserAndStaff(currentSession.user.id);
      } else {
        setProfile(null);
        setCurrentStaff(null);
        setStaffList([]);
        setIsStaffLocked(false);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initUserAndStaff = async (userId: string) => {
    try {
      await Promise.all([
        fetchProfile(userId),
        fetchStaffList(userId),
      ]);

      // Check if there was a saved staff session
      const saved = await staffService.loadSavedStaffSession();
      if (saved) {
        setCurrentStaff(saved);
        setIsStaffLocked(false);
      } else {
        // By default prompt who is working
        setIsStaffLocked(true);
      }
    } catch (e) {
      console.warn('initUserAndStaff error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }
  };

  const fetchStaffList = async (userId: string) => {
    const list = await staffService.getActiveStaff(userId);
    setStaffList(list);
  };

  const refreshStaffList = async () => {
    if (user?.id) {
      await fetchStaffList(user.id);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await initUserAndStaff(data.user.id);
      }
      return { success: true };
    } catch (e: any) {
      console.error('Sign in exception:', e);
      return { success: false, error: e.message || 'Giriş xətası' };
    }
  };

  const logout = async () => {
    try {
      await staffService.saveCurrentStaffSession(null);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setCurrentStaff(null);
      setStaffList([]);
      setIsStaffLocked(false);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const selectStaff = async (
    staff: StaffMember | 'owner',
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isValid = staffService.verifyPin(staff, pin, profile?.admin_pin);
    if (!isValid) {
      return { success: false, error: 'Daxil edilən PIN kod yanlışdır' };
    }

    setCurrentStaff(staff);
    setIsStaffLocked(false);
    await staffService.saveCurrentStaffSession(staff);
    return { success: true };
  };

  const lockStaff = () => {
    setIsStaffLocked(true);
  };

  const permissions = staffService.computePermissions(currentStaff);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        currentStaff,
        permissions,
        isStaffLocked,
        staffList,
        login,
        logout,
        selectStaff,
        lockStaff,
        refreshStaffList,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
