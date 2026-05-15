import React, { useEffect, useRef } from 'react';
import { MessageSquare, Instagram, Phone, Check, CheckCheck, Clock, LayoutGrid, AlertCircle, Send } from 'lucide-react';

export interface UnifiedMessage {
  id: string;
  source: 'whatsapp' | 'instagram' | 'phone' | 'telephony';
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'missed' | 'sending';
  sender_name?: string;
}

const UnifiedChat: React.FC<{ messages: UnifiedMessage[] }> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whatsapp': return <MessageSquare className="w-3 h-3 text-green-500" />;
      case 'instagram': return <Instagram className="w-3 h-3 text-pink-500" />;
      case 'phone': return <Phone className="w-3 h-3 text-blue-500" />;
      case 'telephony': return <Send className="w-3 h-3 text-blue-400" />; // Use Send icon for Telegram/Telephony
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return <Clock className="w-3 h-3 text-blue-200 animate-pulse" />;
      case 'sent': return <Check className="w-3 h-3 text-blue-100" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-blue-100" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-white" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-200" />;
      default: return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getMessageDate = (msg: any) => {
    const raw = msg.timestamp || msg.created_at;
    return raw ? new Date(raw) : new Date();
  };

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/10">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-gray-200/50 flex items-center justify-center mb-4 text-gray-300">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">Нет сообщений</h4>
        <p className="text-xs text-gray-400 mt-2 max-w-[200px]">Отправьте первое сообщение, чтобы начать диалог</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex flex-col space-y-4 p-6 h-full overflow-y-auto no-scrollbar scroll-smooth">
      {messages.map((msg, index) => {
        const msgDate = getMessageDate(msg);
        const prevDate = index > 0 ? getMessageDate(messages[index - 1]) : null;
        const showDateSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

        return (
          <React.Fragment key={msg.id}>
            {showDateSeparator && (
              <div className="flex items-center justify-center my-6">
                <div className="bg-white rounded-full px-4 py-1 shadow-sm border border-gray-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatDate(msg.timestamp || (msg as any).created_at)}</span>
                </div>
              </div>
            )}
            <div className={`flex w-full ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`
                relative max-w-[85%] sm:max-w-[70%] p-4 rounded-[1.5rem] shadow-xl shadow-gray-200/20 border
                ${msg.direction === 'outbound' 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500 rounded-tr-none' 
                  : 'bg-white text-gray-900 border-gray-100 rounded-tl-none'}
              `}>
                {/* Source Badge */}
                <div className={`
                  absolute -top-2 ${msg.direction === 'outbound' ? '-left-2' : '-right-2'}
                  bg-white rounded-xl p-1.5 shadow-lg border border-gray-50 flex items-center justify-center
                `}>
                  {getSourceIcon(msg.source || (msg as any).source)}
                </div>

                {msg.direction === 'inbound' && (
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-600 mb-1 leading-none">
                    {msg.sender_name || 'Клиент'}
                  </p>
                )}

                <div className="text-[13px] font-bold leading-relaxed">
                  {msg.content}
                </div>

                <div className={`
                  flex items-center justify-end gap-1.5 mt-2 text-[10px] font-bold
                  ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'}
                `}>
                  <span>{msgDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default UnifiedChat;

