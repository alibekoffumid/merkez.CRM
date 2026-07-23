import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Hammer, Box, User, AlertCircle, Loader2, Package, Search } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import Dropdown from '../../components/Common/Dropdown';

const SendToRepairModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  
  const [type, setType] = useState('INTERNAL_STOCK'); // 'INTERNAL_STOCK' or 'CLIENT_ITEM'
  const [products, setProducts] = useState([]);
  const [masters, setMasters] = useState([]);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemName, setItemName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [selectedMasterId, setSelectedMasterId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [newMasterName, setNewMasterName] = useState('');
  const [isAddingMaster, setIsAddingMaster] = useState(false);

  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const barcodeInputRef = React.useRef(null);

  useEffect(() => {
    if (!profile) return;
    
    const fetchInitialData = async () => {
      try {
        // 1. Sync masters from staff table first
        const { data: staffMasters } = await supabase
          .from('staff')
          .select('name')
          .eq('user_id', profile.id)
          .eq('role', 'Master');
          
        const { data: existingMastersRaw } = await supabase
          .from('warehouse_masters')
          .select('name')
          .eq('user_id', profile.id);
          
        const existingNames = new Set((existingMastersRaw || []).map(m => m.name));
        const newMasters = (staffMasters || [])
          .filter(m => !existingNames.has(m.name))
          .map(m => ({ user_id: profile.id, name: m.name }));
          
        if (newMasters.length > 0) {
          await supabase.from('warehouse_masters').insert(newMasters);
        }

        // Fetch products
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, stock_quantity, barcode')
          .eq('user_id', profile.id)
          .eq('is_deleted', false)
          .order('name');
          
        setProducts(productsData || []);
        
        // Fetch masters
        const { data: mastersData, error: mastersError } = await supabase
          .from('warehouse_masters')
          .select('id, name')
          .eq('user_id', profile.id)
          .order('name');
          
        if (!mastersError) {
          setMasters(mastersData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    fetchInitialData();
  }, [profile]);

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setItemName(prod.name);
    }
  };

  const handleAddMaster = async () => {
    if (!newMasterName.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('warehouse_masters')
        .insert([{
          user_id: profile.id,
          name: newMasterName.trim()
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setMasters([...masters, data]);
      setSelectedMasterId(data.id);
      setIsAddingMaster(false);
      setNewMasterName('');
      toast.success(i18n.language === 'az' ? 'Usta əlavə edildi' : 'Мастер добавлен');
    } catch (err) {
      console.error('Error adding master:', err);
      toast.error(i18n.language === 'az' ? 'Usta əlavə edilə bilmədi' : 'Не удалось добавить мастера');
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const barcode = barcodeBuffer.trim();
    if (!barcode) return;

    const product = (products || []).find(p => p.barcode === barcode);
    if (product) {
      handleProductSelect(product.id);
      setBarcodeBuffer('');
      toast.success(`${product.name} seçildi`);
    } else {
      toast.error(i18n.language === 'az' ? 'Məhsul tapılmadı' : 'Товар не найден');
    }
    
    // Keep focus
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMasterId) {
      toast.error(i18n.language === 'az' ? 'Usta seçilməlidir' : 'Необходимо выбрать мастера');
      return;
    }
    
    if (type === 'INTERNAL_STOCK' && !selectedProductId) {
      toast.error(i18n.language === 'az' ? 'Məhsul seçilməlidir' : 'Необходимо выбрать товар');
      return;
    }
    
    if (type === 'CLIENT_ITEM') {
      if (!clientName.trim() || !clientPhone.trim()) {
        toast.error(i18n.language === 'az' ? 'Müştərinin adı və nömrəsi daxil edilməlidir' : 'Необходимо ввести имя и номер клиента');
        return;
      }
      if (!itemName.trim()) {
        toast.error(i18n.language === 'az' ? 'Alətin adı daxil edilməlidir' : 'Необходимо ввести название инструмента');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Generate unique code
      const repairCode = `REP-${Date.now().toString().slice(-6)}`;
      
      let finalIssueDescription = issueDescription.trim();
      if (type === 'CLIENT_ITEM' && (clientName || clientPhone)) {
        finalIssueDescription = `Müştəri: ${clientName || '-'}\nTelefon: ${clientPhone || '-'}\n\nProblem: ${finalIssueDescription}`;
      }

      const { data, error } = await supabase
        .from('warehouse_repairs')
        .insert([{
          user_id: profile.id,
          repair_code: repairCode,
          type,
          product_id: type === 'INTERNAL_STOCK' ? selectedProductId : null,
          item_name: itemName,
          serial_number: serialNumber || null,
          master_id: selectedMasterId,
          issue_description: finalIssueDescription,
          status: type === 'INTERNAL_STOCK' ? 'SENT_TO_WORKSHOP' : 'RECEIVED_FROM_CUSTOMER'
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      toast.success(i18n.language === 'az' ? 'Təmirə göndərildi' : 'Передано в ремонт');
      
      // We could trigger printing the act here
      // printTransferAct(data);
      
      onSuccess();
    } catch (err) {
      console.error('Error sending to repair:', err);
      toast.error(i18n.language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Hammer className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {i18n.language === 'az' ? 'Təmirə Göndər' : 'Передача в Ремонт'}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {i18n.language === 'az' ? 'Alətin ustaya təhvil verilməsinin qeydiyyatı' : 'Регистрация передачи инструмента мастеру'}
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
            <form id="repairForm" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('INTERNAL_STOCK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                    type === 'INTERNAL_STOCK' 
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  {i18n.language === 'az' ? 'Anbar Məhsulu' : 'Товар со Склада'}
                </button>
                <button
                  type="button"
                  onClick={() => setType('CLIENT_ITEM')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                    type === 'CLIENT_ITEM' 
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  {i18n.language === 'az' ? 'Müştəri Aləti' : 'Инструмент Клиента'}
                </button>
              </div>

              <div className="space-y-4">
                {type === 'INTERNAL_STOCK' ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        {i18n.language === 'az' ? 'Məhsul Seçin' : 'Выберите Товар'} *
                      </label>
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
                          <div className="w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                        </div>
                      </label>
                    </div>
                    
                    {barcodeMode ? (
                      <div className="relative mb-2">
                        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={barcodeBuffer}
                          onChange={(e) => setBarcodeBuffer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleBarcodeSubmit(e);
                          }}
                          placeholder={t('warehouse.scanBarcodePlaceholder') || 'Skan edin...'}
                          className="w-full bg-gray-50 border-2 border-orange-500/30 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <Dropdown
                        value={selectedProductId}
                        onChange={handleProductSelect}
                        searchable={true}
                        options={[
                          { value: '', label: i18n.language === 'az' ? 'Məhsul seçin...' : 'Выберите товар...' },
                          ...products.map(p => ({
                            value: p.id,
                            label: `${p.name} ${p.barcode ? `(${p.barcode})` : ''} - ${i18n.language === 'az' ? 'Qalıq' : 'Остаток'}: ${p.stock_quantity}`
                          }))
                        ]}
                        buttonClassName="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                          {i18n.language === 'az' ? 'Müştərinin Adı, Soyadı' : 'Имя, Фамилия Клиента'} *
                        </label>
                        <input
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder={i18n.language === 'az' ? 'Məsələn: İlkin Əliyev' : 'Например: Иван Иванов'}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                          {i18n.language === 'az' ? 'Əlaqə Nömrəsi' : 'Номер Телефона'} *
                        </label>
                        <input
                          type="tel"
                          required
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+994 50 123 45 67"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                        {i18n.language === 'az' ? 'Alətin Adı' : 'Название Инструмента'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder={i18n.language === 'az' ? 'Məsələn: Yamaha Gitara' : 'Например: Гитара Yamaha'}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    {i18n.language === 'az' ? 'Seriya Nömrəsi (İxtiyari)' : 'Серийный Номер (Необязательно)'}
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="S/N..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    {i18n.language === 'az' ? 'Usta' : 'Мастер'} *
                  </label>
                  <div className="flex gap-2">
                    {isAddingMaster ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newMasterName}
                          onChange={(e) => setNewMasterName(e.target.value)}
                          placeholder={i18n.language === 'az' ? 'Ustanın adı' : 'Имя мастера'}
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddMaster}
                          className="px-4 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                        >
                          {i18n.language === 'az' ? 'Əlavə Et' : 'Добавить'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingMaster(false)}
                          className="px-3 py-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <Dropdown
                            value={selectedMasterId}
                            onChange={setSelectedMasterId}
                            options={[
                              { value: '', label: i18n.language === 'az' ? 'Usta seçin...' : 'Выберите мастера...' },
                              ...masters.map(m => ({ value: m.id, label: m.name }))
                            ]}
                            buttonClassName="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingMaster(true)}
                          className="px-4 py-3 bg-orange-100 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-200 transition-colors"
                        >
                          + {i18n.language === 'az' ? 'Yeni' : 'Новый'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    {i18n.language === 'az' ? 'Problem / Təmir səbəbi' : 'Проблема / Причина ремонта'} *
                  </label>
                  <textarea
                    required
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={3}
                    placeholder={i18n.language === 'az' ? 'Problemi ətraflı təsvir edin...' : 'Опишите проблему подробно...'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
            >
              {t('common.cancel') || 'Ləğv et'}
            </button>
            <button
              form="repairForm"
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {i18n.language === 'az' ? 'Yadda Saxla' : 'Сохранить'}
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default SendToRepairModal;
