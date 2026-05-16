const fs = require('fs');
const path = 'src/modules/Hotels/components/BookingCalendar.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update Guest Tooltip date localization
content = content.replace(
  /<span>\{format\(d, 'dd MMMM'\)\}<\/span>/g,
  "<span>{format(d, 'd')} {t(`common.months.${format(d, 'MMMM').toLowerCase()}`)}</span>"
);
content = content.replace(
  /\{t\('hotels\.guests'\) \|\| 'Guests'\}/g,
  "{t('hotels.guests')}"
);

fs.writeFileSync(path, content);
console.log('Fixed localization!');
