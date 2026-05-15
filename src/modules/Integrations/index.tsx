import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, MessageSquare, Instagram, Phone, Search, MoreHorizontal, Send, Settings } from 'lucide-react';
import UnifiedChat, { UnifiedMessage } from './components/UnifiedChat';
import ChannelSettings from './components/ChannelSettings';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { TelegramService } from './services/TelegramService';

const IntegrationsModule = () => {
  const { profile } = useUser();
  const tenantId = profile?.tenant_id || profile?.id;
  const { t } = useTranslation();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'telephony'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const selectedContactRef = React.useRef<any>(null);

  // Keep ref in sync with state so realtime callback sees latest value
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  const fetchContacts = async () => {
    let query = supabase
      .from('integration_contacts')
      .select('*')
      .eq('tenant_id', tenantId);

    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      if (dateFilter === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'yesterday') {
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
        query = query.lt('created_at', endDate.toISOString());
      } else if (dateFilter === 'week') {
        startDate.setDate(now.getDate() - 7);
      }
      
      query = query.gte('created_at', startDate.toISOString());
    }

    const { data } = await query.order('created_at', { ascending: false });
    if (data) setContacts(data);
  };

  useEffect(() => {
    fetchContacts();

    const contactSub = supabase
      .channel('realtime:integration_contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_contacts' }, () => {
        fetchContacts();
      })
      .subscribe();

    const messageSub = supabase
      .channel('realtime:integration_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'integration_messages' }, (payload) => {
        const newMsg = payload.new as any;
        const current = selectedContactRef.current;
        if (current && newMsg.contact_id === current.id) {
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        fetchContacts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contactSub);
      supabase.removeChannel(messageSub);
    };
  }, [sourceFilter, dateFilter, tenantId]);

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!selectedContact) return;
    
    // Fetch messages for the selected contact
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('integration_messages')
        .select('*')
        .eq('contact_id', selectedContact.id)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data as any[]);
    };
    
    fetchMessages();
  }, [selectedContact]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedContact) return;
    
    const messageText = inputText;
    setInputText('');

    // Fetch integration channel to get API keys
    const { data: channels } = await supabase
      .from('integration_channels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', selectedContact.source)
      .eq('status', 'active')
      .limit(1);

    const channel = channels?.[0];

    // 1. Save outbound message to database first
    const { data: savedMsg, error: dbError } = await supabase
      .from('integration_messages')
      .insert({
        tenant_id: selectedContact.tenant_id || tenantId,
        contact_id: selectedContact.id,
        channel_id: channel?.id,
        direction: 'outbound',
        type: 'text',
        content: messageText,
        status: 'sending'
      })
      .select()
      .single();

    if (dbError || !savedMsg) {
      console.error('Failed to save message:', dbError);
      return;
    }

    // Add to local state immediately
    setMessages((prev) => {
      if (prev.some(m => m.id === savedMsg.id)) return prev;
      return [...prev, savedMsg as any];
    });

    // 2. Send via WhatsApp API
    if (selectedContact.source === 'whatsapp') {
      try {
        // Fallback logic: Use DB channel settings, or environment variables if no channel exists
        const phoneId = channel?.settings?.phone_number_id || (import.meta as any).env.VITE_WA_PHONE_ID;
        const token = channel?.settings?.api_key || (import.meta as any).env.VITE_WA_ACCESS_TOKEN;
        const toPhone = selectedContact.external_id;

        if (!phoneId || !token) {
          console.warn("WhatsApp API credentials missing (neither in DB nor in ENV)");
          await supabase.from('integration_messages').update({ status: 'failed' }).eq('id', savedMsg.id);
          setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'failed' } : m));
          return;
        }

        const response = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: toPhone,
            type: 'text',
            text: { preview_url: false, body: messageText }
          })
        });

        if (response.ok) {
          await supabase.from('integration_messages').update({ status: 'sent' }).eq('id', savedMsg.id);
          setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'sent' } : m));
        } else {
          const err = await response.json();
          console.error('WhatsApp API Error:', err);
          await supabase.from('integration_messages').update({ status: 'failed' }).eq('id', savedMsg.id);
          setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'failed' } : m));
        }
      } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        await supabase.from('integration_messages').update({ status: 'failed' }).eq('id', savedMsg.id);
        setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'failed' } : m));
      }
    }

    // 3. Send via Instagram API
    if (selectedContact.source === 'instagram') {
      try {
        const token = channel?.settings?.api_key || (import.meta as any).env.VITE_IG_ACCESS_TOKEN;
        const recipientId = selectedContact.external_id;

        if (!token) {
          console.warn("Instagram Access Token missing (neither in DB nor in ENV)");
          await supabase.from('integration_messages').update({ status: 'failed' }).eq('id', savedMsg.id);
          setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'failed' } : m));
          return;
        }

        const response = await fetch(`https://graph.facebook.com/v25.0/me/messages?access_token=${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: messageText }
          })
        });

        if (response.ok) {
          await supabase.from('integration_messages').update({ status: 'sent' }).eq('id', savedMsg.id);
          setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'sent' } : m));
        } else {
          const err = await response.json();
          console.error('Instagram API Error:', err);
          await supabase.from('integration_messages').update({ status: 'failed' }).eq('id', savedMsg.id);
          setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'failed' } : m));
        }
      } catch (error) {
        console.error('Failed to send Instagram message:', error);
        await supabase.from('integration_messages').update({ status: 'failed' }).eq('id', savedMsg.id);
        setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'failed' } : m));
      }
    }

    // 4. Send via Telegram Bot API
    if (selectedContact.source === 'telephony' || selectedContact.source === 'telegram') {
      try {
        if (!channel) throw new Error('No channel config found for Telegram');
        
        const botToken = channel.settings?.bot_token;
        if (!botToken) throw new Error('Telegram Bot Token missing in channel settings');

        await TelegramService.sendMessage(botToken, selectedContact.external_id, messageText);
        
        await supabase.from('integration_messages').update({ status: 'sent' }).eq('id', savedMsg.id);
        setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'sent' } : m));
      } catch (error) {
        console.error('Failed to send Telegram message:', error);
        await supabase.from('integration_messages').update({ status: 'failed' }).eq('id', savedMsg.id);
        setMessages((prev) => prev.map(m => m.id === savedMsg.id ? { ...m, status: 'failed' } : m));
      }
    }
  };

  return (
    <div className="h-full flex bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
      {/* 1. Contact List (Left Sidebar) */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/20">
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900">{t('integrations.title')}</h2>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-gray-400 hover:text-blue-600 border border-gray-100'}`}
              title={t('common.settings')}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={t('integrations.searchPlaceholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
            />
          </div>

          {/* Source Filters */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            <button 
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${sourceFilter === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'}`}
            >
              {t('integrations.filterAll')}
            </button>
            <button 
              onClick={() => setSourceFilter('whatsapp')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${sourceFilter === 'whatsapp' ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20' : 'bg-white text-gray-400 border-gray-100 hover:border-green-200'}`}
            >
              WhatsApp
            </button>
            <button 
              onClick={() => setSourceFilter('telephony')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${sourceFilter === 'telephony' ? 'bg-blue-400 text-white border-blue-400 shadow-md shadow-blue-400/20' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'}`}
            >
              Telegram
            </button>
            <button 
              onClick={() => setSourceFilter('instagram')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${sourceFilter === 'instagram' ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-600/20' : 'bg-white text-gray-400 border-gray-100 hover:border-pink-200'}`}
            >
              Instagram
            </button>
          </div>

          {/* Date Filters */}
          <div className="grid grid-cols-4 gap-1">
            {(['all', 'today', 'yesterday', 'week'] as const).map((filter) => (
              <button 
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${dateFilter === filter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              >
                {filter === 'all' ? t('integrations.filterAny') : 
                 filter === 'today' ? t('integrations.filterToday') : 
                 filter === 'yesterday' ? t('integrations.filterYesterday') : 
                 t('integrations.filterWeek')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => {
                setSelectedContact(contact);
                setShowSettings(false);
              }}
              className={`w-full p-4 flex items-center gap-4 transition-all border-b border-gray-50/50 ${selectedContact?.id === contact.id && !showSettings ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center font-bold text-gray-500 shadow-inner">
                  {contact.name?.[0] || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-50">
                  {contact.source === 'whatsapp' && <MessageSquare className="w-3 h-3 text-green-500" />}
                  {contact.source === 'instagram' && <Instagram className="w-3 h-3 text-pink-500" />}
                  {contact.source === 'phone' && <Phone className="w-3 h-3 text-blue-500" />}
                  {contact.source === 'telephony' && <Send className="w-3 h-3 text-blue-400" />}
                </div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{contact.name}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">{contact.time}</span>
                </div>
                <p className="text-xs text-gray-500 truncate font-medium">{contact.lastMessage || t('integrations.noMessages')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Content Area */}
      {showSettings ? (
        <ChannelSettings tenantId={tenantId} onClose={() => setShowSettings(false)} />
      ) : selectedContact ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-600/20">
                {selectedContact.name?.[0] || 'U'}
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-none mb-1">{selectedContact.name}</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{t('integrations.online')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden bg-gray-50/30">
            <UnifiedChat messages={messages} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-[1.5rem] border border-gray-100 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-inner">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('integrations.messagePlaceholder')} 
                className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-bold text-gray-700"
              />
              <button 
                onClick={handleSendMessage}
                className="w-10 h-10 bg-blue-600 text-white rounded-[1rem] flex items-center justify-center shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-90"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 text-center p-12 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05)_0%,transparent_70%)] animate-pulse" />
           <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl shadow-blue-500/10 flex items-center justify-center mb-8 relative animate-bounce duration-[2000ms]">
              <div className="absolute inset-0 bg-blue-500 rounded-[2rem] blur-2xl opacity-10" />
              <LayoutGrid className="w-10 h-10 text-blue-600 relative" />
           </div>
           <h3 className="text-2xl font-black text-gray-900 mb-3 relative">{t('integrations.emptyTitle')}</h3>
           <p className="text-sm text-gray-500 max-w-xs mx-auto font-medium mb-8 relative leading-relaxed">{t('integrations.emptyDescription')}</p>
           <button 
             onClick={() => setShowSettings(true)}
             className="px-8 py-3 bg-white border border-gray-100 text-blue-600 rounded-2xl text-sm font-bold shadow-xl shadow-blue-500/5 hover:bg-blue-50 transition-all relative"
           >
             {t('integrations.connectChannels') || 'Подключить каналы'}
           </button>
        </div>
      )}
    </div>
  );
};

export default IntegrationsModule;
