import React, { useState, useEffect } from 'react';
import { User, Mail, Bell, Shield, Globe, Camera, Save, LogOut, MapPin, Phone, Clock, FileText, Building2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: '',
    business_name: '',
    business_type: 'Restaurant',
    address: '',
    phone: '',
    website: '',
    description: '',
    operating_hours: '',
    avatar_url: ''
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
            avatar_url: data.avatar_url || ''
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
    { id: 'general', name: 'General', icon: Building2 },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'display', name: 'Display & Language', icon: Globe },
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
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
    } catch (err) {
      window.alert('Error updating profile: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
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
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">Management Profile</h1>
          <p className="text-gray-500 font-medium tracking-tight">Configure your restaurant identity and account preferences</p>
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
              <Save className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 px-4 sm:px-0">
        {/* Left Column: Business Summary Card */}
        <div className="w-full lg:w-1/3 space-y-6">
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
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Partner</span>
               </div>
               <span className="text-[10px] font-black bg-white px-2 py-1 rounded-md text-gray-400 border border-gray-100">PRO</span>
            </div>
          </div>

          <div className="sm:hidden mb-6">
            <button onClick={handleSave} className="w-full bg-merkez-blue text-white py-4 rounded-2xl font-bold shadow-lg">Save Configuration</button>
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
                  ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
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
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Owner Details</h3>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2.5">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                         <input 
                           type="text" 
                           name="full_name"
                           value={profile.full_name} 
                           onChange={handleChange}
                           className="block w-full px-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold placeholder:text-gray-300 shadow-sm"
                           placeholder="Your full name"
                         />
                       </div>
                       <div className="space-y-2.5">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">System Login Email</label>
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
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Establishment Information</h3>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2.5">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Establishment Name</label>
                         <input 
                           type="text" 
                           name="business_name"
                           value={profile.business_name} 
                           onChange={handleChange}
                           className="block w-full px-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                           placeholder="Restaurant/Bar name"
                         />
                       </div>
                       <div className="space-y-2.5">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Category</label>
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
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Address</label>
                         <div className="relative">
                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input 
                              type="text" 
                              name="address"
                              value={profile.address} 
                              onChange={handleChange}
                              className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                              placeholder="City, Street, Building..."
                            />
                         </div>
                       </div>

                       <div className="space-y-2.5">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Business Contact Number</label>
                         <div className="relative">
                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input 
                              type="tel" 
                              name="phone"
                              value={profile.phone} 
                              onChange={handleChange}
                              className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                              placeholder="+X XXX XXX XX XX"
                            />
                         </div>
                       </div>

                       <div className="space-y-2.5">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Digital Web-Home</label>
                         <div className="relative">
                            <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input 
                              type="text" 
                              name="website"
                              value={profile.website} 
                              onChange={handleChange}
                              className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                              placeholder="www.yourrestaurant.com"
                            />
                         </div>
                       </div>

                       <div className="space-y-2.5">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Opening Hours</label>
                         <div className="relative">
                            <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input 
                              type="text" 
                              name="operating_hours"
                              value={profile.operating_hours} 
                              onChange={handleChange}
                              className="block w-full pl-14 pr-6 py-4.5 bg-gray-50/50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold shadow-sm"
                              placeholder="Mon-Sun: 10:00 - 23:00"
                            />
                         </div>
                       </div>

                       <div className="space-y-2.5 md:col-span-2">
                         <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">The Essence of Your Brand (About)</label>
                         <div className="relative">
                            <FileText className="absolute left-6 top-7 w-4 h-4 text-gray-300" />
                            <textarea 
                              rows={5}
                              name="description"
                              value={profile.description} 
                              onChange={handleChange}
                              className="block w-full pl-14 pr-6 py-6 bg-gray-50/50 border border-transparent rounded-3xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold resize-none shadow-sm"
                              placeholder="Tell us about the vibes, the food, and the mission of your establishment..."
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
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">Smart Notifications</h3>
                   </div>
                   
                   <div className="space-y-4">
                     {[
                       { title: 'Operational Digest', desc: 'Receive daily summaries and critical inventory alerts.', active: true },
                       { title: 'Real-time Push', desc: 'Show desktop alerts for mentions, orders and urgent tasks.', active: true },
                       { title: 'Community & Ecosystem', desc: 'Stay updated with new features, benchmarks and tips.', active: false },
                       { title: 'Cyber-Security Ledger', desc: 'Priority alerts for new logins and permission changes.', active: true },
                     ].map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between p-6 bg-gray-50/50 rounded-3xl border border-gray-100/30 hover:bg-white hover:shadow-xl hover:shadow-gray-200/40 transition-all cursor-pointer">
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

              {(activeTab === 'security' || activeTab === 'display') && (
                <div className="py-24 text-center space-y-6 animate-in fade-in duration-500">
                   <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300 shadow-inner">
                      {activeTab === 'security' ? <Shield className="w-10 h-10" /> : <Globe className="w-10 h-10" />}
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-gray-900 tracking-tight">{activeTab === 'security' ? 'Vault Protection' : 'Visual Presence'}</h3>
                     <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Enhanced security features coming soon</p>
                   </div>
                   <div className="max-w-xs mx-auto py-3 px-6 bg-blue-50 rounded-full inline-block text-merkez-blue text-[10px] font-black uppercase tracking-widest">
                      Developer Preview Active
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

