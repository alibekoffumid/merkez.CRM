const fs = require('fs');
const path = require('path');

// Scan all t() calls in codebase
function scanKeys(dir) {
  const missing = new Set();
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const fp = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.includes('node_modules')) {
      scanKeys(fp).forEach(k => missing.add(k));
    } else if (/\.(jsx|tsx|js|ts)$/.test(e.name)) {
      const c = fs.readFileSync(fp, 'utf8');
      const m = c.matchAll(/t\(['`]([a-zA-Z][a-zA-Z0-9_.]+\.[a-zA-Z][a-zA-Z0-9_]+)['`]\)/g);
      for (const x of m) missing.add(x[1]);
    }
  });
  return missing;
}

// Auto-generate translation from key
function autoTranslate(key, lang) {
  // Convert camelCase to words
  const lastPart = key.split('.').pop();
  const words = lastPart.replace(/([A-Z])/g, ' $1').trim();
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  
  // Common translations map
  const dict = {
    // Common
    'common.name': ['Ad', 'Название', 'Name'],
    'common.description': ['Təsvir', 'Описание', 'Description'],
    'common.close': ['Bağla', 'Закрыть', 'Close'],
    'common.done': ['Hazır', 'Готово', 'Done'],
    'common.yes': ['Bəli', 'Да', 'Yes'],
    'common.no': ['Xeyr', 'Нет', 'No'],
    'common.next': ['Növbəti', 'Далее', 'Next'],
    'common.prev': ['Əvvəlki', 'Назад', 'Previous'],
    'common.total': ['Cəmi', 'Итого', 'Total'],
    'common.update': ['Yenilə', 'Обновить', 'Update'],
    'common.updated': ['Yeniləndi', 'Обновлено', 'Updated'],
    'common.added': ['Əlavə edildi', 'Добавлено', 'Added'],
    'common.archived': ['Arxivləndi', 'Архивировано', 'Archived'],
    'common.processing': ['Emal olunur...', 'Обработка...', 'Processing...'],
    'common.saving': ['Saxlanılır...', 'Сохранение...', 'Saving...'],
    'common.saveChanges': ['Dəyişiklikləri saxla', 'Сохранить изменения', 'Save Changes'],
    'common.confirmDelete': ['Silmək istədiyinizdən əminsiniz?', 'Вы уверены, что хотите удалить?', 'Are you sure you want to delete?'],
    'common.confirmArchive': ['Arxivləmək istəyirsiniz?', 'Архивировать?', 'Archive this item?'],
    'common.noResults': ['Nəticə tapılmadı', 'Ничего не найдено', 'No results found'],
    'common.clearFilters': ['Filtrləri təmizlə', 'Сбросить фильтры', 'Clear Filters'],
    'common.exportAll': ['Hamısını ixrac et', 'Экспортировать всё', 'Export All'],
    'common.loadMore': ['Daha çox yüklə', 'Загрузить ещё', 'Load More'],
    'common.optional': ['İstəyə bağlı', 'Необязательно', 'Optional'],
    'auth.sessionExpired': ['Sessiya bitib', 'Сессия истекла', 'Session expired'],

    // CRM
    'crm.client': ['Müştəri', 'Клиент', 'Client'],
    'crm.active': ['Aktiv', 'Активный', 'Active'],
    'crm.inactive': ['Qeyri-aktiv', 'Неактивный', 'Inactive'],
    'crm.lead': ['Potensial', 'Лид', 'Lead'],
    'crm.partner': ['Tərəfdaş', 'Партнёр', 'Partner'],
    'crm.company': ['Şirkət', 'Компания', 'Company'],
    'crm.companyName': ['Şirkət adı', 'Название компании', 'Company Name'],
    'crm.address': ['Ünvan', 'Адрес', 'Address'],
    'crm.phoneNumber': ['Telefon nömrəsi', 'Номер телефона', 'Phone Number'],
    'crm.emailAddress': ['E-poçt ünvanı', 'Email адрес', 'Email Address'],
    'crm.clientType': ['Müştəri növü', 'Тип клиента', 'Client Type'],
    'crm.allStatuses': ['Bütün statuslar', 'Все статусы', 'All Statuses'],
    'crm.contactInfo': ['Əlaqə məlumatları', 'Контактные данные', 'Contact Info'],
    'crm.newClientDetails': ['Yeni müştəri məlumatları', 'Данные нового клиента', 'New Client Details'],
    'crm.saveClient': ['Müştərini saxla', 'Сохранить клиента', 'Save Client'],

    // CallCenter
    'callCenter.title': ['Zəng Mərkəzi', 'Колл-центр', 'Call Center'],
    'callCenter.subtitle': ['Müştəri əlaqələri', 'Управление звонками', 'Customer Communications'],
    'callCenter.newTicket': ['Yeni müraciət', 'Новая заявка', 'New Ticket'],
    'callCenter.searchPlaceholder': ['Müştəri axtar...', 'Поиск клиента...', 'Search customer...'],
    'callCenter.newLeads': ['Yeni lidlər', 'Новые лиды', 'New Leads'],
    'callCenter.contacted': ['Əlaqə saxlanıldı', 'Связались', 'Contacted'],
    'callCenter.followUp': ['Təkrar əlaqə', 'Повторный контакт', 'Follow Up'],
    'callCenter.converted': ['Dönüşdürüldü', 'Сконвертирован', 'Converted'],
    'callCenter.startCall': ['Zəng et', 'Позвонить', 'Start Call'],
    'callCenter.send': ['Göndər', 'Отправить', 'Send'],
    'callCenter.dragTicket': ['Müraciəti sürükləyin', 'Перетащите заявку', 'Drag ticket'],
    'callCenter.pipelineStatus': ['Pipeline statusu', 'Статус пайплайна', 'Pipeline Status'],
    'callCenter.clientDetails': ['Müştəri məlumatları', 'Данные клиента', 'Client Details'],
    'callCenter.inquiryDetails': ['Müraciət detalları', 'Детали запроса', 'Inquiry Details'],
    'callCenter.customerType': ['Müştəri növü', 'Тип клиента', 'Customer Type'],
    'callCenter.regular': ['Adi', 'Обычный', 'Regular'],
    'callCenter.vip': ['VIP', 'VIP', 'VIP'],
    'callCenter.source': ['Mənbə', 'Источник', 'Source'],
    'callCenter.inboundWeb': ['Veb sorğu', 'Веб-запрос', 'Inbound Web'],
    'callCenter.generalService': ['Ümumi xidmət', 'Общая услуга', 'General Service'],
    'callCenter.requestQuote': ['Qiymət sorğusu', 'Запрос цены', 'Request Quote'],
    'callCenter.estimatedValue': ['Təxmini dəyər', 'Оценочная стоимость', 'Estimated Value'],
    'callCenter.industry': ['Sahə', 'Отрасль', 'Industry'],
    'callCenter.notePlaceholder': ['Qeyd yazın...', 'Введите заметку...', 'Write a note...'],
    'callCenter.setCallback': ['Geri zəng planla', 'Запланировать звонок', 'Set Callback'],
    'callCenter.chooseDateTime': ['Tarix seçin', 'Выберите дату', 'Choose Date & Time'],
    'callCenter.callReminder': ['Zəng xatırlatması', 'Напоминание о звонке', 'Call Reminder'],
    'callCenter.activityLog': ['Fəaliyyət jurnalı', 'Журнал действий', 'Activity Log'],
    'callCenter.noAddress': ['Ünvan yoxdur', 'Адрес не указан', 'No address'],
  };

  if (dict[key]) return dict[key][lang === 'az' ? 0 : lang === 'ru' ? 1 : 2];
  
  // For restaurant keys - return the capitalized English form as fallback
  if (lang === 'en') return capitalized;
  if (lang === 'az') return capitalized; // Will use English as placeholder
  if (lang === 'ru') return capitalized;
  return capitalized;
}

// Load existing keys
function flat(o, p = '') {
  let r = {};
  for (let k in o) {
    let np = p ? p + '.' + k : k;
    if (typeof o[k] === 'object' && o[k] !== null) Object.assign(r, flat(o[k], np));
    else r[np] = o[k];
  }
  return r;
}

function setNested(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  if (cur[parts[parts.length - 1]] === undefined) {
    cur[parts[parts.length - 1]] = value;
  }
}

const allCodeKeys = scanKeys('src');
const langs = ['az', 'ru', 'en'];
const files = langs.map(l => `src/locales/${l}.json`);

// Filter to only valid dotted keys (module.key format)
const validKeys = [...allCodeKeys].filter(k => /^[a-z]+\.[a-zA-Z]/.test(k));

files.forEach((file, idx) => {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const existing = flat(json);
  let added = 0;
  
  for (const key of validKeys) {
    if (!existing[key]) {
      const val = autoTranslate(key, langs[idx]);
      setNested(json, key, val);
      added++;
    }
  }
  
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`${file}: added ${added} keys`);
});

console.log('Done!');
