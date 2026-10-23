import React, { useRef } from 'react';
import { Plus, Trash2, Sliders, Sparkles, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SUGGESTIONS = {
  az: ['Ölçü', 'Rəng', 'Material', 'Çəki', 'Model', 'Brend'],
  ru: ['Размер', 'Цвет', 'Материал', 'Вес', 'Модель', 'Бренд'],
  en: ['Size', 'Color', 'Material', 'Weight', 'Model', 'Brand']
};

const ProductCharacteristicsEditor = ({ attributes = [], onChange }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n?.language?.startsWith('ru') ? 'ru' : i18n?.language?.startsWith('en') ? 'en' : 'az';
  const quickSuggestions = SUGGESTIONS[currentLang] || SUGGESTIONS.az;
  const lastInputRef = useRef(null);

  const handleAdd = (initialName = '') => {
    const newId = `attr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const updated = [...attributes, { id: newId, name: initialName, value: '' }];
    onChange(updated);
    setTimeout(() => {
      if (lastInputRef.current) {
        lastInputRef.current.focus();
      }
    }, 50);
  };

  const handleUpdate = (id, field, val) => {
    const updated = attributes.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    onChange(updated);
  };

  const handleRemove = (id) => {
    const updated = attributes.filter(item => item.id !== id);
    onChange(updated);
  };

  const handleQuickAdd = (suggestionName) => {
    // If there is already an empty row without a name, use that row
    const emptyIdx = attributes.findIndex(a => !a.name && !a.value);
    if (emptyIdx !== -1) {
      const updated = [...attributes];
      updated[emptyIdx] = { ...updated[emptyIdx], name: suggestionName };
      onChange(updated);
    } else {
      handleAdd(suggestionName);
    }
  };

  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100/80 flex items-center justify-center text-merkez-blue">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                {t('warehouse.characteristics') || (currentLang === 'az' ? 'Xüsusiyyətlər (Xarakteristika)' : currentLang === 'ru' ? 'Характеристики товара' : 'Characteristics')}
              </span>
              {attributes.length > 0 && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {attributes.length}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleAdd('')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-merkez-blue hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all group"
        >
          <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
          <span>{t('warehouse.addCharacteristic') || (currentLang === 'az' ? 'Xüsusiyyət əlavə et' : currentLang === 'ru' ? 'Добавить характеристику' : 'Add characteristic')}</span>
        </button>
      </div>

      {/* Quick Suggestions Chips */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3 text-[11px]">
        <span className="text-gray-400 font-medium flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          {currentLang === 'az' ? 'Tövsiyə:' : currentLang === 'ru' ? 'Быстрый выбор:' : 'Suggestions:'}
        </span>
        {quickSuggestions.map(s => {
          const isAlreadyUsed = attributes.some(a => a.name?.trim().toLowerCase() === s.toLowerCase());
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleQuickAdd(s)}
              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                isAlreadyUsed 
                  ? 'bg-blue-50/70 border-blue-200 text-merkez-blue font-semibold' 
                  : 'bg-white border-gray-200/90 text-gray-600 hover:border-merkez-blue hover:text-merkez-blue hover:bg-blue-50/30'
              }`}
            >
              + {s}
            </button>
          );
        })}
      </div>

      {/* Attributes List */}
      {attributes.length === 0 ? (
        <div 
          onClick={() => handleAdd('')}
          className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-merkez-blue/60 bg-white/70 hover:bg-blue-50/20 rounded-xl p-4 text-center transition-all group"
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100/60 flex items-center justify-center transition-colors">
              <Tag className="w-4 h-4 text-gray-400 group-hover:text-merkez-blue transition-colors" />
            </div>
            <p className="text-xs text-gray-500 group-hover:text-gray-700 font-medium">
              {t('warehouse.noCharacteristics') || (currentLang === 'az' 
                ? 'Məhsulun ölçüsü, rəngi, modeli və ya digər xüsusiyyətlərini daxil etmək üçün bura klikləyin' 
                : currentLang === 'ru' 
                ? 'Нажмите здесь, чтобы ввести размер, цвет, модель или другие параметры товара' 
                : 'Click here to add size, color, model or other specifications')}
            </p>
            <span className="text-[11px] text-merkez-blue font-bold group-hover:underline">
              + {t('warehouse.addCharacteristic') || (currentLang === 'az' ? 'Xüsusiyyət yarat' : currentLang === 'ru' ? 'Создать характеристику' : 'Create characteristic')}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {attributes.map((attr, index) => {
            const isLast = index === attributes.length - 1;
            return (
              <div 
                key={attr.id}
                className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200/80 shadow-xs hover:border-blue-200 transition-all group"
              >
                <span className="text-[10px] font-black text-gray-400 w-5 text-center shrink-0">
                  #{index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => handleUpdate(attr.id, 'name', e.target.value)}
                    placeholder={t('warehouse.charNamePlaceholder') || (currentLang === 'az' ? 'Xüsusiyyət (məs. Ölçü)' : currentLang === 'ru' ? 'Характеристика (напр. Размер)' : 'Name (e.g. Size)')}
                    className="w-full px-3 py-2 bg-gray-50/70 border border-gray-100 rounded-lg text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-merkez-blue transition-all"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <input
                    ref={isLast ? lastInputRef : null}
                    type="text"
                    value={attr.value}
                    onChange={(e) => handleUpdate(attr.id, 'value', e.target.value)}
                    placeholder={t('warehouse.charValuePlaceholder') || (currentLang === 'az' ? 'Dəyəri (məs. XL, 42, Qara)' : currentLang === 'ru' ? 'Значение (напр. XL, Черный)' : 'Value (e.g. XL, Black)')}
                    className="w-full px-3 py-2 bg-gray-50/70 border border-gray-100 rounded-lg text-xs font-bold text-merkez-blue placeholder-gray-400 focus:outline-none focus:bg-white focus:border-merkez-blue transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(attr.id)}
                  title={currentLang === 'az' ? 'Sil' : currentLang === 'ru' ? 'Удалить' : 'Remove'}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductCharacteristicsEditor;
