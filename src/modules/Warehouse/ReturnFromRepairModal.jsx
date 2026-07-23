import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, CheckCircle2, Box, RefreshCw, Loader2, Plus, Trash2, Banknote } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';

const ReturnFromRepairModal = ({ isOpen, onClose, repair, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  
  const [masterFee, setMasterFee] = useState('');
  const [parts, setParts] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');

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
    e.preventDefault();
    setLoading(true);
    
    const returnToStock = repair.targetStatus === 'RECEIVED_FROM_WORKSHOP' && repair.type === 'INTERNAL_STOCK';
    
    try {
      const fee = parseFloat(masterFee) || 0;
      let totalPartsCost = 0;
      
      // 1. Calculate total parts cost and insert them
      if (parts.length > 0) {
        const partsDataToInsert = parts.map(p => {
          totalPartsCost += (p.cost_price * p.quantity);
          return {
            user_id: profile.id,
            repair_id: repair.id,
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
          const newQty = prod.stock_quantity - p.quantity;
          
          await supabase
            .from('products')
            .update({ stock_quantity: newQty })
            .eq('id', p.product_id);
        }
      }

      // 2. Add master fee to master's balance
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

      // 3. If INTERNAL_STOCK and returning to stock, update cost_price of the repaired item
      if (repair.type === 'INTERNAL_STOCK' && returnToStock && repair.product_id) {
        const { data: repairedProd } = await supabase
          .from('products')
          .select('cost_price, stock_quantity')
          .eq('id', repair.product_id)
          .single();
          
        if (repairedProd) {
          // Add fee and parts cost to the cost price
          // In a real accounting system, average cost is recalculated based on quantity
          // For simplicity and logic of repairing ONE item:
          // Since only one item is repaired, we just add the absolute extra cost divided by total stock (to average it)
          // OR we can just add it to the cost_price. It's better to average it or just add flat if qty=1
          const extraCost = fee + totalPartsCost;
          const newCostPrice = parseFloat(repairedProd.cost_price || 0) + (extraCost / (repairedProd.stock_quantity || 1));
          
          await supabase
            .from('products')
            .update({ cost_price: newCostPrice })
            .eq('id', repair.product_id);
        }
      }

      // 4. Update repair status
      const { error: updateError } = await supabase
        .from('warehouse_repairs')
        .update({
          status: repair.targetStatus || (returnToStock ? 'RECEIVED_FROM_WORKSHOP' : 'READY'),
          master_fee: fee,
          parts_cost: totalPartsCost
        })
        .eq('id', repair.id);
        
      if (updateError) throw updateError;
      
      toast.success(i18n.language === 'az' ? 'Uğurla tamamlandı' : 'Успешно завершено');
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
                  {repair.repair_code} • {repair.item_name}
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

            <form id="returnForm" className="space-y-6">
              
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
