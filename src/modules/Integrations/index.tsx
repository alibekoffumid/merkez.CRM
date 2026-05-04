import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, MessageSquare, Instagram, Phone, Search, MoreHorizontal, Send } from 'lucide-react';
import UnifiedChat, { UnifiedMessage } from './components/UnifiedChat';
import { supabase } from '../../supabaseClient';

const IntegrationsModule = () => {
  const { t } = useTranslation();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [inputText, setInputText] = useState('');

  const [contacts, setContacts] = useState<any[]>([]);
  const selectedContactRef = React.useRef<any>(null);

  // Keep ref in sync with state so realtime callback sees latest value
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  const fetchContacts = async () => {
    const { data } = await supabase
      .from('integration_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setContacts(data);
  };

  useEffect(() => {
    fetchContacts();

    // Subscribe to new contacts
    const contactSub = supabase
      .channel('realtime:integration_contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_contacts' }, () => {
        fetchContacts();
      })
      .subscribe();

    // Subscribe to new messages
    const messageSub = supabase
      .channel('realtime:integration_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'integration_messages' }, (payload) => {
        const newMsg = payload.new as any;
        const current = selectedContactRef.current;
        // Only append if the message belongs to the currently selected contact
        if (current && newMsg.contact_id === current.id) {
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
        // Always refresh contacts list (to update last message preview)
        fetchContacts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contactSub);
      supabase.removeChannel(messageSub);
    };
  }, []);

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

    // 1. Save outbound message to database first
    const { data: savedMsg, error: dbError } = await supabase
      .from('integration_messages')
      .insert({
        tenant_id: selectedContact.tenant_id || '00000000-0000-0000-0000-000000000000',
        contact_id: selectedContact.id,
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
        const phoneId = (import.meta as any).env.VITE_WA_PHONE_ID;
        const token = (import.meta as any).env.VITE_WA_ACCESS_TOKEN;
        const toPhone = selectedContact.external_id;

        if (!phoneId || !token) {
          console.warn("WhatsApp API credentials missing");
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
        const token = (import.meta as any).env.VITE_IG_ACCESS_TOKEN;
        const recipientId = selectedContact.external_id;

        if (!token) {
          console.warn("Instagram Access Token missing");
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
  };

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
      {/* 1. Contact List (Left Sidebar) */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/20">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-4">Omnichannel</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Söhbətlərdə axtar..." 
              className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-4 flex items-center gap-4 transition-all border-b border-gray-50/50 ${selectedContact?.id === contact.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                  {contact.name[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-50">
                  {contact.source === 'whatsapp' && <MessageSquare className="w-3 h-3 text-green-500" />}
                  {contact.source === 'instagram' && <Instagram className="w-3 h-3 text-pink-500" />}
                  {contact.source === 'phone' && <Phone className="w-3 h-3 text-blue-500" />}
                </div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{contact.name}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">{contact.time}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{contact.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Chat Area */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-600/20">
                {selectedContact.name[0]}
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-none mb-1">{selectedContact.name}</h3>
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Online</span>
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
          <div className="flex-1 overflow-hidden">
            <UnifiedChat messages={messages} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:border-blue-500 focus-within:bg-white transition-all">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Mesaj yazın..." 
                className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium"
              />
              <button 
                onClick={handleSendMessage}
                className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-90"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 text-center p-12">
           <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6 animate-bounce">
              <LayoutGrid className="w-10 h-10 text-blue-600" />
           </div>
           <h3 className="text-xl font-black text-gray-900 mb-2">Omnichannel Mərkəzi</h3>
           <p className="text-sm text-gray-500 max-w-xs mx-auto">Müştərilərinizlə bütün kanallar vasitəsilə vahid interfeysdən ünsiyyət qurun.</p>
        </div>
      )}
    </div>
  );
};

export default IntegrationsModule;
