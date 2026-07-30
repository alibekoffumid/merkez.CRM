import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Plus, Trash2, Save, FileSpreadsheet, Printer, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const CreateSupplierOrderModal = ({ isOpen, onClose, selectedSupplierId, warehouseId, suppliers = [] }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Data fetching
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  
  // Form State
  const [supplierId, setSupplierId] = useState(selectedSupplierId || '');
  const [orderItems, setOrderItems] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(1.70);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (isOpen) {
      setSupplierId(selectedSupplierId || '');
      setOrderItems([]);
    }
  }, [isOpen, selectedSupplierId]);

  useEffect(() => {
    if (isOpen && profile?.id && warehouseId) {
      fetchProducts();
    }
  }, [isOpen, profile?.id, warehouseId]);

  const fetchProducts = async () => {
    if (!profile?.id || !warehouseId) return;
    const { data, error } = await supabase
      .from('products')
      .select('id, name, barcode, purchase_price, image_url, supplier_id')
      .eq('is_deleted', false)
      .eq('user_id', profile.id)
      .eq('warehouse_id', warehouseId)
      .order('name');
    
    if (error) {
      console.error('Error fetching products:', error);
      toast.error(i18n.language === 'az' ? 'Məhsulları yükləmək mümkün olmadı' : 'Ошибка загрузки товаров');
    } else if (data) {
      setProducts(data);
    }
  };

  const filteredProducts = products.filter(p => {
    const searchLower = productSearch.toLowerCase();
    return p.name?.toLowerCase().includes(searchLower) || 
           (p.barcode && p.barcode.toLowerCase().includes(searchLower));
  });

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddItem = (product) => {
    // Check if already in list
    if (orderItems.find(item => item.product_id === product.id)) {
      toast.error(i18n.language === 'az' ? 'Məhsul artıq siyahıdadır' : 'Товар уже в списке');
      return;
    }
    
    setOrderItems([...orderItems, {
      id: Date.now().toString(),
      product_id: product.id,
      name: product.name,
      article_number: product.barcode,
      picture_url: product.image_url,
      quantity: 1,
      unit_price: product.purchase_price || 0,
      remark: '',
      package_size: ''
    }]);
    setProductSearch('');
    setIsSearchFocused(false);
  };

  const updateItem = (id, field, value) => {
    setOrderItems(orderItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
  };

  const handleSave = async () => {
    if (!supplierId) {
      toast.error(i18n.language === 'az' ? 'Təchizatçı seçin' : 'Выберите поставщика');
      return;
    }
    if (orderItems.length === 0) {
      toast.error(i18n.language === 'az' ? 'Məhsul əlavə edin' : 'Добавьте товары');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      
      // Insert Order
      const { data: orderData, error: orderError } = await supabase.from('supplier_orders').insert([{
        user_id: profile?.id,
        supplier_id: supplierId,
        total_amount: totalAmount,
        currency,
        exchange_rate: exchangeRate,
        status: 'draft'
      }]).select().single();

      if (orderError) throw orderError;

      // Insert Items
      const itemsToInsert = orderItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        remark: item.remark,
        package_size: item.package_size
      }));

      const { error: itemsError } = await supabase.from('supplier_order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast.success(i18n.language === 'az' ? 'Sifariş uğurla yadda saxlanıldı' : 'Заказ успешно сохранен');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateExcel = async () => {
    if (orderItems.length === 0) {
      toast.error(i18n.language === 'az' ? 'Məhsul əlavə edin' : 'Добавьте товары');
      return;
    }

    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Order');

      // Setup Columns
      sheet.columns = [
        { header: 'Item No.', key: 'itemNo', width: 25 },
        { header: 'Quantity', key: 'qty', width: 15 },
        { header: 'Unit price (USD)', key: 'price', width: 20 },
        { header: 'Amount (USD)', key: 'amount', width: 20 },
        { header: 'Picture', key: 'picture', width: 20 },
        { header: 'Remark', key: 'remark', width: 30 },
        { header: 'Package size', key: 'packageSize', width: 20 }
      ];

      // Format Header Row
      const headerRow = sheet.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF808080' } // Gray background
        };
        cell.font = { bold: true, color: { argb: 'FF000000' }, name: 'Times New Roman', size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
        };
      });

      // Group Specification headers
      sheet.mergeCells('F1:G1');
      sheet.getCell('F1').value = 'Specification';
      
      // Insert sub-headers for specification manually since we merged
      sheet.insertRow(2, ['', '', '', '', '', 'Remark', 'Package size']);
      const subHeaderRow = sheet.getRow(2);
      subHeaderRow.height = 20;
      subHeaderRow.eachCell((cell, colNumber) => {
        if(colNumber === 6 || colNumber === 7) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA0A0A0' } };
            cell.font = { bold: true, name: 'Times New Roman' };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }
      });
      
      // Fix borders for the merged cell below
      sheet.mergeCells('A1:A2');
      sheet.mergeCells('B1:B2');
      sheet.mergeCells('C1:C2');
      sheet.mergeCells('D1:D2');
      sheet.mergeCells('E1:E2');

      // Re-apply borders and centering for merged cells
      ['A', 'B', 'C', 'D', 'E'].forEach(col => {
         const cell = sheet.getCell(`${col}1`);
         cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      let currentRow = 3;

      for (const item of orderItems) {
        const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
        
        const row = sheet.getRow(currentRow);
        row.height = 80;
        
        // Output Product Name instead of Barcode for Item No. column
        sheet.getCell(`A${currentRow}`).value = item.name;
        sheet.getCell(`B${currentRow}`).value = item.quantity;
        
        const priceCell = sheet.getCell(`C${currentRow}`);
        priceCell.value = item.unit_price;
        priceCell.numFmt = '$#,##0.00';
        
        const amountCell = sheet.getCell(`D${currentRow}`);
        amountCell.value = amount;
        amountCell.numFmt = '$#,##0.00';
        
        sheet.getCell(`F${currentRow}`).value = item.remark;
        sheet.getCell(`G${currentRow}`).value = item.package_size;

        // Alignment and borders for data cells
        for (let i = 1; i <= 7; i++) {
           const cell = row.getCell(i);
           cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
           cell.font = { name: 'Times New Roman', size: 11 };
           cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }

        // Add Image
        if (item.picture_url) {
          try {
            const response = await fetch(item.picture_url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            
            const imageId = workbook.addImage({
              buffer: arrayBuffer,
              extension: blob.type.split('/')[1] || 'jpeg',
            });

            sheet.addImage(imageId, {
              tl: { col: 4.1, row: currentRow - 1 + 0.1 }, // E is col 5, index is 4
              br: { col: 4.9, row: currentRow - 0.1 },
              editAs: 'oneCell'
            });
          } catch (imgErr) {
            console.error('Failed to load image:', imgErr);
            sheet.getCell(`E${currentRow}`).value = 'No Image';
          }
        } else {
            sheet.getCell(`E${currentRow}`).value = 'No Image';
        }
        
        currentRow++;
      }

      // Buffer & Save
      const buffer = await workbook.xlsx.writeBuffer();
      const supplierName = suppliers.find(s => s.id === supplierId)?.name || 'Unknown';
      saveAs(new Blob([buffer]), `Order_${supplierName}_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  if (!isOpen) return null;

  const supplierOptions = [
    { value: '', label: i18n.language === 'az' ? 'Seçin...' : 'Выберите...' },
    ...suppliers.map(s => ({ value: s.id, label: s.name }))
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col animate-in slide-in-from-bottom-4 duration-300 print:absolute print:inset-0">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 print:hidden">
            <div>
              <h2 className="text-xl font-black text-gray-900">{i18n.language === 'az' ? 'Yeni Sifariş (Excel)' : 'Новый заказ (Excel)'}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {i18n.language === 'az' ? 'Təchizatçı üçün Çin sifarişi yaradın' : 'Создать заказ поставщику из Китая'}
              </p>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row print:overflow-visible">
            
            {/* Sidebar / Settings */}
            <div className="w-full md:w-80 border-r border-gray-100 p-6 flex flex-col gap-6 shrink-0 bg-gray-50/30 overflow-y-auto print:hidden">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {i18n.language === 'az' ? 'Təchizatçı' : 'Поставщик'}
                </label>
                <Dropdown
                  value={supplierId}
                  onChange={(val) => setSupplierId(val)}
                  options={supplierOptions}
                  className="w-full"
                  buttonClassName="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-merkez-blue outline-none text-left"
                />
              </div>

              <div className="relative" ref={searchContainerRef}>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {i18n.language === 'az' ? 'Məhsul Axtarışı' : 'Поиск товара'}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={i18n.language === 'az' ? 'Ad və ya barkod...' : 'Имя или артикул...'}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-merkez-blue outline-none text-sm"
                  />
                </div>
                {isSearchFocused && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => handleAddItem(p)}
                          className="p-3 border-b border-gray-50 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="w-10 h-10 rounded bg-gray-100 shrink-0 overflow-hidden flex items-center justify-center">
                             {p.picture_url ? <img src={p.picture_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.article_number}</p>
                          </div>
                          <Plus className="w-4 h-4 text-merkez-blue shrink-0" />
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-400 font-medium">
                        {supplierId ? (i18n.language === 'az' ? 'Bu təchizatçı üçün məhsul tapılmadı' : 'У этого поставщика нет таких товаров') : (i18n.language === 'az' ? 'Məhsul tapılmadı' : 'Товар не найден')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  {i18n.language === 'az' ? 'Valyuta' : 'Валюта'}
                </label>
                <Dropdown
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  options={[
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'AZN', label: 'AZN (₼)' }
                  ]}
                  className="w-full mb-3"
                  buttonClassName="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none text-left"
                />

                {currency === 'AZN' && (
                  <div>
                     <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">USD Rate</label>
                     <input type="number" step="0.01" value={exchangeRate} onChange={e=>setExchangeRate(Number(e.target.value))} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none" />
                  </div>
                )}
              </div>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden print:p-0 print:overflow-visible">
               
               {/* Print Title Only visible on print */}
               <div className="hidden print:block mb-6 text-center">
                  <h1 className="text-2xl font-bold">Purchase Order</h1>
                  <p className="text-lg mt-2">Supplier: {suppliers.find(s=>s.id === supplierId)?.name}</p>
                  <p className="text-md text-gray-500">Date: {new Date().toLocaleDateString()}</p>
               </div>

               <div className="flex-1 overflow-x-auto overflow-y-auto bg-white rounded-xl border border-gray-100 print:border-none print:rounded-none">
                  <table className="w-full min-w-[800px] border-collapse">
                    <thead className="sticky top-0 bg-gray-100 z-10 print:static print:bg-gray-200">
                      <tr className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        <th className="p-4 text-left border-b border-r border-gray-200">Item No.</th>
                        <th className="p-4 text-center border-b border-r border-gray-200 w-24">Quantity</th>
                        <th className="p-4 text-center border-b border-r border-gray-200 w-32">Unit price ($)</th>
                        <th className="p-4 text-center border-b border-r border-gray-200 w-32">Amount ($)</th>
                        <th className="p-4 text-center border-b border-r border-gray-200 w-24">Picture</th>
                        <th className="p-4 text-left border-b border-r border-gray-200">Remark / Color</th>
                        <th className="p-4 text-left border-b border-r border-gray-200">Package size</th>
                        <th className="p-4 text-center border-b border-gray-200 w-16 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-gray-400">
                             <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                             {i18n.language === 'az' ? 'Siyahı boşdur. Sol tərəfdən məhsul əlavə edin.' : 'Список пуст. Добавьте товары слева.'}
                          </td>
                        </tr>
                      ) : orderItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="p-3 border-r border-gray-100 font-medium">
                            {item.name}
                          </td>
                          <td className="p-3 border-r border-gray-100">
                             <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full p-2 text-center border border-gray-200 rounded bg-white outline-none focus:border-merkez-blue print:border-none print:p-0" />
                          </td>
                          <td className="p-3 border-r border-gray-100">
                             <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full p-2 text-center border border-gray-200 rounded bg-white outline-none focus:border-merkez-blue print:border-none print:p-0" />
                          </td>
                          <td className="p-3 border-r border-gray-100 text-center font-bold text-gray-900">
                             ${((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}
                          </td>
                          <td className="p-3 border-r border-gray-100 flex justify-center">
                             <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                {item.picture_url ? <img src={item.picture_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-300" />}
                             </div>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                             <input type="text" placeholder="Color, variant..." value={item.remark} onChange={(e) => updateItem(item.id, 'remark', e.target.value)} className="w-full p-2 border border-gray-200 rounded bg-white outline-none focus:border-merkez-blue print:border-none print:p-0 print:placeholder-transparent" />
                          </td>
                          <td className="p-3 border-r border-gray-100">
                             <input type="text" placeholder="Carton size..." value={item.package_size} onChange={(e) => updateItem(item.id, 'package_size', e.target.value)} className="w-full p-2 border border-gray-200 rounded bg-white outline-none focus:border-merkez-blue print:border-none print:p-0 print:placeholder-transparent" />
                          </td>
                          <td className="p-3 text-center print:hidden">
                             <button onClick={() => removeItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
               
               {/* Total Area */}
               <div className="mt-4 flex items-center justify-end gap-6 print:mt-6">
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{i18n.language === 'az' ? 'Yekun Məbləğ' : 'Итоговая Сумма'}</p>
                    <p className="text-3xl font-black text-gray-900">${calculateTotal().toFixed(2)}</p>
                    {currency === 'AZN' && (
                        <p className="text-sm font-bold text-merkez-blue">≈ {(calculateTotal() * exchangeRate).toFixed(2)} ₼</p>
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50 rounded-b-2xl print:hidden">
            <button onClick={onClose} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">
              {i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
            </button>
            <div className="flex gap-3">
              <button 
                onClick={handlePrint}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {i18n.language === 'az' ? 'Çap et' : 'Печать'}
              </button>
              <button 
                onClick={generateExcel}
                disabled={exporting}
                className="px-6 py-2.5 bg-[#107C41] text-white font-bold rounded-xl hover:bg-[#0d6b38] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Excel
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2.5 bg-merkez-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {i18n.language === 'az' ? 'Yadda Saxla' : 'Сохранить'}
              </button>
            </div>
          </div>
          
      </div>
    </ModalPortal>
  );
};

export default CreateSupplierOrderModal;
