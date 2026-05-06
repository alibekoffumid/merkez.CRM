import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Navigation, 
  Layers,
  Loader2,
  Car,
  Gauge,
  ShieldCheck,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { Vehicle } from './types/fleet';
import { UserProfile } from '../../types/auth';

// Import Leaflet directly
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface UserContextType {
  profile: UserProfile | null;
}

const FleetMap: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useUser() as UserContextType;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  useEffect(() => {
    if (profile) fetchVehicles();
  }, [profile]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [40.4093, 49.8671],
      zoom: 13,
      zoomControl: false
    });

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    const markerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersRef.current = markerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const streetUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    const satUrl = 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    const url = mapType === 'streets' ? streetUrl : satUrl;

    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) mapRef.current?.removeLayer(layer);
    });

    L.tileLayer(url, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(mapRef.current);
  }, [mapType]);

  useEffect(() => {
    if (!markersRef.current || !vehicles.length) return;
    markersRef.current.clearLayers();

    vehicles.forEach((v) => {
      const color = v.status === 'active' ? '#22c55e' : v.status === 'repair' ? '#ef4444' : '#2563eb';
      const statusText = v.status === 'active' ? 'НА ЛИНИИ' : v.status === 'repair' ? 'В РЕМОНТЕ' : 'СВОБОДЕН';
      
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color};" class="w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white transform hover:scale-110 transition-transform">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      const popupContent = `
        <div class="p-4 min-w-[240px] font-sans">
          <div class="flex items-center justify-between mb-4">
             <div class="bg-gray-100 px-3 py-1.5 rounded-lg border-2 border-gray-200">
                <span class="text-sm font-black text-gray-900 tracking-tighter">${v.plate_number}</span>
             </div>
             <span class="text-[9px] font-black px-2 py-1 rounded-md bg-opacity-10" style="background-color: ${color}; color: ${color}; border: 1px solid ${color}40;">
                ${statusText}
             </span>
          </div>
          
          <h4 class="text-base font-black text-gray-900 mb-1">${v.brand_model}</h4>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Taxi Fleet Member</p>
          
          <div class="grid grid-cols-2 gap-3 mb-5">
             <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <p class="text-[8px] font-black text-gray-400 uppercase mb-1">Пробег</p>
                <p class="text-xs font-black text-gray-800">${v.current_mileage.toLocaleString()} км</p>
             </div>
             <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <p class="text-[8px] font-black text-gray-400 uppercase mb-1">Страховка</p>
                <p class="text-xs font-black text-gray-800">${new Date(v.insurance_expiry).toLocaleDateString()}</p>
             </div>
          </div>
          
          <button class="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
            ЛОГ СМЕНЫ
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </button>
        </div>
      `;

      L.marker([Number(v.last_lat), Number(v.last_lng)], { icon })
        .bindPopup(popupContent, { 
          className: 'premium-popup',
          maxWidth: 300,
          minWidth: 260
        })
        .addTo(markersRef.current!);
    });
  }, [vehicles]);

  const fetchVehicles = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { data } = await supabase.from('fleet_vehicles').select('*').eq('tenant_id', tenantId);
      
      const demoCoords: [number, number][] = [[40.4093, 49.8671], [40.3772, 49.8431], [40.3953, 49.8722]];
      const processed = (data || []).map((v, i) => ({
        ...v,
        last_lat: v.last_lat || demoCoords[i % demoCoords.length][0],
        last_lng: v.last_lng || demoCoords[i % demoCoords.length][1]
      }));
      setVehicles(processed as Vehicle[]);
    } catch (e) {} finally { setLoading(false); }
  };

  return (
    <div className="relative h-screen w-full bg-gray-50 overflow-hidden flex flex-col">
      <div className="fixed inset-0 lg:left-[72px] top-[64px] z-[40] bg-gray-50 overflow-hidden flex flex-col">
        <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={() => navigate('/fleet')} className="p-4 bg-white rounded-3xl shadow-xl border border-gray-100 hover:bg-gray-50 transition-all">
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl shadow-xl border border-white/20">
              <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600 animate-pulse" />
                Live Monitor
              </h1>
            </div>
          </div>
          <button 
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className="pointer-events-auto p-4 bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center gap-2"
          >
            <Layers className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-black uppercase">{mapType === 'streets' ? 'SAT' : 'MAP'}</span>
          </button>
        </div>

        {loading && (
          <div className="absolute inset-0 z-[2000] bg-white/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        )}

        <div ref={mapContainerRef} className="flex-1 w-full h-full z-10" />
      </div>

      <style>{`
        .leaflet-container { background: #f8fafc; outline: none; }
        .custom-div-icon { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { 
          border-radius: 2rem !important; 
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .leaflet-popup-tip { display: none !important; }
        .premium-popup .leaflet-popup-close-button {
          top: 15px !important;
          right: 15px !important;
          color: #94a3b8 !important;
          font-size: 20px !important;
        }
      `}</style>
    </div>
  );
};

export default FleetMap;
