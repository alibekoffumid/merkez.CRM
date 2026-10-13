const fs = require('fs');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rvywrxnmgwwudihgrxdp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI'
);

const csvData = fs.readFileSync('new_products.csv', 'utf8');

async function run() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo@merkez.com',
    password: 'password123',
  });
  if (authError) {
    console.error('Login error:', authError);
    return;
  }
  
  console.log('Logged in successfully!');
  const userId = authData.user.id;
  const warehouseId = '6ee516ab-a627-45e9-aa08-654b5e01acb3';

  // Parse CSV
  Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    complete: async function(results) {
      console.log(`Parsed ${results.data.length} rows`);
      
      const productsToInsert = [];
      const suppliersSet = new Set();
      
      // Collect unique suppliers
      for (const row of results.data) {
        const suppName = row['MƏNBƏ FAYLI']?.trim() || 'General';
        if (suppName) suppliersSet.add(suppName);
      }
      
      console.log('Categories found:', Array.from(suppliersSet));
      
      // Fetch or Create Categories
      const categoryMap = {};
      
      for (const suppName of suppliersSet) {
        let { data } = await supabase.from('suppliers').select('id').eq('name', suppName).eq('user_id', userId).limit(1);
        if (data && data.length > 0) {
          categoryMap[suppName] = data[0].id;
        } else {
          const { data: newCat } = await supabase.from('suppliers').insert([{ name: suppName, user_id: userId }]).select();
          if (newCat && newCat.length > 0) {
            categoryMap[suppName] = newCat[0].id;
          }
        }
      }

      for (const row of results.data) {
        const name = row['MƏNBƏ SERİYA'] || row['MƏHSUL SERİYA'] || '';
        if (!name.trim()) continue;

        let purchasePrice = parseFloat((row['MAYA QİYMƏTİ'] || '0').replace(/[^0-9.]/g, '')) || 0;
        let price = parseFloat((row['SATIŞ QİYMƏTİ'] || '0').replace(/[^0-9.]/g, '')) || 0;
        let stock = parseInt(row['STOK'] || '0') || 0;
        
        let barcode = row['BARKOD']?.trim();
        if (!barcode) {
          barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
        }

        const color = row['RƏNG']?.trim();
        const suppName = row['MƏNBƏ FAYLI']?.trim() || 'General';
        const supplierId = categoryMap[suppName];
        
        let factoryPrice = row['ZAVOD QİYMƏTİ']?.trim() || '';
        let info = row['ƏLAVƏ MƏLUMAT']?.trim() || '';
        
        let description = '';
        if (factoryPrice) description += `Zavod qiyməti: ${factoryPrice}\n`;
        if (info) description += `Əlavə məlumat: ${info}`;

        productsToInsert.push({
          name: name.trim(),
          price: price,
          purchase_price: purchasePrice,
          stock_quantity: stock,
          barcode: barcode,
          color: color || null,
          description: description.trim() || null,
          supplier_id: supplierId,
          type: 'finished_good',
          archived: false,
          critical_stock: 5,
          user_id: userId,
          warehouse_id: warehouseId,
          is_deleted: false
        });
      }
      
      console.log(`Prepared ${productsToInsert.length} products to insert.`);
      
      const batchSize = 100;
      let successCount = 0;
      
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('products').insert(batch);
        if (error) {
          console.error(`Error inserting batch ${i / batchSize}:`, error);
        } else {
          successCount += batch.length;
          console.log(`Inserted ${successCount}/${productsToInsert.length}`);
        }
      }
      
      console.log('Finished inserting products!');
    }
  });
}

run();
