import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Save, Package, User, Calendar, DollarSign, Loader2, AlertCircle } from 'lucide-react'; 
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
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    received_at: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchProducts();
    }
  }, [isOpen]);

  const fetchSuppliers = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('suppliers').select('id, name').eq('user_id', profile.id).order('name');
    if (data) setSuppliers(data);
  };

  const fetchProducts = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('products').select('id, name, barcode, purchase_price').eq('user_id', profile.id).eq('archived', false).order('name');
    if (data) setProducts(data);
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setFormData(prev => ({
      ...prev,
      product_id: productId,
      unit_price: product?.purchase_price || prev.unit_price
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity) return;
    
    setLoading(true);
    try {
      // 1. Record the receipt
      const { error: receiptError } = await supabase
        .from('stock_receipts')
        .insert([{ 
          ...formData,
          quantity: parseFloat(formData.quantity),
          unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
          user_id: profile?.id 
        }]);

      if (receiptError) throw receiptError;

      // 2. Update the product stock quantity
      // We need to fetch current stock first or use increment logic
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', formData.product_id)
        .single();

      const newQuantity = (currentProduct?.stock_quantity || 0) + parseFloat(formData.quantity);

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          purchase_price: formData.unit_price ? parseFloat(formData.unit_price) : currentProduct?.purchase_price
        })
        .eq('id', formData.product_id);

      if (updateError) throw updateError;

      toast.success(t('warehouse.stockReceivedSuccess') || 'Товар успешно принят на склад');
      onStockReceived();
      onClose();
      setFormData({
        supplier_id: '',
        product_id: '',
        quantity: '',
        unit_price: '',
        received_at: new Date().toISOString().split('T')[0],
        notes: ''
      });
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
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-8 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 text-merkez-green flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('warehouse.receiveStock') || 'Приемка товара'}</h3>
                <p className="text-xs text-gray-500 font-medium">{t('warehouse.receiveStockDesc') || 'Зафиксируйте поступление товара от поставщика'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.supplier') || 'Поставщик'}</label>
                <Dropdown 
                  value={formData.supplier_id}
                  onChange={val => setFormData({...formData, supplier_id: val})}
                  options={[
                    { value: '', label: t('warehouse.selectSupplier') || 'Выберите поставщика' },
                    ...suppliers.map(s => ({ value: s.id, label: s.name }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.product') || 'Товар'}</label>
                <Dropdown 
                  value={formData.product_id}
                  onChange={handleProductChange}
                  options={[
                    { value: '', label: t('warehouse.selectProduct') || 'Выберите товар' },
                    ...products.map(p => ({ value: p.id, label: `${p.name} (${p.barcode})` }))
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.quantity') || 'Количество'}</label>
                  <div className="relative">
                    <Package className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      required
                      step="any"
                      value={formData.quantity}
                      onChange={e => setFormData({...formData, quantity: e.target.value})}
                      className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl pl-12 pr-6 py-4 outline-none transition-all font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('warehouse.unitPrice') || 'Цена закупки'}</label>
                  <div className="relative">
                    <DollarSign className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.unit_price}
                      onChange={e => setFormData({...formData, unit_price: e.target.value})}
                      className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl pl-12 pr-6 py-4 outline-none transition-all font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DatePicker 
                  label={t('warehouse.receivedDate')}
                  value={formData.received_at}
                  onChange={val => setFormData({...formData, received_at: val})}
                />
                
                <div className="pt-6">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('common.notes') || 'Заметки'}</label>
                  <textarea 
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-gray-50 border-transparent border focus:bg-white focus:border-merkez-blue rounded-2xl px-6 py-3 outline-none transition-all font-medium resize-none h-14"
                    placeholder={t('warehouse.notesPlaceholder') || 'Номер накладной, комментарии...'}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-[2] py-4 bg-merkez-green text-white rounded-2xl font-black shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {t('warehouse.completeReceipt') || 'Принять товар'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ReceiveStockModal;
