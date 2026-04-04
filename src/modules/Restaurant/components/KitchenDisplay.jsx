import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, CheckCircle2, ArrowRight, Martini } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const TicketCard = ({ ticket, actionBtn }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-bold text-gray-900">{ticket.table}</h3>
        <p className="text-xs text-gray-500">ID: {ticket.displayId}</p>
      </div>
      <div className="flex items-center text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
        <Clock className="w-3 h-3 mr-1" />
        {ticket.timeElapsed}
      </div>
    </div>
    <div className="space-y-2 mb-4">
      {ticket.items.map((item, idx) => (
        <div key={idx} className="flex justify-between text-sm">
          <span className="text-gray-700">{item.qty}x {item.name}</span>
          {item.notes && <span className="text-gray-400 italic text-xs">({item.notes})</span>}
        </div>
      ))}
    </div>
    {actionBtn}
  </div>
);

const ActionBtn = ({ onClick, text, color, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`w-full py-2 rounded-lg text-white text-sm font-bold transition-colors ${color}`}
  >
    {text}
  </button>
);

const KitchenDisplay = () => {
  const [tickets, setTickets] = useState([]);
  const [activeStation, setActiveStation] = useState('kitchen'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000); 
    return () => clearInterval(interval);
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name, categories(name)), orders!inner(id, status, restaurant_tables(number))')
        .neq('orders.status', 'completed')
        .order('created_at', { ascending: true });
      
      if (data && Array.isArray(data)) {
        const grouped = data.reduce((acc, item) => {
          const orderId = item.order_id;
          if (!orderId) return acc;

          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
          const category = product?.categories;
          const categoryName = Array.isArray(category) ? category[0]?.name : category?.name;
          const table = order?.restaurant_tables;
          const tableNumber = Array.isArray(table) ? table[0]?.number : table?.number;

          if (!acc[orderId]) {
            acc[orderId] = {
              id: orderId,
              displayId: orderId.slice(0, 8).toUpperCase(),
              table: tableNumber || 'Unknown',
              status: (item.status || 'new').toUpperCase(),
              station: ['Drinks', 'Desserts'].includes(categoryName) ? 'bar' : 'kitchen',
              items: [],
              created_at: new Date(item.created_at)
            };
          }
          acc[orderId].items.push({
            id: item.id,
            name: product?.name || 'Unknown Item',
            qty: item.quantity,
            notes: item.notes
          });
          
          return acc;
        }, {});

        setTickets(Object.values(grouped).map(t => ({
          ...t,
          timeElapsed: Math.floor((new Date() - t.created_at) / 60000) + 'm'
        })));
      }
    } catch (err) {
      console.error('Fetch tickets error:', err);
    }
    setLoading(false);
  };

  const moveOrder = async (orderId, newStatus) => {
    const statusLower = newStatus.toLowerCase();

    // Update all order_items for this order
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({ status: statusLower })
      .eq('order_id', orderId);

    // Also sync the parent order status
    if (!itemsError) {
      await supabase
        .from('orders')
        .update({ status: statusLower })
        .eq('id', orderId);

      fetchTickets();
    }
  };

  const getStationParams = () => {
    return activeStation === 'kitchen' 
      ? { icon: <ChefHat className="w-5 h-5 mr-2 text-merkez-blue" />, title: 'Kitchen Display System', color: 'blue' }
      : { icon: <Martini className="w-5 h-5 mr-2 text-purple-500" />, title: 'Bar Display System', color: 'purple' };
  };

  const { icon, title } = getStationParams();

  // Filter based on currently active station
  const stationTickets = (tickets || []).filter(t => t && t.station === activeStation);
  const getColumnData = (status) => stationTickets.filter(t => t && t.status === status);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            {icon}
            {title}
          </h2>
          <p className="text-sm text-gray-500">Manage incoming tickets and track preparation times.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Station Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
             <button
               onClick={() => setActiveStation('kitchen')}
               className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm flex items-center ${
                 activeStation === 'kitchen' ? 'bg-white text-merkez-blue' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <ChefHat className="w-4 h-4 mr-2"/>
               Kitchen
             </button>
             <button
               onClick={() => setActiveStation('bar')}
               className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm flex items-center ${
                 activeStation === 'bar' ? 'bg-white text-purple-600' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <Martini className="w-4 h-4 mr-2"/>
               Bar
             </button>
          </div>

          <div className="flex gap-3">
            <div className="text-center px-4 py-1.5 bg-red-50 rounded-lg border border-red-100 min-w-[70px]">
              <span className="block text-xl font-bold text-red-600">{getColumnData('NEW').length}</span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">New</span>
            </div>
            <div className="text-center px-4 py-1.5 bg-yellow-50 rounded-lg border border-yellow-100 min-w-[70px]">
              <span className="block text-xl font-bold text-yellow-600">{getColumnData('PREPARING').length}</span>
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Preparing</span>
            </div>
            <div className="text-center px-4 py-1.5 bg-green-50 rounded-lg border border-green-100 min-w-[70px]">
              <span className="block text-xl font-bold text-green-600">{getColumnData('READY').length}</span>
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Ready</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        
        {/* NEW COLUMN */}
        <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
          <div className="p-4 bg-red-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🔴 New Tickets</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('NEW').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('NEW').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'PREPARING')} text="Start Preparing" color="bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500" />}
              />
            ))}
            {getColumnData('NEW').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">No new tickets.</p>
            )}
          </div>
        </div>

        {/* PREPARING COLUMN */}
        <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
          <div className="p-4 bg-yellow-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟡 Preparing</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('PREPARING').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('PREPARING').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'READY')} text="Mark as Ready" color="bg-green-500 hover:bg-green-600 focus:ring-green-500" />}
              />
            ))}
            {getColumnData('PREPARING').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">No tickets in preparation.</p>
            )}
          </div>
        </div>

        {/* READY COLUMN */}
        <div className="flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
          <div className="p-4 bg-green-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟢 Ready for Pickup</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('READY').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('READY').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'completed')} text="Archived (Done)" color="bg-gray-500 hover:bg-gray-600" />}
              />
            ))}
            {getColumnData('READY').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">No tickets waiting for pickup.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default KitchenDisplay;
