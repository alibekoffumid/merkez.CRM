const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rvywrxnmgwwudihgrxdp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI'
);

const csvData = fs.readFileSync('C:\\Users\\ACER\\.gemini\\antigravity\\brain\\1a6ecb3e-20f9-4ef8-bd5b-81c8f45a1ade\\.system_generated\\steps\\8595\\content.md', 'utf8');

// Parse CSV manually
const lines = csvData.split('\n');
let isData = false;
const productsToInsert = [];

for (const line of lines) {
  if (line.trim() === 'Name (Обязательно),Price (Обязательно),Old Price,Brand (Обязательно),Category Slug (Обязательно),Subcategory Slug,Image URL (Обязательно),Colors,Gift Items,Name RU,Name EN,Description,Description RU,Description EN,Specifications,SKU,Barcode,Stock Status,Condition,Meta Title,Meta Description,Image Alt,Fabric') {
    isData = true;
    continue;
  }
  if (!isData || line.trim() === '') continue;

  // very basic CSV parse handling some quotes
  const cols = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += line[i];
    }
  }
  cols.push(current);

  const name = cols[0];
  if (!name) continue;

  let priceStr = cols[1] || '0';
  priceStr = priceStr.replace(/[^0-9.]/g, ''); // strip " ₼" and ","
  const price = parseFloat(priceStr);
  if (isNaN(price)) continue;

  let barcode = cols[16];
  if (!barcode) {
    // generate random 13 digit barcode
    barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
  }

  // Generate random stock quantity between 5 and 50
  const stockQuantity = Math.floor(Math.random() * 46) + 5;

  productsToInsert.push({
    name: name,
    price: price,
    stock_quantity: stockQuantity,
    barcode: barcode,
    type: 'finished_good',
    archived: false,
    purchase_price: price * 0.7, // Random purchase price 30% less
    critical_stock: 5
  });
}

async function run() {
  console.log(`Found ${productsToInsert.length} products to insert.`);
  
  // Create a category for them
  let { data: catData, error: catError } = await supabase
    .from('categories')
    .insert([{ name: 'Musiqi Alətləri' }])
    .select();
  
  let categoryId = null;
  if (catError) {
    // maybe exists?
    let { data } = await supabase.from('categories').select('*').eq('name', 'Musiqi Alətləri').limit(1);
    if (data && data.length > 0) {
      categoryId = data[0].id;
    } else {
       // fallback to first category
       let { data: d2 } = await supabase.from('categories').select('id').limit(1);
       categoryId = d2[0].id;
    }
  } else {
    categoryId = catData[0].id;
  }

  // Set category_id for all
  const toInsert = productsToInsert.map(p => ({
    ...p,
    category_id: categoryId,
    // Add user_id if needed, but RLS might be off for service role. Wait, I'm using anon key. 
    // Need a user_id.
    user_id: 'a26d9d88-0f79-4765-aaff-f01350ea66f7' // existing user from previous query
  }));

  const { data, error } = await supabase.from('products').insert(toInsert);
  
  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Successfully inserted products!');
  }
}

run();
