const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL_PROD;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY_PROD;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
    email: 'demo@merkez.com',
    password: 'password123'
  });
  if (authError2) return;
  
  const user = (await supabase.auth.getUser()).data.user;
  const userId = user.id;

  const reverseTranslations = {
    'pianino': 'pianos',
    'sintezatorlar': 'keyboards',
    'aksesuarlar': 'accessories',
    'gitaralar': 'guitars',
    'ukulele': 'ukuleles',
    'simli alətlər': 'string-instruments',
    'bancolar': 'banjo',
    'gücləndiricilər': 'amps',
    'zərb alətləri': 'percussion',
    'barabanlar': 'drums',
    'nəfəsli alətlər': 'wind-instruments',
    'effektlər': 'effects'
  };

  const { data: existingCategories } = await supabase.from('categories').select('*').eq('user_id', userId);
  
  for (const cat of existingCategories) {
    if (reverseTranslations[cat.name.toLowerCase()]) {
      const newName = reverseTranslations[cat.name.toLowerCase()];
      await supabase.from('categories').update({ name: newName }).eq('id', cat.id);
    }
  }

  console.log('Categories reverted successfully!');
}

run().catch(console.error);
