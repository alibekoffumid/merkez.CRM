import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Car, 
  ArrowLeft, 
  Navigation, 
  Filter,
  Layers,
  Search,
  Maximize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { Vehicle } from './types/fleet';
import { UserProfile } from '../../types/auth';
import { toast } from 'react-hot-toast';

// Fix for default marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface UserContextType {
  profile: UserProfile | null;
}

const FleetMap: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useUser() as UserContextType;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  useEffect(() => {
    if (profile) {
      fetchVehicles();
    }
  }, [profile]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const tenantId = profile?.tenant_id || profile?.id;
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      const demoCoords: [number, number][] = [
        [40.4093, 49.8671], 
        [40.3772, 49.8431], 
        [40.3953, 49.8722], 
        [40.3833, 49.8133], 
        [40.4333, 49.8667], 
      ];

      const processedData = (data || []).map((v, i) => ({
        ...v,
        last_lat: v.last_lat || demoCoords[i % demoCoords.length][0],
        last_lng: v.last_lng || demoCoords[i % demoCoords.length][1]
      }));

      setVehicles(processedData as Vehicle[]);
    } catch (error: any) {
      toast.error('Ошибка загрузки авто для карты');
    } finally {
      setLoading(false);
    }
  };

  const getMarkerIcon = (status: string) => {
    let color = '#2563eb';
    if (status === 'active') color = '#22c55e';
    if (status === 'repair') color = '#ef4444';

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color};" class="w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  };

  return (
    <div className="relative h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={() => navigate('/fleet')}
            className="p-4 bg-white rounded-3xl shadow-2xl border border-gray-100 hover:bg-gray-50 transition-all active:scale-90"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-3xl shadow-2xl border border-white/20">
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600 animate-pulse" />
              Live Monitor
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{vehicles.length} АВТО НА КАРТЕ</p>
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
           <button 
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className="p-4 bg-white rounded-3xl shadow-2xl border border-gray-100 hover:bg-gray-50 transition-all flex items-center gap-2"
           >
              <Layers className="w-5 h-5 text-gray-600" />
              <span className="text-xs font-black uppercase">{mapType === 'streets' ? 'SATELLITE' : 'STREETS'}</span>
           </button>
        </div>
      </div>

      <div className="absolute bottom-10 left-6 z-[1000] max-w-sm w-full bg-white/90 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white/20 animate-in slide-in-from-bottom duration-700">
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900">Активные машины</h3>
            <span className="px-2 py-1 bg-green-100 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-wider">LIVE</span>
         </div>
         <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-white/50 rounded-2xl border border-gray-50 hover:border-blue-200 transition-all cursor-pointer">
                 <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${v.status === 'active' ? 'bg-green-500' : 'bg-blue-400'}`} />
                    <div>
                       <p className="text-xs font-black text-gray-900">{v.plate_number}</p>
                       <p className="text-[10px] font-bold text-gray-400 uppercase">{v.brand_model}</p>
                    </div>
                 </div>
                 <button className="p-2 hover:bg-blue-50 rounded-xl transition-all">
                    <Maximize2 className="w-4 h-4 text-blue-500" />
                 </button>
              </div>
            ))}
         </div>
      </div>

      <MapContainer 
        // @ts-ignore
        center={[40.4093, 49.8671]} 
        // @ts-ignore
        zoom={13} 
        className="h-full w-full z-10"
        zoomControl={false}
      >
        <TileLayer
          // @ts-ignore
          url={mapType === 'streets' 
            ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{y}/{x}/{z}'
          }
          // @ts-ignore
          attribution='&copy; OpenStreetMap contributors'
        />
        {vehicles.map((vehicle) => (
          <Marker 
            key={vehicle.id} 
            // @ts-ignore
            position={[Number(vehicle.last_lat), Number(vehicle.last_lng)]}
            // @ts-ignore
            icon={getMarkerIcon(vehicle.status || 'available')}
          >
            <Popup>
              <div className="p-2 text-center min-w-[120px]">
                <p className="text-xs font-black text-gray-900 mb-1">{vehicle.plate_number}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{vehicle.brand_model}</p>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter ${
                  vehicle.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {vehicle.status}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .leaflet-container {
          background: #f8fafc;
        }
        .custom-div-icon {
          background: none !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 1.5rem !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1) !important;
          border: 1px solid #f1f5f9 !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default FleetMap;
