import React, { useState, useEffect } from 'react';
import { PhoneCall, Plus, Clock, Search, Filter } from 'lucide-react';
import TicketModal from './components/TicketModal';
import { supabase } from '../../supabaseClient';

const CallCenterModule = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setTickets(data.map((c, idx) => ({
        id: `CRM-${c.id.slice(0, 4).toUpperCase()}`,
        clientName: c.name,
        phone: c.phone || 'N/A',
        address: c.address || 'N/A',
        status: c.status || 'NEW',
        type: c.type || 'Regular',
        initialRequest: c.initial_request || 'New inquiry.',
        estimatedValue: c.estimated_value || 0,
        time: idx === 0 ? 'Just now' : `${idx * 15} mins ago`,
        comments: [
          { text: 'Lead imported from system.', time: 'System' }
        ],
        reminder: idx % 3 === 0 ? 'Today, 17:00' : null
      })));
    }
    setLoading(false);
  };

  const handleUpdateStatus = (id, newStatus) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleAddComment = (id, text) => {
    setTickets(tickets.map(t => {
      if (t.id === id) {
        return {
          ...t,
          comments: [...t.comments, { text, time: 'Just now' }]
        };
      }
      return t;
    }));
  };

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const columns = [
    { title: 'New Leads', status: 'NEW', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { title: 'Contacted', status: 'CONTACTED', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { title: 'Requires Follow-Up', status: 'FOLLOW_UP', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { title: 'Converted / Ordered', status: 'CONVERTED', color: 'bg-green-100 text-green-700 border-green-200' }
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 justify-between rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <PhoneCall className="w-6 h-6 mr-3 text-merkez-blue" />
            Unified Sales & Support CRM
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage inbound leads, support tickets, and scheduling across any industry.</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-blue focus:border-merkez-blue block w-full pl-10 p-2.5 outline-none transition-colors" 
              placeholder="Search by phone, name or ID..."
            />
          </div>
          <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
            <Filter className="w-5 h-5" />
          </button>
          <button className="px-4 py-2 bg-merkez-blue text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors flex items-center">
            <Plus className="w-4 h-4 mr-2" /> New Ticket
          </button>
        </div>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-6 h-full min-w-[1000px]">
          {columns.map(col => {
            const columnTickets = tickets.filter(t => 
              t.status === col.status && 
              (t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
               t.phone.includes(searchQuery) ||
               t.id.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            return (
              <div key={col.status} className="flex-1 flex flex-col bg-gray-50 rounded-2xl border border-gray-200/60 overflow-hidden shadow-inner">
                {/* Column Header */}
                <div className="p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm flex justify-between items-center sticky top-0 z-10">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${col.color}`}>
                    {columnTickets.length}
                  </span>
                </div>
                
                {/* Column Body / Cards */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {columnTickets.map(ticket => (
                    <div 
                      key={ticket.id} 
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-merkez-blue/50 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-3">
                         <div>
                           <span className="text-[10px] font-bold text-gray-400 block mb-0.5 tracking-wider">{ticket.id}</span>
                           <h4 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-merkez-blue transition-colors">
                             {ticket.clientName}
                           </h4>
                         </div>
                         {ticket.type === 'VIP' && (
                           <span className="text-[9px] bg-merkez-yellow/20 text-yellow-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">
                             🌟 VIP
                           </span>
                         )}
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100 line-clamp-2 leading-relaxed">
                        {ticket.initialRequest}
                      </p>

                      <div className="flex justify-between items-center text-xs font-medium border-t border-gray-50 pt-3">
                        <span className="text-gray-500 font-mono flex items-center gap-1.5"><PhoneCall className="w-3 h-3 text-merkez-blue"/> {ticket.phone}</span>
                      </div>

                      {ticket.reminder && (
                        <div className="mt-3 flex items-center bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1.5 rounded-md uppercase tracking-wider">
                          <Clock className="w-3 h-3 mr-1.5" /> Callback: {ticket.reminder}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {columnTickets.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs font-medium text-gray-400 bg-white/40">
                      Drag ticket here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TicketModal 
        ticket={selectedTicket} 
        onClose={() => setSelectedTicketId(null)} 
        onUpdateStatus={handleUpdateStatus}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

export default CallCenterModule;
