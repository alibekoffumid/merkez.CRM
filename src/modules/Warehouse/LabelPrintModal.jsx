import React, { useState, useEffect } from 'react';
import { X, Printer, Plus, Minus, FileText, Tag, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LabelPrintModal = ({ isOpen, onClose, selectedProducts, onPrint }) => {
  const { t, i18n } = useTranslation();
  const [printItems, setPrintItems] = useState([]);
  const [printFormat, setPrintFormat] = useState(() => {
    return localStorage.getItem('merkez_label_print_format') || 'thermal';
  });

  const handleFormatChange = (format) => {
    setPrintFormat(format);
    localStorage.setItem('merkez_label_print_format', format);
  };

  // Initialize quantities when modal opens or selected products change
  useEffect(() => {
    if (isOpen && selectedProducts) {
      setPrintItems(selectedProducts.map(p => ({ ...p, printQty: 1 })));
    }
  }, [isOpen, selectedProducts]);

  if (!isOpen) return null;

  const handleQtyChange = (id, delta) => {
    setPrintItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, (item.printQty || 0) + delta);
        return { ...item, printQty: newQty };
      }
      return item;
    }));
  };

  const handleSetAllQty = (qty) => {
    setPrintItems(prev => prev.map(item => ({ ...item, printQty: qty })));
  };

  const handlePrintClick = () => {
    // Expand the array based on quantities
    const expandedItems = [];
    printItems.forEach(item => {
      for (let i = 0; i < (item.printQty || 0); i++) {
        expandedItems.push(item);
      }
    });

    if (expandedItems.length > 0) {
      onPrint(expandedItems, printFormat);
    }
  };

  const totalLabels = printItems.reduce((acc, item) => acc + (item.printQty || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-merkez-blue/10 flex items-center justify-center text-merkez-blue shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">{t('warehouse.printLabels') || 'Etiketlərin Çapı'}</h2>
              <p className="text-xs text-gray-500 font-medium">{printItems.length} {i18n.language === 'az' ? 'məhsul seçildi' : 'товаров выбрано'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{i18n.language === 'az' ? 'Çap Formati:' : 'Формат печати:'}</span>
          <div className="grid grid-cols-2 gap-2 flex-1 sm:max-w-md">
            <button
              type="button"
              onClick={() => handleFormatChange('thermal')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${printFormat === 'thermal' ? 'bg-merkez-blue text-white border-merkez-blue shadow-md shadow-blue-500/20' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
            >
              <Tag className="w-4 h-4" />
              <span>Termo (58×40 mm)</span>
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('a4')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${printFormat === 'a4' ? 'bg-merkez-blue text-white border-merkez-blue shadow-md shadow-blue-500/20' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
            >
              <FileText className="w-4 h-4" />
              <span>A4 Vərəq (Epson / HP)</span>
            </button>
          </div>
        </div>

        {/* Quick Batch Quantity Buttons */}
        <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">{i18n.language === 'az' ? 'Hamısına say təyin et:' : 'Количество для всех:'}</span>
          <div className="flex gap-1.5">
            {[1, 2, 5, 10].map(n => (
              <button
                key={n}
                onClick={() => handleSetAllQty(n)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-bold text-[11px] transition-colors"
              >
                {n} ədəd
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-2.5">
            {printItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all shadow-sm">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</p>
                    {item.color && (
                      <span className="text-[10px] font-bold bg-blue-50 text-merkez-blue px-2 py-0.5 rounded-md shrink-0">
                        {item.color}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="font-mono font-bold text-gray-700">{item.barcode || item.id?.replace(/-/g, '').substring(0, 10)}</span>
                    <span>•</span>
                    <span className="font-bold text-merkez-blue">{parseFloat(item.price || 0).toFixed(2)} ₼</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
                  <button 
                    onClick={() => handleQtyChange(item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-black text-gray-900 text-sm">
                    {item.printQty}
                  </span>
                  <button 
                    onClick={() => handleQtyChange(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-500">
            {i18n.language === 'az' ? 'Cəmi etiket sayı:' : 'Всего этикеток:'} <span className="font-black text-gray-900 text-base ml-1">{totalLabels}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {t('common.cancel') || 'Ləğv et'}
            </button>
            <button 
              onClick={handlePrintClick}
              disabled={totalLabels === 0}
              className="px-6 py-2.5 bg-merkez-blue text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-md shadow-blue-500/20"
            >
              <Printer className="w-4 h-4 mr-2" />
              {t('common.print') || 'Çap Et'} ({totalLabels})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LabelPrintModal;
