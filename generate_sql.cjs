const fs = require('fs');
const { v4: uuidv4 } = require('crypto');

const csvData = fs.readFileSync('C:\\Users\\ACER\\.gemini\\antigravity\\brain\\1a6ecb3e-20f9-4ef8-bd5b-81c8f45a1ade\\.system_generated\\steps\\8595\\content.md', 'utf8');

const lines = csvData.split('\n');
let isData = false;
let sql = '';
let count = 0;

const userId = '1499055f-836f-4680-8d94-3b7aa4e3b2d8'; // Example user_id from db
const categoryId = 'a92871d8-2426-44f7-8e0e-8db7da378306'; // Audio texnika category as a fallback

for (const line of lines) {
  if (line.trim() === 'Name (Обязательно),Price (Обязательно),Old Price,Brand (Обязательно),Category Slug (Обязательно),Subcategory Slug,Image URL (Обязательно),Colors,Gift Items,Name RU,Name EN,Description,Description RU,Description EN,Specifications,SKU,Barcode,Stock Status,Condition,Meta Title,Meta Description,Image Alt,Fabric') {
    isData = true;
    continue;
  }
  if (!isData || line.trim() === '') continue;

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
  priceStr = priceStr.replace(/[^0-9.]/g, ''); 
  const price = parseFloat(priceStr);
  if (isNaN(price)) continue;

  let barcode = cols[16];
  if (!barcode) {
    barcode = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
  }

  const stockQuantity = Math.floor(Math.random() * 46) + 5;
  const purchasePrice = (price * 0.7).toFixed(2);
  const id = require('crypto').randomUUID();

  // Escape single quotes for SQL
  const safeName = name.replace(/'/g, "''");

  sql += `INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
VALUES ('${id}', '${categoryId}', '${safeName}', ${price}, '${userId}', '${barcode}', ${purchasePrice}, ${stockQuantity}, 5, 'finished_good', false, false);\n`;
  
  count++;
}

fs.writeFileSync('C:\\Users\\ACER\\Desktop\\merkez.crm\\import_products.sql', sql, 'utf8');
console.log(`Generated SQL for ${count} products in import_products.sql`);
