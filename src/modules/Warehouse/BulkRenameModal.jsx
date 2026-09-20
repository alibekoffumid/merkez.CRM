import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Type, 
  X, 
  Search, 
  RotateCcw, 
  Loader2, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  CheckSquare, 
  Square,
  Sparkles,
  SlidersHorizontal,
  Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import ModalPortal from '../../components/Common/ModalPortal';

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const toTitleCase = (str) => {
  return str.replace(/\b\w+/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const toSentenceCase = (str) => {
  const trimmed = str.trim();
  if (!trimmed) return str;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const BulkRenameModal = ({ 
  isOpen, 
  onClose, 
  selectedProducts = [], 
  onSuccess 
}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'ru';

  // Modes: 'replace' | 'affix' | 'template' | 'case'
  const [activeMode, setActiveMode] = useState('replace');
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Mode 1: Find & Replace
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  // Mode 2: Prefix / Suffix
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');

  // Mode 3: Template & Numbering
  const [templateName, setTemplateName] = useState('');
  const [useNumbering, setUseNumbering] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [numberFormat, setNumberFormat] = useState('hyphen'); // 'hyphen' (- 1), 'hash' (#1), 'parentheses' ((1)), 'space' (1)

  // Mode 4: Case formatting
  const [caseType, setCaseType] = useState('upper'); // 'upper' | 'lower' | 'title' | 'sentence'

  // Per-item enabled status (id -> boolean)
  const [enabledItems, setEnabledItems] = useState({});

  // Per-item manual overrides (id -> edited string)
  const [manualOverrides, setManualOverrides] = useState({});

  // Reset/initialize state when modal opens or products change
  useEffect(() => {
    if (isOpen) {
      const initialEnabled = {};
      selectedProducts.forEach(p => {
        initialEnabled[p.id] = true;
      });
      setEnabledItems(initialEnabled);
      setManualOverrides({});
      setFindText('');
      setReplaceText('');
      setPrefix('');
      setSuffix('');
      setTemplateName('');
      setSearchFilter('');
    }
  }, [isOpen, selectedProducts]);

  // Compute transform for a single product name based on current rule
  const computeRuleName = (originalName, index) => {
    const orig = originalName || '';

    if (activeMode === 'replace') {
      if (!findText) return orig;
      try {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(escapeRegExp(findText), flags);
        return orig.replace(regex, replaceText);
      } catch (e) {
        return orig;
      }
    }

    if (activeMode === 'affix') {
      return `${prefix}${orig}${suffix}`;
    }

    if (activeMode === 'template') {
      if (!templateName.trim()) return orig;
      if (!useNumbering) return templateName.trim();

      const num = Number(startNumber) + index;
      let suffixPart = '';
      if (numberFormat === 'hyphen') suffixPart = ` - ${num}`;
      else if (numberFormat === 'hash') suffixPart = ` #${num}`;
      else if (numberFormat === 'parentheses') suffixPart = ` (${num})`;
      else suffixPart = ` ${num}`;

      if (templateName.includes('{n}')) {
        return templateName.replace(/\{n\}/g, String(num));
      }
      return `${templateName.trim()}${suffixPart}`;
    }

    if (activeMode === 'case') {
      if (caseType === 'upper') return orig.toUpperCase();
      if (caseType === 'lower') return orig.toLowerCase();
      if (caseType === 'title') return toTitleCase(orig);
      if (caseType === 'sentence') return toSentenceCase(orig);
    }

    return orig;
  };

  // Preview data list with final calculated names
  const previewItems = useMemo(() => {
    let activeCounter = 0;
    return selectedProducts.map((product) => {
      const isEnabled = enabledItems[product.id] !== false;
      const indexForNumbering = isEnabled ? activeCounter++ : 0;

      const ruleName = computeRuleName(product.name || '', indexForNumbering);
      const manualName = manualOverrides[product.id];
      const finalName = manualName !== undefined ? manualName : ruleName;
      const isChanged = isEnabled && finalName !== (product.name || '');
      const isEmpty = isEnabled && finalName.trim() === '';

      return {
        product,
        isEnabled,
        originalName: product.name || '',
        finalName,
        isChanged,
        isEmpty,
        isManual: manualName !== undefined && manualName !== ruleName
      };
    });
  }, [
    selectedProducts, 
    enabledItems, 
    manualOverrides, 
    activeMode, 
    findText, 
    replaceText, 
    caseSensitive, 
    prefix, 
    suffix, 
    templateName, 
    useNumbering, 
    startNumber, 
    numberFormat, 
    caseType
  ]);

  // Filtered preview items for table search
  const filteredPreview = useMemo(() => {
    if (!searchFilter.trim()) return previewItems;
    const term = searchFilter.toLowerCase();
    return previewItems.filter(item => 
      item.originalName.toLowerCase().includes(term) ||
      item.finalName.toLowerCase().includes(term) ||
      (item.product.barcode && item.product.barcode.toLowerCase().includes(term))
    );
  }, [previewItems, searchFilter]);

  const changedCount = useMemo(() => {
    return previewItems.filter(p => p.isEnabled && p.isChanged && !p.isEmpty).length;
  }, [previewItems]);

  const hasEmptyNames = useMemo(() => {
    return previewItems.some(p => p.isEnabled && p.isEmpty);
  }, [previewItems]);

  const toggleAll = (select) => {
    const next = {};
    selectedProducts.forEach(p => {
      next[p.id] = select;
    });
    setEnabledItems(next);
  };

  const resetOverrides = () => {
    setManualOverrides({});
  };

  const handleSave = async () => {
    const itemsToUpdate = previewItems.filter(p => p.isEnabled && p.isChanged && !p.isEmpty);

    if (itemsToUpdate.length === 0) {
      toast(lang === 'az' ? 'Dəyişdiriləcək heç bir ad yoxdur' : 'Нет измененных названий для сохранения', {
        icon: 'ℹ️'
      });
      return;
    }

    if (hasEmptyNames) {
      toast.error(lang === 'az' ? 'Bəzi məhsulların adı boşdur. Zəhmət olmasa düzəldin.' : 'Название товара не может быть пустым!');
      return;
    }

    setLoading(true);
    try {
      // Chunk processing into batches of 10 for safety and speed
      const chunkSize = 10;
      const updatedMap = {};

      for (let i = 0; i < itemsToUpdate.length; i += chunkSize) {
        const chunk = itemsToUpdate.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (item) => {
            const cleanName = item.finalName.trim();
            const { error } = await supabase
              .from('products')
              .update({ name: cleanName })
              .eq('id', item.product.id);

            if (error) throw error;
            updatedMap[item.product.id] = cleanName;
          })
        );
      }

      toast.success(
        lang === 'az'
          ? `${itemsToUpdate.length} məhsulun adı uğurla yeniləndi!`
          : lang === 'ru'
          ? `Названия ${itemsToUpdate.length} товаров успешно обновлены!`
          : `Names of ${itemsToUpdate.length} products successfully updated!`
      );

      if (onSuccess) {
        onSuccess(updatedMap);
      }
      onClose();
    } catch (err) {
      console.error('Error bulk updating product names:', err);
      toast.error(err.message || (lang === 'az' ? 'Adlar yenilənərkən xəta baş verdi' : 'Ошибка при сохранении названий'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-3 md:p-6"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden border border-gray-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                <Type className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                  {lang === 'az' ? 'Məhsul Adlarını Kütləvi Dəyiş' : 'Массовое изменение названий товаров'}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {lang === 'az' 
                    ? `Seçilmiş ${selectedProducts.length} məhsul üçün adların tənzimlənməsi` 
                    : `Выбрано товаров: ${selectedProducts.length}. Настройте правило или отредактируйте вручную`}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={loading}
              className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: 2 sections - Top config controls, Bottom preview table */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            
            {/* Mode selection tabs */}
            <div className="bg-gray-100/80 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setActiveMode('replace')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'replace'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                {lang === 'az' ? 'Axtar və dəyiş' : 'Поиск и замена'}
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('affix')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'affix'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {lang === 'az' ? 'Prefiks / Şəkilçi' : 'Префикс / Суффикс'}
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('template')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'template'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                {lang === 'az' ? 'Şablon / Nömrələmə' : 'Шаблон / Номер'}
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('case')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeMode === 'case'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {lang === 'az' ? 'Hərf registri' : 'Регистр букв'}
              </button>
            </div>

            {/* Mode Controls Box */}
            <div className="bg-gray-50/80 border border-gray-200/70 rounded-2xl p-4 sm:p-5">
              
              {/* Tab 1: Find & Replace */}
              {activeMode === 'replace' && (
                <div className="flex flex-col gap-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {lang === 'az' ? 'Nəyi axtarmaq (silinəcək mətn):' : 'Что искать (исходный текст):'}
                      </label>
                      <input 
                        type="text"
                        value={findText}
                        onChange={e => setFindText(e.target.value)}
                        placeholder={lang === 'az' ? 'Məs: Köhnə marka və ya söz' : 'Напр: Старый бренд, артикул или слово'}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {lang === 'az' ? 'Nə ilə əvəz etmək:' : 'Чем заменить:'}
                      </label>
                      <input 
                        type="text"
                        value={replaceText}
                        onChange={e => setReplaceText(e.target.value)}
                        placeholder={lang === 'az' ? 'Yeni mətn (silmək üçün boş buraxın)' : 'Новый текст (оставьте пустым для удаления)'}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={caseSensitive}
                        onChange={e => setCaseSensitive(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-300"
                      />
                      <span>{lang === 'az' ? 'Böyük/kiçik hərfləri nəzərə al' : 'Учитывать регистр букв'}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 2: Prefix & Suffix */}
              {activeMode === 'affix' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === 'az' ? 'Əvvələ əlavə et (Prefiks):' : 'Добавить в начало (Префикс):'}
                    </label>
                    <input 
                      type="text"
                      value={prefix}
                      onChange={e => setPrefix(e.target.value)}
                      placeholder={lang === 'az' ? 'Məs: "Brend: "' : 'Напр: "Бренд: " или "Акция - "'}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === 'az' ? 'Sona əlavə et (Şəkilçi):' : 'Добавить в конец (Суффикс):'}
                    </label>
                    <input 
                      type="text"
                      value={suffix}
                      onChange={e => setSuffix(e.target.value)}
                      placeholder={lang === 'az' ? 'Məs: " (2024)"' : 'Напр: " (2024)" или " / 250мл"'}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Template & Numbering */}
              {activeMode === 'template' && (
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {lang === 'az' ? 'Vahid ad və ya baza şablonu:' : 'Единое имя или базовый шаблон:'}
                    </label>
                    <input 
                      type="text"
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      placeholder={lang === 'az' ? 'Məs: Məhsul qutusu və ya Model {n}' : 'Напр: Стул офисный или Товар #{n}'}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      💡 {lang === 'az' 
                        ? 'Nömrənin yerini təyin etmək üçün mətndə {n} yaza bilərsiniz' 
                        : 'Можно использовать тег {n} в тексте для точной позиции номера'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={useNumbering}
                        onChange={e => setUseNumbering(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-300"
                      />
                      <span>{lang === 'az' ? 'Ardıcıl nömrələmə əlavə et' : 'Добавить порядковый номер'}</span>
                    </label>

                    {useNumbering && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                          <span>{lang === 'az' ? 'Başlanğıc:' : 'С какого:'}</span>
                          <input 
                            type="number"
                            min="1"
                            value={startNumber}
                            onChange={e => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500"
                          />
                        </div>

                        {!templateName.includes('{n}') && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <span>{lang === 'az' ? 'Format:' : 'Формат:'}</span>
                            <select
                              value={numberFormat}
                              onChange={e => setNumberFormat(e.target.value)}
                              className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                            >
                              <option value="hyphen">- 1, - 2</option>
                              <option value="hash">#1, #2</option>
                              <option value="parentheses">(1), (2)</option>
                              <option value="space">1, 2</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Change Case */}
              {activeMode === 'case' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    {lang === 'az' ? 'Registr formatını seçin:' : 'Выберите формат регистра:'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setCaseType('upper')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        caseType === 'upper'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      ВСЕ ПРОПИСНЫЕ
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaseType('lower')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        caseType === 'lower'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      все строчные
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaseType('title')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        caseType === 'title'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      С Заглавной Буквы
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaseType('sentence')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        caseType === 'sentence'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Как в предложении
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Preview Section Header & Controls */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-gray-900">
                    {lang === 'az' ? 'Dəyişikliklərin önbaxışı' : 'Предпросмотр изменений'}
                  </span>
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full">
                    {lang === 'az' 
                      ? `${changedCount} / ${selectedProducts.length} dəyişəcək` 
                      : `Изменится: ${changedCount} из ${selectedProducts.length}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      placeholder={lang === 'az' ? 'Siyahıda axtar...' : 'Фильтр по списку...'}
                      className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 outline-none focus:bg-white focus:border-indigo-500 w-44"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="text-xs text-gray-600 hover:text-indigo-600 font-bold px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    {lang === 'az' ? 'Hamısını seç' : 'Выбрать все'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="text-xs text-gray-600 hover:text-indigo-600 font-bold px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    {lang === 'az' ? 'Seçimi ləğv et' : 'Снять выбор'}
                  </button>

                  {Object.keys(manualOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={resetOverrides}
                      className="text-xs text-amber-600 hover:text-amber-700 font-bold px-2 py-1 rounded hover:bg-amber-50 transition-colors flex items-center gap-1"
                      title={lang === 'az' ? 'Əl ilə edilmiş düzəlişləri sıfırla' : 'Сбросить ручные правки'}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {lang === 'az' ? 'Sıfırla' : 'Сброс правок'}
                    </button>
                  )}
                </div>
              </div>

              {/* Table / List */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
                  {filteredPreview.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs font-medium">
                      {lang === 'az' ? 'Heç bir məhsul tapılmadı' : 'Товары не найдены'}
                    </div>
                  ) : (
                    filteredPreview.map((item) => (
                      <div 
                        key={item.product.id}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                          !item.isEnabled 
                            ? 'bg-gray-50/50 opacity-60' 
                            : item.isChanged 
                            ? 'bg-indigo-50/20 hover:bg-indigo-50/40' 
                            : 'hover:bg-gray-50/80'
                        }`}
                      >
                        {/* Checkbox and original name */}
                        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEnabledItems(prev => ({
                                ...prev,
                                [item.product.id]: !item.isEnabled
                              }));
                            }}
                            className="mt-0.5 sm:mt-0 text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                          >
                            {item.isEnabled ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-700 truncate" title={item.originalName}>
                              {item.originalName || <span className="italic text-gray-400">(без названия)</span>}
                            </p>
                            {item.product.barcode && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                {item.product.barcode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <div className="hidden sm:flex items-center text-gray-300 shrink-0">
                          <ArrowRight className="w-4 h-4" />
                        </div>

                        {/* Editable New Name input field */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <div className="relative flex-1">
                            <input 
                              type="text"
                              disabled={!item.isEnabled}
                              value={item.finalName}
                              onChange={e => {
                                const val = e.target.value;
                                setManualOverrides(prev => ({
                                  ...prev,
                                  [item.product.id]: val
                                }));
                              }}
                              placeholder={lang === 'az' ? 'Yeni ad...' : 'Новое название...'}
                              className={`w-full px-3 py-1.5 text-xs font-bold rounded-lg border outline-none transition-all ${
                                !item.isEnabled
                                  ? 'bg-gray-100 text-gray-400 border-gray-200'
                                  : item.isEmpty
                                  ? 'bg-red-50 text-red-700 border-red-300 focus:ring-2 focus:ring-red-400/20'
                                  : item.isChanged
                                  ? 'bg-white text-indigo-950 border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 shadow-xs'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 focus:bg-white focus:border-gray-300'
                              }`}
                            />
                            {item.isManual && item.isEnabled && (
                              <span 
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400"
                                title={lang === 'az' ? 'Əl ilə redaktə edilib' : 'Отредактировано вручную'}
                              />
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 w-24 text-right">
                            {!item.isEnabled ? (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                                {lang === 'az' ? 'Keç' : 'Пропущен'}
                              </span>
                            ) : item.isEmpty ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md flex items-center gap-1 justify-end">
                                <AlertCircle className="w-3 h-3" />
                                {lang === 'az' ? 'Boşdur' : 'Пусто'}
                              </span>
                            ) : item.isChanged ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 justify-end">
                                <Check className="w-3 h-3" />
                                {lang === 'az' ? 'Dəyişəcək' : 'Изменится'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-gray-400">
                                {lang === 'az' ? 'Eyni' : 'Без изм.'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 font-medium">
              {hasEmptyNames ? (
                <span className="text-red-600 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {lang === 'az' ? 'Xəta: Bəzi adlar boşdur!' : 'Ошибка: Названия не могут быть пустыми!'}
                </span>
              ) : changedCount > 0 ? (
                <span>
                  {lang === 'az' 
                    ? `${changedCount} məhsulun adı yenilənəcək` 
                    : `Будут обновлены названия ${changedCount} товаров`}
                </span>
              ) : (
                <span className="text-gray-400">
                  {lang === 'az' ? 'Dəyişiklik edilməyib' : 'Изменений пока нет'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors shadow-xs"
              >
                {lang === 'az' ? 'İmtina' : 'Отмена'}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={loading || changedCount === 0 || hasEmptyNames}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{lang === 'az' ? 'Yadda saxlanılır...' : 'Сохранение...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'az' 
                        ? `Yadda saxla (${changedCount})` 
                        : `Применить (${changedCount})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default BulkRenameModal;
