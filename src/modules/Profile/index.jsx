import React, { useState, useEffect } from 'react';
import { User, Mail, Bell, Shield, Globe, Camera, Save, LogOut } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const tabs = [
    { id: 'general', name: 'General', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'display', name: 'Display & Language', icon: Globe },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Profile</h1>
          <p className="text-gray-500">Manage your personal information and account preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => supabase.auth.signOut()}
            className="bg-white text-red-500 border border-red-100 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-50 transition-all flex items-center shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
          <button 
            onClick={handleSave}
            className="bg-merkez-blue text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all flex items-center shadow-lg shadow-blue-100 active:scale-95"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: User Summary Card */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-merkez-blue to-blue-400 relative">
               <button className="absolute bottom-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
                  <Camera className="w-4 h-4" />
               </button>
            </div>
            <div className="px-8 pb-8">
              <div className="relative -mt-16 mb-4">
                <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-xl shadow-gray-200/50">
                   <div className="w-full h-full rounded-[2rem] bg-merkez-blue flex items-center justify-center text-4xl font-black text-white shadow-inner">
                      {initials}
                   </div>
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-merkez-blue hover:text-blue-600 transition-colors">
                   <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
              <p className="text-merkez-blue font-bold text-sm uppercase tracking-wider mb-4">
                {user?.user_metadata?.business_name || 'Business Owner'}
              </p>
              
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-3 opacity-60" />
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Globe className="w-4 h-4 mr-3 opacity-60" />
                  <span className="text-sm font-medium">Baku, Azerbaijan (GMT+4)</span>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Status</span>
               <span className="text-xs font-bold text-green-600 uppercase">Authenticated</span>
            </div>
          </div>

          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center space-x-2 p-4 text-red-500 bg-red-50 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors"
          >
             <LogOut className="w-4 h-4" />
             <span>Sign Out From This Device</span>
          </button>
        </div>

        {/* Right Column: Settings Tabs */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-sm transition-all ${
                  activeTab === tab.id 
                  ? 'bg-gray-50 text-merkez-blue' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className={activeTab === tab.id ? '' : 'hidden md:inline'}>{tab.name}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-10">
              {activeTab === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div>
                     <h3 className="text-lg font-bold text-gray-900 mb-6">General Information</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                         <input 
                           type="text" 
                           defaultValue={name} 
                           className="block w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                         <input 
                           type="email" 
                           disabled
                           value={user?.email || ''} 
                           className="block w-full px-4 py-4 bg-gray-100 border border-transparent rounded-2xl text-gray-400 outline-none transition-all font-medium cursor-not-allowed"
                         />
                       </div>
                       <div className="space-y-2 md:col-span-2">
                         <label className="text-sm font-bold text-gray-700 ml-1">Business Context</label>
                         <textarea 
                           rows={4}
                           defaultValue={user?.user_metadata?.business_name || "Owner of Merkez instance"} 
                           className="block w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:bg-white focus:border-merkez-blue focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium resize-none"
                         />
                       </div>
                     </div>
                   </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                   <h3 className="text-lg font-bold text-gray-900 mb-6">Notification Preferences</h3>
                   <div className="space-y-4">
                     {[
                       { title: 'Email Notifications', desc: 'Receive daily summaries and critical alerts.', default: true },
                       { title: 'Browser Notifications', desc: 'Show desktop alerts for mentions and tasks.', default: true },
                       { title: 'Marketing Content', desc: 'Stay updated with new features and tips.', default: false },
                       { title: 'Security Alerts', desc: 'Immediate priority alerts for login attempts.', default: true },
                     ].map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                         <div>
                           <p className="font-bold text-gray-900">{item.title}</p>
                           <p className="text-xs text-gray-500">{item.desc}</p>
                         </div>
                         <div className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${item.default ? 'bg-merkez-blue' : 'bg-gray-300'}`}>
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.default ? 'left-7' : 'left-1'}`}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {activeTab !== 'general' && activeTab !== 'notifications' && (
                <div className="py-20 text-center space-y-4 animate-in fade-in duration-300">
                   <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                      <Shield className="w-8 h-8" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900">Module Under Construction</h3>
                   <p className="text-sm text-gray-500 max-w-xs mx-auto">This sub-module is being finalized by our engineering team.</p>
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
