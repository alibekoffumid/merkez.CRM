const fs = require('fs');
const file = 'src/modules/Warehouse/index.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /\{item\.categories\?\.name \? \(t\(\categories\.\$\{item\.categories\.name\}\, \{ defaultValue: item\.categories\.name \}\)\) : '-'\}/g,
  "{item.suppliers?.name ? item.suppliers.name : '—'}"
);
fs.writeFileSync(file, content);
