const fs = require('fs');
const { v4: uuidv4 } = require('crypto');

const csvData = fs.readFileSync('C:\\Users\\ACER\\.gemini\\antigravity\\brain\\1a6ecb3e-20f9-4ef8-bd5b-81c8f45a1ade\\.system_generated\\steps\\8595\\content.md', 'utf8');

const lines = csvData.split('\n');
let isData = false;
let sql = `
-- Скрипт для добавления товаров для аккаунта demo@merkez.com

DO $$
DECLARE
    v_user_id UUID;
    v_category_id UUID;
BEGIN
    -- Находим ID пользователя
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@merkez.com' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Пользователь demo@merkez.com не найден';
    END IF;

    -- Находим или создаем категорию 'Musiqi Alətləri' для этого пользователя
    SELECT id INTO v_category_id FROM public.categories WHERE name = 'Musiqi Alətləri' AND user_id = v_user_id LIMIT 1;
    
    IF v_category_id IS NULL THEN
        v_category_id := gen_random_uuid();
        INSERT INTO public.categories (id, name, user_id, is_deleted) 
        VALUES (v_category_id, 'Musiqi Alətləri', v_user_id, false);
    END IF;

    -- Добавляем товары
`;

let count = 0;

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

  const safeName = name.replace(/'/g, "''");

  sql += `    INSERT INTO public.products (id, category_id, name, price, user_id, barcode, purchase_price, stock_quantity, critical_stock, type, archived, is_deleted)
    VALUES ('${id}', v_category_id, '${safeName}', ${price}, v_user_id, '${barcode}', ${purchasePrice}, ${stockQuantity}, 5, 'finished_good', false, false);\n`;
  
  count++;
}

sql += `
END $$;
`;

fs.writeFileSync('C:\\Users\\ACER\\Desktop\\merkez.crm\\import_products.sql', sql, 'utf8');
console.log(`Generated SQL for ${count} products in import_products.sql`);
