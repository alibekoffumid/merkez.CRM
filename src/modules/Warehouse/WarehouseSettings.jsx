import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Settings2, DollarSign, Scale, BellRing, Barcode } from 'lucide-react';
import Dropdown from '../../components/Common/Dropdown';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import { useUser } from '../../core/UserContext';

const WarehouseSettings = () => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState({
    currency: 'AZN',
    defaultUnit: 'pcs',
    availableUnits: ['pcs', 'kg', 'liter', 'g', 'ml', 'pack', 'bottle', 'm', 'm2'],
    lowStockThreshold: '10',
    autoGenerateBarcode: false,
    barcodePrefix: 'MRKZ-'
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('merkez_warehouse_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse warehouse settings');
      }
    }
  }, []);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('merkez_warehouse_settings', JSON.stringify(settings));
      setLoading(false);
      toast.success(t('common.saved') || 'Настройки сохранены');
    }, 400);
  };

  const exportBarcodes = async () => {
    if (!profile) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, barcode, price')
        .eq('user_id', profile.id)
        .eq('archived', false)
        .not('barcode', 'is', null)
        .neq('barcode', '');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error(t('common.noData') || 'Нет данных для экспорта');
        setExporting(false);
        return;
      }

      // Convert to CSV
      const csv = Papa.unparse(data.map(p => ({
        'Товар / Product': p.name,
        'Штрихкод / Barcode': p.barcode,
        'Цена / Price': p.price
      })));

      // Trigger download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `barcodes_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('common.success') || 'Экспорт завершен');
    } catch (err) {
      console.error(err);
      toast.error(t('common.error') || 'Ошибка экспорта');
    } finally {
      setExporting(false);
    }
  };

  const currencies = [
    { value: 'AZN', label: 'AZN (₼)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'RUB', label: 'RUB (₽)' }
  ];

  const units = [
    { value: 'pcs', label: t('restaurant.pcs') || 'Штуки (шт)' },
    { value: 'kg', label: t('restaurant.kg') || 'Килограммы (кг)' },
    { value: 'g', label: t('restaurant.g') || 'Граммы (г)' },
    { value: 'liter', label: t('restaurant.liter') || 'Литры (л)' },
    { value: 'ml', label: t('restaurant.ml') || 'Миллилитры (мл)' },
    { value: 'm', label: t('restaurant.m') || 'Метры (м)' },
    { value: 'm2', label: t('restaurant.m2') || 'Кв. метры (м²)' },
    { value: 'pack', label: t('restaurant.pack') || 'Упаковка (уп)' },
    { value: 'bottle', label: t('restaurant.bottle') || 'Бутылка (бут)' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl w-full flex-1">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('common.settings') || 'Настройки'}</h2>
          <p className="text-sm text-gray-500">{t('warehouse.settingsDesc') || 'Настройка параметров складского учета'}</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Currency Setting */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              {t('warehouse.currency') || 'Валюта'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{t('warehouse.currencyDesc') || 'Базовая валюта для расчета стоимости запасов и себестоимости.'}</p>
          </div>
          <div className="md:col-span-2">
            <Dropdown 
              value={settings.currency}
              onChange={(val) => setSettings({ ...settings, currency: val })}
              options={currencies}
            />
          </div>
        </div>

        <div className="border-t border-gray-50" />

        {/* Available Units Setting */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-gray-400" />
              {t('warehouse.availableUnits') || 'Доступные единицы измерения'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{t('warehouse.availableUnitsDesc') || 'Отметьте те единицы, которые вы используете (они появятся в выпадающем списке при добавлении товара).'}</p>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {units.map(unit => {
              const isSelected = settings.availableUnits?.includes(unit.value);
              return (
                <button
                  key={unit.value}
                  onClick={() => {
                    const newUnits = isSelected 
                      ? settings.availableUnits.filter(u => u !== unit.value)
                      : [...(settings.availableUnits || []), unit.value];
                    setSettings({ ...settings, availableUnits: newUnits });
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isSelected ? 'bg-merkez-blue text-white border-merkez-blue shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-merkez-blue hover:text-merkez-blue'}`}
                >
                  {unit.label}
                </button>
              );
            })}
          </div>
          <div className="border-t border-gray-50" />

        {/* Auto-generate Barcodes Setting */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-gray-400" />
              {t('warehouse.autoGenerateBarcode') || 'Автогенерация штрихкодов'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{t('warehouse.autoGenerateBarcodeDesc') || 'Система сама придумает штрихкод при добавлении товара, если поле пустое.'}</p>
          </div>
          <div className="md:col-span-2 space-y-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={settings.autoGenerateBarcode}
                  onChange={(e) => setSettings({ ...settings, autoGenerateBarcode: e.target.checked })}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${settings.autoGenerateBarcode ? 'bg-merkez-blue' : 'bg-gray-200'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.autoGenerateBarcode ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div className="ml-3 text-sm font-bold text-gray-700">
                {settings.autoGenerateBarcode ? t('common.yes') || 'Да' : t('common.no') || 'Нет'}
              </div>
            </label>

            {settings.autoGenerateBarcode && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  {t('warehouse.barcodePrefix') || 'Префикс штрихкода'}
                </label>
                <input 
                  type="text" 
                  value={settings.barcodePrefix}
                  onChange={(e) => setSettings({ ...settings, barcodePrefix: e.target.value })}
                  placeholder="MRKZ-"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none transition-colors font-bold" 
                />
                <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
                  {t('warehouse.barcodePrefixDesc') || 'Текст перед номером (например, MRKZ-). Оставьте пустым, если не нужен.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-50" />

        {/* Default Unit Setting */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-gray-400" />
              {t('warehouse.defaultUnit') || 'Ед. измерения по умолчанию'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{t('warehouse.defaultUnitDesc') || 'Будет автоматически подставляться при добавлении новых товаров и ингредиентов.'}</p>
          </div>
          <div className="md:col-span-2">
            <Dropdown 
              value={settings.defaultUnit}
              onChange={(val) => setSettings({ ...settings, defaultUnit: val })}
              options={units.filter(u => settings.availableUnits?.includes(u.value))}
            />
          </div>
        </div>

        <div className="border-t border-gray-50" />

        {/* Low Stock Alert Threshold */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-gray-400" />
              {t('warehouse.lowStockThreshold') || 'Критический остаток по умолчанию'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{t('warehouse.lowStockThresholdDesc') || 'Значение, ниже которого товар будет отмечаться желтым или красным цветом.'}</p>
          </div>
          <div className="md:col-span-2">
            <input 
              type="number" 
              value={settings.lowStockThreshold}
              onChange={(e) => setSettings({ ...settings, lowStockThreshold: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none transition-colors font-bold" 
            />
          </div>
        </div>

      </div>

      <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <button 
          onClick={exportBarcodes}
          disabled={exporting}
          className="bg-gray-50 border border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:bg-white hover:border-merkez-blue hover:text-merkez-blue transition-colors flex items-center gap-2"
        >
          {exporting ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          ) : (
            <Barcode className="w-4 h-4" />
          )}
          {t('warehouse.exportBarcodes') || 'Выгрузить список штрихкодов (CSV)'}
        </button>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-merkez-blue text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t('common.saveSettings') || 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
};

export default WarehouseSettings;
