import React, { useState, useEffect, useRef } from 'react';
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

  // 1. Fetch data
  useEffect(() => {
    if (profile) {
      fetchVehicles();
    }
  }, [profile]);

  // 2. Initialize Map (Only once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [40.4093, 49.8671],
      zoom: 13,
      zoomControl: false
    });

    // Add Google Maps Tile Layer
    const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    // Create a group for markers
    const markerGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersRef.current = markerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 3. Update Tiles when MapType changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Google Maps Tile URLs
    const streetUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    const satUrl = 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';

    const url = mapType === 'streets' ? streetUrl : satUrl;

    // Remove old tiles and add Google tiles
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    L.tileLayer(url, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(mapRef.current);
  }, [mapType]);

  // 4. Update Markers when vehicles change
  useEffect(() => {
    if (!markersRef.current || !vehicles.length) return;

    // Clear old markers
    markersRef.current.clearLayers();

    vehicles.forEach((v) => {
      const color = v.status === 'active' ? '#22c55e' : v.status === 'repair' ? '#ef4444' : '#2563eb';
      
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color};" class="w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      L.marker([Number(v.last_lat), Number(v.last_lng)], { icon })
        .bindPopup(`<b>${v.plate_number}</b><br>${v.brand_model}`)
        .addTo(markersRef.current!);
    });
  }, [vehicles]);

  const fetchVehicles = async () => {
    try {
      const tenantId = profile?.tenant_id || profile?.id;
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      const demoCoords: [number, number][] = [
        [40.4093, 49.8671], [40.3772, 49.8431], [40.3953, 49.8722], [40.3833, 49.8133]
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

  return (
    <div className="relative h-[calc(100vh-60px)] -m-6 lg:-m-8 -mb-20 bg-gray-50 overflow-hidden flex flex-col">
      {/* UI Elements (Always visible) */}
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={() => navigate('/fleet')} className="p-4 bg-white rounded-3xl shadow-xl border border-gray-100 hover:bg-gray-50">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl shadow-xl">
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

      {/* Direct Leaflet Mount Point */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full z-10" />

      <style>{`
        .leaflet-container { background: #f8fafc; outline: none; }
        .custom-div-icon { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 1.5rem !important; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1) !important; border: 1px solid #f1f5f9 !important; }
      `}</style>
    </div>
  );
};

export default FleetMap;
