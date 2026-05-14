import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Save, Package, User, Calendar, DollarSign, Loader2, Trash2, ShoppingCart, Search, ChevronRight } from 'lucide-react'; 
import { supabase } from '../../supabaseClient';
import ModalPortal from '../../components/Common/ModalPortal';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import Dropdown from '../../components/Common/Dropdown';
import DatePicker from '../../components/Common/DatePicker';

const ReceiveStockModal = ({ isOpen, onClose, onStockReceived }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Header info
  const [headerData, setHeaderData] = useState({
    supplier_id: '',
    received_at: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Items in the "cart"
  const [items, setItems] = useState([]);

  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: '',
    unit_price: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchProducts();
      setItems([]);
      setHeaderData({
        supplier_id: '',
        received_at: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setCurrentItem({
        product_id: '',
        quantity: '',
        unit_price: ''
      });
    }
  }, [isOpen]);

  const fetchSuppliers = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('suppliers').select('id, name').eq('user_id', profile.id).order('name');
    if (data) setSuppliers(data);
  };

  const fetchProducts = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('products').select('id, name, barcode, purchase_price, supplier_id').eq('user_id', profile.id).eq('archived', false).order('name');
    if (data) setProducts(data);
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setCurrentItem(prev => ({
      ...prev,
      product_id: productId,
      unit_price: product?.purchase_price || prev.unit_price
    }));

    // Auto-fill supplier if not set
    if (product?.supplier_id && !headerData.supplier_id) {
      setHeaderData(prev => ({ ...prev, supplier_id: product.supplier_id }));
    }
  };

  const addItem = () => {
    if (!currentItem.product_id || !currentItem.quantity) {
        toast.error(t('warehouse.selectProductAndQty') || 'Выберите товар и укажите количество');
        return;
    }
    
    const product = products.find(p => p.id === currentItem.product_id);
    const existingIndex = items.findIndex(item => item.product_id === currentItem.product_id);

    if (existingIndex > -1) {
        // Update existing
        const newItems = [...items];
        newItems[existingIndex].quantity = (parseFloat(newItems[existingIndex].quantity) + parseFloat(currentItem.quantity)).toString();
        newItems[existingIndex].unit_price = currentItem.unit_price;
        setItems(newItems);
    } else {
        // Add new
        setItems([...items, { ...currentItem, productName: product?.name, barcode: product?.barcode }]);
    }

    // Reset current item
    setCurrentItem({
        product_id: '',
        quantity: '',
        unit_price: ''
    });
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
        toast.error(t('warehouse.noItemsToReceive') || 'Добавьте хотя бы один товар');
        return;
    }
    
    setLoading(true);
    try {
      // Process each item
      for (const item of items) {
        // 1. Record the receipt
        const { error: receiptError } = await supabase
          .from('stock_receipts')
          .insert([{ 
            product_id: item.product_id,
            supplier_id: headerData.supplier_id || null,
            quantity: parseFloat(item.quantity),
            unit_price: item.unit_price ? parseFloat(item.unit_price) : null,
            received_at: headerData.received_at,
            notes: headerData.notes,
            user_id: profile?.id 
          }]);

        if (receiptError) throw receiptError;

        // 2. Update the product stock quantity
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity, purchase_price')
          .eq('id', item.product_id)
          .single();

        const newQuantity = (currentProduct?.stock_quantity || 0) + parseFloat(item.quantity);

        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: newQuantity,
            purchase_price: item.unit_price ? parseFloat(item.unit_price) : currentProduct?.purchase_price
          })
          .eq('id', item.product_id);

        if (updateError) throw updateError;
      }

      toast.success(t('warehouse.stockReceivedSuccess') || 'Приемка успешно завершена');
      onStockReceived();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 text-merkez-green flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('warehouse.receiveStock') || 'Многопозиционная приемка'}</h3>
                <p className="text-xs text-gray-500 font-medium">{t('warehouse.receiveStockDesc') || 'Добавьте все товары из накладной'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('warehouse.coreSettings') || 'Данные накладной'}</h4>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.supplier')}</label>
                    <Dropdown 
                      value={headerData.supplier_id}
                      onChange={val => setHeaderData({...headerData, supplier_id: val})}
                      options={[
                        { value: '', label: t('warehouse.selectSupplier') },
                        ...suppliers.map(s => ({ value: s.id, label: s.name }))
                      ]}
                    />
                  </div>

                  <DatePicker 
                    label={t('warehouse.receivedDate')}
                    value={headerData.received_at}
                    onChange={val => setHeaderData({...headerData, received_at: val})}
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

                <div className="bg-merkez-blue/5 p-6 rounded-3xl border border-merkez-blue/10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500">{t('common.total') || 'Итого позиции'}:</span>
                        <span className="font-black text-merkez-blue">{items.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">{t('common.sum') || 'Сумма закупки'}:</span>
                        <span className="text-lg font-black text-merkez-blue">₼{calculateTotal().toFixed(2)}</span>
                    </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Add Item Form */}
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> {t('warehouse.addItemsToReceipt') || 'Добавить товар в список'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                        <Dropdown 
                            value={currentItem.product_id}
                            onChange={handleProductChange}
                            options={[
                                { value: '', label: t('warehouse.selectProduct') },
                                ...products.map(p => ({ value: p.id, label: `${p.name} (${p.barcode})` }))
                            ]}
                        />
                    </div>
                    <div className="md:col-span-3">
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
                    <div className="md:col-span-3">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₼</span>
                            <input 
                                type="number" 
                                value={currentItem.unit_price}
                                onChange={e => setCurrentItem({...currentItem, unit_price: e.target.value})}
                                placeholder={t('warehouse.unitPrice')}
                                className="w-full bg-gray-50 border border-transparent rounded-xl pl-9 pr-4 py-3 text-sm focus:bg-white focus:border-merkez-blue outline-none transition-all font-bold"
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
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3 bg-gray-50/50 rounded-[2rem] border border-gray-100">
                      <ShoppingCart className="w-10 h-10 text-gray-200" />
                      <p className="text-sm font-medium">{t('warehouse.receiptEmpty') || 'Список приемки пуст'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow group">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-merkez-blue group-hover:text-white transition-colors">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-gray-900 leading-none mb-1">{item.productName}</h5>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.barcode}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8 mr-6">
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('warehouse.quantity')}</p>
                                <p className="text-sm font-black text-gray-900">{item.quantity}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('warehouse.unitPrice')}</p>
                                <p className="text-sm font-black text-merkez-blue">₼{parseFloat(item.unit_price || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-right w-20">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('common.total')}</p>
                                <p className="text-sm font-black text-gray-900">₼{(parseFloat(item.quantity) * parseFloat(item.unit_price || 0)).toFixed(2)}</p>
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
          <div className="p-8 border-t border-gray-100 flex gap-4 shrink-0 bg-gray-50/30">
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
              className="flex-[2] py-4 bg-merkez-green text-white rounded-2xl font-black shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('warehouse.completeReceipt') || 'Завершить приемку'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ReceiveStockModal;
