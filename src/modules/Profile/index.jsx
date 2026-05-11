import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Bell, Shield, Globe, Camera, Save, LogOut, MapPin, Phone, Clock, FileText, Building2, CheckCircle2, Languages, Monitor, Moon, Sun, Check } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../core/UserContext';

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { refreshProfile } = useUser();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: string }

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);
  const [profile, setProfile] = useState({
    full_name: '',
    business_name: '',
    business_type: 'Restaurant',
    address: '',
    phone: '',
    website: '',
    description: '',
    operating_hours: '',
    avatar_url: '',
    admin_pin: ''
  });

  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem('merkez_theme') || 'light';
  });

  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    const saved = localStorage.getItem('merkez_notifications');
    return saved ? JSON.parse(saved) : {
      operational: true,
      realtime: true,
      community: false,
      security: true
    };
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile({
            full_name: data.full_name || '',
            business_name: data.business_name || '',
            business_type: data.business_type || 'Restaurant',
            address: data.address || '',
            phone: data.phone || '',
            website: data.website || '',
            description: data.description || '',
            operating_hours: data.operating_hours || '',
            avatar_url: data.avatar_url || '',
            admin_pin: data.admin_pin || ''
          });
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', name: t('profile.tabs.general', 'Общее'), icon: User },
    { id: 'security', name: t('profile.tabs.security', 'Безопасность'), icon: Shield },
    { id: 'notifications', name: t('profile.tabs.notifications', 'Уведомления'), icon: Bell },
    { id: 'display', name: t('profile.tabs.display', 'Оформление'), icon: Globe },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          business_name: profile.business_name,
          business_type: profile.business_type,
          address: profile.address,
          phone: profile.phone,
          website: profile.website,
          description: profile.description,
          operating_hours: profile.operating_hours,
          admin_pin: profile.admin_pin,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Refresh the global profile context so PinGuard picks up the new PIN
      await refreshProfile();
      
      showToast('success', t('common.saveSuccess', 'Настройки успешно сохранены!'));
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleThemeChange = (newTheme) => {
    setThemePreference(newTheme);
    localStorage.setItem('merkez_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // system
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const toggleNotification = (key) => {
    setNotificationPrefs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('merkez_notifications', JSON.stringify(updated));
      
      // If operational digest is turned ON, clear the last shown date so it triggers immediately
      if (key === 'operational' && updated.operational) {
        localStorage.removeItem('merkez_last_digest_date');
      }
      
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-merkez-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="max-w-full mx-auto px-4 lg:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">{t('sidebar.settings')}</h1>
          <p className="text-gray-500 font-medium tracking-tight text-lg">{t('profile.subtitle', 'Настройте данные вашего профиля и предпочтения аккаунта')}</p>
        </div>
        <div className="hidden sm:flex items-center space-x-3">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="group bg-merkez-blue text-white px-8 py-3 rounded-2xl font-bold text-sm hover:hover:bg-blue-600 transition-all flex items-center shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Save className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
            )}
            {t('common.save', 'Сохранить')}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left Column: Business Summary Card */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group">
            <div className="h-40 bg-gradient-to-br from-merkez-blue to-blue-500 relative">
               <button className="absolute bottom-4 right-4 p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/30 transition-colors">
                  <Camera className="w-4 h-4" />
               </button>
               {/* Decorative elements */}
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Building2 className="w-32 h-32 text-white" />
               </div>
            </div>
            <div className="px-8 pb-8">
              <div className="relative -mt-16 mb-6">
                <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-2xl shadow-gray-200/60 transition-transform group-hover:scale-105">
                   <div className="w-full h-full rounded-[2rem] bg-merkez-blue flex items-center justify-center text-4xl font-black text-white shadow-inner">
                      {initials}
                   </div>
                </div>
                <button className="absolute bottom-1 right-1 p-2.5 bg-white rounded-xl shadow-xl border border-gray-100 text-merkez-blue hover:text-blue-600 transition-colors">
                   <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{profile.full_name || 'Admin User'}</h2>
              <p className="text-merkez-blue font-black text-xs uppercase tracking-widest mb-6 mt-1 flex items-center">
                <span className="w-2 h-2 bg-merkez-blue rounded-full mr-2"></span>
                {profile.business_name || 'My Business'}
              </p>
              
              <div className="space-y-4 pt-6 border-t border-gray-50">
                <div className="flex items-center text-gray-600 group/item">
                  <Mail className="w-4 h-4 mr-4 text-merkez-blue opacity-40 group-hover/item:opacity-100 transition-opacity" />
                  <span className="text-[13px] font-bold truncate">{user?.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center text-gray-600 group/item">
                    <Phone className="w-4 h-4 mr-4 text-merkez-blue opacity-40 group-hover/item:opacity-100 transition-opacity" />
                    <span className="text-[13px] font-bold">{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center text-gray-600 group/item">
                    <MapPin className="w-4 h-4 mr-4 text-merkez-blue opacity-40 group-hover/item:opacity-100 transition-opacity" />
                    <span className="text-[13px] font-bold leading-tight">{profile.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <CheckCircle2 className="w-4 h-4 text-green-500" />
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('profile.activePartner', 'Активный партнер')}</span>
               </div>
               <span className="text-[10px] font-black bg-white px-2 py-1 rounded-md text-gray-400 border border-gray-100">PRO</span>
            </div>
          </div>

          <div className="sm:hidden mb-6">
            <button onClick={handleSave} className="w-full bg-merkez-blue text-white py-4 rounded-2xl font-bold shadow-lg">{t('common.save', 'Сохранить')}</button>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                  activeTab === tab.id 
                  ? 'bg-merkez-blue text-white shadow-xl shadow-blue-200/50' 
                  : 'text-gray-400 hover:text-merkez-blue hover:bg-blue-50/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className={activeTab === tab.id ? '' : 'hidden xl:inline'}>{tab.name}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-12">
              
              {activeTab === 'general' && (
                 <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                    {/* Personal Section */}
                    <div>
                      <div className="flex items-center space-x-3 mb-8">
                         <div className="p-2.5 bg-blue-50 rounded-xl text-merkez-blue">
                           <User className="w-5 h-5" />
                         </div>
                         <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('profile.ownerDetails', 'Личные данные')}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.fullName', 'Full Identity Name')}</label>
                          <input 
                            type="text" 
                            name="full_name"
                            value={profile.full_name} 
                            onChange={handleChange}
                            className="block w-full px-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold placeholder:text-gray-300 shadow-sm"
                            placeholder={t('profile.fullNamePlaceholder', 'Your full name')}
                          />
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.systemEmail', 'System Login Email')}</label>
                          <div className="relative">
                             < Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                             <input 
                               type="email" 
                               disabled
                               value={user?.email || ''} 
                               className="block w-full pl-14 pr-6 py-4.5 bg-gray-100/50 border border-transparent rounded-2xl text-gray-400 outline-none transition-all font-bold cursor-not-allowed"
                             />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Business Section */}
                    <div className="pt-10 border-t border-gray-50">
                      <div className="flex items-center space-x-3 mb-8">
                         <div className="p-2.5 bg-orange-50 rounded-xl text-orange-500">
                           <Building2 className="w-5 h-5" />
                         </div>
                         <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('profile.businessInfo', 'Информация о бизнесе')}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.businessName', 'Название заведения')}</label>
                          <input 
                            type="text" 
                            name="business_name"
                            value={profile.business_name} 
                            onChange={handleChange}
                            className="block w-full px-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                            placeholder={t('profile.businessNamePlaceholder', 'Restaurant/Bar name')}
                          />
                        </div>
                        <div className="space-y-2.5">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.businessCategory', 'Категория бизнеса')}</label>
                          <select 
                            name="business_type"
                            value={profile.business_type} 
                            onChange={handleChange}
                            className="block w-full px-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm cursor-pointer"
                          >
                            <option value="Restaurant text-gray-700">Premium Restaurant</option>
                            <option value="Cafe">Cozy Cafe</option>
                            <option value="Bar">Evening Bar / Pub</option>
                            <option value="Quick Service">Fast Food / Street Food</option>
                            <option value="Bakery">Bakery / Confectionery</option>
                          </select>
                        </div>

                        <div className="space-y-2.5 md:col-span-2">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.address', 'Физический адрес')}</label>
                          <div className="relative">
                             <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                             <input 
                               type="text" 
                               name="address"
                               value={profile.address} 
                               onChange={handleChange}
                               className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                               placeholder={t('profile.addressPlaceholder', 'City, Street, Building...')}
                             />
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.contactPhone', 'Контактный номер')}</label>
                          <div className="relative">
                             <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                             <input 
                               type="tel" 
                               name="phone"
                               value={profile.phone} 
                               onChange={handleChange}
                               className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                               placeholder={t('profile.phonePlaceholder', '+X XXX XXX XX XX')}
                             />
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.website', 'Веб-сайт / Digital Home')}</label>
                          <div className="relative">
                             <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                             <input 
                               type="text" 
                               name="website"
                               value={profile.website} 
                               onChange={handleChange}
                               className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                               placeholder={t('profile.websitePlaceholder', 'www.yourwebsite.com')}
                             />
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.hours', 'Часы работы')}</label>
                          <div className="relative">
                             <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                             <input 
                               type="text" 
                               name="operating_hours"
                               value={profile.operating_hours} 
                               onChange={handleChange}
                               className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                               placeholder={t('profile.hoursPlaceholder', 'Mon-Sun: 10:00 - 23:00')}
                             />
                          </div>
                        </div>

                        <div className="space-y-2.5 md:col-span-2">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('profile.essence', 'О бренде (Описание)')}</label>
                          <div className="relative">
                             <FileText className="absolute left-6 top-7 w-4 h-4 text-gray-300" />
                             <textarea 
                               rows={5}
                               name="description"
                               value={profile.description} 
                               onChange={handleChange}
                               className="block w-full pl-14 pr-6 py-6 bg-gray-50/50 border border-transparent rounded-3xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold resize-none shadow-sm"
                               placeholder={t('profile.essencePlaceholder', 'Tell us about the vibes, the food, and the mission of your establishment...')}
                             />
                          </div>
                        </div>
                      </div>
                    </div>
                 </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                   <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('profile.notifications.title', 'Smart Notifications')}</h3>
                   </div>
                   
                   <div className="space-y-4">
                     {[
                       { key: 'operational', title: t('profile.notifications.digest', 'Operational Digest'), desc: t('profile.notifications.digestDesc', 'Receive daily summaries and critical inventory alerts.'), active: notificationPrefs.operational },
                       { key: 'realtime', title: t('profile.notifications.push', 'Real-time Push'), desc: t('profile.notifications.pushDesc', 'Show desktop alerts for mentions, orders and urgent tasks.'), active: notificationPrefs.realtime },
                       { key: 'community', title: t('profile.notifications.community', 'Community & Ecosystem'), desc: t('profile.notifications.communityDesc', 'Stay updated with new features, benchmarks and tips.'), active: notificationPrefs.community },
                       { key: 'security', title: t('profile.notifications.security', 'Cyber-Security Ledger'), desc: t('profile.notifications.securityDesc', 'Priority alerts for new logins and permission changes.'), active: notificationPrefs.security },
                     ].map((item, idx) => (
                       <div key={idx} onClick={() => toggleNotification(item.key)} className="flex items-center justify-between p-6 bg-gray-50/50 rounded-3xl border border-gray-100/30 hover:bg-white hover:shadow-xl hover:shadow-gray-200/40 transition-all cursor-pointer">
                         <div>
                           <p className="font-black text-gray-900 tracking-tight">{item.title}</p>
                           <p className="text-xs text-gray-400 font-bold mt-1 opacity-70 uppercase tracking-wide">{item.desc}</p>
                         </div>
                         <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${item.active ? 'bg-merkez-blue shadow-lg shadow-blue-100' : 'bg-gray-200'}`}>
                           <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${item.active ? 'left-8' : 'left-1'}`}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                   <div className="flex items-center space-x-3 mb-8">
                      <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500">
                        <Shield className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('profile.adminPinTitle', 'Защита доступа')}</h3>
                   </div>
                   
                   <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-8">
                      <div className="max-w-sm">
                        <label className="text-[11px] font-black text-amber-600 uppercase tracking-widest ml-1 mb-2 block">
                          {t('profile.adminPinLabel', 'Административный PIN-код (4 цифры)')}
                        </label>
                        <p className="text-sm text-amber-700/60 font-medium mb-6">
                          {t('profile.adminPinDesc', 'Этот код используется для доступа к защищенным разделам, таким как Склад.')}
                        </p>
                        
                        <input 
                          type="text" 
                          inputMode="numeric"
                          name="admin_pin"
                          maxLength={4}
                          value={profile.admin_pin} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setProfile({ ...profile, admin_pin: val });
                          }}
                          className="block w-full px-8 py-5 bg-white border-2 border-amber-100 rounded-2xl text-2xl font-black tracking-[1em] text-center text-amber-600 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all shadow-sm"
                          placeholder="0000"
                        />
                        
                        <button 
                          onClick={handleSave}
                          disabled={isSaving || profile.admin_pin.length !== 4}
                          className={`mt-6 w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                            profile.admin_pin.length === 4
                              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 active:scale-95'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {t('common.save')}
                        </button>

                        <div className="mt-8 flex items-start space-x-3 text-xs text-amber-600/70 font-bold">
                           <div className="mt-0.5">⚠️</div>
                           <p>{t('profile.adminPinWarning', 'Убедитесь, что вы запомнили этот код. Он одинаков для всех администраторов этого филиала.')}</p>
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'display' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                   {/* Language Section */}
                   <div>
                     <div className="flex items-center space-x-3 mb-8">
                        <div className="p-2.5 bg-violet-50 rounded-xl text-violet-500">
                          <Languages className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('profile.language', 'Язык интерфейса')}</h3>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       {[
                         { code: 'az', label: 'Azərbaycan dili', flag: '🇦🇿', desc: 'Azərbaycan' },
                         { code: 'ru', label: 'Русский язык', flag: '🇷🇺', desc: 'Россия' },
                         { code: 'en', label: 'English', flag: '🇬🇧', desc: 'International' },
                       ].map(lang => (
                         <button
                           key={lang.code}
                           onClick={() => i18n.changeLanguage(lang.code)}
                           className={`relative p-6 rounded-3xl border-2 transition-all text-left group ${
                             i18n.language === lang.code
                               ? 'border-merkez-blue bg-merkez-blue/5 shadow-lg shadow-blue-100'
                               : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                           }`}
                         >
                           {i18n.language === lang.code && (
                             <div className="absolute top-4 right-4 w-6 h-6 bg-merkez-blue rounded-full flex items-center justify-center">
                               <Check className="w-3.5 h-3.5 text-white" />
                             </div>
                           )}
                           <span className="text-3xl mb-3 block">{lang.flag}</span>
                           <p className="font-black text-gray-900 text-base">{lang.label}</p>
                           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{lang.desc}</p>
                         </button>
                       ))}
                     </div>
                   </div>

                   {/* Theme Section */}
                   <div className="pt-10 border-t border-gray-50">
                     <div className="flex items-center space-x-3 mb-8">
                        <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500">
                          <Monitor className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">{t('profile.theme', 'Тема оформления')}</h3>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       {[
                         { id: 'light', icon: Sun, label: t('profile.themeLight', 'Светлая') },
                         { id: 'dark', icon: Moon, label: t('profile.themeDark', 'Тёмная') },
                         { id: 'system', icon: Monitor, label: t('profile.themeSystem', 'Системная') },
                       ].map(theme => {
                         const isActive = themePreference === theme.id;
                         return (
                         <button
                           key={theme.id}
                           onClick={() => handleThemeChange(theme.id)}
                           className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${
                             isActive
                               ? 'border-merkez-blue bg-merkez-blue/5 shadow-lg shadow-blue-100'
                               : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                           }`}
                         >
                           <div className={`p-3 rounded-2xl ${
                             isActive ? 'bg-merkez-blue/10 text-merkez-blue' : 'bg-gray-50 text-gray-500'
                           }`}>
                             <theme.icon className="w-6 h-6" />
                           </div>
                           <div>
                             <p className="font-black text-gray-900">{theme.label}</p>
                             {isActive && <p className="text-[10px] font-bold text-merkez-blue uppercase tracking-widest mt-0.5">{t('profile.active', 'Активна')}</p>}
                           </div>
                           {isActive && (
                             <div className="ml-auto w-6 h-6 bg-merkez-blue rounded-full flex items-center justify-center">
                               <Check className="w-3.5 h-3.5 text-white" />
                             </div>
                           )}
                         </button>
                       )})}
                     </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* In-app Toast */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-600 text-white shadow-green-200' 
            : 'bg-red-500 text-white shadow-red-200'
        }`}>
          {toast.type === 'success' 
            ? <CheckCircle2 className="w-5 h-5 shrink-0" /> 
            : <Shield className="w-5 h-5 shrink-0" />
          }
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Profile;
