import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Clock, FileText, CheckCircle2, AlertCircle, Calendar, MessageSquare, ChevronDown, User, MapPin } from 'lucide-react';

const TicketModal = ({ ticket, onClose, onUpdateStatus, onAddComment }) => {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState('');

  if (!ticket) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    onAddComment(ticket.id, newComment);
    setNewComment('');
  };

  const statusColors = {
    'NEW': 'bg-blue-100 text-blue-700 border-blue-200',
    'CONTACTED': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'FOLLOW_UP': 'bg-purple-100 text-purple-700 border-purple-200',
    'CONVERTED': 'bg-green-100 text-green-700 border-green-200',
    'LOST': 'bg-gray-100 text-gray-700 border-gray-200'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">{t('common.actions')} #{ticket.id}</h2>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider border ${statusColors[ticket.status]}`}>
              {ticket.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-200">
            <AlertCircle className="w-5 h-5 rotate-45" /> {/* Using as closing cross visually */}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          {/* Left Panel: Client Info */}
          <div className="w-full md:w-1/3 border-r border-gray-100 p-6 overflow-y-auto bg-white flex-shrink-0">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t('callCenter.clientDetails')}</h3>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-merkez-blue text-lg font-bold border border-blue-100 pb-0.5">
                {ticket.clientName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg leading-tight">{ticket.clientName}</h4>
                <p className="text-sm text-gray-500 font-medium">{ticket.phone}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start gap-3 text-sm text-gray-700">
                   <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                   <span>{ticket.address || t('callCenter.noAddress')}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-sm text-gray-700">
                   <User className="w-4 h-4 text-gray-400" />
                   <span>{t('callCenter.customerType')}</span>
                 </div>
                 <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                   {ticket.type === 'VIP' ? t('callCenter.vip') : t('callCenter.regular')}
                 </span>
              </div>
            </div>

            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-8 mb-4">{t('callCenter.inquiryDetails')}</h3>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100/50">
               <p className="text-sm text-orange-900 font-medium whitespace-pre-wrap">{ticket.initialRequest}</p>
            </div>
            
            <div className="mt-6 flex justify-between items-center text-xs text-gray-500">
               <div className="flex flex-col gap-1">
                 <span>{t('callCenter.source')}: <strong>Inbound Web / Call</strong></span>
                 <span>{t('callCenter.industry')}: <strong>General Service</strong></span>
               </div>
               <div className="text-right">
                 <span>{t('callCenter.estimatedValue')}</span>
                 <p className="font-bold text-lg text-gray-900">${ticket.estimatedValue.toLocaleString()}</p>
               </div>
            </div>
          </div>

          {/* Middle Panel: Timeline & Comments */}
          <div className="flex-1 bg-gray-50/30 flex flex-col overflow-hidden relative">
            <div className="p-6 pb-2 shrink-0 border-b border-gray-100 bg-white">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                 <MessageSquare className="w-4 h-4" /> {t('callCenter.activityLog')}
               </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {ticket.comments.map((comment, index) => (
                <div key={index} className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-xs font-bold text-gray-500 pb-0.5">
                     OP
                   </div>
                   <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex-1 relative group">
                     <p className="text-sm text-gray-800">{comment.text}</p>
                     <span className="text-[10px] text-gray-400 font-medium absolute -bottom-5 left-0 invisible group-hover:visible transition-all">
                       {comment.time}
                     </span>
                   </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
               <div className="flex gap-3">
                 <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder={t('callCenter.notePlaceholder')} 
                    className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-merkez-blue focus:border-merkez-blue block p-3 outline-none transition-colors"
                 />
                 <button 
                   onClick={handleAddComment}
                   className="bg-merkez-blue text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors"
                 >
                   {t('callCenter.send')}
                 </button>
               </div>
            </div>
          </div>

          {/* Right Panel: Actions & Reminders */}
          <div className="w-full md:w-1/4 border-l border-gray-100 bg-white flex flex-col p-6 overflow-y-auto shrink-0">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t('callCenter.pipelineStatus')}</h3>
             
             <div className="space-y-2 mb-8">
               {Object.keys(statusColors).map(status => (
                 <button
                   key={status}
                   onClick={() => onUpdateStatus(ticket.id, status)}
                   className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-colors border ${
                     ticket.status === status 
                       ? statusColors[status] + ' shadow-sm'
                       : 'border-transparent text-gray-500 hover:bg-gray-50'
                   }`}
                 >
                   {status.replace('_', ' ')}
                   {ticket.status === status && <CheckCircle2 className="w-4 h-4 float-right" />}
                 </button>
               ))}
             </div>

             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t('callCenter.callReminder')}</h3>
             <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col gap-3">
               <div className="flex items-center text-merkez-blue font-bold text-sm">
                 <Calendar className="w-4 h-4 mr-2" />
                 {t('callCenter.setCallback')}
               </div>
               
               {ticket.reminder ? (
                 <div className="bg-white p-3 rounded-lg border border-blue-200 text-sm font-medium text-gray-800 flex justify-between items-center shadow-sm">
                   <span>{ticket.reminder}</span>
                   <button className="text-gray-400 hover:text-red-500 px-1"><AlertCircle className="w-4 h-4 rotate-45"/></button>
                 </div>
               ) : (
                 <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:border-merkez-blue hover:text-merkez-blue transition-colors flex justify-between items-center shadow-sm">
                   {t('callCenter.chooseDateTime')} <ChevronDown className="w-4 h-4" />
                 </button>
               )}
             </div>

             <div className="mt-auto pt-8 flex flex-col gap-3">
               <button className="w-full bg-merkez-green text-white py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-green-600 transition-colors flex items-center justify-center">
                 <FileText className="w-4 h-4 mr-2" /> {t('callCenter.requestQuote')}
               </button>
               <button className="w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors flex items-center justify-center">
                 <Phone className="w-4 h-4 mr-2" /> {t('callCenter.startCall')}
               </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TicketModal;
