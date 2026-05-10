import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import ModalPortal from '../../components/Common/ModalPortal';

const ProductImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      handleParse(file);
    }
  }, [profile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false
  });

  const handleParse = (file) => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawData = results.data;
        if (rawData.length === 0) {
          toast.error("Файл пуст или имеет неверный формат");
          setIsProcessing(false);
          return;
        }

        const businessId = profile?.business_id || profile?.tenant_id || profile?.id;
        
        // Map data to the required format as requested by user
        const dataToUpload = rawData.map(row => ({
          barcode: String(row.barcode || row.Barcode || row['Баркод'] || '').trim(),
          name: String(row.name || row.Name || row['Наименование'] || '').trim(),
          sale_price: parseFloat(row.sale_price || row.Price || row['Цена']) || 0,
          stock_quantity: parseFloat(row.stock_quantity || row.Quantity || row['Количество']) || 0,
          expiry_date: row.expiry_date || row['Срок годности'] || null,
          business_id: businessId,
          // Compatibility with existing schema
          user_id: profile?.id,
          price: parseFloat(row.sale_price || row.Price || row['Цена']) || 0
        })).filter(item => item.barcode && item.name); // Basic validation

        if (dataToUpload.length === 0) {
          toast.error("Не найдено корректных данных для импорта. Проверьте заголовки: barcode, name, price...");
          setIsProcessing(false);
          return;
        }

        try {
          // Chunking for large datasets
          const chunkSize = 50;
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < dataToUpload.length; i += chunkSize) {
            const chunk = dataToUpload.slice(i, i + chunkSize);
            const { error } = await supabase
              .from('products')
              .upsert(chunk, { onConflict: 'barcode' });

            if (error) {
              console.error('Upsert error:', error);
              errorCount += chunk.length;
            } else {
              successCount += chunk.length;
            }
            
            const currentProgress = Math.min(100, Math.round(((i + chunk.length) / dataToUpload.length) * 100));
            setProgress(currentProgress);
          }

          setResult({ success: successCount, error: errorCount });
          if (successCount > 0) {
            toast.success(`Успешно импортировано: ${successCount}`);
            onImportComplete && onImportComplete();
          }
          if (errorCount > 0) {
            toast.error(`Ошибок при импорте: ${errorCount}`);
          }
        } catch (err) {
          toast.error("Ошибка при загрузке в базу данных");
          console.error(err);
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        toast.error("Ошибка при чтении файла");
        console.error(error);
        setIsProcessing(false);
      }
    });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-merkez-blue/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-merkez-blue" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Импорт базы товаров</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8">
            {!isProcessing && !result && (
              <div {...getRootProps()} className={`border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragActive ? 'border-merkez-blue bg-blue-50' : 'border-gray-200 hover:border-merkez-blue hover:bg-gray-50'}`}>
                <input {...getInputProps()} />
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-white transition-colors">
                  <FileText className="w-8 h-8 text-gray-400 group-hover:text-merkez-blue" />
                </div>
                <p className="text-lg font-bold text-gray-900 mb-2">Выберите CSV файл</p>
                <p className="text-sm text-gray-500 text-center">Перетащите файл сюда или нажмите для выбора</p>
                <div className="mt-6 px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Заголовки: barcode, name, sale_price, stock_quantity, expiry_date
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-merkez-blue animate-spin mb-6" />
                <p className="text-lg font-bold text-gray-900 mb-2">Обработка данных...</p>
                <p className="text-sm text-gray-500 mb-8">{progress}% завершено</p>
                
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-merkez-blue transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {result && (
              <div className="flex flex-col items-center justify-center py-8">
                {result.error === 0 ? (
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                ) : (
                  <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
                )}
                <h4 className="text-xl font-bold text-gray-900 mb-6">Импорт завершен</h4>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center">
                    <span className="text-2xl font-black text-green-600">{result.success}</span>
                    <span className="text-[10px] font-black text-green-600/60 uppercase tracking-widest">Успешно</span>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center">
                    <span className="text-2xl font-black text-red-600">{result.error}</span>
                    <span className="text-[10px] font-black text-red-600/60 uppercase tracking-widest">Ошибки</span>
                  </div>
                </div>

                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-merkez-blue text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all"
                >
                  Готово
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ProductImportModal;
