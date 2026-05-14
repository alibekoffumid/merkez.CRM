import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRightLeft, Package, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../core/UserContext';

const TransferStockModal = ({ isOpen, onClose, products, warehouses, onStockTransferred, type = 'product' }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [items, setItems] = useState([{ id: Date.now(), item_id: '', quantity: '' }]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setItems([{ id: Date.now(), item_id: '', quantity: '' }]);
      setNotes('');
      setFromWarehouseId('');
      setToWarehouseId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addItem = () => {
    setItems([...items, { id: Date.now(), item_id: '', quantity: '' }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleTransfer = async () => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error(t('warehouse.selectBothWarehouses') || 'Выберите оба склада');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      toast.error(t('warehouse.warehousesMustBeDifferent') || 'Склады должны быть разными');
      return;
    }

    const validItems = items.filter(i => i.item_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error(t('warehouse.addAtLeastOneItem') || 'Добавьте хотя бы один товар');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the transfer record
      const { data: transfer, error: transferError } = await supabase
        .from('stock_transfers')
        .insert({
          user_id: profile.id,
          from_warehouse_id: fromWarehouseId,
          to_warehouse_id: toWarehouseId,
          notes: notes
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // 2. Process each item
      for (const item of validItems) {
        // Create transfer item record
        const { error: itemError } = await supabase
          .from('stock_transfer_items')
          .insert({
            transfer_id: transfer.id,
            [type === 'product' ? 'product_id' : 'ingredient_id']: item.item_id,
            quantity: parseFloat(item.quantity)
          });

        if (itemError) throw itemError;

        // Decrease stock in source warehouse
        const table = type === 'product' ? 'products' : 'ingredients';
        const quantityField = type === 'product' ? 'stock_quantity' : 'quantity';

        // Check current stock in source
        const { data: sourceItem } = await supabase
          .from(table)
          .select(quantityField)
          .eq('id', item.item_id)
          .single();

        const currentSourceStock = parseFloat(sourceItem?.[quantityField] || 0);
        
        await supabase
          .from(table)
          .update({ [quantityField]: currentSourceStock - parseFloat(item.quantity) })
          .eq('id', item.item_id);

        // Increase or Create stock in destination warehouse
        // Let's check if the product with the same name/barcode exists in the destination warehouse
        const sourceProduct = (products || []).find(p => p.id === item.item_id);
        
        const { data: existingProduct } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', profile.id)
          .eq('warehouse_id', toWarehouseId)
          .eq('name', sourceProduct?.name)
          .single();

        if (existingProduct) {
          // Update existing
          await supabase
            .from(table)
            .update({ [quantityField]: parseFloat(existingProduct[quantityField] || 0) + parseFloat(item.quantity) })
            .eq('id', existingProduct.id);
        } else {
          // Create new record in destination warehouse
          const { id, created_at, ...productData } = sourceProduct;
          await supabase
            .from(table)
            .insert({
              ...productData,
              warehouse_id: toWarehouseId,
              [quantityField]: parseFloat(item.quantity)
            });
        }
      }

      toast.success(t('warehouse.transferSuccess') || 'Перемещение успешно завершено');
      onStockTransferred();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-merkez-blue/10 flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-merkez-blue" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">{t('warehouse.transferStock') || 'Перемещение товара'}</h2>
              <p className="text-sm text-gray-500 font-medium">{t('warehouse.transferStockDesc') || 'Перемещение позиций между вашими складами'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Warehouse Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-blue-50/30 rounded-2xl border border-blue-100/50">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.fromWarehouse') || 'Откуда'}</label>
              <select 
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none font-bold shadow-sm"
              >
                <option value="">{t('warehouse.selectWarehouse')}</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.toWarehouse') || 'Куда'}</label>
              <select 
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none font-bold shadow-sm"
              >
                <option value="">{t('warehouse.selectWarehouse')}</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('warehouse.itemsToTransfer') || 'Товары для перемещения'}</h3>
              <button 
                onClick={addItem}
                className="text-xs font-bold text-merkez-blue hover:text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('warehouse.addItem')}
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-end animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1 space-y-2">
                    <select 
                      value={item.item_id}
                      onChange={(e) => updateItem(item.id, 'item_id', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none font-bold"
                    >
                      <option value="">{t('warehouse.selectItem')}</option>
                      {products.filter(p => p.warehouse_id === fromWarehouseId || !fromWarehouseId).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({type === 'product' ? p.stock_quantity : p.quantity} {type === 'product' ? 'шт' : p.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 space-y-2">
                    <input 
                      type="number"
                      placeholder={t('warehouse.quantity')}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none font-bold shadow-sm"
                    />
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('warehouse.notes')}</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('warehouse.transferNotesPlaceholder') || 'Причина перемещения или комментарий...'}
              className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none font-medium h-24 resize-none shadow-sm"
            />
          </div>
        </div>

        <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black hover:bg-gray-50 transition-all shadow-sm"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleTransfer}
            disabled={loading}
            className="flex-1 py-4 bg-merkez-blue text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('common.processing') || 'Обработка...'}
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-5 h-5" />
                {t('warehouse.confirmTransfer') || 'Подтвердить перемещение'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferStockModal;
