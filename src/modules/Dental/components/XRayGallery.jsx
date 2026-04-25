import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Maximize2, Calendar, FileText, Plus, Loader2 } from 'lucide-react';
import { DentalService } from '../../../services/DentalService';

const XRayGallery = ({ patientId }) => {
  const { t } = useTranslation();
  const [xrays, setXrays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadXRays();
    }
  }, [patientId]);

  const loadXRays = async () => {
    try {
      setLoading(true);
      const data = await DentalService.getXRays(patientId);
      setXrays(data || []);
    } catch (err) {
      console.error('Error fetching X-Rays:', err);
      // Fallback to empty if table doesn't exist
      setXrays([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Image className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Diagnostic Imagery & X-Rays</h3>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          Upload New
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : xrays.length > 0 ? (
          xrays.map((img) => (
            <div key={img.id} className="group relative rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
              <img 
                src={img.image_url || 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=300&fit=crop'} 
                alt={img.type} 
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
              
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <h4 className="text-sm font-black tracking-tight">{img.type || 'Scan'}</h4>
                <div className="flex items-center gap-2 mt-1 opacity-80">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {img.created_at ? new Date(img.created_at).toLocaleDateString() : 'Unknown Date'}
                  </span>
                </div>
              </div>

              <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40">
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500 text-sm font-bold">
            No X-Rays found.
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl p-8 hover:bg-gray-50/50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add Scan</p>
        </div>
      </div>
    </div>
  );
};

export default XRayGallery;
