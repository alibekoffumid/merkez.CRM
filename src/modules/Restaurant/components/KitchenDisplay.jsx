import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, ChefHat, CheckCircle2, ArrowRight, Martini, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const TicketCard = ({ ticket, actionBtn, t }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-bold text-gray-900">{ticket.table}</h3>
        <p className="text-xs text-gray-500">{t('kitchen.ticketId') || 'ID'}: {ticket.displayId}</p>
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
        const processedTickets = [];

        activeOrders.forEach(order => {
          const items = order.order_items || [];
          if (items.length === 0) return;

          const isBarItem = (item) => {
            const catName = (item.products?.categories?.name || '').toLowerCase();
            return ['drinks', 'desserts', 'напитки', 'десерты', 'bar', 'бар', 'çəki', 'su', 'şirə'].some(keyword => 
              catName.includes(keyword)
            );
          };

          const kitchenItems = items.filter(item => !isBarItem(item));
          const barItems = items.filter(item => isBarItem(item));

          const baseTicket = {
            id: order.id,
            displayId: order.id.slice(0, 8).toUpperCase(),
            table: order.restaurant_tables?.number || '?',
            status: order.status?.toUpperCase() === 'PENDING' ? 'NEW' : (order.status || 'NEW').toUpperCase(),
            created_at: new Date(order.created_at)
          };

          if (kitchenItems.length > 0) {
            processedTickets.push({
              ...baseTicket,
              id: `${order.id}-kitchen`,
              station: 'kitchen',
              items: kitchenItems.map(item => ({
                id: item.id,
                name: item.products?.name || 'Unknown',
                qty: item.quantity,
                notes: item.notes
              }))
            });
          }

          if (barItems.length > 0) {
            processedTickets.push({
              ...baseTicket,
              id: `${order.id}-bar`,
              station: 'bar',
              items: barItems.map(item => ({
                id: item.id,
                name: item.products?.name || 'Unknown',
                qty: item.quantity,
                notes: item.notes
              }))
            });
          }
        });

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

  const moveOrder = async (ticketId, newStatus) => {
    const orderId = ticketId.replace(/-kitchen$|-bar$/, '');
    const statusLower = newStatus.toLowerCase();
    
    // UI mapping: When kitchen finishes, it should move to 'ready' 
    // so waiter can see it and mark as 'served'.
    // If we mark as 'done' from 'ready' column, it goes to 'served'.
    let targetStatus = statusLower;
    if (statusLower === 'done') targetStatus = 'served';

    try {
      // 1. Update items
      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ status: targetStatus })
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // 2. Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: targetStatus })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await fetchTickets();
    } catch (err) {
      console.error('Move order error:', err);
      window.alert('Error updating status: ' + (err.message || err));
    }
  };

  const getStationParams = () => {
    return activeStation === 'kitchen' 
      ? { icon: <ChefHat className="w-5 h-5 mr-2 text-merkez-blue" />, title: t('kitchen.kdsTitle') || 'Kitchen Display', color: 'blue' }
      : { icon: <Martini className="w-5 h-5 mr-2 text-purple-500" />, title: t('kitchen.barTitle') || 'Bar Display', color: 'purple' };
  };

  const { icon, title } = getStationParams();
  const stationTickets = (tickets || []).filter(t => t && t.station === activeStation);
  const getColumnData = (status) => stationTickets.filter(t => t && t.status === status);

  const [mobileColumn, setMobileColumn] = useState('NEW');

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            {icon}
            {title}
          </h2>
          <p className="text-sm text-gray-500">{t('kitchen.subtitle') || 'Manage orders'}</p>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-4 items-center w-full sm:w-auto">
          <div className="flex bg-gray-100 p-1 rounded-md w-full sm:w-auto">
             <button
               onClick={() => setActiveStation('kitchen')}
               className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 rounded-sm text-sm font-bold transition-all shadow-sm flex items-center justify-center ${
                 activeStation === 'kitchen' ? 'bg-white text-merkez-blue' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <ChefHat className="w-4 h-4 mr-2"/>
               {t('kitchen.stationKitchen') || 'Kitchen'}
             </button>
             <button
               onClick={() => setActiveStation('bar')}
               className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 rounded-sm text-sm font-bold transition-all shadow-sm flex items-center justify-center ${
                 activeStation === 'bar' ? 'bg-white text-purple-600' : 'text-gray-500 shadow-none hover:text-gray-700'
               }`}
             >
               <Martini className="w-4 h-4 mr-2"/>
               {t('kitchen.stationBar') || 'Bar'}
             </button>
          </div>

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-center">
            {['NEW', 'PREPARING', 'READY'].map(s => (
              <div 
                key={s}
                onClick={() => setMobileColumn(s)}
                className={`text-center px-3 sm:px-4 py-1.5 rounded-md border min-w-[60px] sm:min-w-[70px] cursor-pointer transition-all lg:cursor-default ${
                  mobileColumn === s 
                    ? (s === 'NEW' ? 'bg-red-50 border-red-200' : s === 'PREPARING' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200') 
                    : 'bg-gray-50 border-gray-100 opacity-60'
                } lg:opacity-100`}
              >
                 <span className={`block text-lg sm:text-xl font-bold ${s === 'NEW' ? 'text-red-600' : s === 'PREPARING' ? 'text-yellow-600' : 'text-green-600'}`}>
                   {getColumnData(s).length}
                 </span>
                 <span className="text-[9px] sm:text-[10px] font-bold opacity-60 uppercase tracking-wider">{t(`status.${s.toLowerCase()}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden relative" style={{ height: 'calc(100vh - 210px)' }}>
        
        {/* NEW COLUMN */}
        <div className={`flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner transition-all duration-300 ${mobileColumn === 'NEW' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 bg-red-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🔴 {t('kitchen.columnNew') || 'New Tickets'}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('NEW').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {getColumnData('NEW').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 t={t}
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'PREPARING')} text={t('kitchen.startPreparing') || 'Start Preparing'} color="bg-yellow-500 hover:bg-yellow-600" />}
              />
            ))}
          </div>
        </div>

        {/* PREPARING COLUMN */}
        <div className={`flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner transition-all duration-300 ${mobileColumn === 'PREPARING' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 bg-yellow-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟡 {t('kitchen.columnPreparing') || 'Preparing'}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('PREPARING').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {getColumnData('PREPARING').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 t={t}
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'READY')} text={t('kitchen.markAsReady') || 'Mark as Ready'} color="bg-green-500 hover:bg-green-600" />}
              />
            ))}
          </div>
        </div>

        {/* READY COLUMN */}
        <div className={`flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner transition-all duration-300 ${mobileColumn === 'READY' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 bg-green-500 text-white font-bold flex justify-between items-center shadow-sm z-10">
            <span>🟢 {t('kitchen.columnReady') || 'Ready'}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{getColumnData('READY').length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {getColumnData('READY').map(ticket => (
              <TicketCard 
                 key={ticket.id} 
                 ticket={ticket} 
                 t={t}
                 actionBtn={<ActionBtn onClick={() => moveOrder(ticket.id, 'DONE')} text={t('kitchen.markAsDone') || 'Finish'} color="bg-blue-500 hover:bg-blue-600" />}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplay;
