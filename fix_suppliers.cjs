const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rvywrxnmgwwudihgrxdp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI');

async function fix() {
  await supabase.auth.signInWithPassword({ email: 'demo@merkez.com', password: 'password123' });
  const userId = '8929ea5f-d6b8-46e9-9873-dd67e65046f0';
  
  // 1. Fetch categories
  const { data: categories } = await supabase.from('categories').select('*').eq('user_id', userId);
  const catMap = {};
  for (const c of categories) catMap[c.id] = c.name;
  
  // 2. Fetch suppliers
  const { data: existingSuppliers } = await supabase.from('suppliers').select('*').eq('user_id', userId);
  const suppMap = {};
  for (const s of existingSuppliers) suppMap[s.name.toUpperCase()] = s.id;
  
  // 3. Fetch products
  const { data: products } = await supabase.from('products').select('id, category_id, supplier_id').eq('user_id', userId);
  
  console.log('Total products:', products.length);
  
  let updated = 0;
  for (const p of products) {
    if (p.category_id && catMap[p.category_id]) {
      const catName = catMap[p.category_id];
      // We only convert specific categories to suppliers, or all of them? 
      // The user said "Allegro and others are not product categories, they are suppliers". 
      // The old categories imported were: LADE, ALLEGRO, GIDOO, VIVALDI, MILES, AROMA, etc.
      // So let's just move ALL categories that came from this import to suppliers.
      
      let suppId = suppMap[catName.toUpperCase()];
      if (!suppId) {
         console.log('Creating supplier:', catName);
         const { data: newSupp } = await supabase.from('suppliers').insert([{ name: catName, user_id: userId }]).select();
         suppId = newSupp[0].id;
         suppMap[catName.toUpperCase()] = suppId;
      }
      
      await supabase.from('products').update({ supplier_id: suppId, category_id: null }).eq('id', p.id);
      updated++;
      if (updated % 100 === 0) console.log('Updated', updated);
    }
  }
  console.log('Finished updating', updated, 'products');
  
  // Optional: delete those categories? 
  // Let's delete categories that have no products left.
  for (const c of categories) {
     const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', c.id);
     if (count === 0) {
        console.log('Deleting empty category:', c.name);
        await supabase.from('categories').delete().eq('id', c.id);
     }
  }
}
fix().catch(console.error);
