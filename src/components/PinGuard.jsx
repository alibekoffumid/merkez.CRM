import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, X, KeyRound, ChevronLeft, User, Users, Loader2, Store, Hammer, Wrench, ArrowRight, ShieldCheck } from 'lucide-react';
import { useUser } from '../core/UserContext';
import { useNavigate } from 'react-router-dom';
import ModalPortal from './Common/ModalPortal';
import { supabase } from '../supabaseClient';

const PinGuard = ({ children, moduleId }) => {
  const { t, i18n } = useTranslation();
  const { profile, setCurrentStaff } = useUser();
  const navigate = useNavigate();
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); // 'owner' or staff object
  const [activeKey, setActiveKey] = useState(null);
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'masters'

  useEffect(() => {
    if (profile?.id) {
      fetchStaff();
    }
  }, [profile]);

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'Active')
        .order('name', { ascending: true });

      if (!error && data) {
        setStaffList(data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const isMasterRole = (role) => String(role || '').trim().toLowerCase() === 'master';

  // Store employees: all active staff excluding masters
  const storeEmployees = useMemo(() => {
    return staffList.filter(s => !isMasterRole(s.role));
  }, [staffList]);

  // Masters: only staff with role 'master' / 'Master'
  const mastersList = useMemo(() => {
    return staffList.filter(s => isMasterRole(s.role));
  }, [staffList]);

  const getRoleBadge = (role) => {
    const r = String(role || '').toLowerCase();
    if (r === 'manager') return i18n.language === 'az' ? 'Menecer' : i18n.language === 'en' ? 'Manager' : 'Менеджер';
    if (r === 'storeman') return i18n.language === 'az' ? 'Anbardar' : i18n.language === 'en' ? 'Storekeeper' : 'Кладовщик';
    if (r === 'cashier') return i18n.language === 'az' ? 'Kassir' : i18n.language === 'en' ? 'Cashier' : 'Кассир';
    if (r === 'master') return i18n.language === 'az' ? 'Usta' : i18n.language === 'en' ? 'Master' : 'Мастер';
    if (r === 'staff') return i18n.language === 'az' ? 'Satıcı / İşçi' : i18n.language === 'en' ? 'Sales / Staff' : 'Продавец / Сотрудник';
    return role;
  };

  const getCorrectPin = () => {
    if (selectedUser === 'owner') {
      return profile?.admin_pin || '0000';
    }
    if (selectedUser?.pin) {
      return selectedUser.pin;
    }
    return '0000'; // Fallback if staff has no PIN
  };

  const handlePinSubmit = (e) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) return;
    if (pin === getCorrectPin()) {
      setCurrentStaff(selectedUser === 'owner' ? null : selectedUser);
      setIsLocked(false);
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setPin(''), 500);
    }
  };

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      // Auto-submit when 4 digits are entered
      if (newPin.length === 4 && newPin === getCorrectPin()) {
        setCurrentStaff(selectedUser === 'owner' ? null : selectedUser);
        setIsLocked(false);
      } else if (newPin.length === 4) {
         setError(true);
         setTimeout(() => setPin(''), 500);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin('');
    setError(false);
  };

  const handleBackToUserList = () => {
    setSelectedUser(null);
    setPin('');
    setError(false);
  };

  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e) => {
      // Don't intercept if an editable input/textarea is focused
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        return;
      }

      if (selectedUser) {
        let digit = null;
        if (e.key >= '0' && e.key <= '9') {
          digit = e.key;
        } else if (/^Numpad[0-9]$/.test(e.code)) {
          digit = e.code.replace('Numpad', '');
        } else if (/^Digit[0-9]$/.test(e.code) && !e.shiftKey) {
          digit = e.code.replace('Digit', '');
        }

        if (digit !== null) {
          e.preventDefault();
          setActiveKey(digit);
          setTimeout(() => setActiveKey(null), 150);
          handleNumberClick(digit);
          return;
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          setActiveKey('backspace');
          setTimeout(() => setActiveKey(null), 150);
          handleDelete();
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          setActiveKey('enter');
          setTimeout(() => setActiveKey(null), 150);
          handlePinSubmit();
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          handleBackToUserList();
          return;
        }
      } else {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (activeTab === 'masters') {
            setActiveTab('store');
          } else {
            handleClose();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, selectedUser, pin, profile, activeTab]);

  if (!isLocked) {
    return children;
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh] border border-gray-100">
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-10"
            title={i18n.language === 'az' ? 'Bağla' : 'Закрыть'}
          >
            <X className="w-5 h-5" />
          </button>

          {!selectedUser ? (
            <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="text-center mb-5">
                <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-md transition-all ${
                  activeTab === 'masters'
                    ? 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 shadow-amber-500/10'
                    : 'bg-blue-500/10 text-merkez-blue ring-1 ring-blue-500/20 shadow-blue-500/10'
                }`}>
                  {activeTab === 'masters' ? (
                    <Hammer className="w-8 h-8" />
                  ) : (
                    <Users className="w-8 h-8" />
                  )}
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
                  {activeTab === 'masters' 
                    ? (i18n.language === 'az' ? 'Usta girişi' : i18n.language === 'en' ? 'Technicians' : 'Вход для мастеров')
                    : (i18n.language === 'az' ? 'Kim işləyir?' : i18n.language === 'en' ? 'Who is working?' : 'Кто работает?')}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {activeTab === 'masters'
                    ? (i18n.language === 'az' ? 'Təmir servisi üçün ustanı seçin' : i18n.language === 'en' ? 'Select technician profile for repairs' : 'Выберите мастера для работы с ремонтом')
                    : (i18n.language === 'az' ? 'Mağaza əməkdaşları üçün giriş (kassirlər, satıcılar, menecerlər)' : i18n.language === 'en' ? 'Store staff login (cashiers, sales, managers)' : 'Сотрудники магазина (кассиры, продавцы, менеджеры)')}
                </p>
              </div>

              {/* Segmented Control Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-xl mb-5 border border-gray-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('store')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'store'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-merkez-blue" />
                  <span>{i18n.language === 'az' ? 'Mağaza' : i18n.language === 'en' ? 'Store' : 'Сотрудники магазина'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'store' ? 'bg-blue-100 text-merkez-blue' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {storeEmployees.length + 1}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('masters')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'masters'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5 text-amber-500" />
                  <span>{i18n.language === 'az' ? 'Ustalar' : i18n.language === 'en' ? 'Masters' : 'Мастера'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === 'masters' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {mastersList.length}
                  </span>
                </button>
              </div>

              {/* Tab Content */}
              {loadingStaff ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-merkez-blue" />
                </div>
              ) : activeTab === 'store' ? (
                <div className="space-y-2.5">
                  {/* Owner Option */}
                  <button
                    onClick={() => handleSelectUser('owner')}
                    className="w-full p-3.5 flex items-center gap-3.5 bg-gray-50 hover:bg-blue-50/50 hover:border-blue-200 rounded-2xl transition-all border border-gray-100 active:scale-[0.98] group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-merkez-blue flex items-center justify-center font-bold group-hover:scale-105 transition-transform shadow-xs shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm truncate">
                          {profile?.full_name || profile?.name || (i18n.language === 'az' ? 'Sahib / İdarəçi' : 'Владелец / Администратор')}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-merkez-blue shrink-0">
                          {i18n.language === 'az' ? 'İdarəçi' : 'Администратор'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">
                        {i18n.language === 'az' ? 'Tam giriş hüququ' : 'Полный доступ'}
                      </p>
                    </div>
                  </button>

                  {/* Store Staff Options - STRICTLY EXCLUDES MASTERS */}
                  {storeEmployees.map(staff => (
                    <button
                      key={staff.id}
                      onClick={() => handleSelectUser(staff)}
                      className="w-full p-3.5 flex items-center gap-3.5 bg-gray-50 hover:bg-gray-100/90 rounded-2xl transition-all border border-gray-100 hover:border-gray-200 active:scale-[0.98] group"
                    >
                      <div className="w-11 h-11 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform shrink-0">
                        {staff.name ? staff.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-sm truncate">{staff.name}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 shrink-0">
                            {getRoleBadge(staff.role)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium truncate">
                          {staff.phone || (i18n.language === 'az' ? 'Mağaza əməkdaşı' : 'Сотрудник магазина')}
                        </p>
                      </div>
                    </button>
                  ))}

                  {/* Dedicated Transition Button to Masters */}
                  <div className="pt-3 border-t border-gray-100 mt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('masters')}
                      className="w-full p-3 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100/80 hover:to-orange-100/80 border border-amber-200/70 rounded-xl transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                          <Hammer className="w-4 h-4" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{i18n.language === 'az' ? 'Usta və Servis Girişi' : i18n.language === 'en' ? 'Technicians Login' : 'Вход для мастеров сервиса'}</span>
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 shrink-0">
                              {mastersList.length}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium truncate">
                            {i18n.language === 'az' ? 'Təmir sifarişlərini idarə etmək üçün' : i18n.language === 'en' ? 'To access repair orders' : 'Для доступа к ремонтам и сервису'}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Masters Tab Content */
                <div className="space-y-2.5">
                  {mastersList.length > 0 ? (
                    mastersList.map(master => (
                      <button
                        key={master.id}
                        onClick={() => handleSelectUser(master)}
                        className="w-full p-3.5 flex items-center gap-3.5 bg-gray-50 hover:bg-amber-50/60 hover:border-amber-200 rounded-2xl transition-all border border-gray-100 active:scale-[0.98] group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{master.name}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                              {i18n.language === 'az' ? 'Usta' : i18n.language === 'en' ? 'Master' : 'Мастер'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium truncate">
                            {master.phone || (i18n.language === 'az' ? 'Təmir mütəxəssisi' : 'Специалист по ремонту')}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 my-2">
                      <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3 ring-1 ring-amber-100">
                        <Hammer className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-gray-800 text-sm mb-1">
                        {i18n.language === 'az' ? 'Usta tapılmadı' : i18n.language === 'en' ? 'No masters found' : 'Мастера пока не добавлены'}
                      </p>
                      <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                        {i18n.language === 'az'
                          ? '«Heyət» bölməsində «Usta» vəzifəsi ilə əməkdaş əlavə edin'
                          : i18n.language === 'en'
                          ? 'Add an employee with "Master" role in the Staff section'
                          : 'Добавьте сотрудника с должностью «Мастер» в разделе «Персонал»'}
                      </p>
                    </div>
                  )}

                  {/* Back to store staff button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('store')}
                      className="w-full py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all border border-gray-200/70"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{i18n.language === 'az' ? 'Mağaza əməkdaşlarına qayıt' : i18n.language === 'en' ? 'Back to store staff' : 'Назад к сотрудникам магазина'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center mt-4">
              <button 
                onClick={handleBackToUserList}
                className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all flex items-center gap-2 z-10"
                title={i18n.language === 'az' ? 'Geri' : 'Назад'}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ring-1 shadow-sm ${
                selectedUser === 'owner' 
                  ? 'bg-blue-50 text-merkez-blue ring-blue-100' 
                  : isMasterRole(selectedUser.role) 
                  ? 'bg-amber-50 text-amber-600 ring-amber-100' 
                  : 'bg-blue-50 text-merkez-blue ring-blue-100'
              }`}>
                {selectedUser === 'owner' ? (
                  <ShieldCheck className="w-8 h-8" />
                ) : isMasterRole(selectedUser.role) ? (
                  <Wrench className="w-8 h-8" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>

              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-xl font-black text-gray-900">
                  {selectedUser === 'owner' 
                    ? (profile?.full_name || profile?.name || (i18n.language === 'az' ? 'Sahib / İdarəçi' : 'Владелец / Администратор')) 
                    : selectedUser.name}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedUser === 'owner'
                    ? 'bg-blue-100 text-merkez-blue'
                    : isMasterRole(selectedUser.role)
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedUser === 'owner' 
                    ? (i18n.language === 'az' ? 'İdarəçi' : 'Администратор') 
                    : getRoleBadge(selectedUser.role)}
                </span>
              </div>

              <p className="text-xs text-gray-500 font-medium mb-8">
                {i18n.language === 'az' ? 'Giriş etmək üçün 4 rəqəmli PIN kodu daxil edin' : 'Введите 4-значный PIN-код для доступа'}
              </p>

              <form onSubmit={handlePinSubmit}>
                {/* PIN Dots */}
                <div className="flex justify-center gap-4 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        pin.length > i 
                          ? (isMasterRole(selectedUser?.role) 
                              ? 'bg-amber-500 scale-125 shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                              : 'bg-merkez-blue scale-125 shadow-[0_0_12px_rgba(66,133,244,0.4)]')
                          : 'bg-gray-200'
                      } ${error ? 'animate-bounce bg-red-400' : ''}`}
                    />
                  ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                    const numStr = num.toString();
                    const isPressed = activeKey === numStr;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleNumberClick(numStr)}
                        className={`h-16 rounded-xl text-xl font-bold transition-all ${
                          isPressed
                            ? (isMasterRole(selectedUser?.role)
                                ? 'bg-amber-100 text-amber-700 scale-95 ring-2 ring-amber-400'
                                : 'bg-blue-100 text-blue-700 scale-95 ring-2 ring-blue-400')
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95 border border-gray-100'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className={`h-16 rounded-xl flex items-center justify-center transition-all ${
                      activeKey === 'backspace'
                        ? 'bg-red-50 text-red-500 scale-95 ring-2 ring-red-300'
                        : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 active:scale-95 border border-gray-100'
                    }`}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberClick('0')}
                    className={`h-16 rounded-xl text-xl font-bold transition-all ${
                      activeKey === '0'
                        ? (isMasterRole(selectedUser?.role)
                            ? 'bg-amber-100 text-amber-700 scale-95 ring-2 ring-amber-400'
                            : 'bg-blue-100 text-blue-700 scale-95 ring-2 ring-blue-400')
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95 border border-gray-100'
                    }`}
                  >
                    0
                  </button>
                  <button
                    type="submit"
                    disabled={pin.length !== 4}
                    className={`h-16 rounded-xl flex items-center justify-center transition-all ${
                      pin.length === 4 
                        ? (isMasterRole(selectedUser?.role)
                            ? (activeKey === 'enter' 
                                ? 'bg-amber-600 text-white scale-95 ring-2 ring-amber-500' 
                                : 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600') 
                            : (activeKey === 'enter'
                                ? 'bg-blue-700 text-white scale-95 ring-2 ring-blue-600'
                                : 'bg-merkez-blue text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600'))
                        : 'bg-gray-100 text-gray-300'
                    }`}
                  >
                    <KeyRound className="w-6 h-6" />
                  </button>
                </div>

                {error && (
                  <p className="text-sm font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                    {t('common.wrongPin') || 'Неверный код. Попробуйте снова.'}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default PinGuard;

