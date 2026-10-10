import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Banknote, History, RefreshCw, Edit3, Trash2, CheckCircle2, Plus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import ConfirmModal from '../../components/Common/ConfirmModal';

const MastersModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { profile, currentStaff } = useUser();
  const isAdmin = !currentStaff || currentStaff?.role === 'Admin' || currentStaff?.role?.toLowerCase() === 'admin';

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [payingMasterId, setPayingMasterId] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  // Edit / Add state
  const [editingMaster, setEditingMaster] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmMaster, setDeleteConfirmMaster] = useState(null);

  const fetchMasters = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Sync masters from staff table
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

      const { data, error } = await supabase
        .from('warehouse_masters')
        .select('*')
        .eq('user_id', profile.id)
        .order('name');
        
      if (!error && data) {
        setMasters(data);
      }
    } catch (err) {
      console.error('Error fetching masters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMasters();
    }
  }, [isOpen, profile]);

  const handlePay = async (masterId, currentBalance) => {
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    const amount = parseFloat(payAmount);
    if (amount > currentBalance) {
      toast.error(i18n.language === 'az' ? 'Məbləğ borcdan çox ola bilməz' : 'Сумма не может превышать долг');
      return;
    }

    try {
      const newBalance = currentBalance - amount;
      
      const { error } = await supabase
        .from('warehouse_masters')
        .update({ balance: newBalance })
        .eq('id', masterId);
        
      if (error) throw error;
      
      toast.success(i18n.language === 'az' ? 'Ödəniş qeydə alındı' : 'Оплата зарегистрирована');
      
      setPayingMasterId(null);
      setPayAmount('');
      fetchMasters();
    } catch (err) {
      console.error('Error paying master:', err);
      toast.error(i18n.language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка');
    }
  };

  const handleStartEdit = (master) => {
    if (!isAdmin) {
      toast.error(i18n.language === 'az' ? 'Yalnız admin redaktə edə bilər' : 'Только администратор имеет право редактировать');
      return;
    }
    setEditingMaster(master);
    setEditName(master.name || '');
    setEditPhone(master.phone || '');
    setEditBalance(master.balance !== undefined && master.balance !== null ? master.balance.toString() : '0');
  };

  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setEditingMaster({ id: 'new', name: '', phone: '', balance: 0 });
    setEditName('');
    setEditPhone('');
    setEditBalance('0');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(i18n.language === 'az' ? 'Yalnız admin redaktə edə bilər' : 'Только администратор имеет право редактировать');
      return;
    }
    if (!editName.trim()) {
      toast.error(i18n.language === 'az' ? 'Ustanın adı daxil edilməlidir' : 'Введите имя мастера');
      return;
    }

    const parsedBalance = parseFloat(editBalance) || 0;
    const newName = editName.trim();
    const newPhone = editPhone.trim() || null;

    setIsSaving(true);
    try {
      if (editingMaster.id === 'new') {
        const { error: insertError } = await supabase
          .from('warehouse_masters')
          .insert([{
            user_id: profile.id,
            name: newName,
            phone: newPhone,
            balance: parsedBalance
          }]);

        if (insertError) throw insertError;

        // Also add to staff table for consistency
        await supabase
          .from('staff')
          .insert([{
            user_id: profile.id,
            name: newName,
            phone: newPhone,
            role: 'Master',
            status: 'Active'
          }]);

        toast.success(i18n.language === 'az' ? 'Yeni usta əlavə edildi' : 'Мастер добавлен');
      } else {
        const oldName = editingMaster.name;

        // 1. Update warehouse_masters
        const { error: masterError } = await supabase
          .from('warehouse_masters')
          .update({
            name: newName,
            phone: newPhone,
            balance: parsedBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMaster.id);

        if (masterError) throw masterError;

        // 2. Keep staff table in sync if master was synced from staff
        if (oldName !== newName || newPhone) {
          await supabase
            .from('staff')
            .update({
              name: newName,
              phone: newPhone
            })
            .eq('user_id', profile.id)
            .eq('role', 'Master')
            .eq('name', oldName);
        }

        toast.success(i18n.language === 'az' ? 'Usta məlumatları yeniləndi' : 'Данные мастера обновлены');
      }

      setEditingMaster(null);
      fetchMasters();
    } catch (err) {
      console.error('Error saving master:', err);
      toast.error(err.message || (i18n.language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMaster || !isAdmin) return;
    const masterToDelete = deleteConfirmMaster;
    setDeleteConfirmMaster(null);

    const loadingToast = toast.loading(i18n.language === 'az' ? 'Silinir...' : 'Удаление...');
    try {
      // 1. Delete from warehouse_masters
      const { error } = await supabase
        .from('warehouse_masters')
        .delete()
        .eq('id', masterToDelete.id);

      if (error) throw error;

      // 2. Delete from staff if exists
      await supabase
        .from('staff')
        .delete()
        .eq('user_id', profile.id)
        .eq('role', 'Master')
        .eq('name', masterToDelete.name);

      toast.success(i18n.language === 'az' ? 'Usta silindi' : 'Мастер удален', { id: loadingToast });
      if (editingMaster?.id === masterToDelete.id) {
        setEditingMaster(null);
      }
      fetchMasters();
    } catch (err) {
      console.error('Error deleting master:', err);
      toast.error(err.message || (i18n.language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка'), { id: loadingToast });
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
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {i18n.language === 'az' ? 'Usta Kartları və Maliyyə' : 'Карточки Мастеров и Финансы'}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {i18n.language === 'az' ? 'Ustaların balansı və onlara edilən ödənişlər' : 'Баланс мастеров и выплаты'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  title={i18n.language === 'az' ? 'Yeni usta əlavə et' : 'Добавить нового мастера'}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{i18n.language === 'az' ? 'Yeni Usta' : 'Новый мастер'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 p-2 rounded-xl transition-all shadow-sm border border-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : masters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-bold">{i18n.language === 'az' ? 'Usta tapılmadı' : 'Мастера не найдены'}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {masters.map(master => (
                  <div key={master.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-gray-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-lg truncate">{master.name}</h3>
                          {isAdmin && (
                            <button
                              onClick={() => handleStartEdit(master)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 rounded-lg border border-gray-200 transition-all shadow-sm flex-shrink-0"
                              title={i18n.language === 'az' ? 'Redaktə et' : 'Редактировать'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{i18n.language === 'az' ? 'Redaktə et' : 'Редактировать'}</span>
                            </button>
                          )}
                        </div>
                        {master.phone && <p className="text-sm text-gray-500 mt-0.5">{master.phone}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                          {i18n.language === 'az' ? 'Cari Borcumuz' : 'Наш долг'}
                        </p>
                        <p className={`text-xl font-black ${master.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          ₼{parseFloat(master.balance || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {payingMasterId === master.id ? (
                      <div className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <Banknote className="w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Məbləğ / Сумма"
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                        <button
                          onClick={() => handlePay(master.id, master.balance)}
                          className="px-4 py-2 bg-gray-900 text-white font-bold text-sm rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          {i18n.language === 'az' ? 'Ödə' : 'Оплатить'}
                        </button>
                        <button
                          onClick={() => setPayingMasterId(null)}
                          className="px-3 py-2 bg-white border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      master.balance > 0 && (
                        <button
                          onClick={() => {
                            setPayingMasterId(master.id);
                            setPayAmount('');
                          }}
                          className="w-full py-2.5 flex items-center justify-center gap-2 bg-orange-50 text-orange-700 font-bold text-sm rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <Banknote className="w-4 h-4" />
                          {i18n.language === 'az' ? 'Kassadan Ödəniş Et' : 'Выплатить из кассы'}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit / Add Master Modal */}
        {editingMaster && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    {editingMaster.id === 'new' ? (
                      <Plus className="w-5 h-5 text-orange-600" />
                    ) : (
                      <Edit3 className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      {editingMaster.id === 'new'
                        ? (i18n.language === 'az' ? 'Yeni Usta Əlavə Et' : 'Добавить Нового Мастера')
                        : (i18n.language === 'az' ? 'Ustanı Redaktə Et' : 'Редактировать Мастера')}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {editingMaster.id === 'new'
                        ? (i18n.language === 'az' ? 'Yeni usta kartı yaradın' : 'Создание карточки мастера')
                        : (editingMaster.name || '')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingMaster(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                    {i18n.language === 'az' ? 'Ustanın Adı' : 'Имя мастера'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={i18n.language === 'az' ? 'Məsələn: Usta Əli' : 'Например: Мастер Али'}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                    {i18n.language === 'az' ? 'Telefon Nömrəsi' : 'Номер телефона'}
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+994"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                    {i18n.language === 'az' ? 'Cari Borcumuz (Balans ₼)' : 'Наш долг (Баланс ₼)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1 px-1">
                    {i18n.language === 'az' 
                      ? 'Ustaya olan cari borc məbləğini buradan tənzimləyə bilərsiniz' 
                      : 'Здесь вы можете изменить текущий баланс задолженности перед мастером'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  {editingMaster.id !== 'new' ? (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmMaster(editingMaster)}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{i18n.language === 'az' ? 'Sil' : 'Удалить'}</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingMaster(null)}
                      className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                    >
                      {i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-orange-600/20"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{i18n.language === 'az' ? 'Saxlanılır...' : 'Сохранение...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{i18n.language === 'az' ? 'Yadda saxla' : 'Сохранить'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmMaster && (
          <ConfirmModal
            isOpen={Boolean(deleteConfirmMaster)}
            onClose={() => setDeleteConfirmMaster(null)}
            onConfirm={handleConfirmDelete}
            title={i18n.language === 'az' ? 'Ustanı Sil' : 'Удалить Мастера'}
            message={i18n.language === 'az' 
              ? `"${deleteConfirmMaster.name}" adlı ustanı silmək istədiyinizə əminsiniz?`
              : `Вы уверены, что хотите удалить мастера "${deleteConfirmMaster.name}"?`}
            confirmText={i18n.language === 'az' ? 'Bəli, Sil' : 'Да, Удалить'}
            cancelText={i18n.language === 'az' ? 'Ləğv et' : 'Отмена'}
            isDanger={true}
          />
        )}
      </div>
    </ModalPortal>
  );
};

export default MastersModal;
