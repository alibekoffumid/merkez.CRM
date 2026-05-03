import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, X, Trash2, Edit2, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const RoomManagement = () => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    capacity: 20,
    type: 'General'
  });

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('education_rooms')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setRooms(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const { error: insertError } = await supabase
        .from('education_rooms')
        .insert([formData]);

      if (insertError) throw insertError;
      
      setSuccess(true);
      fetchRooms();
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        setFormData({ name: '', capacity: 20, type: 'General' });
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      const { error } = await supabase.from('education_rooms').delete().eq('id', id);
      if (error) throw error;
      fetchRooms();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">{t('education.tabRooms')}</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Manage your academy classrooms and studios</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add Room
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : rooms.length > 0 ? (
          rooms.map(room => (
            <div key={room.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => deleteRoom(room.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <MapPin className="w-7 h-7 text-blue-600" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">{room.name}</h3>
              
              <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg">
                  <Users className="w-4 h-4" /> {room.capacity} seats
                </span>
                <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg italic">
                  {room.type}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-gray-50 p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-500">No rooms added yet</h3>
            <p className="text-gray-400 text-sm mt-1">Start by adding your first classroom</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative z-10 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Add New Room</h2>
              <p className="text-gray-500 text-sm mt-1">Define a new classroom or studio space</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Room Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                  placeholder="e.g. Studio A or Room 101" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Capacity</label>
                  <input 
                    type="number" 
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Type</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                  >
                    <option value="General">General</option>
                    <option value="Studio">Studio</option>
                    <option value="Lab">Lab</option>
                    <option value="Hall">Hall</option>
                  </select>
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold">{error}</div>}

              <button 
                type="submit" 
                disabled={isSubmitting || success}
                className={`w-full py-4 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2
                  ${success ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}
                  ${isSubmitting ? 'opacity-80' : ''}
                `}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <CheckCircle2 className="w-5 h-5" /> : 'Save Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
