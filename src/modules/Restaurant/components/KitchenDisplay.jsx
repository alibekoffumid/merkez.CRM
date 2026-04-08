import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, ChefHat, CheckCircle2, ArrowRight, Martini } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const TicketCard = ({ ticket, actionBtn, t }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-bold text-gray-900">{ticket.table}</h3>
        <p className="text-xs text-gray-500">{t('kitchen.ticketId')}: {ticket.displayId}</p>
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
  const { t } = useTranslation();
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
      // 1. Fetch active orders
      const { data: activeOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, 
          status, 
          created_at,
          restaurant_tables(number),
          order_items (
            id,
            product_id,
            quantity,
            notes,
            status,
            products (
              name,
              categories (name)
            )
          )
        `)
        .neq('status', 'completed')
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      if (activeOrders) {
        const processedTickets = activeOrders.map(order => {
          const items = order.order_items || [];
          if (items.length === 0) return null;

          // Ticket status is based on the least progressed item
          // Map 'pending' or 'new' to 'NEW' column
          let ticketStatus = (order.status || 'NEW').toUpperCase();
          if (ticketStatus === 'PENDING') ticketStatus = 'NEW';
          
          return {
            id: order.id,
            displayId: order.id.slice(0, 8).toUpperCase(),
            table: order.restaurant_tables?.number || '?',
            status: ticketStatus,
            // If any item is bar-related, we might want to split or just tag. 
            // For now, let's keep the station logic based on items.
            station: items.some(item => {
              const catName = item.products?.categories?.name || '';
              return ['Drinks', 'Desserts'].includes(catName);
            }) ? 'bar' : 'kitchen',
            items: items.map(item => ({
              id: item.id,
              name: item.products?.name || 'Unknown',
              qty: item.quantity,
              notes: item.notes
            })),
            created_at: new Date(order.created_at)
          };
        }).filter(Boolean);

        setTickets(processedTickets.map(t => ({
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

    try {
      // 1. Update all order_items for this order
      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ status: statusLower })
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // 2. Also sync the parent order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: statusLower })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await fetchTickets();
    } catch (err) {
      console.error('Move order error:', err);
    }
  };

  const getStationParams = () => {
    return activeStation === 'kitchen' 
      ? { icon: <ChefHat className="w-5 h-5 mr-2 text-merkez-blue" />, title: t('kitchen.kdsTitle'), color: 'blue' }
      : { icon: <Martini className="w-5 h-5 mr-2 text-purple-500" />, title: t('kitchen.barTitle'), color: 'purple' };
  };

  const { icon, title } = getStationParams();

  // Filter based on currently active station
  const stationTickets = (tickets || []).filter(t => t && t.station === activeStation);
  const getColumnData = (status) => stationTickets.filter(t => t && t.status === status);

  // Mobile column view state
  const [mobileColumn, setMobileColumn] = useState('NEW');

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            {icon}
            {title}
          </h2>
          <p className="text-sm text-gray-500">{t('kitchen.subtitle')}</p>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-4 items-center w-full sm:w-auto">
          {/* Station Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
             <button
               onClick={() => setActiveStation('kitchen')}
               className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm flex items-center justify-center ${
                 activeStation === 'kitchen' ? 'bg-white text-merkez-blue' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <ChefHat className="w-4 h-4 mr-2"/>
               {t('kitchen.stationKitchen')}
             </button>
             <button
               onClick={() => setActiveStation('bar')}
               className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 rounded-md text-sm font-bold transition-all shadow-sm flex items-center justify-center ${
                 activeStation === 'bar' ? 'bg-white text-purple-600' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <Martini className="w-4 h-4 mr-2"/>
               {t('kitchen.stationBar')}
             </button>
          </div>

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center">
            <div 
              onClick={() => setMobileColumn('NEW')}
              className={`text-center px-3 sm:px-4 py-1.5 rounded-lg border min-w-[60px] sm:min-w-[70px] cursor-pointer transition-all lg:cursor-default ${
                mobileColumn === 'NEW' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100 opacity-60'
              } lg:opacity-100 lg:bg-red-50 lg:border-red-100`}
            >
               <span className="block text-lg sm:text-xl font-bold text-red-600">{getColumnData('NEW').length}</span>
               <span className="text-[9px] sm:text-[10px] font-bold text-red-400 uppercase tracking-wider">{t('status.new')}</span>
             </div>
             <div 
               onClick={() => setMobileColumn('PREPARING')}
               className={`text-center px-3 sm:px-4 py-1.5 rounded-lg border min-w-[60px] sm:min-w-[70px] cursor-pointer transition-all lg:cursor-default ${
                 mobileColumn === 'PREPARING' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100 opacity-60'
               } lg:opacity-100 lg:bg-yellow-50 lg:border-yellow-100`}
             >
               <span className="block text-lg sm:text-xl font-bold text-yellow-600">{getColumnData('PREPARING').length}</span>
               <span className="text-[9px] sm:text-[10px] font-bold text-yellow-400 uppercase tracking-wider">{t('status.preparing')}</span>
             </div>
             <div 
               onClick={() => setMobileColumn('READY')}
               className={`text-center px-3 sm:px-4 py-1.5 rounded-lg border min-w-[60px] sm:min-w-[70px] cursor-pointer transition-all lg:cursor-default ${
                 mobileColumn === 'READY' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 opacity-60'
               } lg:opacity-100 lg:bg-green-50 lg:border-green-100`}
             >
               <span className="block text-lg sm:text-xl font-bold text-green-600">{getColumnData('READY').length}</span>
               <span className="text-[9px] sm:text-[10px] font-bold text-green-400 uppercase tracking-wider">{t('status.ready')}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden relative" style={{ height: 'calc(100vh - 210px)' }}>
        
        {/* NEW COLUMN */}
        <div className={`flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner transition-all duration-300 ${
          mobileColumn === 'NEW' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="p-4 bg-red-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🔴 {t('kitchen.columnNew')}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('NEW').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('NEW').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 t={t}
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'PREPARING')} text={t('kitchen.startPreparing')} color="bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500" />}
              />
            ))}
            {getColumnData('NEW').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">{t('kitchen.noNewTickets')}</p>
            )}
          </div>
        </div>

        {/* PREPARING COLUMN */}
        <div className={`flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner transition-all duration-300 ${
          mobileColumn === 'PREPARING' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="p-4 bg-yellow-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟡 {t('kitchen.columnPreparing')}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('PREPARING').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('PREPARING').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 t={t}
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'READY')} text={t('kitchen.markAsReady')} color="bg-green-500 hover:bg-green-600 focus:ring-green-500" />}
              />
            ))}
            {getColumnData('PREPARING').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">{t('kitchen.noPreparing')}</p>
            )}
          </div>
        </div>

        {/* READY COLUMN */}
        <div className={`flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner transition-all duration-300 ${
          mobileColumn === 'READY' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="p-4 bg-green-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟢 {t('kitchen.columnReady')}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('READY').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getColumnData('READY').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 t={t}
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'served')} text={t('kitchen.archivedDone')} color="bg-gray-500 hover:bg-gray-600" />}
              />
            ))}
            {getColumnData('READY').length === 0 && (
              <p className="text-center text-gray-400 font-medium text-sm mt-8">{t('kitchen.noReady')}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default KitchenDisplay;
