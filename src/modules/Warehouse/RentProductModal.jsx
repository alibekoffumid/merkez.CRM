import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  KeyRound,
  User,
  Phone,
  CreditCard,
  Calendar,
  DollarSign,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  Printer,
  FileText,
  ShieldCheck,
  Video,
  Info,
  Loader2,
  Package
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { toast } from 'react-hot-toast';
import ModalPortal from '../../components/Common/ModalPortal';
import { rentalService } from '../../services/rentalService';

const RentProductModal = ({
  isOpen,
  onClose,
  warehouseId,
  selectedProducts = [],
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { profile } = useUser();

  const [loading, setLoading] = useState(false);

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientIdSerial, setClientIdSerial] = useState('');
  const [clientFin, setClientFin] = useState('');

  // Media
  const [idPhotoFront, setIdPhotoFront] = useState('');
  const [idPhotoBack, setIdPhotoBack] = useState('');
  const [toolMediaList, setToolMediaList] = useState([]);
  const [conditionNotes, setConditionNotes] = useState('');

  // Duration
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // Financials
  const [depositAmount, setDepositAmount] = useState(0);
  const [rentalFee, setRentalFee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Nağd');
  const [notes, setNotes] = useState('');

  // Upload loaders
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [uploadingTool, setUploadingTool] = useState(false);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const toolInputRef = useRef(null);
  const toolCameraRef = useRef(null);

  // Compute total retail value of selected products
  const totalRetailPrice = (selectedProducts || []).reduce((sum, p) => {
    const pr = Number(p.price || p.selling_price || 0);
    return sum + pr;
  }, 0);

  // Reset/populate form on open
  useEffect(() => {
    if (isOpen) {
      setDepositAmount(totalRetailPrice > 0 ? totalRetailPrice : 0);
      setRentalFee('');
      setConditionNotes('Saz vəziyyətdə, tam işlək, xarici zədəsiz.');
      setPaymentMethod('Nağd');
      setNotes('');
      setToolMediaList([]);
      setIdPhotoFront('');
      setIdPhotoBack('');
      setClientName('');
      setClientPhone('');
      setClientIdSerial('');
      setClientFin('');

      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      const in3Days = new Date();
      in3Days.setDate(in3Days.getDate() + 3);
      setDueDate(in3Days.toISOString().split('T')[0]);
    }
  }, [isOpen, totalRetailPrice]);

  if (!isOpen) return null;

  // Preset helpers for duration
  const applyDurationDays = (days) => {
    const base = startDate ? new Date(startDate) : new Date();
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().split('T')[0]);
  };

  // Upload handler for ID front/back
  const handleFileUpload = async (file, type) => {
    if (!file) return;
    try {
      if (type === 'front') setUploadingFront(true);
      if (type === 'back') setUploadingBack(true);

      const url = await rentalService.uploadMedia(file, 'rentals/passports');
      if (url) {
        if (type === 'front') setIdPhotoFront(url);
        if (type === 'back') setIdPhotoBack(url);
        toast.success(i18n.language === 'az' ? 'Şəxsiyyət vəsiqəsi şəkli yükləndi' : 'Фото паспорта загружено');
      }
    } catch (err) {
      toast.error(err.message || 'Yükləmə xətası');
    } finally {
      if (type === 'front') setUploadingFront(false);
      if (type === 'back') setUploadingBack(false);
    }
  };

  // Upload handler for tool photo/video
  const handleToolMediaUpload = async (files) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingTool(true);
      const newUrls = [];
      for (const f of Array.from(files)) {
        const url = await rentalService.uploadMedia(f, 'rentals/tools');
        if (url) newUrls.push(url);
      }
      setToolMediaList((prev) => [...prev, ...newUrls]);
      toast.success(i18n.language === 'az' ? 'Alətin foto/videosu yükləndi' : 'Медиа инструмента загружено');
    } catch (err) {
      toast.error(err.message || 'Yükləmə xətası');
    } finally {
      setUploadingTool(false);
    }
  };

  const removeToolMedia = (index) => {
    setToolMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit rental
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProducts || selectedProducts.length === 0) {
      toast.error(i18n.language === 'az' ? 'İcarəyə veriləcək məhsul seçilməyib!' : 'Товары для аренды не выбраны!');
      return;
    }

    // Required checks
    if (!clientName.trim()) {
      toast.error(i18n.language === 'az' ? 'Müştərinin Ad və Soyadını qeyd edin!' : 'Укажите Имя и Фамилию клиента!');
      return;
    }

    if (!clientPhone.trim()) {
      toast.error(i18n.language === 'az' ? 'Müştərinin əlaqə nömrəsini qeyd edin!' : 'Укажите номер телефона клиента!');
      return;
    }

    if (!clientIdSerial.trim() && !clientFin.trim()) {
      toast.error(i18n.language === 'az' ? 'Şəxsiyyət vəsiqəsinin seriya nömrəsini və ya FİN kodunu qeyd edin!' : 'Укажите данные паспорта (серия или FIN)!');
      return;
    }

    if (!idPhotoFront) {
      toast.error(i18n.language === 'az' ? 'Şəxsiyyət vəsiqəsinin ön tərəfinin şəklini yükləyin (Məcburidir)!' : 'Загрузите фото паспорта (Обязательно)!');
      return;
    }

    if (toolMediaList.length === 0) {
      toast.error(i18n.language === 'az' ? 'Alətin fiziki vəziyyətini əks etdirən ən azı 1 foto və ya video yükləyin!' : 'Загрузите фото или видео состояния инструмента (Обязательно)!');
      return;
    }

    if (!dueDate) {
      toast.error(i18n.language === 'az' ? 'İcarənin bitmə tarixini seçin!' : 'Выберите срок окончания аренды!');
      return;
    }

    if (new Date(dueDate) <= new Date(startDate)) {
      toast.error(i18n.language === 'az' ? 'Bitmə tarixi başlanğıc tarixindən sonra olmalıdır!' : 'Дата возврата должна быть позже даты начала!');
      return;
    }

    try {
      setLoading(true);

      const createdRentals = [];

      // Create a rental entry for each selected product
      for (const prod of selectedProducts) {
        const itemDeposit = Number(prod.price || prod.selling_price || 0);
        const itemRentalFee = selectedProducts.length === 1 ? Number(rentalFee) || 0 : Math.round(((Number(rentalFee) || 0) / selectedProducts.length) * 100) / 100;

        const payload = {
          warehouseId: warehouseId || prod.warehouse_id,
          productId: prod.id,
          productName: prod.name,
          productBarcode: prod.barcode || '',
          quantity: 1,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientIdSerial: clientIdSerial.trim().toUpperCase(),
          clientFin: clientFin.trim().toUpperCase(),
          clientIdPhotoFront: idPhotoFront,
          clientIdPhotoBack: idPhotoBack || null,
          instrumentPhotoBefore: toolMediaList[0] || null,
          instrumentConditionNotes: conditionNotes.trim() + (toolMediaList.length > 1 ? ` | Əlavə media: ${toolMediaList.length} fayl` : ''),
          depositAmount: selectedProducts.length === 1 ? Number(depositAmount) : itemDeposit,
          rentalFee: itemRentalFee,
          paymentMethod,
          startDate,
          dueDate,
          notes: notes.trim(),
          userId: profile?.id,
        };

        const res = await rentalService.createRental(payload);
        createdRentals.push(res);
      }

      toast.success(
        i18n.language === 'az'
          ? `Məhsul(lar) uğurla icarəyə verildi! Girov məbləği: ₼${depositAmount}`
          : `Товар(ы) успешно сданы в аренду! Залог: ₼${depositAmount}`
      );

      if (onSuccess) {
        onSuccess(createdRentals);
      }
      onClose();
    } catch (err) {
      console.error('Rent submission error:', err);
      toast.error(err.message || 'İcarə qeydiyyatı zamanı xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f111a] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                <KeyRound className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {i18n.language === 'az' ? 'Məhsulu İcarəyə Ver' : i18n.language === 'ru' ? 'Сдать товар в аренду' : 'Rent Out Product'}
                </h3>
                <p className="text-xs text-indigo-200 font-medium">
                  {i18n.language === 'az' 
                    ? `Seçilmiş ${selectedProducts.length} məhsul üçün icarə və girov qeydiyyatı` 
                    : `Оформление аренды и залога для ${selectedProducts.length} товаров`}
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
          <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-6">

            {/* 1. Selected Products Banner */}
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  {i18n.language === 'az' ? 'İcarəyə Verilən Məhsullar' : 'Сдаваемые товары'} ({selectedProducts.length})
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {i18n.language === 'az' ? 'Ümumi Dəyər (Girov):' : 'Общая стоимость (Залог):'}{' '}
                  <strong className="text-indigo-600 dark:text-indigo-300 text-sm">₼{totalRetailPrice.toFixed(2)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {selectedProducts.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-400 font-mono">{p.barcode || 'Barkodsuz'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-gray-900 dark:text-white">₼{(p.price || p.selling_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Customer Information (Mandatory) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">
                  {i18n.language === 'az' ? 'Müştəri Məlumatları (Məcburidir)' : 'Данные клиента (Обязательно)'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'Ad və Soyad' : 'Имя и Фамилия'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Məs: Əli Məmmədov"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'Əlaqə Nömrəsi' : 'Номер телефона'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+994 50 123 45 67"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'Şəxsiyyət Vəsiqəsi Seriya və №' : 'Серия и номер паспорта'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={clientIdSerial}
                      onChange={(e) => setClientIdSerial(e.target.value.toUpperCase())}
                      placeholder="AZE 12345678 və ya AA"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'FİN Kod (7 simvol)' : 'FIN-код (7 знаков)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={7}
                    value={clientFin}
                    onChange={(e) => setClientFin(e.target.value.toUpperCase())}
                    placeholder="Məs: 7ABC123"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white font-mono uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>

            {/* 3. Media Upload Section (ID Photos & Tool Condition Photo/Video) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">
                  {i18n.language === 'az' ? 'Foto & Video Təsdiqlər (Məcburidir)' : 'Фото и видео фиксация (Обязательно)'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Passport Front */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {i18n.language === 'az' ? 'Şəxsiyyət Vəsiqəsi (Ön tərəfi)' : 'Паспорт (Лицевая сторона)'} <span className="text-red-500">*</span>
                    </span>
                    {idPhotoFront && <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yükləndi</span>}
                  </div>

                  {idPhotoFront ? (
                    <div className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200 bg-black">
                      <img src={idPhotoFront} alt="Passport Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setIdPhotoFront('')}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingFront}
                      onClick={() => frontInputRef.current?.click()}
                      className="w-full aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-lg flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800/50 hover:bg-indigo-50/30 transition-all text-gray-500 hover:text-indigo-600"
                    >
                      {uploadingFront ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6" />
                          <span className="text-xs font-bold">{i18n.language === 'az' ? 'Şəkli çək və ya seç' : 'Сфотографировать / загрузить'}</span>
                          <span className="text-[10px] text-gray-400">Ön tərəf (Aydın oxunmalı)</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], 'front')}
                  />
                </div>

                {/* Passport Back */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {i18n.language === 'az' ? 'Şəxsiyyət Vəsiqəsi (Arxa tərəfi)' : 'Паспорт (Обратная сторона)'}
                    </span>
                    {idPhotoBack && <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yükləndi</span>}
                  </div>

                  {idPhotoBack ? (
                    <div className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200 bg-black">
                      <img src={idPhotoBack} alt="Passport Back" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setIdPhotoBack('')}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingBack}
                      onClick={() => backInputRef.current?.click()}
                      className="w-full aspect-video border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-lg flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800/50 hover:bg-indigo-50/30 transition-all text-gray-500 hover:text-indigo-600"
                    >
                      {uploadingBack ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6" />
                          <span className="text-xs font-bold">{i18n.language === 'az' ? 'Arxa tərəfi yüklə' : 'Загрузить обратную сторону'}</span>
                          <span className="text-[10px] text-gray-400">Kamera və ya qalereya</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], 'back')}
                  />
                </div>
              </div>

              {/* Tool Photo/Video Before Handover */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-amber-600" />
                      {i18n.language === 'az' ? 'Alətin / Məhsulun Cari Vəziyyəti (Foto və ya Video)' : 'Текущее состояние инструмента (Фото или Видео)'} <span className="text-red-500">*</span>
                    </h5>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      {i18n.language === 'az' ? 'Təhvil verilərkən alətin sazlığı və ya mövcud cızıqları çəkilib qeyd olunmalıdır.' : 'Зафиксируйте исправность или существующие дефекты инструмента.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={uploadingTool}
                      onClick={() => toolCameraRef.current?.click()}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" /> Kamera
                    </button>
                    <button
                      type="button"
                      disabled={uploadingTool}
                      onClick={() => toolInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" /> Qalereya
                    </button>
                  </div>
                </div>

                <input
                  ref={toolCameraRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleToolMediaUpload(e.target.files)}
                />
                <input
                  ref={toolInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleToolMediaUpload(e.target.files)}
                />

                {uploadingTool && (
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Media fayllar yüklənir...</span>
                  </div>
                )}

                {/* Media preview grid */}
                {toolMediaList.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {toolMediaList.map((url, idx) => {
                      const isVid = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
                      return (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-black border border-gray-200 dark:border-gray-700">
                          {isVid ? (
                            <video src={url} className="w-full h-full object-cover" controls />
                          ) : (
                            <img src={url} alt={`Tool ${idx}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeToolMedia(idx)}
                            className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                    {i18n.language === 'az' ? 'Alətin vəziyyəti haqqında qeyd (Cızıq, qüsur və s.)' : 'Примечание о состоянии инструмента'}
                  </label>
                  <input
                    type="text"
                    value={conditionNotes}
                    onChange={(e) => setConditionNotes(e.target.value)}
                    placeholder="Məs: Korpusunda yüngül sürtünmə var, işlək vəziyyətdədir"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Rental Duration Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">
                    {i18n.language === 'az' ? 'İcarə Müddəti' : 'Срок аренды'}
                  </h4>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 mr-1">Tez seç:</span>
                  {[
                    { label: '+1 gün', days: 1 },
                    { label: '+3 gün', days: 3 },
                    { label: '+1 həftə', days: 7 },
                    { label: '+2 həftə', days: 14 },
                    { label: '+1 ay', days: 30 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => applyDurationDays(p.days)}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 text-gray-700 dark:text-gray-300 rounded-md text-[11px] font-bold transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'Başlanğıc Tarixi' : 'Дата начала'}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'Qaytarılma Tarixi (Son gün)' : 'Дата возврата (Срок)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    min={startDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 5. Financials & Guarantee Deposit */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">
                  {i18n.language === 'az' ? 'Maliyyə & Girov (Depozit) Məlumatları' : 'Финансы и Залог (Депозит)'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Deposit (Default 100% retail price) */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black text-emerald-900 dark:text-emerald-300">
                      {i18n.language === 'az' ? 'Girov Məbləği (Tam Dəyər)' : 'Сумма залога (Полная)'}
                    </label>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-emerald-700">₼</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-base font-black text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                    {i18n.language === 'az' ? 'Müştəri alətin tam dəyərini girov olaraq ödəyir.' : 'Клиент оставляет полную стоимость в залог.'}
                  </p>
                </div>

                {/* Rental Fee */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'İcarə Haqqı (AZN)' : 'Стоимость аренды (AZN)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-gray-500">₼</span>
                    <input
                      type="number"
                      step="0.01"
                      value={rentalFee}
                      onChange={(e) => setRentalFee(e.target.value)}
                      placeholder="Məs: 20.00"
                      className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">İstəyə görə</span>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {i18n.language === 'az' ? 'Ödəniş Üsulu' : 'Способ оплаты'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Nağd">Nağd (Kassa)</option>
                    <option value="Kart / Terminal">Kart / Terminal</option>
                    <option value="Bank Köçürməsi">Bank Köçürməsi</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 6. General Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {i18n.language === 'az' ? 'Əlavə Qeydlər' : 'Дополнительные примечания'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={i18n.language === 'az' ? 'İcarə ilə bağlı digər xüsusi şərtlər...' : 'Особые условия или примечания...'}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
              >
                {i18n.language === 'az' ? 'İmtina' : 'Отмена'}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{i18n.language === 'az' ? 'Qeydiyyat edilir...' : 'Оформление...'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {i18n.language === 'az' ? 'İCARƏYƏ VER VƏ TƏSDİQLƏ' : 'СДАТЬ В АРЕНДУ И ОФОРМИТЬ'}
                    </span>
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

export default RentProductModal;

