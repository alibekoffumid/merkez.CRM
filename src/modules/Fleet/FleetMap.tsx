import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Navigation, 
  Layers,
  Loader2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { Vehicle } from './types/fleet';
import { UserProfile } from '../../types/auth';
import { toast } from 'react-hot-toast';

// Import Leaflet and React-Leaflet
import * as L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface UserContextType {
  profile: UserProfile | null;
}

const FleetMap: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useUser() as UserContextType;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  useEffect(() => {
    // Basic initialization
    setIsReady(true);
    
    if (profile) {
      fetchVehicles();
    }
  }, [profile]);

  const fetchVehicles = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      const demoCoords: [number, number][] = [
        [40.4093, 49.8671], [40.3772, 49.8431], [40.3953, 49.8722]
      ];

      const processedData = (data || []).map((v, i) => ({
        ...v,
        last_lat: v.last_lat || demoCoords[i % demoCoords.length][0],
        last_lng: v.last_lng || demoCoords[i % demoCoords.length][1]
      }));

      setVehicles(processedData as Vehicle[]);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) return null;

  return (
    <div className="relative h-screen w-full bg-gray-100 overflow-hidden flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={() => navigate('/fleet')} className="p-4 bg-white rounded-3xl shadow-xl border border-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl shadow-xl">
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Live Monitor
            </h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : (
        <MapContainer 
          center={[40.4093, 49.8671]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url={mapType === 'streets' 
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' 
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{y}/{x}/{z}'
            }
          />
          {vehicles.map((v) => (
            <Marker 
              key={v.id} 
              position={[Number(v.last_lat), Number(v.last_lng)]}
            >
              <Popup>
                <div className="p-1">
                   <p className="font-bold text-sm">{v.plate_number}</p>
                   <p className="text-xs text-gray-500">{v.brand_model}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}

      {/* Map Switcher */}
      <button 
        onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
        className="absolute bottom-10 right-6 z-[1000] p-4 bg-white rounded-full shadow-2xl border border-gray-100"
      >
        <Layers className="w-6 h-6 text-gray-600" />
      </button>
    </div>
  );
};

export default FleetMap;
