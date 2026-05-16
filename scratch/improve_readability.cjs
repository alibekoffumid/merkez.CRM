const fs = require('fs');
const path = 'src/modules/Hotels/components/BookingCalendar.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update Week view width logic
content = content.replace(
  /width: `\$\{width - 8\}px`,/g,
  'width: `${Math.max(width - 8, 120)}px`, // Minimum width for readability'
);

// Add z-index and better styling for the text
content = content.replace(
  /className={`absolute top-2\.5 h-14 shadow-sm border border-white\/20 flex flex-col justify-center px-3 cursor-pointer hover:shadow-lg hover:z-10 transition-all hover:scale-\[1\.02\] active:scale-\[0\.98\] overflow-hidden/g,
  'className={`absolute top-2.5 h-14 shadow-md border border-white/30 flex flex-col justify-center px-3 cursor-pointer hover:shadow-xl hover:z-[20] transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden'
);

fs.writeFileSync(path, content);
console.log('Improved readability!');
