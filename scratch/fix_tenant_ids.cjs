
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rvywrxnmgwwudihgrxdp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI';
const supabase = createClient(supabaseUrl, supabaseKey);

const REAL_TENANT_ID = 'a26d9d88-0f79-4765-aaff-f01350ea66f7';
const ZERO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

async function fixTenantIds() {
  console.log("Updating integration_contacts...");
  const { error: err1 } = await supabase
    .from('integration_contacts')
    .update({ tenant_id: REAL_TENANT_ID })
    .eq('tenant_id', ZERO_TENANT_ID);
    
  if (err1) console.error("Error updating contacts:", err1);
  else console.log("Contacts updated successfully.");

  console.log("Updating integration_messages...");
  const { error: err2 } = await supabase
    .from('integration_messages')
    .update({ tenant_id: REAL_TENANT_ID })
    .eq('tenant_id', ZERO_TENANT_ID);
    
  if (err2) console.error("Error updating messages:", err2);
  else console.log("Messages updated successfully.");

  console.log("Updating integration_channels...");
  const { error: err3 } = await supabase
    .from('integration_channels')
    .update({ tenant_id: REAL_TENANT_ID })
    .eq('tenant_id', ZERO_TENANT_ID);
    
  if (err3) console.error("Error updating channels:", err3);
  else console.log("Channels updated successfully.");
}

fixTenantIds();
