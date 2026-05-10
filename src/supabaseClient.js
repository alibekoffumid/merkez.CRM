import { createClient } from '@supabase/supabase-js';

const isProd = import.meta.env.PROD;

// Environment separation logic
// VITE_SUPABASE_URL_PROD / VITE_SUPABASE_ANON_KEY_PROD
// VITE_SUPABASE_URL_DEV / VITE_SUPABASE_ANON_KEY_DEV
const supabaseUrl = isProd 
  ? import.meta.env.VITE_SUPABASE_URL_PROD 
  : (import.meta.env.VITE_SUPABASE_URL_DEV || import.meta.env.VITE_SUPABASE_URL);

const supabaseAnonKey = isProd 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY_PROD 
  : (import.meta.env.VITE_SUPABASE_ANON_KEY_DEV || import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
