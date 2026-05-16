import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabaseClient';
import { useUser } from '../../../core/UserContext';
import toast from 'react-hot-toast';

const RoomTypeModal = ({ isOpen, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');

  const fetchTypes = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { data, error } = await supabase
        .from('hotel_room_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) {
        // If table doesn't exist, we might get an error. 
        // For now, we'll just show empty list.
        console.warn('Categories table might not exist:', error);
        setTypes([]);
        return;
      }
      setTypes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchTypes();
  }, [isOpen]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setLoading(true);
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { error } = await supabase
        .from('hotel_room_categories')
        .insert([{ tenant_id: tenantId, name: newTypeName.trim() }]);
      
      if (error) throw error;
      
      toast.success(t('common.success'));
      setNewTypeName('');
      fetchTypes();
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('Could not add category. Make sure the table hotel_room_categories exists.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('hotel_room_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success(t('common.deletedSuccessfully'));
      fetchTypes();
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" />
      <div className="bg-white rounded-[2.5rem] w-full max-w-md relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900">{t('hotels.manageCategories')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-8">
          <input 
            type="text" 
            required 
            value={newTypeName} 
            onChange={e => setNewTypeName(e.target.value)}
            className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-pink-500 outline-none transition-all text-sm font-bold"
            placeholder={t('hotels.categoryName')}
          />
          <button 
            type="submit" 
            disabled={loading}
            className="p-4 bg-pink-600 text-white rounded-2xl hover:bg-pink-500 transition-all disabled:opacity-50"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>

        <div className="space-y-3 max-h-60 overflow-auto pr-2 custom-scrollbar">
          {types.length === 0 ? (
            <p className="text-center text-gray-400 py-4 italic text-sm">{t('common.noData')}</p>
          ) : (
            types.map(type => (
              <div key={type.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group border border-transparent hover:border-pink-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Tag className="w-4 h-4 text-pink-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">{type.name}</span>
                </div>
                <button 
                  onClick={() => handleDelete(type.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RoomTypeModal;
