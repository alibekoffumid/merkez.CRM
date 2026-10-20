import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, CheckCircle2, Box, RefreshCw, Loader2, Plus, Trash2, Banknote } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';
import MultiImageUpload from '../../components/Common/MultiImageUpload';

const ReturnFromRepairModal = ({ isOpen, onClose, repair, onSuccess, initialReturnQty }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  
  const [masterFee, setMasterFee] = useState('');
  const [parts, setParts] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [photoAfter, setPhotoAfter] = useState([]);

  // Compute total repair quantity and clean name
  const currentTotalQty = (() => {
    if (repair?.quantity != null && Number(repair.quantity) > 0) {
      return Math.floor(Number(repair.quantity));
    }
    const match = repair?.item_name?.match(/\(x(\d+)\)/);
    if (match) return parseInt(match[1], 10);
    return 1;
  })();

  const cleanItemName = (repair?.item_name || '').replace(/\s*\(x\d+\)\s*/g, '').trim();

  const [returnQty, setReturnQty] = useState(initialReturnQty || (currentTotalQty > 1 ? 1 : 1));

  useEffect(() => {
    if (repair) {
      if (initialReturnQty != null) {
        setReturnQty(Math.min(currentTotalQty, Math.max(1, initialReturnQty)));
      } else {
        setReturnQty(currentTotalQty > 1 ? 1 : 1);
      }
    }
  }, [repair, initialReturnQty, currentTotalQty]);

  useEffect(() => {
    if (!profile) return;
    
    const fetchProducts = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, barcode, cost_price, stock_quantity')
          .eq('user_id', profile.id)
          .eq('is_deleted', false)
          .gt('stock_quantity', 0) // only products in stock
          .order('name');
          
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    
    fetchProducts();
  }, [profile]);

  const handleAddPart = () => {
    if (!selectedPartId || !partQuantity || parseFloat(partQuantity) <= 0) return;
    
    const product = products.find(p => p.id === selectedPartId);
    if (!product) return;
    
    if (parseFloat(partQuantity) > product.stock_quantity) {
      toast.error(i18n.language === 'az' ? 'Anbarda kifayət qədər yoxdur' : 'Недостаточно на складе');
      return;
    }
    
    setParts([...parts, {
      product_id: product.id,
      name: product.name,
      quantity: parseFloat(partQuantity),
      cost_price: product.cost_price || 0
    }]);
    
    setSelectedPartId('');
    setPartQuantity('1');
  };

  const handleRemovePart = (index) => {
    const newParts = [...parts];
    newParts.splice(index, 1);
    setParts(newParts);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    
    const returnToStock = repair.targetStatus === 'RECEIVED_FROM_WORKSHOP' && repair.type === 'INTERNAL_STOCK';
    const parsedReturnQty = Math.min(currentTotalQty, Math.max(1, parseInt(returnQty, 10) || 1));
    const remainingQty = currentTotalQty - parsedReturnQty;

    try {
      const fee = parseFloat(masterFee) || 0;
      let totalPartsCost = 0;
      
      let targetCompletedRepairId = repair.id;

      // 1. Partial Return scenario (remainingQty > 0)
      if (remainingQty > 0) {
        const returnCode = `${repair.repair_code}-R${Date.now().toString().slice(-4)}`;
        const returnedItemName = parsedReturnQty > 1 ? `${cleanItemName} (x${parsedReturnQty})` : cleanItemName;
        
        const insertPayload = {
          user_id: profile.id,
          repair_code: returnCode,
          type: repair.type,
          product_id: repair.product_id || null,
          item_name: returnedItemName,
          quantity: parsedReturnQty,
          serial_number: repair.serial_number || null,
          master_id: repair.master_id || null,
          issue_description: `${repair.issue_description || ''}\n[${new Date().toLocaleDateString()}: ${parsedReturnQty} ədəd təhvil alındı]`.trim(),
          status: repair.targetStatus || 'RECEIVED_FROM_WORKSHOP',
          master_fee: fee,
          parts_cost: 0,
          photo_before: repair.photo_before || null,
          photo_after: photoAfter && photoAfter.length > 0 ? JSON.stringify(photoAfter) : null
        };

        let newRepairData = null;
        const insertRes = await supabase
          .from('warehouse_repairs')
          .insert([insertPayload])
          .select()
          .single();

        if (insertRes.error && (insertRes.error.code === '42703' || insertRes.error.message?.includes('quantity'))) {
          const fallbackPayload = { ...insertPayload };
          delete fallbackPayload.quantity;
          const retryRes = await supabase
            .from('warehouse_repairs')
            .insert([fallbackPayload])
            .select()
            .single();
          if (retryRes.error) throw retryRes.error;
          newRepairData = retryRes.data;
        } else if (insertRes.error) {
          throw insertRes.error;
        } else {
          newRepairData = insertRes.data;
        }

        targetCompletedRepairId = newRepairData?.id || repair.id;

        // Update remaining items on the original repair
        const remainingItemName = remainingQty > 1 ? `${cleanItemName} (x${remainingQty})` : cleanItemName;
        const updateRemainingPayload = {
          item_name: remainingItemName,
          quantity: remainingQty,
          issue_description: `${repair.issue_description || ''}\n[${new Date().toLocaleDateString()}: ${parsedReturnQty} ədəd təhvil alındı, qaldı: ${remainingQty} ədəd]`.trim()
        };

        const updateOrigRes = await supabase
          .from('warehouse_repairs')
          .update(updateRemainingPayload)
          .eq('id', repair.id);

        if (updateOrigRes.error && (updateOrigRes.error.code === '42703' || updateOrigRes.error.message?.includes('quantity'))) {
          delete updateRemainingPayload.quantity;
          await supabase
            .from('warehouse_repairs')
            .update(updateRemainingPayload)
            .eq('id', repair.id);
        }
      }

      // 2. Calculate parts and insert them
      if (parts.length > 0) {
        const partsDataToInsert = parts.map(p => {
          totalPartsCost += (p.cost_price * p.quantity);
          return {
            user_id: profile.id,
            repair_id: targetCompletedRepairId,
            product_id: p.product_id,
            quantity: p.quantity,
            cost_price: p.cost_price
          };
        });
        
        const { error: partsError } = await supabase
          .from('warehouse_repair_parts')
          .insert(partsDataToInsert);
          
        if (partsError) throw partsError;
        
        // Subtract quantities from products
        for (const p of parts) {
          const prod = products.find(x => x.id === p.product_id);
          if (prod) {
            const newQty = prod.stock_quantity - p.quantity;
            await supabase
              .from('products')
              .update({ stock_quantity: newQty })
              .eq('id', p.product_id);
          }
        }

        // If partial return, update parts_cost on new record
        if (remainingQty > 0 && targetCompletedRepairId !== repair.id) {
          await supabase
            .from('warehouse_repairs')
            .update({ parts_cost: totalPartsCost })
            .eq('id', targetCompletedRepairId);
        }
      }

      // 3. Add master fee to master's balance
      if (fee > 0 && repair.master_id) {
        const { data: masterData } = await supabase
          .from('warehouse_masters')
          .select('balance')
          .eq('id', repair.master_id)
          .single();
          
        const newBalance = (parseFloat(masterData?.balance || 0) + fee);
        
        await supabase
          .from('warehouse_masters')
          .update({ balance: newBalance })
          .eq('id', repair.master_id);
      }

      // 4. If INTERNAL_STOCK and returning to stock, update cost_price of the repaired item
      if (repair.type === 'INTERNAL_STOCK' && returnToStock && repair.product_id) {
        const { data: repairedProd } = await supabase
          .from('products')
          .select('cost_price, stock_quantity')
          .eq('id', repair.product_id)
          .single();
          
        if (repairedProd) {
          const extraCost = fee + totalPartsCost;
          const newCostPrice = parseFloat(repairedProd.cost_price || 0) + (extraCost / (repairedProd.stock_quantity || 1));
          
          await supabase
            .from('products')
            .update({ cost_price: newCostPrice })
            .eq('id', repair.product_id);
        }
      }

      // 5. Full Return scenario (remainingQty === 0)
      if (remainingQty === 0) {
        const finalItemName = currentTotalQty > 1 ? `${cleanItemName} (x${currentTotalQty})` : cleanItemName;
        const updatePayload = {
          status: repair.targetStatus || (returnToStock ? 'RECEIVED_FROM_WORKSHOP' : 'READY'),
          master_fee: (parseFloat(repair.master_fee) || 0) + fee,
          parts_cost: (parseFloat(repair.parts_cost) || 0) + totalPartsCost,
          photo_after: photoAfter && photoAfter.length > 0 ? JSON.stringify(photoAfter) : repair.photo_after,
          quantity: currentTotalQty,
          item_name: finalItemName
        };

        let { error: updateError } = await supabase
          .from('warehouse_repairs')
          .update(updatePayload)
          .eq('id', repair.id);

        if (updateError && (updateError.code === '42703' || updateError.message?.includes('quantity'))) {
          delete updatePayload.quantity;
          const retry = await supabase
            .from('warehouse_repairs')
            .update(updatePayload)
            .eq('id', repair.id);
          updateError = retry.error;
        }
          
        if (updateError) throw updateError;
      }
      
      const successMsg = remainingQty > 0
        ? (i18n.language === 'az' ? `${parsedReturnQty} ədəd təhvil alındı, təmirdə ${remainingQty} ədəd qaldı` : i18n.language === 'ru' ? `Принято ${parsedReturnQty} шт., в ремонте осталось ${remainingQty} шт.` : `Received ${parsedReturnQty} pcs, ${remainingQty} pcs remain in repair`)
        : (i18n.language === 'az' ? 'Bütün alətlər təhvil alındı və təmir tamamlandı' : i18n.language === 'ru' ? 'Все инструменты приняты, ремонт завершен' : 'All tools received and repair completed');

      toast.success(successMsg);
      onSuccess();
    } catch (err) {
      console.error('Error completing repair:', err);
      toast.error(i18n.language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !repair) return null;

  const totalPartsCost = parts.reduce((sum, p) => sum + (p.cost_price * p.quantity), 0);
  const totalCost = (parseFloat(masterFee) || 0) + totalPartsCost;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {i18n.language === 'az' ? 'Təmirdən Qəbul' : 'Прием из Ремонта'}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {repair.repair_code} • {cleanItemName} {currentTotalQty > 1 ? `(Cəmi: ${currentTotalQty} ədəd)` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 p-2 rounded-xl transition-all shadow-sm border border-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            
            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 mb-6">
              <h3 className="text-xs font-black text-orange-800 uppercase tracking-widest mb-2">
                {i18n.language === 'az' ? 'Problem Detalları' : 'Детали проблемы'}
              </h3>
              <p className="text-sm font-medium text-gray-800">{repair.issue_description}</p>
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                <span className="font-bold">{i18n.language === 'az' ? 'Usta:' : 'Мастер:'}</span> {repair.master?.name || '-'}
              </div>
            </div>

            <form id="returnForm" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Return Quantity Selector when total in repair > 1 */}
              {currentTotalQty > 1 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200/90 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-xs font-black text-orange-950 uppercase tracking-wider">
                        {i18n.language === 'az' ? 'Qaytarılan Alət Sayı' : i18n.language === 'ru' ? 'Количество возвращаемых инструментов' : 'Quantity Being Returned'}
                      </label>
                      <p className="text-xs text-orange-700 font-medium mt-0.5">
                        {i18n.language === 'az' ? `Təmirdə olan ümumi say: ${currentTotalQty} ədəd` : i18n.language === 'ru' ? `Всего в ремонте: ${currentTotalQty} шт.` : `Total in repair: ${currentTotalQty} pcs`}
                      </p>
                    </div>
                    <div className="flex items-center bg-white border border-orange-200 rounded-xl p-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setReturnQty(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 text-orange-950 font-black text-base transition-all active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={currentTotalQty}
                        value={returnQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val)) setReturnQty(1);
                          else setReturnQty(Math.min(currentTotalQty, Math.max(1, val)));
                        }}
                        className="w-14 text-center font-black text-base text-gray-900 bg-transparent outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setReturnQty(prev => Math.min(currentTotalQty, prev + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-100 text-orange-950 font-black text-base transition-all active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Quick selection chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-orange-100/80">
                    <span className="text-[11px] font-bold text-orange-800">
                      {i18n.language === 'az' ? 'Tez seçim:' : i18n.language === 'ru' ? 'Быстрый выбор:' : 'Quick pick:'}
                    </span>
                    {Array.from({ length: currentTotalQty }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setReturnQty(num)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          returnQty === num
                            ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-600/30'
                            : 'bg-white/90 hover:bg-white text-orange-900 border border-orange-200 shadow-2xs'
                        }`}
                      >
                        {num === currentTotalQty 
                          ? (i18n.language === 'az' ? `Hamısı (${num})` : i18n.language === 'ru' ? `Все (${num})` : `All (${num})`)
                          : `${num} ${i18n.language === 'az' ? 'ədəd' : i18n.language === 'ru' ? 'шт.' : 'pcs'}`
                        }
                      </button>
                    ))}
                  </div>

                  {/* Dynamic helper notification */}
                  <div className="mt-3 p-2.5 bg-white/90 rounded-xl border border-orange-100 text-xs">
                    {returnQty < currentTotalQty ? (
                      <span className="font-bold text-amber-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                        <span>
                          {i18n.language === 'az' 
                            ? `${returnQty} ədəd təhvil alınır. Qalan ${currentTotalQty - returnQty} ədəd təmirdə qalmağa davam edəcək.`
                            : i18n.language === 'ru'
                            ? `Принимается ${returnQty} шт. Оставшиеся ${currentTotalQty - returnQty} шт. останутся в ремонте у мастера.`
                            : `Returning ${returnQty} pcs. Remaining ${currentTotalQty - returnQty} pcs will stay in repair.`}
                        </span>
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span>
                          {i18n.language === 'az'
                            ? `Bütün ${currentTotalQty} ədəd alət təhvil alınır və təmir tamamlanır.`
                            : i18n.language === 'ru'
                            ? `Все ${currentTotalQty} шт. принимаются, ремонт будет полностью закрыт.`
                            : `All ${currentTotalQty} pcs returned and repair completed.`}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  {i18n.language === 'az' ? 'Usta Haqqı (₼)' : 'Оплата Мастеру (₼)'} *
                </label>
                <div className="relative">
                  <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={masterFee}
                    onChange={(e) => setMasterFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 font-medium">
                  {i18n.language === 'az' ? 'Bu məbləğ ustanın balansına borc olaraq yazılacaq.' : 'Эта сумма будет записана как долг на баланс мастера.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  {i18n.language === 'az' ? 'İstifadə olunan ehtiyat hissələri (İxtiyari)' : 'Использованные запчасти (Необязательно)'}
                </label>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <Dropdown
                      value={selectedPartId}
                      onChange={setSelectedPartId}
                      searchable={true}
                      options={[
                        { value: '', label: i18n.language === 'az' ? 'Məhsul seçin...' : 'Выберите товар...' },
                        ...products.map(p => ({
                          value: p.id,
                          label: `${p.name} - ₼${p.cost_price} (${i18n.language === 'az' ? 'Qalıq' : 'Остаток'}: ${p.stock_quantity})`
                        }))
                      ]}
                      buttonClassName="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    />
                  </div>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(e.target.value)}
                    className="w-24 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    placeholder="Say"
                  />
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {parts.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    {/* table is inside here */}
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-100/50">
                        <tr>
                          <th className="p-3 font-bold text-gray-600">{i18n.language === 'az' ? 'Ad' : 'Название'}</th>
                          <th className="p-3 font-bold text-gray-600 text-right">{i18n.language === 'az' ? 'Say' : 'Кол-во'}</th>
                          <th className="p-3 font-bold text-gray-600 text-right">{i18n.language === 'az' ? 'Məbləğ' : 'Сумма'}</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parts.map((p, i) => (
                          <tr key={i} className="bg-white">
                            <td className="p-3 font-bold">{p.name}</td>
                            <td className="p-3 text-right text-gray-600">{p.quantity}</td>
                            <td className="p-3 text-right font-black">₼{(p.cost_price * p.quantity).toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePart(i)}
                                className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50/50">
                          <td colSpan="2" className="p-3 text-right font-bold text-gray-500">{i18n.language === 'az' ? 'Cəmi Ehtiyat Hissələri:' : 'Всего Запчастей:'}</td>
                          <td className="p-3 text-right font-black text-gray-900">₼{totalPartsCost.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

                <div>
                  <MultiImageUpload 
                    value={photoAfter} 
                    onChange={setPhotoAfter} 
                    label={i18n.language === 'az' ? 'TƏMİRDƏN SONRA FOTO (İXTİYARİ)' : 'ФОТО ПОСЛЕ РЕМОНТА (НЕОБЯЗАТЕЛЬНО)'}
                    bucketName="repairs"
                  />
                </div>

              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-blue-900 tracking-tight">
                    {i18n.language === 'az' ? 'Yekun Xərc' : 'Итоговый Расход'}
                  </h3>
                  <p className="text-xs text-blue-700 font-medium mt-0.5">
                    {i18n.language === 'az' ? 'Usta + Ehtiyat hissələri' : 'Мастер + Запчасти'}
                  </p>
                </div>
                <div className="text-2xl font-black text-blue-700">
                  ₼{totalCost.toFixed(2)}
                </div>
              </div>

            </form>
          </div>

          <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
            >
              {t('common.cancel') || 'Ləğv et'}
            </button>
            <div className="flex-1 flex justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {i18n.language === 'az' ? 'Yadda Saxla' : 'Сохранить'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default ReturnFromRepairModal;
