import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModules, setActiveModules] = useState([]);   // ['dental', 'education', ...]
  const [modulesLoading, setModulesLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);

  useEffect(() => {
    fetchProfile();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Only trigger profile refresh on meaningful events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        fetchProfile();
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setActiveModules([]);
        setNeedsOnboarding(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (data) {
          setProfile(data);
          await fetchActiveModules(data.tenant_id || data.id);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveModules = async (tenantId) => {
    // Only show global loading spinner if we don't have any modules yet
    if (activeModules.length === 0) {
      setModulesLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('tenant_modules')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (error) throw error;

      if (!data || data.length === 0) {
        // No modules activated yet → user needs onboarding
        setNeedsOnboarding(true);
        setActiveModules([]);
      } else {
        // Filter out expired trials
        const now = new Date();
        const validModules = data.filter(m => {
          if (m.plan === 'trial' && m.trial_ends_at) {
            return new Date(m.trial_ends_at) > now;
          }
          if (m.expires_at) {
            return new Date(m.expires_at) > now;
          }
          return true;
        });
        const newModules = validModules.map(m => m.module_id);
        
        // Only update state if modules actually changed (to prevent unnecessary re-renders)
        setActiveModules(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newModules)) return prev;
          return newModules;
        });
        setNeedsOnboarding(false);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
      // On error, don't block the user — show all modules as fallback
      setActiveModules([]);
      setNeedsOnboarding(true);
    } finally {
      setModulesLoading(false);
    }
  };

  const activateModule = async (moduleId, plan = 'trial') => {
    if (!profile) return false;
    const tenantId = profile.tenant_id || profile.id;
    
    try {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      const { error } = await supabase.from('tenant_modules').upsert({
        tenant_id: tenantId,
        module_id: moduleId,
        is_active: true,
        plan: plan,
        trial_ends_at: plan === 'trial' ? trialEnds.toISOString() : null,
        subscribed_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,module_id' });

      if (error) throw error;
      
      // Refresh the module list
      await fetchActiveModules(tenantId);
      return true;
    } catch (err) {
      console.error('Error activating module:', err);
      return false;
    }
  };

  const activateMultipleModules = async (moduleIds, plan = 'trial') => {
    if (!profile) return false;
    const tenantId = profile.tenant_id || profile.id;
    
    try {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      const records = moduleIds.map(moduleId => ({
        tenant_id: tenantId,
        module_id: moduleId,
        is_active: true,
        plan: plan,
        trial_ends_at: plan === 'trial' ? trialEnds.toISOString() : null,
        subscribed_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('tenant_modules').upsert(records, { onConflict: 'tenant_id,module_id' });
      if (error) throw error;
      
      await fetchActiveModules(tenantId);
      return true;
    } catch (err) {
      console.error('Error activating modules:', err);
      return false;
    }
  };

  const deactivateModule = async (moduleId) => {
    if (!profile) return false;
    const tenantId = profile.tenant_id || profile.id;
    
    try {
      const { error } = await supabase
        .from('tenant_modules')
        .update({ is_active: false })
        .eq('tenant_id', tenantId)
        .eq('module_id', moduleId);

      if (error) throw error;
      
      await fetchActiveModules(tenantId);
      return true;
    } catch (err) {
      console.error('Error deactivating module:', err);
      return false;
    }
  };

  return (
    <UserContext.Provider value={{ 
      profile, 
      loading, 
      refreshProfile: fetchProfile,
      activeModules,
      modulesLoading,
      needsOnboarding,
      activateModule,
      activateMultipleModules,
      deactivateModule,
      currentStaff,
      setCurrentStaff,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined || context === null) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
