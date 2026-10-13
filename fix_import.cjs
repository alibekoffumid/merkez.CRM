const fs = require('fs');
const file = 'import_gsheet.cjs';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/categories/g, 'suppliers');
content = content.replace(/category_id/g, 'supplier_id');
content = content.replace(/categoryId/g, 'supplierId');
content = content.replace(/catName/g, 'suppName');
fs.writeFileSync(file, content);
