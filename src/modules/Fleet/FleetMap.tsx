import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Navigation, 
  Layers,
  Loader2,
  Clock,
  TrendingUp,
  History
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../core/UserContext';
import { Vehicle } from './types/fleet';
import { UserProfile } from '../../types/auth';
import { useTranslation } from 'react-i18next';

// Import Leaflet directly
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface UserContextType {
  profile: UserProfile | null;
}

interface VehicleWithShift extends Vehicle {
  currentShift?: {
    shift_start: string;
    actual_revenue: number;
    daily_plan: number;
  };
}

const FleetMap: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useUser() as UserContextType;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  
  const [vehicles, setVehicles] = useState<VehicleWithShift[]>([]);
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
    const url = mapType === 'streets' ? 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}' : 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) mapRef.current?.removeLayer(layer);
    });

    L.tileLayer(url, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(mapRef.current);
  }, [mapType]);

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${mins}м`;
  };

  useEffect(() => {
    if (!markersRef.current || !vehicles.length) return;
    markersRef.current.clearLayers();

    vehicles.forEach((v) => {
      const color = v.status === 'active' ? '#22c55e' : v.status === 'repair' ? '#ef4444' : '#2563eb';
      const statusText = v.status === 'active' ? t('fleet.statusActive') : v.status === 'repair' ? t('fleet.statusRepair') : t('fleet.statusAvailable');
      
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color};" class="w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white transform hover:scale-110 transition-transform">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      const shiftInfo = v.currentShift ? `
        <div class="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-2 duration-500">
           <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
             <History className="w-3 h-3" />
             ТЕКУЩАЯ СМЕНА
           </p>
           <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                 <div class="flex items-center gap-1.5 text-gray-500">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span class="text-[10px] font-bold uppercase">В работе</span>
                 </div>
                 <p class="text-sm font-black text-gray-900">${calculateDuration(v.currentShift.shift_start)}</p>
                 <p class="text-[9px] text-gray-400 font-bold">С ${new Date(v.currentShift.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div class="space-y-1">
                 <div class="flex items-center gap-1.5 text-gray-500">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    <span class="text-[10px] font-bold uppercase">Прибыль</span>
                 </div>
                 <p class="text-sm font-black ${v.currentShift.actual_revenue - v.currentShift.daily_plan < 0 ? 'text-red-600' : 'text-green-600'}">
                   ${(v.currentShift.actual_revenue - v.currentShift.daily_plan).toFixed(2)} ₼
                 </p>
                 <p class="text-[9px] text-gray-400 font-bold">${v.currentShift.actual_revenue} ₼ всего</p>
              </div>
           </div>
        </div>
      ` : '';

      const popupContent = `
        <div class="p-6 min-w-[280px] font-sans relative">
          <div class="flex flex-col items-start gap-3 mb-6">
             <div class="flex items-center bg-white border-2 border-gray-900 rounded-lg overflow-hidden h-10 shadow-sm pr-4">
                <div class="bg-blue-700 w-4 h-full flex flex-col items-center justify-center">
                   <span class="text-[7px] text-white font-black leading-none mb-0.5">AZ</span>
                   <div class="w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></div>
                </div>
                <div class="px-3">
                   <span class="text-base font-black text-gray-900 tracking-tighter whitespace-nowrap">${v.plate_number}</span>
                </div>
             </div>
             <div class="px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest flex items-center gap-2" style="background-color: ${color}10; color: ${color}; border: 1px solid ${color}20;">
                <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${color};"></span>
                ${statusText}
             </div>
          </div>
          
          <div class="mb-6">
            <h4 class="text-xl font-black text-gray-900 leading-none mb-1.5">${v.brand_model}</h4>
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${t('fleet.fleetMember')}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
             <div class="bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                <p class="text-[9px] font-bold text-gray-400 uppercase mb-1 leading-none">${t('fleet.mileage')}</p>
                <p class="text-sm font-black text-gray-900 leading-none">${v.current_mileage.toLocaleString()} км</p>
             </div>
             <div class="bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                <p class="text-[9px] font-bold text-gray-400 uppercase mb-1 leading-none">${t('fleet.insurance')}</p>
                <p class="text-sm font-black text-gray-900 leading-none">${new Date(v.insurance_expiry).toLocaleDateString()}</p>
             </div>
          </div>

          ${shiftInfo}
          
          <button class="w-full mt-8 py-4 bg-gray-900 text-white rounded-[1.25rem] text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl hover:shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group">
            ${t('fleet.logShift')}
            <svg class="group-hover:translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </button>
        </div>
      `;

      L.marker([Number(v.last_lat), Number(v.last_lng)], { icon })
        .bindPopup(popupContent, { 
          className: 'premium-popup',
          maxWidth: 320,
          minWidth: 280,
          closeButton: true
        })
        .addTo(markersRef.current!);
    });
  }, [vehicles]);

  const fetchVehicles = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      
      // 1. Fetch vehicles
      const { data: vData } = await supabase.from('fleet_vehicles').select('*').eq('tenant_id', tenantId);
      
      // 2. Fetch active shifts
      const { data: sData } = await supabase.from('fleet_rent_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');

      const demoCoords: [number, number][] = [[40.4093, 49.8671], [40.3772, 49.8431], [40.3953, 49.8722], [40.3833, 49.8133]];
      
      const processed = (vData || []).map((v, i) => {
        const activeShift = sData?.find(s => s.vehicle_id === v.id);
        return {
          ...v,
          last_lat: v.last_lat || demoCoords[i % demoCoords.length][0],
          last_lng: v.last_lng || demoCoords[i % demoCoords.length][1],
          currentShift: activeShift
        };
      });
      
      setVehicles(processed as VehicleWithShift[]);
    } catch (e) {} finally { setLoading(false); }
  };

  return (
    <div className="relative h-screen w-full bg-gray-50 overflow-hidden flex flex-col">
      <div className="fixed inset-0 lg:left-[72px] top-0 z-[40] bg-gray-50 overflow-hidden flex flex-col">
        <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={() => navigate('/fleet')} className="p-4 bg-white rounded-3xl shadow-xl border border-gray-100 hover:bg-gray-50 transition-all">
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl shadow-xl border border-white/20">
              <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600 animate-pulse" />
                {t('fleet.liveMonitor')}
              </h1>
            </div>
          </div>
          <button 
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className="pointer-events-auto p-4 bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center gap-2"
          >
            <Layers className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-black uppercase">{mapType === 'streets' ? t('fleet.satellite') : t('fleet.streets')}</span>
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
          border-radius: 2.5rem !important; 
          padding: 0 !important;
          overflow: hidden !important;
          box-shadow: 0 40px 80px -20px rgba(0,0,0,0.3) !important;
          border: 1px solid rgba(0,0,0,0.05) !important;
        }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .leaflet-popup-tip { display: none !important; }
        .premium-popup .leaflet-popup-close-button {
          top: 24px !important;
          right: 24px !important;
          color: #cbd5e1 !important;
          font-size: 22px !important;
          background: #f8fafc !important;
          width: 32px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 50% !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
        }
        .premium-popup .leaflet-popup-close-button:hover {
          color: #ef4444 !important;
          background: #fff !important;
        }
      `}</style>
    </div>
  );
};

export default FleetMap;
