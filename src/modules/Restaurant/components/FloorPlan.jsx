import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Clock, Receipt, X, Plus, Minus, CreditCard, UserPlus, ShoppingCart, Search, UserCheck, User, Gift, Star, Repeat, Move, ChevronRight, CheckCircle2, ChefHat, ArrowRight } from 'lucide-react';
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
  const [modalConfig, setModalConfig] = useState({
     isOpen: false,
     type: 'confirm', // 'confirm' | 'success' | 'error'
     title: '',
     message: '',
     onConfirm: null,
     onCancel: null
  });

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
        .neq('status', 'completed');

      if (!activeOrders || activeOrders.length === 0) {
        setTableOrders([]);
        setActiveOrderId(null);
        setActiveOrderCreatedAt(null);
        return;
      }

      // Track all active order IDs for this table
      const orderIds = activeOrders.map(o => o.id);
      setActiveOrderId(orderIds); // Store as array
      
      // Use the earliest created_at for the "Entire Order" window? 
      // Or just let individual items handle their own window.
      setActiveOrderCreatedAt(activeOrders[0].created_at);

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
      return [...prev, { ...product, quantity: 1, notes: '' }];
    });
  };

  const updateCartItemNote = (productId, notes) => {
    setCart(prev => prev.map(item => item.id === productId ? { ...item, notes } : item));
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
        notes: item.notes || '',
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
      case 'preparing': return 'bg-yellow-100 text-merkez-yellow border-yellow-200';
      case 'ready': return 'bg-green-500 text-white border-green-600 animate-pulse-gentle shadow-[0_0_15px_rgba(52,168,83,0.4)]';
      case 'served': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleServeOrder = async (orderId) => {
     setIsProcessing(true);
     try {
       // Update all order_items and the order itself to 'served'
       await supabase.from('order_items').update({ status: 'served' }).eq('order_id', orderId.replace('#', ''));
       await supabase.from('orders').update({ status: 'served' }).eq('id', orderId.replace('#', ''));
       fetchLiveOrders();
     } catch (e) {
       console.error(err);
     } finally {
       setIsProcessing(false);
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
    
    // Group delete for all active orders of this table session
    const idsToDelete = Array.isArray(activeOrderId) ? activeOrderId : [activeOrderId];

    // Safety check: 5 minutes limit from first order
    const orderTime = new Date(activeOrderCreatedAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.abs(now - orderTime) / (1000 * 60);
    
    if (diffMins > 5) {
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: t('common.error'),
        message: t('restaurant.tooLateToCancel'),
      });
      return;
    }

    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: t('restaurant.cancelOrder'),
      message: t('restaurant.cancelConfirm'),
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          // 1. Delete items for all active orders
          await supabase.from('order_items').delete().in('order_id', idsToDelete);
          
          // 2. Delete orders
          await supabase.from('orders').delete().in('id', idsToDelete);
          
          // 3. Reset table
          await supabase
            .from('restaurant_tables')
            .update({ status: 'free', waiter: null, customer_id: null })
            .eq('id', selectedTable.id);

          setModalConfig({
            isOpen: true,
            type: 'success',
            title: t('common.success'),
            message: t('common.success'),
          });
          handleCloseModal();
          fetchTables();
        } catch (err) {
          console.error(err);
          setModalConfig({
            isOpen: true,
            type: 'error',
            title: t('common.error'),
            message: t('common.error'),
          });
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleCancelItem = async (item) => {
    if (!item) return;
    
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title: t('restaurant.cancelOrder'),
      message: t('restaurant.cancelItemConfirm'),
      onConfirm: async () => {
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
            fetchTables();
          }
          
          setModalConfig({
            isOpen: true,
            type: 'success',
            title: t('common.success'),
            message: t('restaurant.itemCancelled'),
          });
        } catch (err) {
          console.error(err);
          setModalConfig({
            isOpen: true,
            type: 'error',
            title: t('common.error'),
            message: t('common.error'),
          });
        } finally {
          setIsProcessing(false);
        }
      }
    });
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
                 <div 
                   key={order.id} 
                   className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                     order.status === 'ready' 
                       ? 'bg-green-50 border-green-200 shadow-md ring-2 ring-green-100' 
                       : 'border-gray-100 hover:border-gray-200 hover:shadow-sm bg-gray-50/50'
                   }`}
                 >
                   <div className="flex justify-between items-start">
                     <div>
                       <span className="text-sm font-bold text-gray-900">{t('restaurant.table')} {order.table}</span>
                       <span className="block text-[10px] text-gray-400 font-mono tracking-tight">{order.id}</span>
                     </div>
                     <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border ${getOrderStatusColor(order.status)}`}>
                       {t('status.' + (order.status?.toLowerCase() || 'pending'))}
                     </span>
                   </div>
                   <div className="flex justify-between items-end">
                     <span className="text-xs font-medium text-gray-500">{order.items} {t('restaurant.items')}</span>
                     <span className="text-sm font-black text-gray-900">${order.total.toFixed(2)}</span>
                   </div>
                   
                   {order.status === 'ready' && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleServeOrder(order.id); }}
                        className="mt-2 w-full bg-merkez-green text-white py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all flex items-center justify-center shadow-lg active:scale-95"
                     >
                        <CheckCircle2 className="w-3 h-3 mr-2" /> {t('status.served').toUpperCase()}
                     </button>
                   )}
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
            className={`bg-white rounded-none sm:rounded-2xl shadow-xl w-full transition-all duration-300 flex flex-col h-fit max-h-[95vh] ${isAddingOrder ? 'max-w-5xl' : 'max-w-md'} animate-in fade-in zoom-in-95`}
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
              <div className={`p-5 flex flex-col h-fit min-h-0 ${isAddingOrder ? 'w-full lg:w-[40%] lg:border-r border-gray-100 bg-white flex-shrink-0' : 'w-full'}`}>
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

                    {/* Active Order List - Height restricted when adding new items */}
                    <div className={`${isAddingOrder && cart.length > 0 ? 'max-h-[100px]' : 'flex-1'} overflow-y-auto no-scrollbar py-2 border-b border-transparent transition-all`}>
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
                            // Timezone-safe 5 min check (diff in ms < 300,000)
                            const isCancellable = Math.abs(new Date().getTime() - new Date(item.created_at).getTime()) <= 300000;
                            
                            return (
                              <li key={item.id} className="group flex flex-col items-stretch text-sm py-2 border-b border-gray-50 last:border-0 overflow-hidden">
                                <div className="flex justify-between items-center">
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
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all shadow-sm border border-red-50 active:scale-90"
                                        title={t('restaurant.cancelOrder')}
                                      >
                                        <X className="w-4 h-4 stroke-[3px]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {item.notes && (
                                  <div className="mt-1 flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-md border border-gray-100 self-start">
                                    <ChefHat className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] italic text-gray-600 font-medium">"{item.notes}"</span>
                                  </div>
                                )}
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
                        <button 
                          onClick={() => setIsAddingOrder(false)} 
                          className="w-full bg-merkez-blue/10 text-merkez-blue py-4 rounded-2xl text-xs font-black hover:bg-merkez-blue/20 transition-all uppercase tracking-widest flex items-center justify-center shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {t('restaurant.doneOrdering') || 'DONE ORDERING'}
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
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                  {/* Menu Header */}
                  <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-4 bg-white sticky top-0 z-30">
                    <div className="flex bg-gray-100 p-1 rounded-2xl flex-1 max-w-xs">
                      <button
                        onClick={() => setMenuStation('Kitchen')}
                        className={`flex-1 py-1 px-3 rounded-lg text-[10px] font-black transition-all ${menuStation === 'Kitchen' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                         {t('restaurant.kitchen').toUpperCase()}
                      </button>
                      <button
                        onClick={() => setMenuStation('Bar')}
                        className={`flex-1 py-1 px-3 rounded-lg text-[10px] font-black transition-all ${menuStation === 'Bar' ? 'bg-white text-merkez-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {t('restaurant.bar').toUpperCase()}
                      </button>
                    </div>
                    
                    <div className="relative flex-1 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-merkez-blue transition-colors" />
                      <input
                        type="text"
                        placeholder={t('common.search')}
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-merkez-blue/10 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="flex-1 overflow-y-auto p-4 no-scrollbar h-full">
                    {loading ? (
                      <div className="flex justify-center py-20 text-gray-400 font-bold animate-pulse uppercase tracking-widest">{t('common.loading')}</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-32">
                        {liveMenu
                          .filter(item => item.station === menuStation && (!menuSearch || item.name.toLowerCase().includes(menuSearch.toLowerCase())))
                          .map(product => (
                            <button
                              key={product.id}
                              onClick={() => addToCart(product)}
                              className="group p-4 bg-white border border-gray-100 rounded-2xl text-left hover:border-merkez-blue hover:shadow-lg transition-all active:scale-95 flex flex-col shadow-sm"
                            >
                              <div className="flex-1 mb-3">
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">{product.category}</p>
                                <p className="font-bold text-gray-900 group-hover:text-merkez-blue transition-colors leading-snug truncate">{product.name}</p>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-merkez-blue">${parseFloat(product.price).toFixed(2)}</span>
                                <div className="bg-blue-50 p-1 rounded-lg text-merkez-blue opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus className="w-4 h-4" />
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* SLIDE-UP STRETCHY DRAWER */}
                  {cart.length > 0 && (
                    <div 
                      className="absolute inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-xl shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 rounded-t-[32px] transition-all duration-300 ease-out"
                      style={{ height: 'fit-content', maxHeight: '85%' }}
                    >
                      {/* Interaction Bar */}
                      <div className="flex justify-center py-2">
                        <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
                      </div>

                      {/* Drawer Header */}
                      <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-50 sticky top-0 z-10 rounded-t-[32px]">
                        <div className="flex items-center gap-3">
                           <div className="bg-merkez-blue text-white p-2 rounded-xl shadow-lg">
                             <ShoppingCart className="w-5 h-5" />
                           </div>
                           <div>
                             <h4 className="text-sm font-black text-gray-900 leading-none mb-1">{t('restaurant.newItems')} ({cart.length})</h4>
                             <p className="text-xs font-bold text-merkez-blue opacity-70">
                               Total: ${(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}
                             </p>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="text-right mr-3 hidden sm:block">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">TOTAL</p>
                               <p className="text-lg font-black text-merkez-blue leading-none">${(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}</p>
                            </div>
                            <button 
                              onClick={() => authenticatedAction(handleSendToKitchen, t('restaurant.sendToKitchen'))}
                              disabled={isProcessing}
                              className="bg-merkez-blue text-white px-6 py-4 rounded-2xl font-black text-sm flex items-center shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isProcessing ? t('common.loading') : t('restaurant.sendToKitchen')} 
                              <ArrowRight className="ml-2 w-4 h-4" />
                            </button>
                        </div>
                      </div>

                      {/* Stretchy Items List */}
                      <div className="px-6 py-4 overflow-y-auto no-scrollbar max-h-[60vh]">
                         <div className="space-y-4 pb-10">
                            {cart.map(item => (
                              <div key={item.id} className="bg-gray-50 border border-gray-100 p-6 rounded-[24px] flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-lg font-black text-gray-900 leading-none mb-1">{item.name}</h4>
                                    <p className="text-sm font-bold text-merkez-blue opacity-70">${(item.price * item.quantity).toFixed(2)}</p>
                                  </div>
                                  <div className="flex items-center space-x-4 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                                     <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-merkez-blue hover:bg-gray-50"><Minus className="w-4 h-4" /></button>
                                     <span className="text-lg font-black text-merkez-blue w-4 text-center">{item.quantity}</span>
                                     <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-xl bg-merkez-blue text-white"><Plus className="w-4 h-4" /></button>
                                  </div>
                                </div>
                                
                                {/* STRETCHY CHEF NOTE */}
                                <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 focus-within:border-merkez-blue/30 transition-all shadow-inner">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-amber-50 rounded-lg">
                                       <ChefHat className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-gray-400">{t('restaurant.addNote') || "Chef Note"}</span>
                                  </div>
                                  <textarea 
                                    rows="3"
                                    placeholder="..."
                                    value={item.notes || ''}
                                    onChange={(e) => updateCartItemNote(item.id, e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-base font-bold text-gray-800 resize-none min-h-[90px]"
                                  />
                                </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>
                  )}
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
       {/* Custom Status Modal */}
       {modalConfig.isOpen && (
         <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}></div>
           <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col items-center">
             <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border ${
               modalConfig.type === 'success' ? 'bg-green-50 text-merkez-green border-green-100' :
               modalConfig.type === 'error' ? 'bg-red-50 text-red-500 border-red-100' :
               'bg-blue-50 text-merkez-blue border-blue-100'
             }`}>
               {modalConfig.type === 'success' ? <UserCheck className="w-10 h-10" /> :
                modalConfig.type === 'error' ? <AlertTriangle className="w-10 h-10" /> :
                <Move className="w-10 h-10" />}
             </div>
             <h3 className="text-xl font-black text-gray-900 mb-2 text-center">{modalConfig.title}</h3>
             <p className="text-sm text-gray-500 mb-8 text-center font-medium leading-relaxed">{modalConfig.message}</p>
             
             <div className="flex gap-3 w-full">
               {modalConfig.type === 'confirm' ? (
                 <>
                   <button 
                     onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                     className="flex-1 px-6 py-4 rounded-2xl bg-gray-50 text-gray-500 text-sm font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 border border-gray-100"
                   >
                     {t('common.cancel')}
                   </button>
                   <button 
                     onClick={() => {
                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                        if (modalConfig.onConfirm) modalConfig.onConfirm();
                     }}
                     className="flex-[1.5] px-6 py-4 rounded-2xl bg-merkez-blue text-white text-sm font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                   >
                     {t('common.confirm')}
                   </button>
                 </>
               ) : (
                 <button 
                   onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                   className="w-full px-6 py-4 rounded-2xl bg-merkez-blue text-white text-sm font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                 >
                   OK
                 </button>
               )}
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default FloorPlan;
