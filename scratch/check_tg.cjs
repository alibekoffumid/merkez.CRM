
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rvywrxnmgwwudihgrxdp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTelegram() {
  const { data: contacts, error: ce } = await supabase.from('integration_contacts').select('*').eq('source', 'telephony');
  console.log('Telegram Contacts:', contacts);

  if (contacts && contacts.length > 0) {
    const { data: messages, error: me } = await supabase.from('integration_messages').select('*').in('contact_id', contacts.map(c => c.id)).order('created_at', { ascending: false });
    console.log('Telegram Messages:', messages);
  }
}

checkTelegram();
