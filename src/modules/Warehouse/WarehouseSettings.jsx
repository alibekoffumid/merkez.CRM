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
  const [exporting, setExporting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    currency: 'AZN',
    defaultUnit: 'pcs',
    availableUnits: ['pcs', 'kg', 'liter', 'g', 'ml', 'pack', 'bottle', 'm', 'm2'],
    lowStockThreshold: '10',
    autoGenerateBarcode: false,
    barcodePrefix: 'MRKZ-'
  });
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: '' });
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);

  useEffect(() => {
    const savedSettings = localStorage.getItem('merkez_warehouse_settings');
    if (savedSettings) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      } catch (e) {
        console.error('Failed to parse warehouse settings');
      }
    }
    setLoaded(true);
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    if (!profile?.id) return;
    setLoadingWarehouses(true);
    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true });
    if (data) setWarehouses(data);
    setLoadingWarehouses(false);
  };

  const addWarehouse = async () => {
    if (!newWarehouse.name || !profile?.id) return;
    const { data, error } = await supabase
      .from('warehouses')
      .insert({ 
        name: newWarehouse.name, 
        address: newWarehouse.address,
        user_id: profile.id,
        is_default: warehouses.length === 0
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setWarehouses([...warehouses, data]);
      setNewWarehouse({ name: '', address: '' });
      setShowAddWarehouse(false);
      toast.success(t('common.success'));
    }
  };

  const deleteWarehouse = async (id) => {
    if (warehouses.length <= 1) {
      toast.error(t('warehouse.cannotDeleteOnlyWarehouse') || 'Нельзя удалить единственный склад');
      return;
    }
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      setWarehouses(warehouses.filter(w => w.id !== id));
      toast.success(t('common.success'));
    }
  };

  const setAsDefault = async (id) => {
    // 1. Reset all
    await supabase.from('warehouses').update({ is_default: false }).eq('user_id', profile.id);
    // 2. Set new default
    await supabase.from('warehouses').update({ is_default: true }).eq('id', id);
    fetchWarehouses();
    toast.success(t('common.success'));
  };

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('merkez_warehouse_settings', JSON.stringify(settings));
    }
  }, [settings, loaded]);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full flex-1 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <Settings2 className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('common.settings') || 'Настройки'}</h2>
            <p className="text-sm text-gray-500 font-medium">{t('warehouse.settingsDesc') || 'Настройка параметров складского учета'}</p>
          </div>
        </div>

        <button 
          onClick={exportBarcodes}
          disabled={exporting}
          className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:border-merkez-blue hover:text-merkez-blue transition-all flex items-center gap-2 shadow-sm"
        >
          {exporting ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-merkez-blue rounded-full animate-spin" />
          ) : (
            <Barcode className="w-4 h-4" />
          )}
          {t('warehouse.exportBarcodes') || 'Выгрузить штрихкоды (CSV)'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Core Settings */}
        <div className="space-y-10">
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('warehouse.coreSettings') || 'Основные параметры'}</h3>
            
            {/* Currency */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <DollarSign className="w-4 h-4 text-merkez-blue" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">{t('warehouse.currency') || 'Валюта'}</h4>
              </div>
              <Dropdown 
                value={settings.currency}
                onChange={(val) => setSettings({ ...settings, currency: val })}
                options={currencies}
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">{t('warehouse.currencyDesc') || 'Базовая валюта для расчета стоимости запасов и себестоимости.'}</p>
            </div>

            {/* Default Unit */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <Scale className="w-4 h-4 text-merkez-blue" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">{t('warehouse.defaultUnit') || 'Ед. измерения по умолчанию'}</h4>
              </div>
              <Dropdown 
                value={settings.defaultUnit}
                onChange={(val) => setSettings({ ...settings, defaultUnit: val })}
                options={units.filter(u => settings.availableUnits?.includes(u.value))}
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">{t('warehouse.defaultUnitDesc') || 'Автоматически подставляется при добавлении новых товаров.'}</p>
            </div>

            {/* Critical Stock */}
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <BellRing className="w-4 h-4 text-merkez-blue" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">{t('warehouse.lowStockThreshold') || 'Критический остаток'}</h4>
              </div>
              <input 
                type="number" 
                value={settings.lowStockThreshold}
                onChange={(e) => setSettings({ ...settings, lowStockThreshold: e.target.value })}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none transition-colors font-bold shadow-sm" 
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">{t('warehouse.lowStockThresholdDesc') || 'Порог уведомления о низком запасе товара.'}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Advanced & Units */}
        <div className="space-y-10">
          {/* Units Selection */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('warehouse.unitSettings') || 'Единицы измерения'}</h3>
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
              <p className="text-xs text-gray-500 font-medium">{t('warehouse.availableUnitsDesc') || 'Отметьте те единицы, которые вы используете:'}</p>
              <div className="flex flex-wrap gap-2">
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
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-merkez-blue text-white border-merkez-blue shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-merkez-blue hover:text-merkez-blue shadow-sm'}`}
                    >
                      {unit.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Barcode Automation */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('warehouse.automation') || 'Автоматизация'}</h3>
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Barcode className="w-4 h-4 text-merkez-blue" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">{t('warehouse.autoGenerateBarcode') || 'Автоштрихкоды'}</h4>
                </div>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={settings.autoGenerateBarcode}
                      onChange={(e) => setSettings({ ...settings, autoGenerateBarcode: e.target.checked })}
                    />
                    <div className={`block w-12 h-7 rounded-full transition-colors ${settings.autoGenerateBarcode ? 'bg-merkez-blue' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${settings.autoGenerateBarcode ? 'transform translate-x-5' : ''}`}></div>
                  </div>
                </label>
              </div>

              {settings.autoGenerateBarcode && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    {t('warehouse.barcodePrefix') || 'Префикс'}
                  </label>
                  <input 
                    type="text" 
                    value={settings.barcodePrefix}
                    onChange={(e) => setSettings({ ...settings, barcodePrefix: e.target.value })}
                    placeholder="MRKZ-"
                    className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none transition-colors font-bold shadow-sm" 
                  />
                </div>
              )}
              <p className="text-[11px] text-gray-500 leading-relaxed">{t('warehouse.autoGenerateBarcodeDesc') || 'Система сама придумает штрихкод при добавлении товара.'}</p>
            </div>
          </div>
          {/* Warehouse Management */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t('warehouse.management') || 'Управление складами'}</h3>
            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
              <div className="space-y-3">
                {warehouses.map(w => (
                  <div key={w.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm group">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-gray-900">{w.name}</h5>
                        {w.is_default && (
                          <span className="bg-blue-50 text-merkez-blue text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                            {t('common.default') || 'По умолчанию'}
                          </span>
                        )}
                      </div>
                      {w.address && <p className="text-[11px] text-gray-400 mt-0.5">{w.address}</p>}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!w.is_default && (
                        <button 
                          onClick={() => setAsDefault(w.id)}
                          className="text-[10px] font-bold text-gray-400 hover:text-merkez-blue uppercase tracking-widest px-2 py-1"
                        >
                          {t('common.makeDefault') || 'Сделать основным'}
                        </button>
                      )}
                      <button 
                        onClick={() => deleteWarehouse(w.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddWarehouse ? (
                <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder={t('warehouse.warehouseName') || 'Название склада'}
                      className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold outline-none focus:ring-1 focus:ring-merkez-blue"
                      value={newWarehouse.name}
                      onChange={e => setNewWarehouse({...newWarehouse, name: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder={t('common.address') || 'Адрес (необязательно)'}
                      className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium outline-none focus:ring-1 focus:ring-merkez-blue"
                      value={newWarehouse.address}
                      onChange={e => setNewWarehouse({...newWarehouse, address: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowAddWarehouse(false)}
                      className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      onClick={addWarehouse}
                      className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                    >
                      {t('common.add')}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowAddWarehouse(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:border-merkez-blue hover:text-merkez-blue hover:bg-blue-50/50 transition-all"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  {t('warehouse.addNewWarehouse') || 'Добавить склад'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseSettings;
