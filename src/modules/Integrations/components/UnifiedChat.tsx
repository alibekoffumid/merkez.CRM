import React from 'react';
import { MessageSquare, Instagram, Phone, Check, CheckCheck, Clock } from 'lucide-react';

export interface UnifiedMessage {
  id: string;
  source: 'whatsapp' | 'instagram' | 'phone';
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'missed' | 'sending';
  sender_name?: string;
}

const UnifiedChat: React.FC<{ messages: UnifiedMessage[] }> = ({ messages }) => {
  
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whatsapp': return <MessageSquare className="w-3 h-3 text-green-500" />;
      case 'instagram': return <Instagram className="w-3 h-3 text-pink-500" />;
      case 'phone': return <Phone className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return <Clock className="w-3 h-3 text-blue-200 animate-pulse" />;
      case 'sent': return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed': return <Clock className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4 h-full overflow-y-auto bg-gray-50/30 no-scrollbar">
      {messages.map((msg) => (
        <div 
          key={msg.id}
          className={`flex w-full ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`
            relative max-w-[80%] sm:max-w-[70%] p-3 rounded-2xl shadow-sm border
            ${msg.direction === 'outbound' 
              ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none' 
              : 'bg-white text-gray-900 border-gray-100 rounded-tl-none'}
          `}>
            {/* Source Badge */}
            <div className={`
              absolute -top-2 ${msg.direction === 'outbound' ? '-left-2' : '-right-2'}
              bg-white rounded-full p-1 shadow-md border border-gray-100
            `}>
              {getSourceIcon(msg.source)}
            </div>

            {msg.direction === 'inbound' && (
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 leading-none">
                {msg.sender_name || 'Guest'}
              </p>
            )}

            <div className="text-sm font-medium leading-relaxed">
              {msg.content}
            </div>

            <div className={`
              flex items-center justify-end gap-1 mt-1 text-[10px]
              ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'}
            `}>
              <span>{new Date(msg.timestamp || (msg as any).created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {msg.direction === 'outbound' && getStatusIcon(msg.status)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UnifiedChat;
