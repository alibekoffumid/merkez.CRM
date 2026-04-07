import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Clock, Receipt, X, Plus, Minus, CreditCard, UserPlus, ShoppingCart, Search, UserCheck, User, Gift, Star, Repeat, Move, ChevronRight } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { InventoryService } from '../../../services/InventoryService';
import WaiterAuthOverlay from './WaiterAuthOverlay';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [useBonuses, setUseBonuses] = useState(false);

  // Authentication & Attendance
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authActionTitle, setAuthActionTitle] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [activeWaiter, setActiveWaiter] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOrderCreatedAt, setActiveOrderCreatedAt] = useState(null);

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
    if (!tableId) {
      setTableOrders([]);
      return;
    }
    setTableOrdersLoading(true);

    // Find table in the latest list to resolve merging
    const tableMetadata = tables.find(t => t.id === tableId);
    const targetTableId = tableMetadata?.merged_id || tableId;

    try {
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id, created_at')
        .eq('table_id', targetTableId)
        .neq('status', 'completed')
        .limit(1);

      if (!activeOrders || activeOrders.length === 0) {
        setTableOrders([]);
        setActiveOrderId(null);
        setActiveOrderCreatedAt(null);
        return;
      }

      const orderId = activeOrders[0].id;
      setActiveOrderId(orderId);
      setActiveOrderCreatedAt(activeOrders[0].created_at);

      const { data } = await supabase
        .from('order_items')
        .select('*, products(name, price)')
        .eq('order_id', orderId)
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

  const searchCustomers = async (query) => {
    if (!query) {
      setCustomers([]);
      return;
    }
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(5);
    setCustomers(data || []);
  };

  const authenticatedAction = (action, title) => {
    setAuthActionTitle(title || t('restaurant.authorizeAction'));
    setPendingAction(() => action);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (waiter) => {
    setActiveWaiter(waiter);
    if (pendingAction) {
      pendingAction(waiter);
      setPendingAction(null);
    }
    setIsAuthOpen(false);
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    try {
      // 1. Stock check
      const stockWarnings = await InventoryService.checkStockAvailability(cart);
      if (stockWarnings.length > 0) {
        const confirmMsg = (t('restaurant.stockWarningPrefix') || 'Attention: Some ingredients are low/empty. Proceed anyway?\n\n') + stockWarnings.join('\n');
        if (!window.confirm(confirmMsg)) return;
      }

      const orderTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      let finalDiscount = 0;
      
      // 2. Calculate Birthday Discount (15%)
      if (selectedCustomer?.birthday) {
        const today = new Date();
        const bday = new Date(selectedCustomer.birthday);
        if (today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth()) {
          finalDiscount = orderTotal * 0.15;
        }
      }

      // 3. Handle Bonuses
      let bonusesUsed = 0;
      if (useBonuses && selectedCustomer) {
        bonusesUsed = Math.min(selectedCustomer.bonus_balance || 0, orderTotal - finalDiscount);
      }

      // 4. Calculate Points to Earn (5% of paid amount)
      const pointsEarned = (orderTotal - finalDiscount - bonusesUsed) * 0.05;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          table_id: selectedTable.merged_id || selectedTable.id,
          status: 'pending',
          total_amount: orderTotal - finalDiscount - bonusesUsed,
          customer_id: selectedCustomer?.id,
          discount_amount: finalDiscount + bonusesUsed,
          points_earned: pointsEarned
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 5. Update customer stats if linked
      if (selectedCustomer) {
        const { error: custError } = await supabase
          .from('customers')
          .update({
            bonus_balance: (selectedCustomer.bonus_balance || 0) - bonusesUsed + pointsEarned,
            total_spent: (selectedCustomer.total_spent || 0) + (orderTotal - finalDiscount - bonusesUsed)
          })
          .eq('id', selectedCustomer.id);
        
        if (custError) console.error('Customer update failed:', custError);
      }

      // 6. Add order items
      const itemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        status: 'new'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 7. Update table status if not already occupied
      if (selectedTable.status !== 'occupied') {
        await supabase
          .from('restaurant_tables')
          .update({ 
            status: 'occupied', 
            waiter: t('restaurant.staff') || 'Staff' 
          }) 
          .eq('id', selectedTable.merged_id || selectedTable.id);
      }

      fetchTables();
      fetchTableOrders(selectedTable.id);
      fetchLiveOrders();
      setCart([]);
      setIsAddingOrder(false);
      setSelectedCustomer(null);
      setUseBonuses(false);
    } catch (e) {
      console.error(e);
      window.alert(`Order Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchTables = async () => {
    const { data } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('number', { ascending: true });
    
    if (data) {
      setTables(data.map(tableObj => ({
        ...tableObj,
        amount: 0,
        timeSeated: tableObj.status === 'occupied' ? '12:00' : null,
        waiter: tableObj.status === 'occupied' ? t('restaurant.staff') || 'Staff' : null
      })));
    }
  };

  const getTableColor = (status) => {
    switch(status) {
      case 'free': return 'bg-white border-merkez-green text-merkez-green shadow-[0_2px_10px_-4px_rgba(52,168,83,0.3)] hover:bg-green-50';
      case 'occupied': return 'bg-merkez-blue border-merkez-blue text-white shadow-[0_2px_10px_-4px_rgba(66,133,244,0.4)] hover:bg-blue-600';
      case 'reserved': return 'bg-white border-merkez-yellow text-merkez-yellow shadow-[0_2px_10px_-4px_rgba(251,188,5,0.3)] hover:bg-yellow-50';
      case 'selected': return 'bg-merkez-green/20 border-merkez-green text-merkez-green ring-2 ring-merkez-green ring-offset-2';
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
    setTableOrders([]);
    setSelectedCustomer(null);
    setUseBonuses(false);
    setSearchCustomerQuery('');
    setMoveMode(false);
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

  const handleStartMerge = () => {
    setMergeMode(true);
    setSelectedForMerge([]);
  };

  const toggleTableMergeSelection = (id) => {
    setSelectedForMerge(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const confirmMerge = async () => {
    if (selectedForMerge.length === 0) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ merged_id: selectedTable.id })
        .in('id', selectedForMerge);

      if (error) {
        window.alert(`Merge Error: ${error.message}`);
      } else {
        setMergeMode(false);
        setSelectedForMerge([]);
        fetchTables();
      }
    } catch (e) {
      console.error(e);
      window.alert(`Unexpected Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnmerge = async (table) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ merged_id: null })
        .eq('id', table.id);

      if (error) {
        window.alert(`Unmerge Error: ${error.message}`);
      } else {
        fetchTables();
        handleCloseModal();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrderId || !activeOrderCreatedAt) return;
    
    // Safety check: 5 minutes limit
    const orderTime = new Date(activeOrderCreatedAt).getTime();
    const now = new Date().getTime();
    const diffMins = (now - orderTime) / (1000 * 60);
    
    if (diffMins > 5) {
      window.alert(t('restaurant.tooLateToCancel'));
      return;
    }

    if (!window.confirm(t('restaurant.cancelConfirm'))) return;

    setIsProcessing(true);
    try {
      // 1. Delete items (cascade might handle this, but let's be safe if defined)
      await supabase.from('order_items').delete().eq('order_id', activeOrderId);
      
      // 2. Delete order
      await supabase.from('orders').delete().eq('id', activeOrderId);
      
      // 3. Reset table
      await supabase
        .from('restaurant_tables')
        .update({ status: 'free', waiter: null, customer_id: null })
        .eq('id', selectedTable.id);

      window.alert(t('common.success'));
      handleCloseModal();
      fetchTables();
    } catch (err) {
      console.error(err);
      window.alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelItem = async (item) => {
    if (!item || !window.confirm(t('restaurant.cancelItemConfirm'))) return;

    setIsProcessing(true);
    try {
      // 1. Delete the item
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('id', item.id);

      if (deleteError) throw deleteError;

      // 2. Clear table if no items left, otherwise update total
      const remainingItems = tableOrders.filter(o => o.id !== item.id);
      
      if (remainingItems.length === 0) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'free', waiter: null, customer_id: null })
          .eq('id', selectedTable.id);
        handleCloseModal();
        fetchTables();
      } else {
        fetchTableOrders(selectedTable.id);
        // Table total is handled by active_orders view or will be refreshed in next load
        fetchTables();
      }
      
      window.alert(t('restaurant.itemCancelled'));
    } catch (err) {
      console.error(err);
      window.alert(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartMove = () => {
    setMoveMode(true);
    setIsAddingOrder(false);
  };

  const confirmMoveTable = async (newTable) => {
    if (!newTable || newTable.status !== 'free') return;
    
    setIsProcessing(true);
    try {
      const oldTableId = selectedTable.id;
      const newTableId = newTable.id;

      // 1. Move all active orders
      const { error: orderError } = await supabase
        .from('orders')
        .update({ table_id: newTableId })
        .eq('table_id', oldTableId)
        .neq('status', 'completed');

      if (orderError) throw orderError;

      // 2. Update table statuses
      await supabase
        .from('restaurant_tables')
        .update({ 
          status: 'occupied',
          waiter: selectedTable.waiter,
          // Move merged_id relationships if any? 
          // For now, let's just move the 'master' status if old was master
        })
        .eq('id', newTableId);

      await supabase
        .from('restaurant_tables')
        .update({ status: 'free', waiter: null, merged_id: null })
        .eq('id', oldTableId);

      // 3. Move children if old was master
      await supabase
        .from('restaurant_tables')
        .update({ merged_id: newTableId })
        .eq('merged_id', oldTableId);

      setMoveMode(false);
      setSelectedTable(null);
      fetchTables();
      window.alert(t('restaurant.moveSuccess'));
    } catch (e) {
      console.error(e);
      window.alert(`Move Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    // 1. Get all active orders for this table first to deduct ingredients
    try {
      const masterId = selectedTable.merged_id || selectedTable.id;

      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', masterId)
        .neq('status', 'completed');

      // 2. Mark orders as completed
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('table_id', masterId)
        .neq('status', 'completed');

      // 3. Deduct ingredients for each order
      if (activeOrders && activeOrders.length > 0) {
        for (const order of activeOrders) {
          await InventoryService.deductIngredientsFromOrder(order.id);
        }
      }

      // 4. Free all tables in the group
      await supabase
        .from('restaurant_tables')
        .update({ status: 'free', merged_id: null })
        .or(`id.eq.${masterId},merged_id.eq.${masterId}`);

      fetchTables();
      handleCloseModal();
    } catch (invErr) {
      console.error('Inventory deduction failed during checkout:', invErr);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[600px]">
      {/* Tables Grid Layout */}
      <div className="flex-[2] bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[500px] relative">
        {mergeMode && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-merkez-green text-white px-6 py-4 rounded-t-xl flex justify-between items-center animate-in slide-in-from-top-4">
            <div className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-3" />
              <span className="font-bold">{t('restaurant.selectToMerge')} {selectedTable.number}</span>
              <span className="ml-4 bg-white/20 px-3 py-1 rounded-full text-xs font-black">{selectedForMerge.length} {t('restaurant.items').toUpperCase()}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMergeMode(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all">
                {t('restaurant.cancelMerge')}
              </button>
              <button 
                onClick={confirmMerge}
                disabled={selectedForMerge.length === 0 || isProcessing}
                className="px-4 py-2 bg-white text-merkez-green hover:bg-gray-50 rounded-lg text-sm font-black transition-all shadow-md disabled:opacity-50 flex items-center"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-merkez-green border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {t('restaurant.confirmMerge')}
              </button>
            </div>
          </div>
        )}
        {moveMode && (
          <div className="absolute top-0 left-0 right-0 z-20 bg-merkez-blue text-white px-6 py-4 rounded-t-xl flex justify-between items-center animate-in slide-in-from-top-4">
            <div className="flex items-center">
              <Move className="w-5 h-5 mr-3" />
              <span className="font-bold">{t('restaurant.selectNewTable')} {selectedTable.number}</span>
            </div>
            <button onClick={() => setMoveMode(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all">
              {t('restaurant.cancelMove')}
            </button>
          </div>
        )}
        <div className={`flex justify-between items-center mb-6 ${mergeMode || moveMode ? 'mt-16' : ''}`}>
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
        
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 content-start overflow-y-auto p-4 no-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '300px' }}>
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
                  onClick={() => { 
                    if (mergeMode) {
                      if (table.id !== selectedTable.id && table.status === 'free') {
                        toggleTableMergeSelection(table.id);
                      }
                    } else if (moveMode) {
                      if (table.id !== selectedTable.id && table.status === 'free') {
                        confirmMoveTable(table);
                      }
                    } else {
                      authenticatedAction(() => {
                        setSelectedTable(table); 
                        fetchTableOrders(table.id); 
                      }, t('restaurant.authorizeAction'));
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer h-32 ${
                    getTableColor(mergeMode && selectedForMerge.includes(table.id) ? 'selected' : table.status)
                  } ${mergeMode && table.id === selectedTable.id ? 'ring-4 ring-merkez-blue ring-offset-4' : ''}`}
                >
                  {table.merged_id && !mergeMode && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-merkez-blue text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg z-10 flex items-center whitespace-nowrap">
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      {tables.find(t => t.id === table.merged_id)?.number || '?'}
                    </div>
                  )}
                  {!table.merged_id && tables.some(t => t.merged_id === table.id) && !mergeMode && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-merkez-green text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg z-10 flex items-center whitespace-nowrap">
                      <Users className="w-3 h-3 mr-1" />
                      {t('restaurant.isMaster').toUpperCase()}
                    </div>
                  )}
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
      {selectedTable && !mergeMode && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4" onClick={handleCloseModal}>
          <div 
            className={`bg-white rounded-none sm:rounded-2xl shadow-xl w-full transition-all duration-300 overflow-hidden flex flex-col h-full sm:h-[650px] sm:max-h-[90vh] ${isAddingOrder ? 'max-w-5xl' : 'max-w-md'} animate-in fade-in zoom-in-95`}
            onClick={(e) => e.stopPropagation()}
          >
            
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
                            const isCancellable = (new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60) <= 5;
                            
                            return (
                              <li key={item.id} className="group flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
                                <div className="flex gap-2 items-center flex-1 mr-3 min-w-0">
                                  <span className="text-merkez-blue font-bold shrink-0">{item.quantity}x</span>
                                  <span className="font-medium text-gray-900 leading-tight truncate">{item.products?.name || 'Item'}</span>
                                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide ${color}`}>
                                    {t('status.' + (item.status?.toLowerCase() || 'pending'))}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-gray-900 shrink-0 whitespace-nowrap">${price.toFixed(2)}</span>
                                  {isCancellable && (
                                    <button 
                                      onClick={() => authenticatedAction(() => handleCancelItem(item), t('restaurant.cancelOrder'))}
                                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                      title={t('restaurant.cancelOrder')}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    
                    {/* Fixed Footer Buttons */}
                    <div className="pt-4 mt-auto shrink-0 border-t border-gray-100 bg-white">
                      {!isAddingOrder ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button 
                            onClick={() => setIsAddingOrder(true)} 
                            className="w-full bg-merkez-blue text-white py-3 px-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md flex items-center justify-center group"
                          >
                            <Plus className="w-4 h-4 mr-1.5 shrink-0 transition-transform group-hover:scale-110" />
                            <span className="leading-tight">{t('restaurant.addOrder')}</span>
                          </button>
                          <button 
                             onClick={() => authenticatedAction(handleCheckout, t('restaurant.checkout'))} 
                             className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center"
                          >
                            <CreditCard className="w-4 h-4 mr-2" /> {t('restaurant.checkout')}
                          </button>
                          <button 
                             onClick={() => authenticatedAction(handleStartMove, t('restaurant.moveTable'))}
                             className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center"
                          >
                            <Repeat className="w-4 h-4 mr-2 text-merkez-yellow" /> {t('restaurant.moveTable')}
                          </button>

                          {(activeOrderId && activeOrderCreatedAt && ((new Date().getTime() - new Date(activeOrderCreatedAt).getTime()) / (1000 * 60) <= 5)) && (
                            <button 
                              onClick={() => authenticatedAction(handleCancelOrder, t('restaurant.cancelOrder'))}
                              className="w-full sm:col-span-3 mt-1 bg-red-50 text-red-600 py-3 rounded-lg text-sm font-bold hover:bg-red-100 transition-all flex items-center justify-center border border-red-100"
                            >
                              <X className="w-4 h-4 mr-2" /> {t('restaurant.cancelOrder')}
                            </button>
                          )}
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
                        className="w-full bg-merkez-green text-white py-3 rounded-lg text-sm font-bold hover:bg-green-600 transition-all flex items-center justify-center shadow-md mb-3"
                      >
                        <UserPlus className="w-5 h-5 mr-2" /> {t('restaurant.seatGuests')}
                      </button>
                      <button 
                        onClick={handleStartMerge}
                        className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all flex items-center justify-center shadow-sm"
                      >
                        <ShoppingCart className="w-5 h-5 mr-2 text-merkez-blue" /> {t('restaurant.mergeTables')}
                      </button>
                      {selectedTable.merged_id && (
                        <button 
                          onClick={() => handleUnmerge(selectedTable)}
                          className="w-full mt-3 bg-red-50 text-red-600 py-3 rounded-lg text-sm font-bold hover:bg-red-100 transition-all flex items-center justify-center"
                        >
                          <X className="w-5 h-5 mr-2" /> {t('restaurant.unmerge')}
                        </button>
                      )}
                      
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

                  {/* Real cart footer with Loyalty integration */}
                  <div className="mt-auto bg-white p-4 rounded-xl shadow-xl border border-gray-100 shrink-0 space-y-4 animate-in slide-in-from-bottom-4">
                     {/* Customer Linking Section */}
                     <div className="flex flex-col gap-2">
                        {!selectedCustomer ? (
                          <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-merkez-blue transition-colors" />
                            <input 
                              type="text" 
                              value={searchCustomerQuery}
                              onChange={(e) => {
                                setSearchCustomerQuery(e.target.value);
                                searchCustomers(e.target.value);
                              }}
                              placeholder={t('restaurant.searchCustomer')} 
                              className="w-full bg-gray-50 border border-gray-100 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-merkez-blue/20 focus:border-merkez-blue block pl-9 p-2.5 outline-none transition-all"
                            />
                            {customers.length > 0 && (
                              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 shadow-2xl rounded-xl mb-2 z-50 overflow-hidden divide-y divide-gray-50">
                                {customers.map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => {
                                      setSelectedCustomer(c);
                                      setCustomers([]);
                                      setSearchCustomerQuery('');
                                    }}
                                    className="p-3 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between transition-colors"
                                  >
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 font-bold text-gray-500 text-xs">
                                        {getInitials(c.name)}
                                      </div>
                                      <div>
                                        <div className="text-sm font-bold text-gray-900">{c.name}</div>
                                        <div className="text-[10px] text-gray-500 font-medium">{c.phone}</div>
                                      </div>
                                    </div>
                                    {c.type === 'VIP' && <Star className="w-4 h-4 text-merkez-yellow fill-merkez-yellow" />}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-blue-50/50 border border-merkez-blue/20 p-2.5 rounded-xl">
                            <div className="flex items-center min-w-0">
                              <div className="w-9 h-9 rounded-full bg-merkez-blue text-white flex items-center justify-center font-bold mr-3 shadow-md border-2 border-white">
                                {getInitials(selectedCustomer.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">{selectedCustomer.name}</div>
                                <div className="flex items-center text-[10px] text-merkez-blue font-bold uppercase tracking-wider">
                                  <Star className="w-3 h-3 mr-1" />
                                  {selectedCustomer.bonus_balance?.toFixed(2)} pts
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Birthday Badge */}
                              {(selectedCustomer.birthday && 
                                new Date(selectedCustomer.birthday).getDate() === new Date().getDate() && 
                                new Date(selectedCustomer.birthday).getMonth() === new Date().getMonth()) && (
                                <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-black flex items-center shadow-sm animate-bounce">
                                  <Gift className="w-3 h-3 mr-1" /> BD -15%
                                </div>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  setUseBonuses(false);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Bonus Toggle */}
                        {selectedCustomer && selectedCustomer.bonus_balance > 0 && (
                          <div 
                            onClick={() => setUseBonuses(!useBonuses)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all ${useBonuses ? 'border-merkez-green bg-green-50 shadow-sm' : 'border-gray-50 bg-gray-50/30'}`}
                          >
                            <div className="flex items-center text-xs font-bold text-gray-600">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${useBonuses ? 'bg-merkez-green text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <CreditCard className="w-4 h-4" />
                              </div>
                              {t('restaurant.applyBonuses')}
                            </div>
                            <span className={`text-sm font-black ${useBonuses ? 'text-merkez-green' : 'text-gray-400'}`}>
                              -${Math.min(selectedCustomer.bonus_balance, cart.reduce((s, i) => s + (i.price * i.quantity), 0)).toFixed(2)}
                            </span>
                          </div>
                        )}
                     </div>

                     {/* Total and Submit */}
                     <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('restaurant.total')}</span>
                           <span className="text-2xl font-black text-gray-900">
                             ${(
                               cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - 
                               (selectedCustomer && new Date(selectedCustomer.birthday).getDate() === new Date().getDate() && new Date(selectedCustomer.birthday).getMonth() === new Date().getMonth() ? cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.15 : 0) -
                               (useBonuses ? Math.min(selectedCustomer?.bonus_balance || 0, cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)) : 0)
                             ).toFixed(2)}
                           </span>
                        </div>
                        <button 
                          onClick={handleSendToKitchen}
                          disabled={cart.length === 0 || isProcessing}
                          className={`group relative flex items-center px-8 py-3 rounded-xl font-black text-sm uppercase tracking-tighter transition-all shadow-lg active:scale-95 ${
                            cart.length > 0 
                              ? 'bg-merkez-blue text-white hover:bg-blue-600' 
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                          }`}
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-1 group-hover:translate-x-1 transition-transform" />
                          )}
                          {t('restaurant.sendToKitchen')}
                        </button>
                     </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      {/* Auth Overlay */}
      <WaiterAuthOverlay 
        isOpen={isAuthOpen}
        onClose={() => { setIsAuthOpen(false); setPendingAction(null); }}
        onSuccess={handleAuthSuccess}
        actionTitle={authActionTitle}
      />
    </div>
  );
};

export default FloorPlan;
