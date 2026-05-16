import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import toast from 'react-hot-toast';
import CustomSelect from './CustomSelect';
import ConfirmModal from '../../../components/Common/ConfirmModal';

const RoomModal = ({ isOpen, onClose, onSaved, room }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    capacity: 2,
    price_per_night: 0,
    has_minibar: false,
    housekeeping_note: '',
    warehouse_id: ''
  });
  const [categories, setCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [minibarItems, setMinibarItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [activeTab, setActiveTab] = useState('general'); // general, minibar

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const tenantId = profile?.tenant_id || profile?.id;
        const { data, error } = await supabase
          .from('hotel_room_categories')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('name', { ascending: true });
        if (error) throw error;
        setCategories(data || []);
        if (data && data.length > 0 && !room) {
          setFormData(prev => ({ ...prev, type: data[0].name }));
        }
      } catch (err) {
        console.warn('Categories table might not exist');
      }
    };
    const fetchProducts = async () => {
      try {
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name, parent_id')
          .eq('user_id', profile?.id)
          .order('name');
        setProductCategories(catData || []);

        const { data: prodData } = await supabase
          .from('products')
          .select('id, name, price, category_id, stock_quantity, warehouse_id')
          .eq('user_id', profile?.id)
          .eq('archived', false)
          .order('name');
        
        setAllProducts(prodData || []);
      } catch (err) {
        console.warn('Products/Categories table might not exist');
      }
    };

    const fetchMinibarItems = async () => {
      if (!room?.id) return;
      try {
        const { data, error } = await supabase
          .from('hotel_room_minibar_items')
          .select('*, product:products(name)')
          .eq('room_id', room.id);
        if (error) {
          console.error('Error fetching minibar items:', error);
          toast.error(`Minibar items error: ${error.message}`);
          return;
        }
        setMinibarItems(data || []);
      } catch (err) {
        console.error('Unexpected error fetching minibar items:', err);
      }
    };

    const fetchWarehouses = async () => {
      if (!profile?.id) return;
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('*')
          .eq('user_id', profile.id)
          .order('is_default', { ascending: false });
        if (error) throw error;
        setWarehouses(data || []);
        if (data && data.length > 0 && !room?.warehouse_id && !formData.warehouse_id) {
          const defaultW = data.find(w => w.is_default) || data[0];
          setFormData(prev => ({ ...prev, warehouse_id: defaultW.id }));
        }
      } catch (err) {
        console.error('Error fetching warehouses:', err);
      }
    };

    if (isOpen) {
      fetchCategories();
      fetchProducts();
      fetchMinibarItems();
      fetchWarehouses();
    }
  }, [isOpen, profile, room]);

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name || '',
        type: room.type || '',
        capacity: room.capacity || 2,
        price_per_night: room.price_per_night || 0,
        has_minibar: room.has_minibar || false,
        housekeeping_note: room.housekeeping_note || '',
        warehouse_id: room.warehouse_id || ''
      });
    } else {
      setFormData({ name: '', type: '', capacity: 2, price_per_night: 0, has_minibar: false, housekeeping_note: '', warehouse_id: '' });
      setMinibarItems([]);
    }
    setActiveTab('general');
  }, [room, isOpen]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      let roomId = room?.id;
      
      if (roomId) {
        // Update existing room
        const { error } = await supabase
          .from('hotel_rooms')
          .update(formData)
          .eq('id', roomId);
        if (error) throw error;
        await saveMinibarItems(roomId);
        toast.success(t('hotels.roomUpdated') || 'Room updated ✓');
      } else {
        // Insert new room
        const { data: savedRoom, error } = await supabase.from('hotel_rooms').insert([{
          tenant_id: tenantId,
          ...formData
        }]).select().single();
        if (error) throw error;
        
        await saveMinibarItems(savedRoom.id);
        toast.success(t('hotels.saveRoom') + ' ✓');
      }
      
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hotel_rooms')
        .delete()
        .eq('id', room.id);
      if (error) throw error;
      toast.success(t('common.deletedSuccessfully') || 'Deleted ✓');
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const saveMinibarItems = async (roomId) => {
    const tenantId = profile?.tenant_id || profile?.id;
    // Simple approach: delete all and re-insert
    const { error: deleteError } = await supabase
      .from('hotel_room_minibar_items')
      .delete()
      .eq('room_id', roomId);
      
    if (deleteError) {
      console.error('Error clearing old minibar items:', deleteError);
      throw new Error(`Failed to clear old minibar items: ${deleteError.message}`);
    }

    if (minibarItems.length > 0) {
      const itemsToInsert = minibarItems.map(item => ({
        tenant_id: tenantId,
        room_id: roomId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_override: item.price_override
      }));
      const { error: insertError } = await supabase
        .from('hotel_room_minibar_items')
        .insert(itemsToInsert);
        
      if (insertError) {
        console.error('Error saving minibar items:', insertError);
        throw new Error(`Failed to save minibar items: ${insertError.message}`);
      }
    }
  };

  const addMinibarItem = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (minibarItems.find(item => item.product_id === productId)) {
      toast.error(t('hotels.productAlreadyInMinibar') || 'Product already in minibar');
      return;
    }

    setMinibarItems([...minibarItems, {
      product_id: productId,
      product: { name: product.name },
      quantity: 1,
      price_override: product.price || 0
    }]);
  };

  const removeMinibarItem = (productId) => {
    setMinibarItems(minibarItems.filter(item => item.product_id !== productId));
  };

  const updateMinibarItem = (productId, field, value) => {
    setMinibarItems(minibarItems.map(item => 
      item.product_id === productId ? { ...item, [field]: value } : item
    ));
  };

  const groupedProductOptions = useMemo(() => {
    const getCategoryPath = (cat) => {
      if (!cat) return '';
      if (!cat.parent_id) return cat.name;
      const parent = productCategories.find(c => c.id === cat.parent_id);
      return parent ? `${getCategoryPath(parent)} > ${cat.name}` : cat.name;
    };

    return productCategories.map(cat => ({
      category: getCategoryPath(cat),
      items: allProducts
        .filter(p => p.category_id === cat.id && p.warehouse_id === formData.warehouse_id)
        .map(p => ({ 
          value: p.id, 
          label: `${p.name} (${p.stock_quantity || 0} ${t('common.unit')})` 
        }))
    }))
    .filter(group => group.items.length > 0)
    .sort((a, b) => a.category.localeCompare(b.category));
  }, [productCategories, allProducts, formData.warehouse_id]);

  const typeOptions = categories.map(c => ({ value: c.name, label: c.name }));

  if (!isOpen) return null;

  return createPortal(
    <>
    <div className="fixed top-0 left-0 w-screen h-screen z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" />
      <div className={`bg-white rounded-[2.5rem] w-full ${formData.has_minibar ? 'max-w-4xl' : 'max-w-md'} relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-all`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{room ? t('hotels.editRoom') || 'Edit Room' : t('hotels.addRoom')}</h2>
            {formData.has_minibar && (
              <div className="flex gap-4 mt-4">
                <button 
                  onClick={() => setActiveTab('general')}
                  className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'general' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400'}`}
                >
                  {t('common.general') || 'General'}
                </button>
                <button 
                  onClick={() => setActiveTab('minibar')}
                  className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'minibar' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400'}`}
                >
                  {t('hotels.minibar') || 'Minibar'}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {room && (
              <button 
                onClick={() => setShowConfirmDelete(true)}
                className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                type="button"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Main Form Section */}
          <div className={`${formData.has_minibar ? 'md:col-span-7' : 'md:col-span-12'}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'general' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.roomName')}</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 outline-none transition-all text-sm font-bold" />
                  </div>
                  
                  <CustomSelect
                    label={t('hotels.roomType')}
                    value={formData.type}
                    onChange={(val) => setFormData({...formData, type: val})}
                    options={typeOptions}
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.capacity')}</label>
                      <input type="number" min="1" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 outline-none transition-all text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.pricePerNight')}</label>
                      <input type="number" min="0" step="0.01" required value={formData.price_per_night} onChange={e => setFormData({...formData, price_per_night: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 outline-none transition-all text-sm font-bold" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-pink-50 rounded-2xl border border-pink-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-pink-900">{t('hotels.hasMinibar') || 'Minibar in room'}</span>
                      <span className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">{t('hotels.minibarDescription') || 'Enable stock tracking for this room'}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.has_minibar} 
                        onChange={e => setFormData({...formData, has_minibar: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('hotels.housekeepingNote') || 'Housekeeping Note'}</label>
                    <textarea 
                      value={formData.housekeeping_note} 
                      onChange={e => setFormData({...formData, housekeeping_note: e.target.value})} 
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 outline-none transition-all text-sm font-bold resize-none h-24"
                      placeholder={t('hotels.housekeepingNotePlaceholder') || 'Special instructions for cleaning...'}
                    />
                  </div>
                </>
              ) : (
                /* Minibar Settings Tab */
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {warehouses.length > 0 && (
                    <CustomSelect
                      label={t('warehouse.selectWarehouse') || 'Склад мини-бара'}
                      placeholder={t('warehouse.selectWarehouse') || 'Выберите склад...'}
                      value={formData.warehouse_id}
                      onChange={(val) => setFormData(prev => ({ ...prev, warehouse_id: val }))}
                      options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                    />
                  )}

                  <CustomSelect
                    label={t('hotels.addProductToMinibar') || 'Add product from warehouse'}
                    placeholder={t('common.selectProduct') || 'Select a product...'}
                    value=""
                    onChange={(val) => addMinibarItem(val)}
                    options={groupedProductOptions}
                    isGrouped={true}
                  />

                  <div className="space-y-3 max-h-[300px] overflow-auto pr-2 custom-scrollbar md:hidden">
                    {minibarItems.map(item => (
                      <div key={item.product_id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group">
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-900">{item.product?.name}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('common.quantity') || 'Qty'}</span>
                              <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateMinibarItem(item.product_id, 'quantity', parseInt(e.target.value))}
                                className="w-16 p-1 bg-gray-50 border-none text-xs font-bold rounded"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('common.price') || 'Price'}</span>
                              <input 
                                type="number" 
                                value={item.price_override} 
                                onChange={e => updateMinibarItem(item.product_id, 'price_override', parseFloat(e.target.value))}
                                className="w-20 p-1 bg-gray-50 border-none text-xs font-bold rounded"
                              />
                            </div>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeMinibarItem(item.product_id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {minibarItems.length === 0 && (
                      <div className="text-center py-8 text-gray-400 italic text-xs">
                        {t('hotels.noMinibarItems') || 'No products added yet'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-4 bg-pink-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-pink-500 shadow-xl shadow-pink-600/20 transition-all disabled:opacity-50 flex items-center justify-center">
                {loading ? t('hotels.saving') : (room ? t('common.save') : t('hotels.saveRoom'))}
              </button>
            </form>
          </div>

          {/* Right Preview/Illustration Section (Optional but looks premium) */}
          {formData.has_minibar && (
            <div className="hidden md:flex md:col-span-5 flex-col bg-gray-50 rounded-[2rem] p-8 border border-gray-100 overflow-hidden h-full">
              {minibarItems.length > 0 ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <h4 className="text-lg font-black text-gray-900 mb-4">{t('hotels.minibarItems') || 'Minibar Items'}</h4>
                  <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
                    {minibarItems.map(item => (
                      <div key={item.product_id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm font-black text-gray-900 truncate">{item.product?.name}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('common.quantity') || 'Qty'}</span>
                              <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => updateMinibarItem(item.product_id, 'quantity', parseInt(e.target.value))}
                                className="w-16 p-1 bg-gray-50 border border-transparent hover:border-gray-200 text-xs font-bold rounded focus:bg-white focus:border-pink-500 transition-colors outline-none"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{t('common.price') || 'Price'}</span>
                              <input 
                                type="number" 
                                value={item.price_override} 
                                onChange={e => updateMinibarItem(item.product_id, 'price_override', parseFloat(e.target.value))}
                                className="w-20 p-1 bg-gray-50 border border-transparent hover:border-gray-200 text-xs font-bold rounded focus:bg-white focus:border-pink-500 transition-colors outline-none"
                              />
                            </div>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeMinibarItem(item.product_id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner mb-6">
                    <div className="w-12 h-16 bg-pink-100 rounded-lg relative">
                      <div className="absolute top-2 left-2 right-2 h-2 bg-pink-200 rounded-sm" />
                      <div className="absolute bottom-2 left-2 right-2 h-6 bg-pink-300/50 rounded-sm" />
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-2">{t('hotels.minibarSync') || 'Inventory Sync'}</h4>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    {t('hotels.minibarSyncDescription') || 'Products selected here will be automatically linked to your Warehouse inventory. Sales from this room will generate stock deductions.'}
                  </p>
               </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    <ConfirmModal 
      isOpen={showConfirmDelete}
      onClose={() => setShowConfirmDelete(false)}
      onConfirm={handleDelete}
      title={t('common.confirmDelete') || 'Silməyi təsdiqləyin'}
      message={t('common.confirmDeleteMessage') || 'Bu qeydi silmək istədiyinizə əminsiniz?'}
      confirmText={t('common.yes') || 'Bəli'}
      cancelText={t('common.no') || 'Xeyr'}
      isDanger={true}
    />
    </>,
    document.body
  );
};
export default RoomModal;
