const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
  const code = fs.readFileSync('./src/supabaseClient.js', 'utf8');
  const urlMatch = code.match(/supabaseUrl\s*=\s*['"`]?([^'"`;]+)['"`]?/);
  const keyMatch = code.match(/supabaseAnonKey\s*=\s*['"`]?([^'"`;]+)['"`]?/);
  
  if (!urlMatch || !keyMatch) {
    console.log("Could not parse supabaseClient.js");
    return;
  }
  
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  const { data: products, error } = await supabase.from('products').select('*').limit(5);
  if (error) {
    console.error(error);
  } else {
    console.log(products);
  }
}

check();
