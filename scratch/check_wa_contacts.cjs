
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rvywrxnmgwwudihgrxdp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWhatsAppContacts() {
  const { data: contacts, error } = await supabase
    .from('integration_contacts')
    .select('id, name, source, tenant_id')
    .eq('source', 'whatsapp');
    
  console.log("WhatsApp Contacts:", contacts);
}

checkWhatsAppContacts();
