const fs = require('fs');
const path = 'src/modules/Hotels/components/BookingCalendar.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update Week view width logic to be slightly smaller than cell width to prevent overlapping "+" button
content = content.replace(
  /width: `\$\{Math\.max\(width - 8, 120\)\}px`,/g,
  'width: `${Math.max(width - 8, 88)}px`, // Reduced min-width to prevent blocking next cell "+" button'
);

fs.writeFileSync(path, content);
console.log('Fixed overlap!');
