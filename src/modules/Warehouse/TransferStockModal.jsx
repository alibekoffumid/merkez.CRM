import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRightLeft, Package, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../core/UserContext';
import Dropdown from '../../components/Common/Dropdown';

const TransferStockModal = ({ isOpen, onClose, products, warehouses, onStockTransferred, type = 'product' }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
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

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const barcode = barcodeBuffer.trim();
    if (!barcode) return;

    const product = (products || []).find(p => p.barcode === barcode);
    if (product) {
      if (fromWarehouseId && product.warehouse_id !== fromWarehouseId) {
        playBeep(false);
        toast.error(t('warehouse.productNotInSelectedWarehouse') || 'Məhsul seçilmiş anbarda deyil');
        setBarcodeBuffer('');
        return;
      }
      
      const qtyField = type === 'product' ? 'stock_quantity' : 'quantity';
      const availableQty = parseFloat(product[qtyField] || 0);

      const existingItemIndex = items.findIndex(item => item.item_id === product.id);
      const currentQtyInCart = existingItemIndex > -1 ? parseFloat(items[existingItemIndex].quantity) : 0;

      if (currentQtyInCart + 1 > availableQty) {
        playBeep(false);
        toast.error(`${t('warehouse.insufficientStock') || 'Məhsul anbarda kifayət deyil'}: ${availableQty}`);
        setBarcodeBuffer('');
        return;
      }

      if (!fromWarehouseId && product.warehouse_id) {
        setFromWarehouseId(product.warehouse_id);
      }

      setItems(prevItems => {
        const existingIndex = prevItems.findIndex(item => item.item_id === product.id);
        if (existingIndex > -1) {
          const newItems = [...prevItems];
          newItems[existingIndex].quantity = (parseFloat(newItems[existingIndex].quantity) + 1).toString();
          return newItems;
        } else {
          return [...prevItems, {
            id: Date.now() + Math.random(),
            item_id: product.id,
            quantity: '1',
            productName: product.name,
            barcode: product.barcode,
            availableStock: availableQty
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

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setNotes('');
      setFromWarehouseId('');
      setToWarehouseId('');
      setBarcodeMode(false);
      setBarcodeBuffer('');
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
        const { data: sourceItem, error: sourceFetchError } = await supabase
          .from(table)
          .select('*')
          .eq('id', item.item_id)
          .single();

        if (sourceFetchError) throw sourceFetchError;

        const currentSourceStock = parseFloat(sourceItem?.[quantityField] || 0);
        
        const { error: decreaseError } = await supabase
          .from(table)
          .update({ [quantityField]: currentSourceStock - parseFloat(item.quantity) })
          .eq('id', item.item_id);

        if (decreaseError) throw decreaseError;

        // Increase or Create stock in destination warehouse
        // Match by name AND barcode for better accuracy
        let query = supabase
          .from(table)
          .select('*')
          .eq('user_id', profile.id)
          .eq('warehouse_id', toWarehouseId)
          .eq('name', sourceItem.name);
        
        if (sourceItem.barcode) {
          query = query.eq('barcode', sourceItem.barcode);
        }

        const { data: existingProduct } = await query.maybeSingle();

        if (existingProduct) {
          // Update existing
          const { error: updateDestError } = await supabase
            .from(table)
            .update({ [quantityField]: parseFloat(existingProduct[quantityField] || 0) + parseFloat(item.quantity) })
            .eq('id', existingProduct.id);
          
          if (updateDestError) throw updateDestError;
        } else {
          // Create new record in destination warehouse
          const { id, created_at, warehouse_id, ...productData } = sourceItem;
          const { error: insertDestError } = await supabase
            .from(table)
            .insert({
              ...productData,
              user_id: profile.id,
              warehouse_id: toWarehouseId,
              [quantityField]: parseFloat(item.quantity)
            });
          
          if (insertDestError) throw insertDestError;
        }
      }

      toast.success(t('warehouse.transferSuccess') || 'Перемещение успешно завершено');
      if (onStockTransferred) onStockTransferred();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center" onClick={onClose}>
        <div 
          className="bg-white w-screen h-screen overflow-hidden animate-in fade-in flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
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
              <Dropdown 
                label={t('warehouse.fromWarehouse') || 'Откуда'}
                value={fromWarehouseId}
                onChange={setFromWarehouseId}
                options={[
                  { value: '', label: t('warehouse.selectWarehouse') },
                  ...warehouses.map(w => ({ value: w.id, label: w.name }))
                ]}
              />
            </div>
            <div className="space-y-2">
              <Dropdown 
                label={t('warehouse.toWarehouse') || 'Куда'}
                value={toWarehouseId}
                onChange={setToWarehouseId}
                options={[
                  { value: '', label: t('warehouse.selectWarehouse') },
                  ...warehouses.map(w => ({ value: w.id, label: w.name }))
                ]}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{t('warehouse.itemsToTransfer') || 'Товары для перемещения'}</h3>
              <div className="flex items-center gap-4">
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
                
                {!barcodeMode && (
                  <button 
                    onClick={addItem}
                    className="text-xs font-bold text-merkez-blue hover:text-blue-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('warehouse.addItem')}
                  </button>
                )}
              </div>
            </div>

            {barcodeMode ? (
              <div className="space-y-4">
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
                </form>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-400 py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      {t('warehouse.scanBarcodeHint') || 'Skaneri məhsula yönəldin və oxudun...'}
                    </p>
                  ) : (
                    items.map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                        <div className="flex-1">
                          <h5 className="text-sm font-bold text-gray-900 leading-none mb-1">{item.productName || products.find(p => p.id === item.item_id)?.name}</h5>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.barcode || products.find(p => p.id === item.item_id)?.barcode}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('warehouse.inStock')}</p>
                            <p className="text-xs font-bold text-gray-500">{item.availableStock || products.find(p => p.id === item.item_id)?.stock_quantity || 0}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('warehouse.quantity')}</p>
                            <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const limit = item.availableStock || products.find(p => p.id === item.item_id)?.stock_quantity || 0;
                                if (parseFloat(e.target.value || 0) > limit) {
                                  toast.error(`${t('warehouse.insufficientStock') || 'Məhsul anbarda kifayət deyil'}: ${limit}`);
                                  return;
                                }
                                updateItem(item.id, 'quantity', e.target.value);
                              }}
                              className="w-16 bg-white border border-gray-100 rounded-lg px-2 py-1 text-xs font-bold text-right outline-none focus:border-merkez-blue"
                            />
                          </div>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-3 items-end animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1">
                      <Dropdown 
                        value={item.item_id}
                        onChange={(val) => updateItem(item.id, 'item_id', val)}
                        options={[
                          { value: '', label: t('warehouse.selectItem') },
                          ...products
                            .filter(p => p.warehouse_id === fromWarehouseId || !fromWarehouseId)
                            .map(p => ({ 
                              value: p.id, 
                              label: `${p.name} (${type === 'product' ? p.stock_quantity : p.quantity} ${type === 'product' ? 'шт' : p.unit})` 
                            }))
                        ]}
                        searchable={true}
                      />
                    </div>
                    <div className="w-32">
                      <input 
                        type="number"
                        placeholder={t('warehouse.quantity')}
                        value={item.quantity}
                        onChange={(e) => {
                          const prod = products.find(p => p.id === item.item_id);
                          const limit = prod ? (type === 'product' ? prod.stock_quantity : prod.quantity) : 0;
                          if (parseFloat(e.target.value || 0) > limit) {
                            toast.error(`${t('warehouse.insufficientStock') || 'Məhsul anbarda kifayət deyil'}: ${limit}`);
                            return;
                          }
                          updateItem(item.id, 'quantity', e.target.value);
                        }}
                        className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-2xl focus:ring-4 focus:ring-merkez-blue/10 focus:border-merkez-blue block p-2.5 outline-none font-bold shadow-sm transition-all"
                      />
                    </div>
                    {items.length > 1 && (
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-3 text-gray-400 hover:text-red-500 transition-colors mb-0.5"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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

        <div className="px-4 md:px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
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
