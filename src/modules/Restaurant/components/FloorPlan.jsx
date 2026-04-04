import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Clock, Receipt, X, Plus, Minus, CreditCard, UserPlus, ShoppingCart, Search, UserCheck } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// Helper for initials
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length === 0) return '?';
  return parts.map(n => n[0]).join('').toUpperCase();
};

const FloorPlan = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [selectedTable, setSelectedTable] = useState(null);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [tables, setTables] = useState([]);
  const [menuStation, setMenuStation] = useState('Kitchen');
  const [menuSearch, setMenuSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [liveMenu, setLiveMenu] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [tableOrders, setTableOrders] = useState([]);
  const [tableOrdersLoading, setTableOrdersLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          fetchTables(),
          fetchLiveMenu(),
          fetchLiveOrders()
        ]);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchLiveOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, restaurant_tables(number), order_items(id, quantity)')
        .neq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (data) {
        setLiveOrders(data.map(o => ({
          id: '#' + o.id.substring(0, 8).toUpperCase(),
          table: o.restaurant_tables?.number || '?',
          items: o.order_items?.length || 0,
          status: o.status,
          total: parseFloat(o.total_amount || 0)
        })));
      }
    } catch (e) {}
  };

  const fetchLiveMenu = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, categories(name)');
      
      if (data && Array.isArray(data)) {
        setLiveMenu(data.map(p => {
          const category = Array.isArray(p.categories) ? p.categories[0] : p.categories;
          const categoryName = (category?.name || 'Dish').trim();
          return {
            id: p.id,
            name: p.name,
            price: parseFloat(p.price),
            category: categoryName,
            station: ['Drinks', 'Desserts'].some(s => s.toLowerCase() === categoryName.toLowerCase()) ? 'Bar' : 'Kitchen'
          };
        }));
      }
    } catch (e) {}
  };

  const fetchTableOrders = async (tableId) => {
    if (!tableId) return;
    setTableOrdersLoading(true);
    try {
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', tableId)
        .neq('status', 'completed');

      if (!activeOrders || activeOrders.length === 0) {
        setTableOrders([]);
        return;
      }

      const orderIds = activeOrders.map(o => o.id);
      const { data } = await supabase
        .from('order_items')
        .select('*, products(name, price)')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      setTableOrders(data || []);
    } catch (e) {
    } finally {
      setTableOrdersLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          table_id: selectedTable.id,
          status: 'pending',
          total_amount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        status: 'new'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (!itemsError) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' }) 
          .eq('id', selectedTable.id);

        const newAmount = (selectedTable.amount || 0) + orderData.total_amount;
        setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, status: 'occupied', amount: newAmount } : t));
        setSelectedTable(prev => ({ ...prev, status: 'occupied', amount: newAmount }));
        fetchTableOrders(selectedTable.id);
        fetchLiveOrders();
        setCart([]);
        setIsAddingOrder(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTables = async () => {
    const { data } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('number', { ascending: true });
    
    if (data) {
      setTables(data.map(t => ({
        ...t,
        amount: 0,
        timeSeated: t.status === 'occupied' ? '12:00' : null,
        waiter: t.status === 'occupied' ? t('restaurant.staff') || 'Staff' : null
      })));
    }
  };

  const getTableColor = (status) => {
    switch(status) {
      case 'free': return 'bg-white border-merkez-green text-merkez-green shadow-[0_2px_10px_-4px_rgba(52,168,83,0.3)] hover:bg-green-50';
      case 'occupied': return 'bg-merkez-blue border-merkez-blue text-white shadow-[0_2px_10px_-4px_rgba(66,133,244,0.4)] hover:bg-blue-600';
      case 'reserved': return 'bg-white border-merkez-yellow text-merkez-yellow shadow-[0_2px_10px_-4px_rgba(251,188,5,0.3)] hover:bg-yellow-50';
      default: return 'bg-gray-100 border-gray-200 text-gray-400';
    }
  };

  const getOrderStatusColor = (status) => {
    switch(status) {
      case 'preparing': return 'bg-yellow-100 text-merkez-yellow';
      case 'ready': return 'bg-green-100 text-merkez-green';
      case 'served': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCloseModal = () => {
    setSelectedTable(null);
    setIsAddingOrder(false);
    setMenuSearch('');
    setCart([]);
    setTableOrders([]);
  };

  const handleSeatGuests = async () => {
    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied' })
      .eq('id', selectedTable.id);

    if (!error) {
      const staffLabel = t('restaurant.staff') || 'Staff';
      const updatedTable = {
        ...selectedTable,
        status: 'occupied',
        timeSeated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: 0,
        waiter: staffLabel
      };
      
      setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
      setSelectedTable(updatedTable);
    }
  };

  const handleCheckout = async () => {
    await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('table_id', selectedTable.id)
      .neq('status', 'completed');

    const { error } = await supabase
      .from('restaurant_tables')
      .update({ status: 'free' })
      .eq('id', selectedTable.id);

    if (!error) {
      const updatedTable = {
        ...selectedTable,
        status: 'free',
        timeSeated: null,
        amount: 0,
        waiter: null
      };
      
      setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
      setSelectedTable(updatedTable);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[600px]">
      {/* Tables Grid Layout */}
      <div className="flex-[2] bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[500px]">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-lg font-semibold text-gray-900">{t('restaurant.mainHall')}</h3>
           <div className="flex space-x-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
             {['all', 'free', 'occupied', 'reserved'].map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 {f === 'all' ? t('restaurant.allTables') : t('restaurant.' + f)}
               </button>
             ))}
           </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 content-start overflow-y-auto pr-2 no-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '300px' }}>
          {loading ? (
             <div className="col-span-full h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
                <Clock className="w-8 h-8 animate-pulse" />
                <span>{t('common.loading')}...</span>
             </div>
          ) : tables.length === 0 ? (
             <div className="col-span-full h-48 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                {t('restaurant.noTables')}
             </div>
          ) : (
            tables
              .filter(table => filter === 'all' || table.status === filter)
              .map(table => (
                <div 
                  key={table.id} 
                  onClick={() => { setSelectedTable(table); fetchTableOrders(table.id); }}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer h-32 ${getTableColor(table.status)}`}
                >
                  {table.waiter && (
                    <div 
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-sm flex items-center justify-center text-[10px] font-bold text-current"
                      title={`${t('restaurant.assignedWaiter')}: ${table.waiter}`}
                    >
                      {getInitials(table.waiter)}
                    </div>
                  )}
                  <span className="text-2xl font-bold mb-1">{table.number}</span>
                  <div className="flex items-center text-xs opacity-90 mb-2">
                    <Users className="w-4 h-4 mr-1" /> {table.capacity}
                  </div>
                  {table.status === 'occupied' && (
                    <div className="absolute bottom-3 text-xs font-medium bg-black/20 px-2 py-0.5 rounded-full flex gap-2">
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {table.timeSeated}</span>
                      <span>${(table.amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {table.status === 'reserved' && (
                    <div className="absolute bottom-3 text-xs font-medium px-2 py-0.5 rounded-full text-gray-600 bg-black/5">
                      <span>19:00</span>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>

        <div className="mt-6 flex justify-center gap-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
           <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-merkez-green mr-2"></span> {t('restaurant.free')}</div>
           <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-merkez-blue mr-2"></span> {t('restaurant.occupied')}</div>
           <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-merkez-yellow mr-2"></span> {t('restaurant.reserved')}</div>
        </div>
      </div>

      {/* Active Orders Queue Sidebar */}
      <div className="flex-[1] flex flex-col gap-6">
       <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-[400px] overflow-hidden">
           <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
             <h3 className="text-lg font-semibold text-gray-900 flex items-center">
               <Receipt className="w-5 h-5 mr-2 text-merkez-blue" />
               {t('restaurant.kitchenQueue')}
             </h3>
             <span className="bg-blue-50 text-merkez-blue text-xs font-bold px-2 py-1 rounded-full">{liveOrders.length} {t('restaurant.active')}</span>
           </div>
           
           <div className="flex-1 space-y-3 overflow-y-auto pr-2 min-h-0 no-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
             {liveOrders.length === 0 ? (
               <p className="text-sm text-gray-400 text-center py-8">{t('restaurant.noActiveOrders')}</p>
             ) : (
               liveOrders.map(order => (
                 <div key={order.id} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-gray-50/50 cursor-pointer">
                   <div className="flex justify-between items-start mb-2">
                     <div>
                       <span className="text-sm font-bold text-gray-900">{t('restaurant.table')} {order.table}</span>
                       <span className="block text-xs text-gray-500">{order.id}</span>
                     </div>
                     <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wider ${getOrderStatusColor(order.status)}`}>
                       {t('status.' + (order.status?.toLowerCase() || 'pending'))}
                     </span>
                   </div>
                   <div className="flex justify-between items-end mt-3">
                     <span className="text-sm text-gray-600">{order.items} {t('restaurant.items')}</span>
                     <span className="text-sm font-bold text-gray-900">${order.total.toFixed(2)}</span>
                   </div>
                 </div>
               ))
             )}
           </div>
           <button className="w-full mt-4 py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-lg text-sm font-medium hover:text-merkez-blue hover:border-merkez-blue transition-colors">
             {t('restaurant.viewAllOrders')}
           </button>
         </div>
      </div>

      {/* Table Details & Order Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
          <div className={`bg-white rounded-none sm:rounded-2xl shadow-xl w-full transition-all duration-300 overflow-hidden flex flex-col h-full sm:h-[650px] sm:max-h-[90vh] ${isAddingOrder ? 'max-w-5xl' : 'max-w-md'} animate-in fade-in zoom-in-95`}>
            
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {t('restaurant.table')} {selectedTable.number} {isAddingOrder && `- ${t('restaurant.selectItems')}`}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-md hover:bg-gray-100">
                <X className="w-6 h-6 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              
              {/* Left Column: Table Details */}
              <div className={`p-5 flex flex-col flex-1 min-h-0 overflow-hidden ${isAddingOrder ? 'w-full lg:w-[40%] lg:border-r border-gray-100 bg-white flex-shrink-0' : 'w-full'}`}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-sm text-gray-500">{t('restaurant.tableStatus')}</p>
                    <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      selectedTable.status === 'free' ? 'bg-green-100 text-merkez-green' : 
                      selectedTable.status === 'occupied' ? 'bg-blue-100 text-merkez-blue' : 
                      'bg-yellow-100 text-merkez-yellow'
                    }`}>
                      {t('status.' + selectedTable.status)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{t('restaurant.maxCapacity')}</p>
                    <p className="font-semibold text-gray-900 mt-1 flex items-center justify-end">
                      <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                      {selectedTable.capacity}
                    </p>
                  </div>
                </div>

                {selectedTable.waiter && (
                  <div className="mb-6 flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                     <div className="w-10 h-10 rounded-full bg-blue-100 text-merkez-blue flex items-center justify-center text-sm font-bold mr-3 shadow-sm border border-blue-200">
                       {getInitials(selectedTable.waiter)}
                     </div>
                     <div>
                       <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('restaurant.assignedWaiter')}</p>
                       <p className="text-sm font-semibold text-gray-900">{selectedTable.waiter}</p>
                     </div>
                  </div>
                )}

                {selectedTable.status === 'occupied' ? (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Header Info Stats (non-scrolling) */}
                    <div className="space-y-4 shrink-0 pb-4">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm transition-all">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">{t('restaurant.currentBill')}</span>
                          <span className="font-bold text-gray-900 text-lg">${(selectedTable.amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('restaurant.timeSeated')}</span>
                          <span className="font-medium text-gray-900">{selectedTable.timeSeated}</span>
                        </div>
                      </div>
                      
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                        {t('restaurant.activeOrder')}
                        <span className="text-merkez-blue font-bold px-2 py-0.5 bg-blue-50 rounded-full">{tableOrders.length} {t('restaurant.items').toUpperCase()}</span>
                      </h4>
                    </div>

                    {/* Scrollable Order List - Live Data */}
                    <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                      {tableOrdersLoading ? (
                        <p className="text-sm text-gray-400 text-center py-4">{t('common.loading')}</p>
                      ) : tableOrders.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">{t('restaurant.noOrders')}</p>
                      ) : (
                        <ul className="space-y-3 pr-2">
                          {tableOrders.map(item => {
                            const statusColors = {
                              'new': 'text-merkez-blue bg-blue-100',
                              'preparing': 'text-yellow-700 bg-yellow-100',
                              'ready': 'text-green-700 bg-green-100',
                              'served': 'text-gray-600 bg-gray-100',
                            };
                            const color = statusColors[item.status?.toLowerCase()] || 'text-gray-500 bg-gray-50';
                            const price = item.products?.price ? parseFloat(item.products.price) * item.quantity : 0;
                            return (
                              <li key={item.id} className="flex justify-between items-center text-sm py-1">
                                <div className="flex gap-2 items-center flex-1 mr-3 min-w-0">
                                  <span className="text-merkez-blue font-bold shrink-0">{item.quantity}x</span>
                                  <span className="font-medium text-gray-900 leading-tight truncate">{item.products?.name || 'Item'}</span>
                                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide ${color}`}>
                                    {t('status.' + (item.status?.toLowerCase() || 'pending'))}
                                  </span>
                                </div>
                                <span className="font-bold text-gray-900 shrink-0 whitespace-nowrap">${price.toFixed(2)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    
                    {/* Fixed Footer Buttons */}
                    <div className="pt-4 mt-auto shrink-0 border-t border-gray-100 bg-white">
                      {!isAddingOrder ? (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button onClick={() => setIsAddingOrder(true)} className="w-full sm:flex-1 bg-merkez-blue text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center">
                            <Plus className="w-4 h-4 mr-2" /> {t('restaurant.addOrder')}
                          </button>
                          <button 
                             onClick={handleCheckout} 
                             className="w-full sm:flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center"
                          >
                            <CreditCard className="w-4 h-4 mr-2" /> {t('restaurant.checkout')}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setIsAddingOrder(false)} className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-sm font-extrabold hover:bg-gray-50 transition-all flex items-center justify-center shadow-sm">
                          {t('restaurant.doneOrdering')}
                        </button>
                      )}
                    </div>
                  </div>
                ) : selectedTable.status === 'free' ? (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                       <Users className="w-12 h-12 text-gray-300 mb-4" />
                       <h4 className="text-lg font-bold text-gray-900">{t('restaurant.tableEmpty')}</h4>
                       <p className="text-sm text-gray-500 max-w-[200px]">{t('restaurant.assignGuests')}</p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <button 
                        onClick={handleSeatGuests}
                        className="w-full bg-merkez-green text-white py-3 rounded-lg text-sm font-bold hover:bg-green-600 transition-all flex items-center justify-center shadow-md"
                      >
                        <UserPlus className="w-5 h-5 mr-2" /> {t('restaurant.seatGuests')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100/50 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
                           <Clock className="w-5 h-5" />
                         </div>
                         <div>
                           <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider">{t('restaurant.reserved')} @ 19:00</p>
                           <p className="text-lg font-bold text-yellow-900">John Doe</p>
                         </div>
                      </div>
                      
                      <div className="space-y-3 p-4 bg-white/60 rounded-lg border border-yellow-100 text-sm text-yellow-800">
                        <div className="flex justify-between">
                          <span className="opacity-70">Phone:</span>
                          <span className="font-semibold">+1 555-0198</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Guests:</span>
                          <span className="font-semibold">4 People</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100">
                      <button className="w-full bg-merkez-yellow text-white py-3 rounded-lg text-sm font-bold hover:bg-yellow-500 transition-all shadow-md flex items-center justify-center">
                         <UserCheck className="w-4 h-4 mr-2" /> {t('status.ready')}
                      </button>
                      <button className="w-full bg-white border border-gray-200 text-gray-500 py-3 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all">
                         {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Menu (Visible only when Add Order is clicked) */}
              {isAddingOrder && (
                <div className="w-full lg:w-[60%] bg-gray-50 p-4 sm:p-6 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                     <h4 className="font-bold text-gray-900">{t('restaurant.selectItems')}</h4>
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                       <button
                         onClick={() => setMenuStation('Kitchen')}
                         className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm flex items-center ${
                           menuStation === 'Kitchen' ? 'bg-white text-merkez-blue' : 'text-gray-500 shadow-none hover:text-gray-700'
                         }`}
                       >
                         {t('restaurant.kitchen')}
                       </button>
                       <button
                         onClick={() => setMenuStation('Bar')}
                         className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm flex items-center ${
                           menuStation === 'Bar' ? 'bg-white text-purple-600' : 'text-gray-500 shadow-none hover:text-gray-700'
                         }`}
                       >
                         {t('restaurant.bar')}
                       </button>
                     </div>
                  </div>
                  
                  <div className="mb-4 shrink-0 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      placeholder={t('restaurant.searchDishes')} 
                      className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-merkez-blue focus:border-merkez-blue block pl-9 p-2.5 outline-none transition-colors shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto no-scrollbar pr-2 pb-4">
                    {liveMenu.filter(item => 
                        item.station === menuStation && 
                        item.name.toLowerCase().includes(menuSearch.trim().toLowerCase())
                    ).map(item => {
                      const cartItem = cart.find(i => i.id === item.id);
                      const quantity = cartItem ? cartItem.quantity : 0;
                      
                      return (
                        <div key={item.id} onClick={() => addToCart(item)} className={`bg-white border p-3 rounded-xl shadow-sm transition-colors cursor-pointer flex flex-col justify-between h-24 ${quantity > 0 ? 'border-merkez-blue ring-1 ring-merkez-blue/20' : 'border-gray-100 hover:border-merkez-blue group'}`}>
                          <div>
                             <p className="text-xs text-gray-500 font-medium mb-1">{item.category}</p>
                             <p className="text-sm font-bold text-gray-900 leading-tight truncate">{item.name}</p>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                             <span className="text-sm font-bold text-merkez-blue">${item.price.toFixed(2)}</span>
                             
                             {quantity > 0 ? (
                               <div className="flex items-center space-x-2 bg-blue-50 rounded-full px-1 py-1">
                                 <button 
                                  onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                  className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-merkez-blue shadow-sm hover:bg-gray-50 transition-colors"
                                 >
                                   <Minus className="w-3 h-3" />
                                 </button>
                                 <span className="text-xs font-bold text-merkez-blue w-3 text-center">{quantity}</span>
                                 <button 
                                  onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                  className="w-6 h-6 rounded-full bg-merkez-blue flex items-center justify-center text-white shadow-sm hover:bg-blue-600 transition-colors"
                                 >
                                   <Plus className="w-3 h-3" />
                                 </button>
                                </div>
                             ) : (
                               <button 
                                onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-merkez-blue group-hover:text-white transition-colors"
                               >
                                 <Plus className="w-4 h-4" />
                               </button>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Real cart footer */}
                  <div className="mt-auto bg-white p-4 rounded-xl shadow-sm border border-gray-200 shrink-0 flex justify-between items-center">
                     <div className="flex items-center text-gray-600">
                        <ShoppingCart className="w-5 h-5 mr-3" />
                        <div>
                           <p className="text-xs font-medium uppercase">{t('dashboard.newOrder')}</p>
                           <p className="text-sm font-bold text-gray-900">{cart.reduce((sum, i) => sum + i.quantity, 0)} {t('restaurant.items')}</p>
                        </div>
                     </div>
                     <button 
                      onClick={handleSendToKitchen}
                      disabled={cart.length === 0}
                      className={`px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${cart.length > 0 ? 'bg-merkez-green text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                     >
                        {t('restaurant.sendToKitchen')}
                     </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlan;
