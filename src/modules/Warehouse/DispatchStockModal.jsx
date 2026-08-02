import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Minus, Plus, Save, Package, User, Calendar, AlertCircle, Loader2, Trash2, ShoppingCart, Search, ChevronRight, FileText } from 'lucide-react'; 
import { supabase } from '../../supabaseClient';
import ModalPortal from '../../components/Common/ModalPortal';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import Dropdown from '../../components/Common/Dropdown';
import DatePicker from '../../components/Common/DatePicker';
import { formatCategoriesHierarchically } from './categoryUtils';

const DispatchStockModal = ({ isOpen, onClose, onStockDispatched, type = 'product', warehouseId }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const barcodeInputRef = React.useRef(null);
  
  const playBeep = (success = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = success ? 880 : 220;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  // Header info
  const [headerData, setHeaderData] = useState({
    issued_at: new Date().toISOString().split('T')[0],
    reason: 'sale',
    notes: ''
  });

  // Items in the "cart"
  const [items, setItems] = useState([]);

  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: ''
  });

  useEffect(() => {
    if (isOpen && warehouseId) {
      fetchCategories();
      fetchProducts();
      setItems([]);
      setSelectedCategoryId('');
      setBarcodeMode(false);
      setBarcodeBuffer('');
      setHeaderData({
        issued_at: new Date().toISOString().split('T')[0],
        reason: 'sale',
        notes: ''
      });
      setCurrentItem({
        product_id: '',
        quantity: ''
      });
    }
  }, [isOpen, warehouseId, type]);

  const fetchCategories = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('categories').select('id, name, parent_id').eq('user_id', profile.id).order('name');
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    if (!profile?.id || !warehouseId) return;
    const table = type === 'product' ? 'products' : 'ingredients';
    const qtyField = type === 'product' ? 'stock_quantity' : 'quantity';
    
    const { data } = await supabase
      .from(table)
      .select(`id, name, barcode, ${qtyField}, category_id`)
      .eq('user_id', profile.id)
      .eq('warehouse_id', warehouseId)
      .eq('is_deleted', false)
      .order('name');
    
    if (data) {
      // Map the qty field to a common name for internal use
      setProducts(data.map(p => ({
        ...p,
        stock_quantity: p[qtyField]
      })));
    }
  };

  const handleCategoryChange = (val) => {
    setSelectedCategoryId(val);
    setCurrentItem(prev => ({ ...prev, product_id: '' }));
  };

  const handleProductChange = (productId) => {
    setCurrentItem(prev => ({
      ...prev,
      product_id: productId
    }));
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const barcode = barcodeBuffer.trim();
    if (!barcode) return;

    const product = (products || []).find(p => p.barcode === barcode);
    if (product) {
      const existingItem = items.find(item => item.product_id === product.id);
      const currentQtyInCart = existingItem ? parseFloat(existingItem.quantity) : 0;
      
      if (currentQtyInCart + 1 > (product.stock_quantity || 0)) {
        playBeep(false);
        toast.error(`${t('warehouse.insufficientStock') || 'Məhsul anbarda kifayət deyil'}: ${product.stock_quantity || 0}`);
        setBarcodeBuffer('');
        return;
      }

      setItems(prevItems => {
        const existingIndex = prevItems.findIndex(item => item.product_id === product.id);
        if (existingIndex > -1) {
          const newItems = [...prevItems];
          newItems[existingIndex].quantity = (parseFloat(newItems[existingIndex].quantity) + 1).toString();
          return newItems;
        } else {
          return [...prevItems, {
            product_id: product.id,
            quantity: '1',
            productName: product.name,
            barcode: product.barcode,
            currentStock: product.stock_quantity
          }];
        }
      });
      playBeep(true);
      toast.success(`${product.name} (+1)`);
    } else {
      playBeep(false);
      toast.error(t('warehouse.productNotFoundByBarcode') || 'Məhsul tapılmadı');
    }
    setBarcodeBuffer('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const filteredProducts = (products || []).filter(p => {
    if (!selectedCategoryId) return true;
    if (p.category_id === selectedCategoryId) return true;
    const subIds = (categories || []).filter(c => c.parent_id === selectedCategoryId).map(c => c.id);
    return subIds.includes(p.category_id);
  });

  const addItem = () => {
    if (!currentItem.product_id || !currentItem.quantity) {
        toast.error(t('warehouse.selectProductAndQty') || 'Выберите товар и укажите количество');
        return;
    }
    
    const product = (products || []).find(p => p.id === currentItem.product_id);
    if (parseFloat(currentItem.quantity) > (product?.stock_quantity || 0)) {
        toast.error(`${t('warehouse.insufficientStock') || 'Недостаточно товара на складе'}: ${product?.stock_quantity || 0}`);
        return;
    }

    const existingIndex = items.findIndex(item => item.product_id === currentItem.product_id);

    if (existingIndex > -1) {
        const newTotal = parseFloat(items[existingIndex].quantity) + parseFloat(currentItem.quantity);
        if (newTotal > (product?.stock_quantity || 0)) {
            toast.error(`${t('warehouse.insufficientStock') || 'Недостаточно товара на складе'}: ${product?.stock_quantity || 0}`);
            return;
        }
        const newItems = [...items];
        newItems[existingIndex].quantity = newTotal.toString();
        setItems(newItems);
    } else {
        setItems([...items, { ...currentItem, productName: product?.name, barcode: product?.barcode, currentStock: product?.stock_quantity }]);
    }

    setCurrentItem({
        product_id: '',
        quantity: ''
    });
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
        toast.error(t('warehouse.noItemsToDispatch') || 'Добавьте хотя бы один товар');
        return;
    }
    
    setLoading(true);
    const targetTable = type === 'product' ? 'products' : 'ingredients';
    const qtyField = type === 'product' ? 'stock_quantity' : 'quantity';

    try {
      for (const item of items) {
        // 1. Record the dispatch
        const { error: dispatchError } = await supabase
          .from('stock_dispatches')
          .insert([{ 
            product_id: type === 'product' ? item.product_id : null,
            ingredient_id: type === 'ingredient' ? item.product_id : null,
            quantity: parseFloat(item.quantity),
            issued_at: headerData.issued_at,
            reason: headerData.reason,
            notes: headerData.notes,
            user_id: profile?.id,
            warehouse_id: warehouseId
          }]);

        if (dispatchError) throw dispatchError;

        // 2. Update quantity
        const { data: currentData } = await supabase
          .from(targetTable)
          .select(qtyField)
          .eq('id', item.product_id)
          .single();
        
        const newQty = (currentData?.[qtyField] || 0) - parseFloat(item.quantity);

        const { error: updateError } = await supabase
          .from(targetTable)
          .update({ [qtyField]: newQty })
          .eq('id', item.product_id);

        if (updateError) throw updateError;
      }

      toast.success(t('warehouse.stockDispatchedSuccess') || 'Списание успешно завершено');
      onStockDispatched();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const reasons = [
    { value: 'sale', label: t('warehouse.reasonSale') || 'Продажа' },
    { value: 'damaged', label: t('warehouse.reasonDamaged') || 'Повреждение/Брак' },
    { value: 'expired', label: t('warehouse.reasonExpired') || 'Срок годности' },
    { value: 'internal_use', label: t('warehouse.reasonInternal') || 'Внутреннее использование' },
    { value: 'return_to_supplier', label: t('warehouse.reasonReturn') || 'Возврат поставщику' }
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center" onClick={onClose}>
        <div 
          className="bg-white w-screen h-screen overflow-hidden animate-in fade-in flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-merkez-red flex items-center justify-center">
                <Minus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('warehouse.dispatchStock') || 'Отгрузка/Списание'}</h3>
                <p className="text-xs text-gray-500 font-medium">{t('warehouse.dispatchStockDesc') || 'Оформите выдачу или списание товаров со склада'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar Info */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('warehouse.coreSettings') || 'Параметры операции'}</h4>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.reason') || 'Причина'}</label>
                    <Dropdown 
                      value={headerData.reason}
                      onChange={val => setHeaderData({...headerData, reason: val})}
                      options={reasons}
                    />
                  </div>

                  <DatePicker 
                    label={t('warehouse.dispatchedDate') || 'Дата операции'}
                    value={headerData.issued_at}
                    onChange={val => setHeaderData({...headerData, issued_at: val})}
                  />
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('common.notes')}</label>
                    <textarea 
                      value={headerData.notes}
                      onChange={e => setHeaderData({...headerData, notes: e.target.value})}
                      className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 outline-none transition-all font-medium resize-none h-24 text-sm focus:border-merkez-blue shadow-sm"
                      placeholder={t('warehouse.notesPlaceholder')}
                    />
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500">{t('common.total') || 'Итого позиции'}:</span>
                        <span className="font-black text-merkez-red">{items.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">{t('warehouse.totalQuantity') || 'Общее кол-во'}:</span>
                        <span className="text-lg font-black text-merkez-red">{items.reduce((sum, i) => sum + parseFloat(i.quantity || 0), 0)}</span>
                    </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Add Item Form */}
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('warehouse.addItem') || 'Məhsul əlavə et'}</span>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs font-bold text-gray-500">{t('warehouse.barcodeMode') || 'Skaner rejimi'}</span>
                      <div className="relative">
                        <input 
                          type="checkbox"
                          checked={barcodeMode}
                          onChange={(e) => {
                            setBarcodeMode(e.target.checked);
                            if (e.target.checked) {
                              setTimeout(() => barcodeInputRef.current?.focus(), 100);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-merkez-blue after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                      </div>
                    </label>
                  </div>
                  
                  {barcodeMode ? (
                    <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                      <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={barcodeBuffer}
                          onChange={(e) => setBarcodeBuffer(e.target.value)}
                          placeholder={t('warehouse.scanBarcodePlaceholder') || 'Skan edin...'}
                          className="w-full bg-gray-50 border border-2 border-merkez-blue/30 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:bg-white focus:border-merkez-blue outline-none transition-all"
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium text-center">
                        {t('warehouse.scanBarcodeHint') || 'Skaneri məhsula yönəldin və oxudun. O, siyahıya avtomatik əlavə olunacaq.'}
                      </p>
                    </form>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-6 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('common.category') || 'Категория'}</label>
                            <Dropdown 
                                value={selectedCategoryId}
                                onChange={handleCategoryChange}
                                options={[
                                    { value: '', label: t('warehouse.allCategories') || 'Bütün Kateqoriyalar' },
                                    ...formatCategoriesHierarchically(categories, null, t).map(c => ({
                                        value: c.id,
                                        label: c.label
                                    }))
                                ]}
                            />
                        </div>
                        <div className="md:col-span-6 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.product') || 'Товар'}</label>
                            <Dropdown 
                                value={currentItem.product_id}
                                onChange={handleProductChange}
                                options={[
                                    { value: '', label: t('warehouse.selectProduct') },
                                    ...filteredProducts.map(p => ({ 
                                        value: p.id, 
                                        label: `${p.name} (${p.barcode}) — ${p.stock_quantity} ${t('common.unit') || 'шт'}`
                                    }))
                                ]}
                                searchable={true}
                            />
                        </div>
                        <div className="md:col-span-12 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.quantity') || 'Количество'}</label>
                            <div className="relative">
                                <Package className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="number" 
                                    value={currentItem.quantity}
                                    onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})}
                                    placeholder={t('warehouse.quantity')}
                                    className="w-full bg-gray-50 border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:border-merkez-blue outline-none transition-all font-bold"
                                />
                            </div>
                        </div>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={addItem}
                        className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
                      >
                        <Plus className="w-4 h-4" /> {t('common.add')}
                      </button>
                    </>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3 bg-gray-50/50 rounded-[2rem] border border-gray-100">
                      <ShoppingCart className="w-10 h-10 text-gray-200" />
                      <p className="text-sm font-medium">{t('warehouse.dispatchListEmpty') || 'Список списания пуст'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow group">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-merkez-red group-hover:text-white transition-colors">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-gray-900 leading-none mb-1">{item.productName}</h5>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.barcode}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8 mr-6">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('warehouse.inStock')}</p>
                                <p className="text-sm font-bold text-gray-500">{item.currentStock}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('warehouse.quantity')}</p>
                                <input 
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value || 0);
                                    if (val > (item.currentStock || 0)) {
                                      toast.error(`${t('warehouse.insufficientStock') || 'Məhsul anbarda kifayət deyil'}: ${item.currentStock || 0}`);
                                      return;
                                    }
                                    const newItems = [...items];
                                    newItems[index].quantity = e.target.value;
                                    setItems(newItems);
                                  }}
                                  className="w-16 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-xs font-bold text-right outline-none focus:border-merkez-blue focus:bg-white text-red-500"
                                />
                            </div>
                          </div>

                          <button 
                            onClick={() => removeItem(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 md:p-8 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 shrink-0 bg-gray-50/30">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading || items.length === 0} 
              className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-black shadow-lg shadow-gray-900/20 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('warehouse.completeDispatch') || 'Подтвердить списание'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default DispatchStockModal;
