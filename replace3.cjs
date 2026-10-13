const fs = require('fs');
const file = 'src/modules/Warehouse/index.jsx';
let content = fs.readFileSync(file, 'utf8');
const search = "{item.categories?.name ? (t(\categories.\\, { defaultValue: item.categories.name })) : '—'}";
const replace = "{item.suppliers?.name || '—'}";
content = content.replace(search, replace).replace(search, replace);
fs.writeFileSync(file, content);
