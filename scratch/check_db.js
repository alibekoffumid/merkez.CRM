
import { supabase } from './src/supabaseClient.js';

async function checkCategories() {
  const { data, error } = await supabase.from('categories').select('*');
  console.log('Categories:', data);
  console.log('Error:', error);
}

checkCategories();
