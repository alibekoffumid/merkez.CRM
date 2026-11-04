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
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Platform Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {i18n.language === 'az' ? 'İCARƏDƏN TƏHVİL AL' : 'ПРИНЯТЬ ИЗ АРЕНДЫ'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    № {rental.rental_code}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {rental.client_name} • {rental.product_name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors border border-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
            {/* Rental Summary Card */}
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">{i18n.language === 'az' ? 'Məhsul' : 'Товар'}</span>
                <span className="font-black text-gray-900">{rental.product_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">{i18n.language === 'az' ? 'Müştəri' : 'Клиент'}</span>
                <span className="font-bold text-gray-800">{rental.client_name} ({rental.client_phone})</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">{i18n.language === 'az' ? 'Girov Depoziti' : 'Залог'}</span>
                <span className="font-black text-emerald-600 text-base">₼{totalDeposit.toFixed(2)}</span>
              </div>
            </div>

            {/* Condition Check */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2 px-0.5">
                {i18n.language === 'az' ? 'Alətin Fiziki Vəziyyəti' : 'Состояние возвращенного инструмента'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleConditionChange('GOOD')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                    conditionStatus === 'GOOD'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-black">{i18n.language === 'az' ? 'Saz / Qüsursuz' : 'Исправен / Без дефектов'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConditionChange('DAMAGED')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                    conditionStatus === 'DAMAGED'
                      ? 'border-red-500 bg-red-50 text-red-800 shadow-sm'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-black">{i18n.language === 'az' ? 'Zədəli / Qüsurlu' : 'Поврежден / Дефект'}</span>
                </button>
              </div>
            </div>

            {/* Return Photo */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                {i18n.language === 'az' ? 'Təhvil zamanı foto (İstəyə görə)' : 'Фото при возврате (опционально)'}
              </label>

              {returnPhoto ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-black">
                  <img src={returnPhoto} alt="Return photo" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setReturnPhoto('')}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-emerald-500 transition-all"
                >
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Camera className="w-4 h-4 text-emerald-600" />}
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
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                <label className="block text-xs font-black text-red-900">
                  {i18n.language === 'az' ? 'Zədəyə görə girovdan tutulan məbləğ (AZN)' : 'Удержание из залога за повреждение (AZN)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-black text-red-600">₼</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalDeposit}
                    value={deductionAmount}
                    onChange={(e) => handleDeductionChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-red-300 rounded-xl text-sm font-black text-red-700 outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
            )}

            {/* Refund to client */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase text-emerald-900 block">
                  {i18n.language === 'az' ? 'Müştəriyə Qaytarılacaq Girov' : 'Залог к возврату клиенту'}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {conditionStatus === 'GOOD' ? 'Tam məbləğ geri qaytarılır' : 'Tutulma çıxıldıqdan sonra qalan məbləğ'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-700">
                  ₼{Number(returnedDeposit).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 px-0.5">
                {i18n.language === 'az' ? 'Təhvil Qeydləri' : 'Примечания при возврате'}
              </label>
              <input
                type="text"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Qeyd..."
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
              >
                {i18n.language === 'az' ? 'İmtina' : 'Отмена'}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn-gradient-primary px-7 py-3 rounded-xl text-xs font-black shadow-lg shadow-merkez-blue/20 active:scale-95 transition-all flex items-center gap-2 text-white uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>{i18n.language === 'az' ? 'TƏHVİL AL VƏ QAYTAR' : 'ПРИНЯТЬ И ВЕРНУТЬ'}</span>
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
