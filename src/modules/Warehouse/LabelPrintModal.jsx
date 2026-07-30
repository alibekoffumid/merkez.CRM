import React, { useState, useEffect } from 'react';
import { X, Printer, Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LabelPrintModal = ({ isOpen, onClose, selectedProducts, onPrint }) => {
  const { t } = useTranslation();
  const [printItems, setPrintItems] = useState([]);

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

  const handlePrintClick = () => {
    // Expand the array based on quantities
    const expandedItems = [];
    printItems.forEach(item => {
      for (let i = 0; i < (item.printQty || 0); i++) {
        expandedItems.push(item);
      }
    });

    if (expandedItems.length > 0) {
      onPrint(expandedItems);
    }
  };

  const totalLabels = printItems.reduce((acc, item) => acc + (item.printQty || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5 text-merkez-blue" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">{t('warehouse.printLabels') || 'Печать этикеток'}</h2>
              <p className="text-xs text-gray-500 font-medium">58x40mm Thermal Labels</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-3">
            {printItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{item.barcode || item.id?.replace(/-/g, '').substring(0, 10)}</p>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                  <button 
                    onClick={() => handleQtyChange(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-900 text-sm">
                    {item.printQty}
                  </span>
                  <button 
                    onClick={() => handleQtyChange(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-500">
            Total Labels: <span className="font-black text-gray-900 text-base">{totalLabels}</span>
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
              {t('common.print') || 'Çap Et'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LabelPrintModal;
