import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Settings2, DollarSign, Scale, BellRing } from 'lucide-react';
import Dropdown from '../../components/Common/Dropdown';
import { toast } from 'react-hot-toast';

const WarehouseSettings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    currency: 'AZN',
    defaultUnit: 'pcs',
    availableUnits: ['pcs', 'kg', 'liter', 'g', 'ml', 'pack', 'bottle'],
    lowStockThreshold: '10'
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

      <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
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
