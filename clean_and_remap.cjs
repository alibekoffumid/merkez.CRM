const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const Papa = require('papaparse');

const supabase = createClient('https://rvywrxnmgwwudihgrxdp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI');

async function main() {
  await supabase.auth.signInWithPassword({ email: 'demo@merkez.com', password: 'password123' });
  const userId = '8929ea5f-d6b8-46e9-9873-dd67e65046f0';

  console.log('1. Cleaning existing suppliers for user...');
  // Delete all suppliers for this user
  // First, unset supplier_id on all products to avoid FK constraint issues if any
  let from = 0;
  const step = 1000;
  while(true) {
    const { data: prods } = await supabase.from('products').select('id').eq('user_id', userId).range(from, from + step - 1);
    if (!prods || prods.length === 0) break;
    console.log(`Clearing supplier_id/category_id on ${prods.length} products...`);
    const updates = prods.map(p => supabase.from('products').update({ supplier_id: null, category_id: null }).eq('id', p.id));
    await Promise.all(updates);
    if (prods.length < step) break;
    from += step;
  }

  // Delete all current suppliers for user
  const { error: delSuppError } = await supabase.from('suppliers').delete().eq('user_id', userId);
  console.log('Deleted old suppliers, error:', delSuppError);

  // Delete all fake categories for user
  const { error: delCatError } = await supabase.from('categories').delete().eq('user_id', userId);
  console.log('Deleted old categories, error:', delCatError);

  // 2. Create the exact 11 suppliers
  const targetSuppliers = [
    'LADE',
    'ALLEGRO',
    'GIDOO',
    'VIVALDI',
    'MILES',
    'AROMA',
    'TURKIYE_MALI',
    'YERLI FAKTURA',
    'Dig?r Çin Faktura',
    'IRAN_MALI_FAKTURA',
    'KORG'
  ];

  console.log('2. Inserting exact 11 suppliers...');
  const suppMap = {};
  for (const name of targetSuppliers) {
    const { data, error } = await supabase.from('suppliers').insert([{ name, user_id: userId }]).select();
    if (error) console.error('Error inserting supplier', name, error);
    else {
      suppMap[name] = data[0].id;
      console.log(`Created supplier: ${name} -> ${data[0].id}`);
    }
  }

  // Helper function to normalize CSV supplier name to one of the 11 target suppliers
  function mapCsvSupplier(raw) {
    if (!raw) return 'LADE';
    const s = raw.trim().toUpperCase();
    if (s.includes('LADE')) return 'LADE';
    if (s.includes('ALLEGRO')) return 'ALLEGRO';
    if (s.includes('GIDOO') || s.includes('GIDOO')) return 'GIDOO';
    if (s.includes('VIVALDI')) return 'VIVALDI';
    if (s.includes('MILES')) return 'MILES';
    if (s.includes('AROMA')) return 'AROMA';
    if (s.includes('TURKIYE') || s.includes('TÜRKIY?')) return 'TURKIYE_MALI';
    if (s.includes('YERLI') || s.includes('YERLI')) return 'YERLI FAKTURA';
    if (s.includes('ÇIN') || s.includes('CIN') || s.includes('DIG?R') || s.includes('DIGER')) return 'Dig?r Çin Faktura';
    if (s.includes('IRAN') || s.includes('IRAN')) return 'IRAN_MALI_FAKTURA';
    if (s.includes('KORG')) return 'KORG';
    return 'LADE';
  }

  // 3. Read CSV and map each product by barcode or name
  console.log('3. Reading CSV and mapping products...');
  const csvContent = fs.readFileSync('new_products.csv', 'utf8');
  const { data: csvRows } = Papa.parse(csvContent, { header: true });

  // Build a lookup from CSV: barcode -> supplier_id, and name -> supplier_id
  const barcodeToSupplier = {};
  const nameToSupplier = {};

  csvRows.forEach(row => {
    const rawSuppKey = Object.keys(row).find(k => k.includes('M?NB?') || k.includes('MNB') || k.includes('FAYLI'));
    const rawSupp = rawSuppKey ? row[rawSuppKey] : row['M?NB? FAYLI'];
    const targetName = mapCsvSupplier(rawSupp);
    const suppId = suppMap[targetName];

    const barcodeKey = Object.keys(row).find(k => k.toLowerCase().includes('barkod') || k.toLowerCase().includes('barcode'));
    const barcode = (barcodeKey ? row[barcodeKey] : row['BARKOD'])?.trim();

    const nameKey = Object.keys(row).find(k => k.includes('M?HSUL') || k.includes('MHSUL') || k.includes('SER'));
    const name = (nameKey ? row[nameKey] : row['M?HSUL SERIYA'])?.trim();

    if (barcode && suppId) {
      barcodeToSupplier[barcode] = suppId;
    }
    if (name && suppId && !nameToSupplier[name]) {
      nameToSupplier[name] = suppId;
    }
  });

  // Fetch all products in DB
  let allDbProducts = [];
  from = 0;
  while(true) {
    const { data: prods } = await supabase.from('products').select('id, name, barcode').eq('user_id', userId).range(from, from + step - 1);
    if (!prods || prods.length === 0) break;
    allDbProducts.push(...prods);
    if (prods.length < step) break;
    from += step;
  }
  console.log(`Found ${allDbProducts.length} products in DB.`);

  let updatedCount = 0;
  const updates = [];
  for (const p of allDbProducts) {
    let suppId = null;
    if (p.barcode && barcodeToSupplier[p.barcode]) {
      suppId = barcodeToSupplier[p.barcode];
    } else if (p.name && nameToSupplier[p.name]) {
      suppId = nameToSupplier[p.name];
    } else {
      // Default to LADE if not matched
      suppId = suppMap['LADE'];
    }

    if (suppId) {
      updates.push(supabase.from('products').update({ supplier_id: suppId, category_id: null }).eq('id', p.id));
      updatedCount++;
    }
  }

  console.log(`Executing ${updates.length} updates...`);
  // Run in chunks of 50
  for (let i = 0; i < updates.length; i += 50) {
    await Promise.all(updates.slice(i, i + 50));
    if (i % 250 === 0) console.log(`Processed ${i}/${updates.length}`);
  }

  console.log(`Successfully mapped all ${updatedCount} products to clean suppliers!`);
}

main().catch(console.error);
