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
import DatePicker from '../../components/Common/DatePicker';
import Dropdown from '../../components/Common/Dropdown';
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

  const paymentOptions = [
    { value: 'Nağd', label: i18n.language === 'az' ? 'Nağd (Kassa)' : 'Наличные' },
    { value: 'Kart / Terminal', label: i18n.language === 'az' ? 'Kart / Terminal' : 'Карта / Терминал' },
    { value: 'Bank Köçürməsi', label: i18n.language === 'az' ? 'Bank Köçürməsi' : 'Банковский перевод' },
  ];

  return (
    <ModalPortal>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Platform Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {i18n.language === 'az' ? 'MƏHSULU İCARƏYƏ VER' : 'СДАТЬ ТОВАР В АРЕНДУ'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {selectedProducts.length} {i18n.language === 'az' ? 'məhsul' : 'тов.'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {i18n.language === 'az' 
                    ? 'Müştəri məlumatları, girov (depozit) və foto təhvil aktının rəsmiləşdirilməsi' 
                    : 'Оформление аренды: паспортные данные, депозит и фиксация состояния'}
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
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

            {/* 1. Selected Products Banner */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  {i18n.language === 'az' ? 'İcarəyə Verilən Məhsullar' : 'Сдаваемые товары'} ({selectedProducts.length})
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {i18n.language === 'az' ? 'Ümumi Dəyər (Girov):' : 'Общая стоимость (Залог):'}{' '}
                  <strong className="text-indigo-600 text-sm font-black">₼{totalRetailPrice.toFixed(2)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-36 overflow-y-auto pr-1">
                {selectedProducts.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-100/80 shadow-2xs text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{p.barcode || 'Barkodsuz'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-gray-900 text-sm">₼{(p.price || p.selling_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Customer Information (Mandatory) */}
            <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200/60 pb-2.5">
                <User className="w-4 h-4 text-indigo-600" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-600">
                  {i18n.language === 'az' ? 'Müştəri Məlumatları (Məcburidir)' : 'Данные клиента (Обязательно)'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
                    {i18n.language === 'az' ? 'Ad və Soyad' : 'Имя и Фамилия'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Məs: Əli Məmmədov"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none font-semibold text-sm focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
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
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none font-semibold text-sm focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all text-gray-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
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
                      className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none font-semibold text-sm focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all text-gray-900 font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
                    {i18n.language === 'az' ? 'FİN Kod (7 simvol)' : 'FIN-код (7 знаков)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={7}
                    value={clientFin}
                    onChange={(e) => setClientFin(e.target.value.toUpperCase())}
                    placeholder="Məs: 7ABC123"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none font-semibold text-sm focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all text-gray-900 font-mono uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>

            {/* 3. Media Upload Section (ID Photos & Tool Condition Photo/Video) */}
            <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200/60 pb-2.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-600">
                  {i18n.language === 'az' ? 'Foto & Video Təsdiqlər (Məcburidir)' : 'Фото и видео фиксация (Обязательно)'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Passport Front */}
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700">
                      {i18n.language === 'az' ? 'Şəxsiyyət Vəsiqəsi (Ön tərəfi)' : 'Паспорт (Лицевая сторона)'} <span className="text-red-500">*</span>
                    </span>
                    {idPhotoFront && <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yükləndi</span>}
                  </div>

                  {idPhotoFront ? (
                    <div className="relative group aspect-video rounded-xl overflow-hidden border border-gray-200 bg-black">
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
                      className="w-full aspect-video border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center gap-2 bg-gray-50/50 hover:bg-indigo-50/30 transition-all text-gray-500 hover:text-indigo-600"
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
                <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700">
                      {i18n.language === 'az' ? 'Şəxsiyyət Vəsiqəsi (Arxa tərəfi)' : 'Паспорт (Обратная сторона)'}
                    </span>
                    {idPhotoBack && <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yükləndi</span>}
                  </div>

                  {idPhotoBack ? (
                    <div className="relative group aspect-video rounded-xl overflow-hidden border border-gray-200 bg-black">
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
                      className="w-full aspect-video border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center gap-2 bg-gray-50/50 hover:bg-indigo-50/30 transition-all text-gray-500 hover:text-indigo-600"
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
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-amber-600" />
                      {i18n.language === 'az' ? 'Alətin / Məhsulun Cari Vəziyyəti (Foto və ya Video)' : 'Текущее состояние инструмента (Фото или Видео)'} <span className="text-red-500">*</span>
                    </h5>
                    <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                      {i18n.language === 'az' ? 'Təhvil verilərkən alətin sazlığı və ya mövcud cızıqları çəkilib qeyd olunmalıdır.' : 'Зафиксируйте исправность или существующие дефекты инструмента.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={uploadingTool}
                      onClick={() => toolCameraRef.current?.click()}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" /> Kamera
                    </button>
                    <button
                      type="button"
                      disabled={uploadingTool}
                      onClick={() => toolInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all hover:bg-amber-50"
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
                  <div className="flex items-center gap-2 p-3 bg-white rounded-xl text-xs font-bold text-amber-700">
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
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-black border border-gray-200">
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
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    {i18n.language === 'az' ? 'Alətin vəziyyəti haqqında qeyd (Cızıq, qüsur və s.)' : 'Примечание о состоянии инструмента'}
                  </label>
                  <input
                    type="text"
                    value={conditionNotes}
                    onChange={(e) => setConditionNotes(e.target.value)}
                    placeholder="Məs: Korpusunda yüngül sürtünmə var, işlək vəziyyətdədir"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* 4. Rental Duration Section (Using Platform DatePicker!) */}
            <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-600">
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
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-gray-700 rounded-lg text-[11px] font-bold border border-gray-200/80 shadow-2xs transition-all active:scale-95"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    label={i18n.language === 'az' ? 'Başlanğıc Tarixi' : 'Дата начала'}
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                  />
                </div>

                <div>
                  <DatePicker
                    label={i18n.language === 'az' ? 'Qaytarılma Tarixi (Son gün) *' : 'Дата возврата (Срок) *'}
                    value={dueDate}
                    onChange={(val) => setDueDate(val)}
                  />
                </div>
              </div>
            </div>

            {/* 5. Financials & Guarantee Deposit (Using Platform Dropdown!) */}
            <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200/60 pb-2.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-600">
                  {i18n.language === 'az' ? 'Maliyyə & Girov (Depozit) Məlumatları' : 'Финансы и Залог (Депозит)'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Deposit (Default 100% retail price) */}
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black text-emerald-900">
                      {i18n.language === 'az' ? 'Girov Məbləği (Tam Dəyər)' : 'Сумма залога (Полная)'}
                    </label>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-black text-emerald-700 text-lg">₼</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-lg font-black text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1.5 font-medium">
                    {i18n.language === 'az' ? 'Müştəri alətin tam dəyərini girov olaraq ödəyir.' : 'Клиент оставляет полную стоимость в залог.'}
                  </p>
                </div>

                {/* Rental Fee */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
                    {i18n.language === 'az' ? 'İcarə Haqqı (AZN)' : 'Стоимость аренды (AZN)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-black text-gray-400">₼</span>
                    <input
                      type="number"
                      step="0.01"
                      value={rentalFee}
                      onChange={(e) => setRentalFee(e.target.value)}
                      placeholder="Məs: 20.00"
                      className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 outline-none font-semibold text-sm focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all text-gray-900"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block px-0.5">İstəyə görə</span>
                </div>

                {/* Payment Method (Custom Dropdown Component) */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
                    {i18n.language === 'az' ? 'Ödəniş Üsulu' : 'Способ оплаты'}
                  </label>
                  <Dropdown
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val)}
                    options={paymentOptions}
                  />
                </div>
              </div>
            </div>

            {/* 6. General Notes */}
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
                {i18n.language === 'az' ? 'Əlavə Qeydlər' : 'Дополнительные примечания'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={i18n.language === 'az' ? 'İcarə ilə bağlı digər xüsusi şərtlər...' : 'Особые условия или примечания...'}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none font-medium text-xs text-gray-900 focus:border-merkez-blue focus:ring-2 focus:ring-merkez-blue/10 transition-all resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
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
