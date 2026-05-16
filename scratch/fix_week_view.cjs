const fs = require('fs');
const path = 'src/modules/Hotels/components/BookingCalendar.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const startDiff = differenceInDays\(booking\.checkIn, startDate\);/g,
  'const startDiff = (booking.checkIn.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);'
);
content = content.replace(
  /const length = differenceInDays\(booking\.checkOut, booking\.checkIn\);/g,
  'const length = (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24);'
);
content = content.replace(
  /const visibleLength = Math\.min\(daysToShow, startDiff \+ length\) - visibleStartDiff;/g,
  'const visibleEndDiff = Math.min(daysToShow, startDiff + length);\n                         const visibleLength = visibleEndDiff - visibleStartDiff;'
);

fs.writeFileSync(path, content);
console.log('Fixed!');
