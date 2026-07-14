import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL_PROD || 'https://rvywrxnmgwwudihgrxdp.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY_PROD || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function loginUser() {
  const email = 'demo@merkez.com';
  const password = 'password123';

  console.log('Attempting to login to PROD...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('PROD Login Error:', error.message);
  } else {
    console.log('PROD Login successful!');
  }
}

loginUser();
