
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rvywrxnmgwwudihgrxdp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkChannel() {
  const { data: channels, error: ce } = await supabase.from('integration_channels').select('*');
  console.log('Channels:', channels);
}

checkChannel();
