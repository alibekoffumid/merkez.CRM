const fs = require('fs');
const path = require('path');

// All missing keys with translations for AZ, RU, EN
const missing = {
  // ---- header ----
  "header.search": ["Axtar...", "Поиск...", "Search..."],
  "header.profile": ["Profil", "Профиль", "Profile"],
  "header.todaySales": ["Bugünkü satışlar", "Продажи сегодня", "Today's Sales"],
  "header.criticalStock": ["Kritik stok", "Критический остаток", "Critical Stock"],
  "header.allStockOk": ["Bütün stoklar normaldır", "Все запасы в норме", "All stock OK"],
  "header.digestTitle": ["Gündəlik xülasə", "Ежедневная сводка", "Daily Digest"],
  "header.inventoryStatus": ["İnventar statusu", "Статус инвентаря", "Inventory Status"],

  // ---- dashboard ----
  "dashboard.welcome": ["Xoş gəldiniz", "Добро пожаловать", "Welcome"],
  "dashboard.overview": ["Ümumi baxış", "Обзор", "Overview"],
  "dashboard.statistics": ["Statistika", "Статистика", "Statistics"],
  "dashboard.recentSales": ["Son satışlar", "Последние продажи", "Recent Sales"],
  "dashboard.noSales": ["Satış yoxdur", "Нет продаж", "No Sales"],
  "dashboard.tasksToday": ["Bugünkü tapşırıqlar", "Задачи на сегодня", "Today's Tasks"],
  "dashboard.taskMeeting": ["Görüş", "Встреча", "Meeting"],
  "dashboard.taskReport": ["Hesabat", "Отчёт", "Report"],
  "dashboard.expandBusiness": ["Biznesinizi genişləndirin", "Расширьте ваш бизнес", "Expand Your Business"],
  "dashboard.expandDesc": ["Yeni modullar əlavə edin", "Добавьте новые модули", "Add new modules"],
  "dashboard.crmClients": ["CRM Müştərilər", "CRM Клиенты", "CRM Clients"],

  // ---- crm ----
  "crm.title": ["CRM", "CRM", "CRM"],
  "crm.subtitle": ["Müştəri münasibətlərinin idarə edilməsi", "Управление взаимоотношениями с клиентами", "Customer Relationship Management"],
  "crm.searchClients": ["Müştəri axtar...", "Поиск клиентов...", "Search clients..."],
  "crm.addClient": ["Müştəri əlavə et", "Добавить клиента", "Add Client"],
  "crm.allClients": ["Bütün müştərilər", "Все клиенты", "All Clients"],
  "crm.type": ["Növ", "Тип", "Type"],
  "crm.showing": ["Göstərilir", "Показано", "Showing"],
  "crm.noClients": ["Müştəri tapılmadı", "Клиенты не найдены", "No clients found"],
  "crm.addFirstClient": ["İlk müştərinizi əlavə edin", "Добавьте вашего первого клиента", "Add your first client"],

  // ---- finance ----
  "finance.subtitle": ["Maliyyə idarəetməsi", "Управление финансами", "Financial Management"],
  "finance.totalBalance": ["Ümumi balans", "Общий баланс", "Total Balance"],
  "finance.monthlyIncome": ["Aylıq gəlir", "Ежемесячный доход", "Monthly Income"],
  "finance.monthlyExpenses": ["Aylıq xərclər", "Ежемесячные расходы", "Monthly Expenses"],
  "finance.vsLastMonth": ["Keçən aya nisbətən", "По сравнению с прошлым месяцем", "vs Last Month"],
  "finance.addTransaction": ["Əməliyyat əlavə et", "Добавить операцию", "Add Transaction"],
  "finance.recentTransactions": ["Son əməliyyatlar", "Последние операции", "Recent Transactions"],
  "finance.viewAll": ["Hamısına bax", "Смотреть все", "View All"],
  "finance.expenses": ["Xərclər", "Расходы", "Expenses"],
  "finance.exportReport": ["Hesabatı ixrac et", "Экспорт отчёта", "Export Report"],
  "finance.rent": ["İcarə", "Аренда", "Rent"],
  "finance.utilities": ["Kommunal xərclər", "Коммунальные", "Utilities"],
  "finance.supplies": ["Təchizat", "Снабжение", "Supplies"],
  "finance.marketing": ["Marketinq", "Маркетинг", "Marketing"],
  "finance.other": ["Digər", "Другое", "Other"],
  "finance.thId": ["№", "№", "ID"],
  "finance.thDesc": ["Təsvir", "Описание", "Description"],
  "finance.thDate": ["Tarix", "Дата", "Date"],

  // ---- education ----
  "education.tabJournal": ["Jurnal", "Журнал", "Journal"],
  "education.tabTeachers": ["Müəllimlər", "Учителя", "Teachers"],
  "education.tabRooms": ["Otaqlar", "Комнаты", "Rooms"],
  "education.academicJournal": ["Akademik Jurnal", "Академический журнал", "Academic Journal"],
  "education.savedSuccessfully": ["Uğurla yadda saxlanıldı", "Успешно сохранено", "Saved successfully"],

  // ---- fleet ----
  "fleet.dashboardTitle": ["Nəqliyyat Parkı", "Автопарк", "Fleet"],
  "fleet.dashboardSubtitle": ["Nəqliyyat parkının idarə edilməsi", "Управление автопарком", "Fleet Management"],
  "fleet.totalVehicles": ["Cəmi nəqliyyat", "Всего транспорта", "Total Vehicles"],
  "fleet.activeShifts": ["Aktiv növbələr", "Активные смены", "Active Shifts"],
  "fleet.totalRentToday": ["Bugünkü icarə", "Аренда за сегодня", "Today's Rent"],
  "fleet.actualRevenue": ["Faktiki gəlir", "Фактический доход", "Actual Revenue"],
  "fleet.fleetList": ["Nəqliyyat siyahısı", "Список транспорта", "Fleet List"],
  "fleet.addVehicle": ["Nəqliyyat əlavə et", "Добавить транспорт", "Add Vehicle"],
  "fleet.newVehicle": ["Yeni nəqliyyat", "Новый транспорт", "New Vehicle"],
  "fleet.editVehicle": ["Redaktə et", "Редактировать", "Edit Vehicle"],
  "fleet.saveVehicle": ["Yadda saxla", "Сохранить", "Save Vehicle"],
  "fleet.plateNumber": ["Dövlət nömrəsi", "Гос. номер", "Plate Number"],
  "fleet.brandModel": ["Marka/Model", "Марка/Модель", "Brand/Model"],
  "fleet.year": ["İl", "Год", "Year"],
  "fleet.vinCode": ["VIN kod", "VIN код", "VIN Code"],
  "fleet.insurance": ["Sığorta", "Страховка", "Insurance"],
  "fleet.insuranceExpiry": ["Sığorta bitmə tarixi", "Окончание страховки", "Insurance Expiry"],
  "fleet.mileage": ["Yürüş", "Пробег", "Mileage"],
  "fleet.status": ["Status", "Статус", "Status"],
  "fleet.statusActive": ["Aktiv", "Активный", "Active"],
  "fleet.statusAvailable": ["Boş", "Свободен", "Available"],
  "fleet.statusRepair": ["Təmirdə", "На ремонте", "In Repair"],
  "fleet.driver": ["Sürücü", "Водитель", "Driver"],
  "fleet.drivers": ["Sürücülər", "Водители", "Drivers"],
  "fleet.driversList": ["Sürücülər siyahısı", "Список водителей", "Drivers List"],
  "fleet.driversSubtitle": ["Sürücüləri idarə edin", "Управляйте водителями", "Manage Drivers"],
  "fleet.addDriver": ["Sürücü əlavə et", "Добавить водителя", "Add Driver"],
  "fleet.saveDriver": ["Yadda saxla", "Сохранить", "Save Driver"],
  "fleet.fullName": ["Ad Soyad", "ФИО", "Full Name"],
  "fleet.licenseNumber": ["Vəsiqə nömrəsi", "Номер удостоверения", "License Number"],
  "fleet.whatsapp": ["WhatsApp", "WhatsApp", "WhatsApp"],
  "fleet.initialBalance": ["İlkin balans", "Начальный баланс", "Initial Balance"],
  "fleet.balance": ["Balans", "Баланс", "Balance"],
  "fleet.selectDriver": ["Sürücü seçin", "Выберите водителя", "Select Driver"],
  "fleet.logShift": ["Növbə qeyd et", "Записать смену", "Log Shift"],
  "fleet.dailyPlan": ["Gündəlik plan", "Дневной план", "Daily Plan"],
  "fleet.endMileage": ["Son yürüş", "Конечный пробег", "End Mileage"],
  "fleet.netProfit": ["Xalis mənfəət", "Чистая прибыль", "Net Profit"],
  "fleet.calculateAndSave": ["Hesabla və saxla", "Рассчитать и сохранить", "Calculate & Save"],
  "fleet.saveChanges": ["Dəyişiklikləri saxla", "Сохранить изменения", "Save Changes"],
  "fleet.fleetMember": ["Park üzvü", "Участник парка", "Fleet Member"],
  "fleet.action": ["Əməliyyat", "Действие", "Action"],
  "fleet.liveMonitor": ["Canlı izləmə", "Мониторинг", "Live Monitor"],
  "fleet.map": ["Xəritə", "Карта", "Map"],
  "fleet.satellite": ["Peyk", "Спутник", "Satellite"],
  "fleet.streets": ["Küçələr", "Улицы", "Streets"],
  "fleet.onLine": ["Onlayn", "Онлайн", "Online"],

  // ---- integrations ----
  "integrations.title": ["İnteqrasiyalar", "Интеграции", "Integrations"],
  "integrations.emptyTitle": ["Hələ inteqrasiya yoxdur", "Интеграций пока нет", "No Integrations Yet"],
  "integrations.emptyDescription": ["Kanallara qoşulun", "Подключите каналы", "Connect channels"],
  "integrations.searchPlaceholder": ["Söhbət axtar...", "Поиск чатов...", "Search chats..."],
  "integrations.messagePlaceholder": ["Mesaj yazın...", "Введите сообщение...", "Type a message..."],
  "integrations.online": ["Onlayn", "Онлайн", "Online"],

  // ---- kitchen ----
  "kitchen.kdsTitle": ["Mətbəx Ekranı", "Экран кухни", "Kitchen Display"],
  "kitchen.barTitle": ["Bar Ekranı", "Экран бара", "Bar Display"],
  "kitchen.subtitle": ["Sifarişləri idarə edin", "Управляйте заказами", "Manage orders"],
  "kitchen.columnNew": ["Yeni", "Новые", "New"],
  "kitchen.columnPreparing": ["Hazırlanır", "Готовятся", "Preparing"],
  "kitchen.columnReady": ["Hazırdır", "Готово", "Ready"],
  "kitchen.startPreparing": ["Hazırlamağa başla", "Начать готовить", "Start Preparing"],
  "kitchen.markAsDone": ["Hazırdır", "Готово", "Done"],
  "kitchen.markAsReady": ["Hazırdır", "Готово", "Ready"],
  "kitchen.ticketId": ["Sifariş №", "Заказ №", "Ticket #"],
  "kitchen.stationBar": ["Bar", "Бар", "Bar"],
  "kitchen.stationKitchen": ["Mətbəx", "Кухня", "Kitchen"],

  // ---- warehouse extras ----
  "warehouse.addNewIngredient": ["Yeni inqrediyent", "Новый ингредиент", "New Ingredient"],
  "warehouse.ingredientNamePlaceholder": ["İnqrediyent adı", "Название ингредиента", "Ingredient name"],
  "warehouse.minStockAlert": ["Min. stok xəbərdarlığı", "Мин. остаток", "Min Stock Alert"],
  "warehouse.editCategory": ["Kateqoriyanı redaktə et", "Редактировать категорию", "Edit Category"],
  "warehouse.categoryDeleted": ["Kateqoriya silindi", "Категория удалена", "Category deleted"],
  "warehouse.categoryUpdated": ["Kateqoriya yeniləndi", "Категория обновлена", "Category updated"],
  "warehouse.confirmDeleteCategory": ["Bu kateqoriyanı silmək istəyirsiniz?", "Удалить эту категорию?", "Delete this category?"],
  "warehouse.confirmDeleteProduct": ["Bu məhsulu silmək istəyirsiniz?", "Удалить этот товар?", "Delete this product?"],
  "warehouse.editIngredient": ["İnqrediyenti redaktə et", "Редактировать ингредиент", "Edit Ingredient"],
  "warehouse.deleteIngredient": ["İnqrediyenti sil", "Удалить ингредиент", "Delete Ingredient"],
  "warehouse.editSupplier": ["Tədarükçünü redaktə et", "Редактировать поставщика", "Edit Supplier"],
  "warehouse.supplierName": ["Tədarükçü adı", "Название поставщика", "Supplier Name"],
  "warehouse.supplierNamePlaceholder": ["Tədarükçü adını daxil edin", "Введите название поставщика", "Enter supplier name"],
  "warehouse.supplierPhone": ["Telefon", "Телефон", "Phone"],
  "warehouse.supplierEmail": ["E-poçt", "E-mail", "Email"],
  "warehouse.supplierAddress": ["Ünvan", "Адрес", "Address"],
  "warehouse.supplierAddressPlaceholder": ["Ünvanı daxil edin", "Введите адрес", "Enter address"],
  "warehouse.supplierDetailsDesc": ["Tədarükçü məlumatları", "Данные поставщика", "Supplier Details"],
  "warehouse.contactPerson": ["Əlaqə şəxsi", "Контактное лицо", "Contact Person"],
  "warehouse.contactPersonPlaceholder": ["Əlaqə şəxsinin adı", "Имя контактного лица", "Contact person name"],
  "warehouse.noContactPerson": ["Əlaqə şəxsi yoxdur", "Нет контактного лица", "No contact person"],
  "warehouse.noSuppliersFound": ["Tədarükçü tapılmadı", "Поставщики не найдены", "No suppliers found"],
  "warehouse.searchSuppliers": ["Tədarükçü axtar...", "Поиск поставщиков...", "Search suppliers..."],
  "warehouse.productUpdated": ["Məhsul yeniləndi", "Товар обновлён", "Product updated"],
  "warehouse.stockReceivedSuccess": ["Qəbul uğurla tamamlandı", "Приёмка завершена", "Stock received"],
  "warehouse.addedDate": ["Əlavə tarixi", "Дата добавления", "Added Date"],
  "warehouse.viewHistory": ["Tarixçəyə bax", "Смотреть историю", "View History"],
  "warehouse.noDeletePermission": ["Silmə icazəsi yoxdur", "Нет разрешения на удаление", "No delete permission"],
  "warehouse.noEditPermission": ["Redaktə icazəsi yoxdur", "Нет разрешения на редактирование", "No edit permission"],
  "warehouse.noProductEditPermission": ["Məhsul redaktə icazəsi yoxdur", "Нет разрешения на редактирование товара", "No product edit permission"],

  // ---- retail extras ----
  "retail.composition": ["Tərkib", "Состав", "Composition"],
  "retail.exciseRequired": ["Aksiz tələb olunur", "Требуется акциз", "Excise Required"],
  "retail.filters": ["Filtrlər", "Фильтры", "Filters"],
  "retail.inventory": ["İnventar", "Инвентарь", "Inventory"],
  "retail.inventory.tableBarcode": ["Barkod", "Штрихкод", "Barcode"],
  "retail.inventory.editProduct": ["Redaktə et", "Редактировать", "Edit"],
  "retail.inventory.empty": ["İnventar boşdur", "Инвентарь пуст", "Inventory is empty"],
  "retail.inventory.expired": ["Vaxtı keçib", "Просрочен", "Expired"],
  "retail.inventory.expiryDate": ["Bitmə tarixi", "Срок годности", "Expiry Date"],
  "retail.inventory.discountType": ["Endirim növü", "Тип скидки", "Discount Type"],
  "retail.inventory.discountValue": ["Endirim dəyəri", "Размер скидки", "Discount Value"],
  "retail.inventory.fixedAmount": ["Sabit məbləğ", "Фикс. сумма", "Fixed Amount"],
  "retail.inventory.noDiscount": ["Endirim yoxdur", "Без скидки", "No Discount"],
  "retail.inventory.percentage": ["Faiz", "Процент", "Percentage"],
  "retail.history.downloadPdf": ["PDF yüklə", "Скачать PDF", "Download PDF"],
  "retail.history.viewDetails": ["Ətraflı bax", "Подробнее", "View Details"],
  "retail.historyError": ["Tarixçə xətası", "Ошибка истории", "History Error"],
  "retail.productAdded": ["Məhsul əlavə edildi", "Товар добавлен", "Product Added"],
  "retail.productNotFound": ["Məhsul tapılmadı", "Товар не найден", "Product Not Found"],
  "retail.itemDeleted": ["Məhsul silindi", "Товар удалён", "Item Deleted"],
  "retail.stockUpdated": ["Stok yeniləndi", "Остаток обновлён", "Stock Updated"],
  "retail.syncSuccess": ["Sinxronizasiya uğurludur", "Синхронизация успешна", "Sync Successful"],
  "retail.saleDetails": ["Satış detalları", "Детали продажи", "Sale Details"],
  "retail.printReceipt": ["Çap et", "Печать", "Print Receipt"],
  "retail.scanConfirmed": ["Skan təsdiqləndi", "Скан подтверждён", "Scan Confirmed"],
  "retail.sendingToPos": ["POS-a göndərilir...", "Отправка на POS...", "Sending to POS..."],
  "retail.sent": ["Göndərildi", "Отправлено", "Sent"],

  // ---- profile ----
  "profile.email": ["E-poçt", "E-mail", "Email"],

  // ---- status ----
  "status.pending": ["Gözləmədə", "В ожидании", "Pending"],
  "status.ready": ["Hazır", "Готов", "Ready"],
  "status.completed": ["Tamamlandı", "Завершён", "Completed"],
  "status.served": ["Verildi", "Подано", "Served"],
};

// Helper to set nested key
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

const files = ['src/locales/az.json', 'src/locales/ru.json', 'src/locales/en.json'];

files.forEach((file, idx) => {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  for (const [key, vals] of Object.entries(missing)) {
    const parts = key.split('.');
    let exists = json;
    let found = true;
    for (const p of parts) {
      if (exists && typeof exists === 'object' && p in exists) {
        exists = exists[p];
      } else {
        found = false;
        break;
      }
    }
    if (!found) {
      setNested(json, key, vals[idx]);
      added++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`${file}: added ${added} keys`);
});

console.log('Done!');
