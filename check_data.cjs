const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  const env = fs.readFileSync('.env', 'utf8');
  const url = env.match(/VITE_SUPABASE_URL_PROD\s*=\s*(.*)/)[1].trim();
  const key = env.match(/VITE_SUPABASE_ANON_KEY_PROD\s*=\s*(.*)/)[1].trim();
  const supabase = createClient(url, key);

  const { data: suppliers } = await supabase.from('suppliers').select('id, name');
  console.log("Suppliers:", suppliers);

  const { data: products } = await supabase.from('products').select('id, name, article_number, supplier_id').limit(10);
  console.log("\nSample Products:", products);
}

check();
