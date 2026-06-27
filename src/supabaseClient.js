import { createClient } from '@supabase/supabase-js';

const isProd = import.meta.env.PROD;

// Support dynamic overrides from localStorage (useful for local offline installations)
const localUrl = typeof window !== 'undefined' ? localStorage.getItem('merkez_supabase_url') : null;
const localKey = typeof window !== 'undefined' ? localStorage.getItem('merkez_supabase_key') : null;

// Environment separation logic with robust fallbacks
// 1. Try specific PROD/DEV keys
// 2. Fallback to standard keys
const supabaseUrl = localUrl || (isProd 
  ? (import.meta.env.VITE_SUPABASE_URL_PROD || import.meta.env.VITE_SUPABASE_URL)
  : (import.meta.env.VITE_SUPABASE_URL_DEV || import.meta.env.VITE_SUPABASE_URL));

const supabaseAnonKey = localKey || (isProd 
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY_PROD || import.meta.env.VITE_SUPABASE_ANON_KEY)
  : (import.meta.env.VITE_SUPABASE_ANON_KEY_DEV || import.meta.env.VITE_SUPABASE_ANON_KEY));

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing. App will not function correctly.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

