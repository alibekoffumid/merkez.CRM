import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { CATEGORY_TAXONOMY } from '../src/data/categoryTaxonomy.js';
import { getCategoryBySlug, getRootCategoryForSlug, normalizeCategorySlug } from '../src/utils/categoryHelper.js';

function getEnvValue(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, 'utf8').match(new RegExp(`^${key}=["']?([^"'\r\n]+)["']?`, 'm'));
      if (match) return match[1];
    }
  } catch {}
  return '';
}

// Configuration
const MERKEZ_URL = 'https://rvywrxnmgwwudihgrxdp.supabase.co';
const MERKEZ_ANON_KEY = getEnvValue('MERKEZ_ANON_KEY');
const MUSIC_STORE_USER_ID = '8929ea5f-d6b8-46e9-9873-dd67e65046f0';

const WAREHOUSE_CATEGORY_MAP = {
  // === 1. GITARALAR ===
  "GITARALAR -> AKUSTIK GITARALAR": "akustik-gitaralar",
  "AKUSTIK GITARALAR -> EQ AKUSTIK GITARALAR": "elektro-akustik-eq",
  "AKUSTIK GITARALAR -> AKUSTIK GITARA": "akustik-gitaralar",
  "AKUSTIK GITARALAR -> *": "akustik-gitaralar",
  "GITARALAR -> ELEKTRO GITARALAR": "elektro-gitaralar",
  "ELEKTRO GITARALAR -> *": "elektro-gitaralar",
  "GITARALAR -> BASS GITARALAR": "bas-gitaralar",
  "BASS GITARALAR -> *": "bas-gitaralar",
  "GITARALAR -> KLASSIK GITARALAR": "klassik-gitaralar",
  "KLASSIK GITARALAR -> EQ KLASSIK GITARALAR": "elektro-klassik-eq",
  "KLASSIK GITARALAR -> *": "klassik-gitaralar",
  "GITARALAR -> UKELELE": "ukulele-ve-gitaralele",
  "UKELELE -> *": "ukulele-ve-gitaralele",
  "UKELELE": "ukulele-ve-gitaralele",
  "GITARALAR -> AKSESUARLAR GITARA": "gitara-aksesuarlari",
  "AKSESUARLAR GITARA -> *": "gitara-aksesuarlari",
  "GITARALAR -> SIMLER GITARA": "gitara-simleri",
  "SIMLER GITARA -> *": "gitara-simleri",
  "GITARALAR -> *": "akustik-gitaralar",

  // === 2. MILLI MUSIQI ALETLERI ===
  "TAR -> ORTA PESEkar TAR": "orta-pesekar-tarlar",
  "TAR -> PESEKAR TAR": "orta-pesekar-tarlar",
  "TAR -> SADE TAR": "telebe-sade-tarlar",
  "TAR -> SEDEFLI TAR": "sedefli-tarlar",
  "TAR -> AKSESUARLAR TAR": "tar-hisseleri",
  "TAR -> SIMLER TAR": "tar-simleri",
  "TAR -> MIZRABLAR TAR": "tar-mizrablari",
  "TAR -> XEREKLER TAR": "tar-xereklari",
  "TAR -> CANTALAR TAR": "tar-cantalari",
  "TAR -> *": "tar",
  "TAR": "tar",

  "KAMANCALAR -> KAMAN PESEKAR": "orta-pesekar-kamancalar",
  "KAMANCALAR -> KAMAN ORTA": "orta-pesekar-kamancalar",
  "KAMANCALAR -> KAMAN SADE": "telebe-sade-kamancalar",
  "KAMANCALAR -> KAMAN SEDEFLI": "sedefli-kamancalar",
  "KAMANCALAR -> AKSESUARLAR KAMAN": "kamanca-hisseleri",
  "KAMANCALAR -> SIMLER KAMAN": "kamanca-simleri",
  "KAMANCALAR -> SMICOKLAR KAMAN": "smicoklar-ve-tuk",
  "KAMANCALAR -> CANTALAR KAMAN": "kamanca-cantalari",
  "KAMANCALAR -> *": "kamanca",
  "KAMANCALAR": "kamanca",
  "KAMANCA": "kamanca",

  "SAZ MILLI -> BOYUK SAZ MILLI": "boyuk-saz",
  "SAZ MILLI -> CURE SAZ MILLI": "cure-saz",
  "SAZ MILLI -> AKSESUARLAR SAZ MILLI": "saz-aksesuarlari",
  "SAZ MILLI -> *": "saz-ve-baglama",
  "SAZ MILLI": "saz-ve-baglama",
  "SAZ TURK -> AKUSTIK BAGLAMA": "turk-baglamasi",
  "SAZ TURK -> ELEKTRO BAGLAMA": "elektro-baglama",
  "SAZ TURK -> SIMLER SAZ TURK": "saz-baglama-simleri",
  "SAZ TURK -> *": "turk-baglamasi",
  "SAZ TURK": "turk-baglamasi",

  "KANON -> AKSESUARLAR KANON": "qanun-aksesuarlari",
  "KANON -> *": "qanun",
  "KANON": "qanun",
  "QANUN -> *": "qanun",
  "UD -> AKSESUARLAR UD": "ud-aksesuarlari",
  "UD -> *": "ud",
  "UD": "ud",

  "BALABAN -> *": "balaban-mey",
  "BALABAN": "balaban-mey",
  "TUTEKLER -> *": "tutek",
  "TUTEKLER": "tutek",
  "TUTEK": "tutek",
  "ZURNA -> *": "zurna",
  "ZURNA": "zurna",
  "NEY -> *": "ney",
  "NEY": "ney",
  "NEFESLI ALETLER -> MILLI NEFESLI": "milli-nefes-aletleri",
  "MILLI NEFESLI -> *": "milli-nefes-aletleri",

  "NAGARALAR -> *": "nagara",
  "NAGARALAR": "nagara",
  "NAGARA": "nagara",
  "DAVULLAR -> *": "davul",
  "DAVULLAR": "davul",
  "DAVUL": "davul",
  "QAVAL -> *": "qaval-def",
  "QAVAL": "qaval-def",
  "DEF -> *": "qaval-def",
  "ZERB -> *": "zerb-darbuka",
  "ZERB": "zerb-darbuka",

  // === 3. PIANOLAR VE KLAVISLER ===
  "PIANOLAR -> ELEKTRO PIANO": "elektron-pianolar",
  "ELEKTRO PIANO -> TAM OKTAVA": "elektron-pianolar",
  "ELEKTRO PIANO -> 5 OKTAVA": "portativ-pianolar",
  "ELEKTRO PIANO -> ELEKTRO PIANO EHTIYYAT HISSELER": "piano-aksesuarlari",
  "ELEKTRO PIANO -> *": "elektron-pianolar",
  "ELEKTRO PIANO": "elektron-pianolar",
  "PIANOLAR -> PORTATIV PIANO": "portativ-pianolar",
  "PORTATIV PIANO -> *": "portativ-pianolar",
  "PORTATIV PIANO": "portativ-pianolar",
  "PIANOLAR -> AKUSTIK PIANO": "akustik-pianolar",
  "AKUSTIK PIANO -> *": "akustik-pianolar",
  "PIANOLAR -> AKSESUARLAR PIANO": "piano-aksesuarlari",
  "AKSESUARLAR PIANO -> OTURACAQLAR PIANO": "piano-aksesuarlari",
  "AKSESUARLAR PIANO -> *": "piano-aksesuarlari",
  "AKSESUARLAR PIANO": "piano-aksesuarlari",
  "SINTEZATORLAR -> *": "sintezatorlar",
  "SINTEZATORLAR": "sintezatorlar",
  "QARMONLAR -> *": "qarmon-akkordeon",
  "QARMONLAR": "qarmon-akkordeon",
  "AKKORDEON -> *": "qarmon-akkordeon",
  "AKKORDEON": "qarmon-akkordeon",
  "PIANOLAR -> *": "elektron-pianolar",

  // === 4. SKRIPKALAR VE YAYLI ALETLER ===
  "SKRIPKALAR -> ELEKTRON SKRIPKA": "elektro-skripkalar",
  "SKRIPKALAR -> AKSESUARLAR": "yayli-alet-aksesuarlari",
  "SKRIPKALAR -> CANTALAR SKRIPKA": "yayli-alet-aksesuarlari",
  "SKRIPKALAR -> *": "skripkalar",
  "SKRIPKALAR": "skripkalar",
  "CELLO -> *": "cello",
  "CELLO": "cello",
  "VIOLA ALT -> *": "viola",
  "VIOLA": "viola",
  "KONTURBAS -> *": "kontrabas",
  "KONTRABAS -> *": "kontrabas",

  // === 5. NEFESLI ALETLER ===
  "SAKSAFON -> *": "saksofon",
  "SAKSAFON": "saksofon",
  "KLARNET -> AKSESUARLAR": "nefes-aksesuarlari",
  "KLARNET -> *": "klarnet",
  "KLARNET": "klarnet",
  "FLEYTA -> *": "fleyta",
  "FLEYTA": "fleyta",
  "TRUMPET -> *": "truba-trombon",
  "TRUMPET": "truba-trombon",
  "TRAMBON -> *": "truba-trombon",
  "TRAMBON": "truba-trombon",
  "VALTORNA -> *": "valtorna-qoboy",
  "VALTORNA": "valtorna-qoboy",
  "QOBOY -> *": "valtorna-qoboy",
  "DODAQ QARMONU -> *": "dodaq-qarmonlari-melodikalar",
  "MELODIKA -> *": "dodaq-qarmonlari-melodikalar",

  // === 6. ZERB VE PERKUSSIYA ===
  "BARABANLAR -> AKUSTIK BARABAN": "akustik-barabanlar",
  "BARABANLAR -> ELEKTRO BARABAN": "elektron-barabanlar",
  "BARABANLAR -> MARS BARABANLARI": "mars-barabanlari",
  "BARABANLAR -> AKSESUARLAR BARABAN": "baraban-aksesuarlari",
  "BARABANLAR -> *": "akustik-barabanlar",
  "BARABANLAR": "akustik-barabanlar",
  "RITM ALETLERI -> *": "el-ritmleri",
  "RITM ALETLERI": "el-ritmleri",
  "DJEMBE -> *": "etnik-perkussiya",
  "DJEMBE": "etnik-perkussiya",
  "KONGO -> *": "etnik-perkussiya",
  "KONGO": "etnik-perkussiya",
  "KAHON -> *": "etnik-perkussiya",
  "KAHON": "etnik-perkussiya",
  "XIRDA EL RITMLERI -> *": "el-ritmleri",
  "XIRDA EL RITMLERI": "el-ritmleri",
  "KALIMBA -> *": "kalimba",
  "KALIMBA": "kalimba",

  // === 7. AUDIO, STUDIYA VE SEHNE ===
  "MIKROFONLAR -> SIMSIZ MIKROFON": "simsiz-mikrofonlar",
  "SIMSIZ MIKROFON -> *": "simsiz-mikrofonlar",
  "SIMSIZ MIKROFON": "simsiz-mikrofonlar",
  "MIKROFONLAR -> KABELLI MIKROFON": "kabelli-mikrofonlar",
  "MIKROFONLAR -> KONDENSATOR MIKROFON": "studia-mikrofonlari",
  "MIKROFONLAR -> AKSESUARLAR MIK": "mikrofon-dinamik-dayaqlari",
  "MIKROFONLAR -> *": "kabelli-mikrofonlar",
  "MIKROFONLAR": "kabelli-mikrofonlar",
  "DINAMIKLER -> *": "dinamikler",
  "DINAMIKLER": "dinamikler",
  "SES SISTEMLERI -> DINAMIKLER": "dinamikler",
  "SES SISTEMLERI -> INSTRUMENTAL MIKROFONLAR": "kabelli-mikrofonlar",
  "SES SISTEMLERI -> EFFEKT PEDALLARI": "effekt-pedallari",
  "SES SISTEMLERI -> *": "dinamikler",
  "EFFEKT PEDALLARI -> *": "effekt-pedallari",
  "EFFEKT PEDALLARI": "effekt-pedallari",
  "USILITELLER -> *": "kombo-guclendiriciler",
  "USILITELLER": "kombo-guclendiriciler",
  "SOUND KARTLAR -> *": "ses-kartlari-mikserler",
  "SOUND KARTLAR": "ses-kartlari-mikserler",
  "MIKSERLER -> *": "ses-kartlari-mikserler",
  "MIKSERLER": "ses-kartlari-mikserler",
  "QULAQLIQLAR -> *": "studiya-qulaqliqlari",
  "QULAQLIQLAR": "studiya-qulaqliqlari",

  // === 8. KABELLER, DAYAQLAR VE AKSESUARLAR ===
  "SES KABELLERI -> *": "ses-kabelleri",
  "SES KABELLERI": "ses-kabelleri",
  "STEKERLER -> PEREXODNIKLER": "stekkerler-perexodnikler",
  "STEKERLER -> *": "stekkerler-perexodnikler",
  "STEKERLER": "stekkerler-perexodnikler",
  "DAYAQLAR -> NOT DAYAGI": "alet-not-dayaqlari",
  "DAYAQLAR -> INSTRUMENT DAYAGI": "alet-not-dayaqlari",
  "DAYAQLAR -> DAYAG MIK": "mikrofon-dinamik-dayaqlari",
  "DAYAQLAR -> DINAMIK DAYAGI": "mikrofon-dinamik-dayaqlari",
  "DAYAQLAR -> *": "alet-not-dayaqlari",
  "DAYAQLAR": "alet-not-dayaqlari",
  "BATAREYALAR -> *": "adapterler-batareyalar",
  "BATAREYALAR": "adapterler-batareyalar",
  "ADAPTERLER -> *": "adapterler-batareyalar",
  "ADAPTERLER": "adapterler-batareyalar",
  "KITABLAR -> *": "musiqi-kitablari",
  "KITABLAR": "musiqi-kitablari",
  "SUVENIRLER -> *": "suvenirler-usaq-aletleri",
  "SUVENIRLER": "suvenirler-usaq-aletleri",
  "DIGER AKSESUARLAR UMUMI -> *": "kabeller-dayaqlar-aksesuarlar",
  "DIGER AKSESUARLAR UMUMI": "kabeller-dayaqlar-aksesuarlar",
  "DIGER ALETLER UMUMI": "kabeller-dayaqlar-aksesuarlar"
};

// Character normalizer for robust mapping
function normalizeKey(str) {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/Ə/g, 'E')
    .replace(/I/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C')
    .replace(/Ö/g, 'O')
    .replace(/Ü/g, 'U')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalized lookup map
const NORMALIZED_MAP = {};
for (const [key, val] of Object.entries(WAREHOUSE_CATEGORY_MAP)) {
  NORMALIZED_MAP[normalizeKey(key)] = val;
}

// Factory Titles Catalog (Guangzhou Gidoo / Kaysen / Tayste / The Rose)
let FACTORY_TITLES_MAP = new Map();
try {
  const gidooData = JSON.parse(fs.readFileSync('scripts/data/gidoo_catalog_titles.json', 'utf8'));
  gidooData.forEach(item => {
    FACTORY_TITLES_MAP.set(item.sku, item);
  });
  console.log('✓ Loaded ' + FACTORY_TITLES_MAP.size + ' factory titles for catalog mapping.');
} catch (e) {
  console.warn('Could not load gidoo_catalog_titles.json:', e.message);
}

// Brand detection catalog
const KNOWN_BRANDS = [
  'YAMAHA', 'KORG', 'CASIO', 'ROLAND', 'FENDER', 'IBANEZ', 'GIBSON', 'EPIPHONE',
  'CORT', 'ALHAMBRA', 'VALENCIA', 'MANUEL RODRIGUEZ', 'STRUNAL', 'HORA', 'CREMONA',
  'AROMA', 'NUX', 'CHERUB', 'M-AUDIO', 'BEHRINGER', 'FOCUSRITE', 'SHURE', 'SENNHEISER',
  'AUDIO-TECHNICA', 'RODE', 'JBL', 'MACKIE', 'PIONEER', 'VIVALDI', 'DOMINGUEZ',
  'KAYSEN', 'TAYSTE', 'LADE', 'MIDILAND', 'MIDIONE', 'ALLEGRO', 'IRIN', 'ALICE',
  'D\'ADDARIO', 'ERNIE BALL', 'ELIXIR', 'SAVAREZ', 'HANNABACH', 'VANDOREN', 'RICO', 'RIGOTTI'
];

// Artisan dictionaries
const ARTISANS = [
  { match: /\b(b[əe]xtiyar|baxtiyar)\b/i, name_az: 'Bəxtiyar', name_ru: 'Бахтияр', name_en: 'Bakhtiyar' },
  { match: /\b(teymur)\b/i, name_az: 'Teymur', name_ru: 'Теймур', name_en: 'Teymur' },
  { match: /\b(sahib)\b/i, name_az: 'Sahib', name_ru: 'Сахиб', name_en: 'Sahib' },
  { match: /\b(f[əe]rhad|farhad)\b/i, name_az: 'Fərhad', name_ru: 'Фархад', name_en: 'Farhad' },
  { match: /\b(f[əe]rrux|farrux)\b/i, name_az: 'Fərrux', name_ru: 'Фаррух', name_en: 'Farrukh' },
  { match: /\b(tahir)\b/i, name_az: 'Tahir', name_ru: 'Тахир', name_en: 'Tahir' },
  { match: /\b(r[öo]v[şs][əe]n|rovsan)\b/i, name_az: 'Rövşən', name_ru: 'Ровшан', name_en: 'Rovshan' },
  { match: /\b(raci)\b/i, name_az: 'Raci', name_ru: 'Раджи', name_en: 'Raji' },
  { match: /\b(el[şs][əe]n|elsan)\b/i, name_az: 'Elşən', name_ru: 'Эльшан', name_en: 'Elshan' },
  { match: /\b(namiq)\b/i, name_az: 'Namiq', name_ru: 'Намиг', name_en: 'Namig' }
];

// Materials dictionaries
const MATERIALS = [
  { match: /\b(ebonit)\b/i, name_az: 'Ebonit', name_ru: 'Эбонит', name_en: 'Ebonite' },
  { match: /\b(qoz)\b/i, name_az: 'Qoz ağacı', name_ru: 'Орех', name_en: 'Walnut' },
  { match: /\b(f[ıi]st[ıi]q)\b/i, name_az: 'Fıstıq ağacı', name_ru: 'Бук', name_en: 'Beech' },
  { match: /\b(latun)\b/i, name_az: 'Latun', name_ru: 'Латунь', name_en: 'Brass' },
  { match: /\b(d[əe]mir|demir)\b/i, name_az: 'Dəmir', name_ru: 'Металл', name_en: 'Metal' },
  { match: /\b(tut|tut a[ğg]ac[ıi])\b/i, name_az: 'Tut ağacı', name_ru: 'Шелковица', name_en: 'Mulberry' },
  { match: /\b(plastik|pvc)\b/i, name_az: 'Plastik', name_ru: 'Пластик', name_en: 'Plastic' },
  { match: /\b(tekstolit)\b/i, name_az: 'Tekstolit', name_ru: 'Текстолит', name_en: 'Textolite' }
];

// Size patterns
const SIZE_REGEX = /\b(4\/4|3\/4|1\/2|2\/1|1\/4|1\/8|1\/16|\d{1,2}\s*(?:inch|düym|sm|duym))\b/i;
const OCTAVE_REGEX = /\b(tam oktava|5 oktava)\b/i;

function extractAttributes(productName, categoryPath) {
  const combined = `${productName} ${categoryPath}`;
  const specsAz = [];
  const specsRu = [];
  const specsEn = [];

  // 1. Artisan
  for (const art of ARTISANS) {
    if (art.match.test(combined)) {
      specsAz.push(`Usta: ${art.name_az}`);
      specsRu.push(`Мастер: ${art.name_ru}`);
      specsEn.push(`Maker: ${art.name_en}`);
      break;
    }
  }

  // 2. Size / Octave (handles fraction sizes 4/4, 1/2, etc. and ignores words starting with SM)
  const fracMatch = combined.match(/(?:^|[\s,;(/])(4\/4|3\/4|1\/2|2\/1|1\/4|1\/8|1\/16)(?:$|[\s,;)/])/);
  if (fracMatch) {
    let sizeVal = fracMatch[1];
    if (sizeVal === '2/1') sizeVal = '1/2';
    specsAz.push(`Ölçü: ${sizeVal}`);
    specsRu.push(`Размер: ${sizeVal}`);
    specsEn.push(`Size: ${sizeVal}`);
  } else {
    const unitMatch = combined.match(/(?:^|[\s,;(/])(\d{1,2})\s*(inch|düym|duym|sm)(?:$|[\s,;)/])/i);
    if (unitMatch) {
      const sizeVal = `${unitMatch[1]} ${unitMatch[2].toLowerCase()}`;
      specsAz.push(`Ölçü: ${sizeVal}`);
      specsRu.push(`Размер: ${sizeVal}`);
      specsEn.push(`Size: ${sizeVal}`);
    } else {
      const octMatch = combined.match(/(?:^|[\s,;(/])(tam oktava|5 oktava)(?:$|[\s,;)/])/i);
      if (octMatch) {
        const octVal = octMatch[1].toLowerCase();
        if (octVal.includes('tam')) {
          specsAz.push('Oktava: Tam oktava (88 klaviş)');
          specsRu.push('Октавы: Полная октава (88 клавиш)');
          specsEn.push('Octaves: Full 88 Keys');
        } else {
          specsAz.push('Oktava: 5 oktava (61 klaviş)');
          specsRu.push('Октавы: 5 октав (61 клавиша)');
          specsEn.push('Octaves: 5 Octaves (61 Keys)');
        }
      }
    }
  }

  // 3. Material
  for (const mat of MATERIALS) {
    if (mat.match.test(combined)) {
      specsAz.push(`Material: ${mat.name_az}`);
      specsRu.push(`Материал: ${mat.name_ru}`);
      specsEn.push(`Material: ${mat.name_en}`);
      break;
    }
  }

  return {
    az: specsAz.join(', '),
    ru: specsRu.join(', '),
    en: specsEn.join(', ')
  };
}

function detectBrand(productName) {
  if (/\b(?:PA[- ]?\d{3,4}|KORG)\b/i.test(productName)) return 'KORG';
  if (/\b(?:PSR[- ]?[A-Z0-9]+|YDP|CLP|YAMAHA)\b/i.test(productName)) return 'YAMAHA';
  const upper = productName.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    if (upper.includes(b)) return b;
  }
  return 'RAST';
}

function cleanProductName(name) {
  if (!name) return 'Musiqi Aləti';
  return name.trim().replace(/\s+/g, ' ');
}

function generateSlug(name, id) {
  const shortId = id.split('-')[0] || Math.floor(Math.random() * 10000);
  const base = name
    .toLowerCase()
    .replace(/[əe]/g, 'e')
    .replace(/[ıi]/g, 'i')
    .replace(/[ğg]/g, 'g')
    .replace(/[şs]/g, 's')
    .replace(/[çc]/g, 'c')
    .replace(/[öo]/g, 'o')
    .replace(/[üu]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'mehsul'}-${shortId}`;
}

// Resolves category path to canonical subcategory slug
function resolveSubcategorySlug(path, name) {
  const normPath = normalizeKey(path);
  if (NORMALIZED_MAP[normPath]) return NORMALIZED_MAP[normPath];

  // Try parent wildcard match
  if (normPath.includes(' -> ')) {
    const parentPart = normPath.split(' -> ')[0].trim();
    const wildKey = `${parentPart} -> *`;
    if (NORMALIZED_MAP[wildKey]) return NORMALIZED_MAP[wildKey];
    if (NORMALIZED_MAP[parentPart]) return NORMALIZED_MAP[parentPart];
  }

  // Try leaf part
  const leaf = normPath.includes(' -> ') ? normPath.split(' -> ').pop().trim() : normPath;
  if (NORMALIZED_MAP[leaf]) return NORMALIZED_MAP[leaf];

  // Fallback heuristics based on combined text
  const combined = `${normPath} ${normalizeKey(name)}`;
  if (combined.includes('QULAQCIQ') || combined.includes('HEADPHONE')) return 'studiya-qulaqliqlari';
  if (/\b(?:PA[- ]?\d{3,4}|PSR[- ]?[A-Z0-9]+|SYNTH|KEYBOARD)\b/i.test(name)) return 'sintezatorlar';
  if (combined.includes('SKRIPKA') || combined.includes('CELLO')) {
    if (combined.includes('SMICOK') || combined.includes('SMC') || combined.includes('KANIFOL') || combined.includes('MOSTIK')) {
      return 'yayli-alet-aksesuarlari';
    }
    return 'skripkalar';
  }
  if (combined.includes('SMICOK') || combined.includes('SMC')) return 'smicoklar-ve-tuk';
  if (combined.includes('GITARA')) {
    if (combined.includes('ELEKTRO')) return 'elektro-gitaralar';
    if (combined.includes('BASS')) return 'bas-gitaralar';
    if (combined.includes('KLASSIK')) return 'klassik-gitaralar';
    return 'akustik-gitaralar';
  }
  if (combined.includes('TAR')) return 'tar';
  if (combined.includes('KAMANCA')) return 'kamanca';
  if (combined.includes('SAZ') || combined.includes('BAGLAMA')) return 'saz-ve-baglama';
  if (combined.includes('KANON') || combined.includes('QANUN')) return 'qanun';
  if (combined.includes('UD')) return 'ud';
  if (combined.includes('PIANO') || combined.includes('PIANINO')) return 'elektron-pianolar';
  if (combined.includes('SINTEZATOR')) return 'sintezatorlar';
  if (combined.includes('QARMON') || combined.includes('AKKORDEON')) return 'qarmon-akkordeon';
  if (combined.includes('BARABAN') || combined.includes('DRUM')) return 'akustik-barabanlar';
  if (combined.includes('MIKROFON')) return 'kabelli-mikrofonlar';
  if (combined.includes('KABEL')) return 'ses-kabelleri';
  if (combined.includes('DAYAQ') || combined.includes('STEND')) return 'alet-not-dayaqlari';
  if (combined.includes('ADAPTER') || combined.includes('BATAREYA')) return 'adapterler-batareyalar';
  if (combined.includes('FLUTE') || combined.includes('FLEYTA')) return 'fleyta';
  if (combined.includes('SAXOPHONE') || combined.includes('SAKSAFON')) return 'saksofon';
  if (combined.includes('KLARNET')) return 'klarnet';

  return 'kabeller-dayaqlar-aksesuarlar';
}

function escapeSqlString(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

export async function runProductSync() {
  console.log('--- STARTING MERKEZ WAREHOUSE PRODUCT SYNC ---');

  const supabase = createClient(MERKEZ_URL, MERKEZ_ANON_KEY);
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'demo@merkez.com',
    password: 'password123'
  });
  if (authErr) {
    console.error('Failed to log in to Merkez CRM:', authErr.message);
    process.exit(1);
  }
  console.log('✓ Successfully authenticated with Merkez CRM.');

  // Fetch categories
  const { data: catRows, error: catErr } = await supabase.from('categories').select('*');
  if (catErr) throw catErr;
  const catMap = new Map();
  catRows.forEach(c => catMap.set(c.id, c));

  function getCatPath(catId) {
    if (!catId || !catMap.has(catId)) return '';
    const c = catMap.get(catId);
    if (!c.parent_id || !catMap.has(c.parent_id)) return c.name.trim();
    const p = catMap.get(c.parent_id);
    return `${p.name.trim()} -> ${c.name.trim()}`;
  }

  // Fetch all products
  console.log('Fetching warehouse products...');
  let allProducts = [];
  let from = 0;
  let batch = 1000;
  while (true) {
    const { data: prods, error: pErr } = await supabase.from('products').select('*').range(from, from + batch - 1);
    if (pErr) throw pErr;
    allProducts = allProducts.concat(prods);
    if (prods.length < batch) break;
    from += batch;
  }
  console.log(`✓ Total products in database: ${allProducts.length}`);

  // Filter for active music store products
  const activeMusicProds = allProducts.filter(p => 
    p.user_id === MUSIC_STORE_USER_ID && 
    !p.is_deleted && 
    !p.archived
  );
  console.log(`✓ Active music store products to sync: ${activeMusicProds.length}`);

  const syncRecords = [];
  const rootCategoryCounts = {};
  const stats = {
    artisansExtracted: 0,
    sizesExtracted: 0,
    materialsExtracted: 0,
    withImages: 0
  };

  for (const p of activeMusicProds) {
    const catPath = getCatPath(p.category_id);
    const subcategorySlug = resolveSubcategorySlug(catPath, p.name);
    const rootCat = getRootCategoryForSlug(subcategorySlug);
    const rootCategorySlug = rootCat ? rootCat.slug : 'kabeller-dayaqlar-aksesuarlar';

    rootCategoryCounts[rootCategorySlug] = (rootCategoryCounts[rootCategorySlug] || 0) + 1;

    const brand = detectBrand(p.name);
    const specs = extractAttributes(p.name, catPath);
    if (specs.az.includes('Usta:')) stats.artisansExtracted++;
    if (specs.az.includes('Ölçü:') || specs.az.includes('Oktava:')) stats.sizesExtracted++;
    if (specs.az.includes('Material:')) stats.materialsExtracted++;
    if (p.image_url) stats.withImages++;

    const sku = p.barcode ? `RM-${p.barcode.slice(-6)}` : `RM-${p.id.slice(0, 6).toUpperCase()}`;
    const factoryTitle = FACTORY_TITLES_MAP.get(sku);
    const finalName = factoryTitle ? factoryTitle.name : cleanProductName(p.name);
    const finalNameRu = factoryTitle ? factoryTitle.name_ru : finalName;
    const finalNameEn = factoryTitle ? factoryTitle.name_en : finalName;
    let finalBrand = brand;
    if (factoryTitle) {
      if (finalName.startsWith('Tayste')) finalBrand = 'TAYSTE';
      else if (finalName.startsWith('Kaysen')) finalBrand = 'KAYSEN';
      else if (finalName.startsWith('The Rose')) finalBrand = 'THE ROSE';
      else if (finalName.startsWith('Gidoo')) finalBrand = 'GIDOO';
    }

    const slug = generateSlug(finalName, p.id);
    const stockStatus = (p.stock_quantity > 0) ? 'in_stock' : 'out_of_stock';

    syncRecords.push({
      id: p.id,
      name: finalName,
      name_ru: finalNameRu,
      name_en: finalNameEn,
      price: Number(p.price) || 0,
      old_price: p.purchase_price ? Number(p.purchase_price) : null,
      brand: finalBrand,
      category_slug: rootCategorySlug,
      subcategory_slug: subcategorySlug,
      image: (factoryTitle && factoryTitle.image) ? factoryTitle.image : (p.image_url || ''),
      images: (factoryTitle && Array.isArray(factoryTitle.images) && factoryTitle.images.length > 0)
        ? factoryTitle.images
        : (p.image_url ? [p.image_url] : []),
      specifications: specs.az || null,
      specifications_ru: specs.ru || null,
      specifications_en: specs.en || null,
      sku: p.barcode ? `RM-${p.barcode.slice(-6)}` : `RM-${p.id.slice(0, 6).toUpperCase()}`,
      barcode: p.barcode || null,
      stock_status: stockStatus,
      is_archived: false,
      condition: 'new',
      slug: slug,
      created_at: p.created_at || new Date().toISOString()
    });
  }

  console.log('\n--- CATEGORY BREAKDOWN ---');
  for (const [cat, count] of Object.entries(rootCategoryCounts)) {
    console.log(`- ${cat.padEnd(30)}: ${count} products`);
  }

  console.log('\n--- ATTRIBUTES EXTRACTED ---');
  console.log(`- Artisans Extracted  : ${stats.artisansExtracted}`);
  console.log(`- Sizes/Keys Extracted: ${stats.sizesExtracted}`);
  console.log(`- Materials Extracted : ${stats.materialsExtracted}`);
  console.log(`- Products with Images: ${stats.withImages}`);

  // Generate idempotent SQL migration
  console.log('\nGenerating idempotent SQL migration...');
  const sqlLines = [];
  sqlLines.push('-- =================================================================');
  sqlLines.push('-- IDEMPOTENT SYNC MIGRATION: MERKEZ WAREHOUSE -> RAST MUSIC SHOP');
  sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
  sqlLines.push(`-- Total Active Products: ${syncRecords.length}`);
  sqlLines.push('-- =================================================================');
  sqlLines.push('BEGIN;\n');

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < syncRecords.length; i += BATCH_SIZE) {
    const chunk = syncRecords.slice(i, i + BATCH_SIZE);
    sqlLines.push(`-- Batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} products)`);
    sqlLines.push('INSERT INTO public.products (');
    sqlLines.push('  id, name, name_ru, name_en, price, old_price, brand,');
    sqlLines.push('  category_slug, subcategory_slug, image, images,');
    sqlLines.push('  specifications, specifications_ru, specifications_en,');
    sqlLines.push('  sku, barcode, stock_status, is_archived, condition, slug, created_at');
    sqlLines.push(') VALUES');

    const valueClauses = chunk.map(r => {
      const imagesSql = r.images.length > 0
        ? `'${JSON.stringify(r.images).replace(/'/g, "''")}'::jsonb`
        : `'[]'::jsonb`;

      return `  (${escapeSqlString(r.id)}, ${escapeSqlString(r.name)}, ${escapeSqlString(r.name_ru)}, ${escapeSqlString(r.name_en)}, ${r.price}, ${r.old_price === null ? 'NULL' : r.old_price}, ${escapeSqlString(r.brand)}, ${escapeSqlString(r.category_slug)}, ${escapeSqlString(r.subcategory_slug)}, ${escapeSqlString(r.image)}, ${imagesSql}, ${escapeSqlString(r.specifications)}, ${escapeSqlString(r.specifications_ru)}, ${escapeSqlString(r.specifications_en)}, ${escapeSqlString(r.sku)}, ${escapeSqlString(r.barcode)}, ${escapeSqlString(r.stock_status)}, ${r.is_archived}, ${escapeSqlString(r.condition)}, ${escapeSqlString(r.slug)}, ${escapeSqlString(r.created_at)})`;
    });

    sqlLines.push(valueClauses.join(',\n'));
    sqlLines.push('ON CONFLICT (id) DO UPDATE SET');
    sqlLines.push('  name = EXCLUDED.name,');
    sqlLines.push('  name_ru = EXCLUDED.name_ru,');
    sqlLines.push('  name_en = EXCLUDED.name_en,');
    sqlLines.push('  price = EXCLUDED.price,');
    sqlLines.push('  old_price = EXCLUDED.old_price,');
    sqlLines.push('  brand = EXCLUDED.brand,');
    sqlLines.push('  category_slug = EXCLUDED.category_slug,');
    sqlLines.push('  subcategory_slug = EXCLUDED.subcategory_slug,');
    sqlLines.push('  image = CASE WHEN EXCLUDED.image <> \'\' THEN EXCLUDED.image ELSE public.products.image END,');
    sqlLines.push('  images = CASE WHEN EXCLUDED.images <> \'[]\'::jsonb THEN EXCLUDED.images ELSE COALESCE(public.products.images, \'[]\'::jsonb) END,');
    sqlLines.push('  specifications = EXCLUDED.specifications,');
    sqlLines.push('  specifications_ru = EXCLUDED.specifications_ru,');
    sqlLines.push('  specifications_en = EXCLUDED.specifications_en,');
    sqlLines.push('  barcode = EXCLUDED.barcode,');
    sqlLines.push('  stock_status = EXCLUDED.stock_status,');
    sqlLines.push('  is_archived = false;\n');
  }

  sqlLines.push('COMMIT;');

  const migrationDir = path.resolve('supabase/migrations');
  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }

  const migrationFile = path.join(migrationDir, '20261102_sync_merkez_products.sql');
  fs.writeFileSync(migrationFile, sqlLines.join('\n'), 'utf8');
  console.log(`✓ Migration written to: ${migrationFile} (${(fs.statSync(migrationFile).size / 1024).toFixed(1)} KB)`);

  // Copy sync script to merkez-crm warehouse-sync folder
  const merkezSyncDir = 'C:\\Users\\Азад\\.gemini\\antigravity-ide\\scratch\\merkez-crm\\warehouse-sync';
  if (fs.existsSync(merkezSyncDir)) {
    const destPath = path.join(merkezSyncDir, 'sync-to-rastmusic.js');
    fs.copyFileSync(path.resolve('scripts/sync_merkez_warehouse.js'), destPath);
    console.log(`✓ Standalone sync script copied to Merkez CRM: ${destPath}`);
  }

  console.log('--- SYNC JOB COMPLETED SUCCESSFULLY ---');
  return syncRecords;
}

// Auto-run if executed directly
runProductSync().catch(err => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});

