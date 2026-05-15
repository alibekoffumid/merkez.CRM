import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageSquare, Instagram, Phone, Trash2, Settings, Globe, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { toast } from 'react-hot-toast';

interface Channel {
  id: string;
  name: string;
  provider: 'whatsapp' | 'instagram' | 'telephony';
  status: 'active' | 'error' | 'maintenance';
  settings: any;
  is_verified: boolean;
}

const ChannelSettings = ({ tenantId, onClose }: { tenantId: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    provider: 'whatsapp' as const,
    apiKey: '',
    phoneId: '',
    instaId: ''
  });

  const fetchChannels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('integration_channels')
      .select('*')
      .eq('tenant_id', tenantId);
    
    if (data) setChannels(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchChannels();
  }, [tenantId]);

  const handleAddChannel = async () => {
    if (!newChannel.name) return;

    const settings: any = {};
    if (newChannel.provider === 'whatsapp') {
      settings.api_key = newChannel.apiKey;
      settings.phone_number_id = newChannel.phoneId;
    } else if (newChannel.provider === 'instagram') {
      settings.api_key = newChannel.apiKey;
      settings.instagram_business_id = newChannel.instaId;
    }

    const { error } = await supabase
      .from('integration_channels')
      .insert({
        tenant_id: tenantId,
        name: newChannel.name,
        provider: newChannel.provider,
        settings,
        status: 'active'
      });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('integrations.channelAdded') || 'Канал добавлен');
      setShowAddModal(false);
      fetchChannels();
    }
  };

  const handleDeleteChannel = async (id: string) => {
    const { error } = await supabase
      .from('integration_channels')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('integrations.channelDeleted') || 'Канал удален');
      fetchChannels();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden relative">
      <div className="p-8 border-b border-gray-100 bg-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">{t('integrations.channelManagement') || 'Управление каналами'}</h2>
          <p className="text-sm text-gray-500 font-medium">{t('integrations.channelDesc') || 'Подключите и настройте каналы связи с клиентами'}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            {t('integrations.addChannel') || 'Добавить канал'}
          </button>
          <button 
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="font-bold">{t('common.loading')}</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Globe className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('integrations.noChannels') || 'Каналы не подключены'}</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">{t('integrations.noChannelsDesc') || 'Начните с подключения WhatsApp или Instagram для общения с вашими клиентами'}</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all"
            >
              {t('integrations.connectFirstChannel') || 'Подключить первый канал'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <div key={channel.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 transition-transform group-hover:scale-110`}>
                  {channel.provider === 'whatsapp' && <MessageSquare className="w-full h-full text-green-500" />}
                  {channel.provider === 'instagram' && <Instagram className="w-full h-full text-pink-500" />}
                </div>

                <div className="flex items-center gap-4 mb-6 relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    channel.provider === 'whatsapp' ? 'bg-green-500 shadow-green-500/20' : 
                    channel.provider === 'instagram' ? 'bg-pink-500 shadow-pink-500/20' : 
                    'bg-blue-500 shadow-blue-500/20'
                  }`}>
                    {channel.provider === 'whatsapp' && <MessageSquare className="w-6 h-6 text-white" />}
                    {channel.provider === 'instagram' && <Instagram className="w-6 h-6 text-white" />}
                    {channel.provider === 'telephony' && <Phone className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900">{channel.name}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{channel.provider}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-500">{t('common.status')}</span>
                    <div className="flex items-center gap-1.5">
                      {channel.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-[10px] font-black text-green-600 uppercase">{t('common.active')}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-[10px] font-black text-red-600 uppercase">{t('common.error')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-2">
                      <Settings className="w-3.5 h-3.5" />
                      {t('common.settings')}
                    </button>
                    <button 
                      onClick={() => handleDeleteChannel(channel.id)}
                      className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900">{t('integrations.connectChannel') || 'Подключить канал'}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t('integrations.newConnection') || 'Новое соединение'}</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed font-medium">
                  {t('integrations.setupNotice') || 'Для работы требуется Meta Business App. Получите ключи в '}
                  <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="underline font-black hover:text-blue-900">Facebook Developers Portal</a>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">{t('integrations.provider')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setNewChannel({ ...newChannel, provider: 'whatsapp' })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${newChannel.provider === 'whatsapp' ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <MessageSquare className={`w-6 h-6 ${newChannel.provider === 'whatsapp' ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold ${newChannel.provider === 'whatsapp' ? 'text-green-700' : 'text-gray-600'}`}>WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => setNewChannel({ ...newChannel, provider: 'instagram' })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${newChannel.provider === 'instagram' ? 'border-pink-500 bg-pink-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <Instagram className={`w-6 h-6 ${newChannel.provider === 'instagram' ? 'text-pink-500' : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold ${newChannel.provider === 'instagram' ? 'text-pink-700' : 'text-gray-600'}`}>Instagram</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">{t('integrations.channelName')}</label>
                <input 
                  type="text"
                  placeholder="e.g. Sales WhatsApp"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">API Key / Token</label>
                   <a href="https://developers.facebook.com/docs/whatsapp/business-platform/get-started" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {t('integrations.getManual') || 'Как получить?'}
                   </a>
                </div>
                <input 
                  type="password"
                  placeholder="Paste your System User Access Token"
                  value={newChannel.apiKey}
                  onChange={(e) => setNewChannel({ ...newChannel, apiKey: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                />
              </div>

              {newChannel.provider === 'whatsapp' ? (
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Phone Number ID</label>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">Required for WhatsApp</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="e.g. 104523945239"
                    value={newChannel.phoneId}
                    onChange={(e) => setNewChannel({ ...newChannel, phoneId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                  />
                </div>
              ) : (
                <div>
                   <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Instagram Business ID</label>
                    <span className="text-[9px] font-bold text-pink-400 bg-pink-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">Required for Instagram</span>
                  </div>
                  <input 
                    type="text"
                    placeholder="e.g. 178414000000"
                    value={newChannel.instaId}
                    onChange={(e) => setNewChannel({ ...newChannel, instaId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleAddChannel}
                  disabled={!newChannel.name || !newChannel.apiKey}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                >
                  {t('integrations.connect') || 'Подключить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelSettings;
