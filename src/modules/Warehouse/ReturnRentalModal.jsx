import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Camera,
  Upload,
  CheckCircle2,
  DollarSign,
  User,
  Package,
  Calendar,
  Loader2,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import { rentalService } from '../../services/rentalService';
import { useUser } from '../../core/UserContext';

const ReturnRentalModal = ({
  isOpen,
  onClose,
  rental,
  warehouseId,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();

  const [loading, setLoading] = useState(false);
  const [conditionStatus, setConditionStatus] = useState('GOOD'); // 'GOOD' | 'DAMAGED'
  const [conditionNotes, setConditionNotes] = useState('');
  const [returnedDeposit, setReturnedDeposit] = useState(rental?.deposit_amount || 0);
  const [deductionAmount, setDeductionAmount] = useState(0);
  const [returnPhoto, setReturnPhoto] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const photoInputRef = useRef(null);

  if (!isOpen || !rental) return null;

  const totalDeposit = Number(rental.deposit_amount || 0);

  const handleConditionChange = (status) => {
    setConditionStatus(status);
    if (status === 'GOOD') {
      setDeductionAmount(0);
      setReturnedDeposit(totalDeposit);
      setConditionNotes('Alət saz və işlək vəziyyətdə təhvil alındı.');
    } else {
      setConditionNotes('Alətdə zədə və ya qüsur aşkarlandı.');
    }
  };

  const handleDeductionChange = (val) => {
    const num = Math.max(0, Math.min(totalDeposit, Number(val) || 0));
    setDeductionAmount(num);
    setReturnedDeposit(Math.max(0, totalDeposit - num));
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const url = await rentalService.uploadMedia(file, 'rentals/returns');
      if (url) {
        setReturnPhoto(url);
        toast.success(i18n.language === 'az' ? 'Təhvil şəkli yükləndi' : 'Фото возврата загружено');
      }
    } catch (e) {
      toast.error(e.message || 'Yükləmə xətası');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await rentalService.returnRental(rental.id, {
        returnedByStaff: profile?.email || profile?.name || 'Kassir',
        returnConditionNotes: conditionNotes,
        instrumentPhotoAfter: returnPhoto || null,
        returnedDepositAmount: returnedDeposit,
        conditionStatus,
        productId: rental.product_id,
        quantity: rental.quantity || 1,
        warehouseId: warehouseId || rental.warehouse_id,
        userId: profile?.id,
      });

      toast.success(
        i18n.language === 'az'
          ? `Alət təhvil alındı! Qaytarılan girov: ₼${returnedDeposit}`
          : `Инструмент принят! Возвращенный залог: ₼${returnedDeposit}`
      );

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Return rental error:', err);
      toast.error(err.message || 'Təhvil qeydiyyatı xətası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-xl bg-white dark:bg-[#0f111a] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                <RotateCcw className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {i18n.language === 'az' ? 'İcarədən Təhvil Al' : 'Принять из аренды'}
                </h3>
                <p className="text-xs text-emerald-200 font-medium">
                  № {rental.rental_code} • {rental.client_name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Rental Summary Card */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-500 uppercase">{i18n.language === 'az' ? 'Məhsul' : 'Товар'}</span>
                <span className="font-black text-gray-900 dark:text-white">{rental.product_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-500 uppercase">{i18n.language === 'az' ? 'Müştəri' : 'Клиент'}</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{rental.client_name} ({rental.client_phone})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-500 uppercase">{i18n.language === 'az' ? 'Girov Depoziti' : 'Залог'}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₼{totalDeposit.toFixed(2)}</span>
              </div>
            </div>

            {/* Condition Check */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                {i18n.language === 'az' ? 'Alətin Fiziki Vəziyyəti' : 'Состояние возвращенного инструмента'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleConditionChange('GOOD')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                    conditionStatus === 'GOOD'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{i18n.language === 'az' ? 'Saz / Qüsursuz' : 'Исправен / Без дефектов'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConditionChange('DAMAGED')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                    conditionStatus === 'DAMAGED'
                      ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>{i18n.language === 'az' ? 'Zədəli / Qüsurlu' : 'Поврежден / Дефект'}</span>
                </button>
              </div>
            </div>

            {/* Return Photo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {i18n.language === 'az' ? 'Təhvil zamanı foto (İstəyə görə)' : 'Фото при возврате (опционально)'}
              </label>

              {returnPhoto ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-black">
                  <img src={returnPhoto} alt="Return photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setReturnPhoto('')}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-all"
                >
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <span>{i18n.language === 'az' ? 'Təhvil fotosu çək / yüklə' : 'Сделать фото возврата'}</span>
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              />
            </div>

            {/* Damage deduction if damaged */}
            {conditionStatus === 'DAMAGED' && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-red-900 dark:text-red-300">
                  {i18n.language === 'az' ? 'Zədəyə görə girovdan tutulan məbləğ (AZN)' : 'Удержание из залога за повреждение (AZN)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-red-600">₼</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalDeposit}
                    value={deductionAmount}
                    onChange={(e) => handleDeductionChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-red-300 rounded-lg text-sm font-bold text-red-700 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Refund to client */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300 block">
                    {i18n.language === 'az' ? 'Müştəriyə Qaytarılacaq Girov' : 'Залог к возврату клиенту'}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {conditionStatus === 'GOOD' ? 'Tam məbləğ geri qaytarılır' : 'Tutulma çıxıldıqdan sonra qalan məbləğ'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    ₼{Number(returnedDeposit).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {i18n.language === 'az' ? 'Təhvil Qeydləri' : 'Примечания при возврате'}
              </label>
              <input
                type="text"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Qeyd..."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 outline-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold"
              >
                {i18n.language === 'az' ? 'İmtina' : 'Отмена'}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>{i18n.language === 'az' ? 'TƏHVİL AL VƏ ANBARA QAYTAR' : 'ПРИНЯТЬ И ВЕРНУТЬ НА СКЛАД'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ReturnRentalModal;

