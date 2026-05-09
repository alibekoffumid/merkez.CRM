const fs = require('fs');
const path = require('path');

const addTranslations = (file, translations) => {
  const filePath = path.join(__dirname, 'src', 'locales', file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.retail) data.retail = {};
    
    data.retail = { ...data.retail, ...translations };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${file} successfully.`);
  } catch (err) {
    console.error(`Error updating ${file}:`, err.message);
  }
};

addTranslations('ru.json', {
  split: "Сплит",
  splitCash: "Наличными",
  splitCard: "Картой (остаток)"
});

addTranslations('az.json', {
  split: "Split",
  splitCash: "Nağd",
  splitCard: "Kartla (qalıq)"
});

addTranslations('en.json', {
  split: "Split",
  splitCash: "Cash Amount",
  splitCard: "Card (Remainder)"
});
