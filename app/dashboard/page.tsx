'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://imomuyjjbxrtibbsgsba.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

declare global {
  interface Window {
    L: any;
  }
}

interface VelocityItem {
  medicine: string;
  failures_total: number;
  last_24h: number;
  trend: string;
  status: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  medicine_name: string;
}

interface PharmacyOption {
  id: string;
  name: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  type: string;
}

interface SearchFeedItem {
  id: string;
  medicine_name: string;
  lat: number;
  lng: number;
  created_at: string;
  area: string;
  zoneType: 'RURAL' | 'URBAN' | 'SEMI-URBAN';
  is_urgent?: boolean;
  city?: string;
}

interface PendingPharmacy {
  id: string;
  name: string;
  area: string;
  phone: string;
  lat: number;
  lng: number;
}

const CORRIDOR_CITIES = [
  { name: 'Bhopal', lng: 77.4126, lat: 23.2599 },
  { name: 'Sehore', lng: 77.0857, lat: 23.2003 },
  { name: 'Ashta', lng: 76.7206, lat: 23.0186 },
  { name: 'Dewas', lng: 76.0511, lat: 22.9623 },
  { name: 'Indore', lng: 75.8577, lat: 22.7196 },
  { name: 'Obaidullaganj', lng: 77.2500, lat: 23.1170 }
];

const INITIAL_CORRIDOR_FEED: SearchFeedItem[] = [
  { id: 'f-1', medicine_name: 'Insulin Regular', lat: 23.2845, lng: 77.4023, area: 'Karond Chowk, Bhopal', zoneType: 'SEMI-URBAN', is_urgent: true, created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: 'f-2', medicine_name: 'Salbutamol 100mcg Inhaler', lat: 23.2003, lng: 77.0857, area: 'Sehore Mandi', zoneType: 'RURAL', is_urgent: true, created_at: new Date(Date.now() - 6 * 60000).toISOString() },
  { id: 'f-3', medicine_name: 'Metformin 500mg', lat: 23.2656, lng: 77.4201, area: 'Old Bhopal (Hamidia Rd)', zoneType: 'URBAN', is_urgent: false, created_at: new Date(Date.now() - 14 * 60000).toISOString() },
  { id: 'f-4', medicine_name: 'Azithromycin 500mg', lat: 23.0186, lng: 76.7206, area: 'Ashta Bus Stand', zoneType: 'RURAL', is_urgent: true, created_at: new Date(Date.now() - 22 * 60000).toISOString() },
  { id: 'f-5', medicine_name: 'Insulin Regular', lat: 22.9623, lng: 76.0511, area: 'Dewas Gate', zoneType: 'URBAN', is_urgent: true, created_at: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: 'f-6', medicine_name: 'Glimepiride 1mg', lat: 23.1170, lng: 77.2500, area: 'Obaidullaganj Bypass', zoneType: 'RURAL', is_urgent: false, created_at: new Date(Date.now() - 48 * 60000).toISOString() },
  { id: 'f-7', medicine_name: 'ORS Sachet', lat: 23.6300, lng: 77.3400, area: 'Berasia PHC Sector', zoneType: 'RURAL', is_urgent: false, created_at: new Date(Date.now() - 64 * 60000).toISOString() },
  { id: 'f-8', medicine_name: 'Metformin 500mg', lat: 22.7196, lng: 75.8577, area: 'Vijay Nagar, Indore', zoneType: 'URBAN', is_urgent: false, created_at: new Date(Date.now() - 79 * 60000).toISOString() },
  { id: 'f-9', medicine_name: 'Artemether + Lumefantrine', lat: 22.9800, lng: 77.0100, area: 'Ichhawar Rural Zone', zoneType: 'RURAL', is_urgent: true, created_at: new Date(Date.now() - 95 * 60000).toISOString() },
  { id: 'f-10', medicine_name: 'Paracetamol 500mg', lat: 23.2345, lng: 77.4356, area: 'Govindpura Industrial Area', zoneType: 'SEMI-URBAN', is_urgent: false, created_at: new Date(Date.now() - 110 * 60000).toISOString() },
  { id: 'f-11', medicine_name: 'Insulin Regular', lat: 22.7250, lng: 75.8620, area: 'Old Palasia, Indore', zoneType: 'URBAN', is_urgent: true, created_at: new Date(Date.now() - 130 * 60000).toISOString() },
  { id: 'f-12', medicine_name: 'Salbutamol Inhaler', lat: 23.1800, lng: 77.4000, area: 'Kolar Road, Bhopal', zoneType: 'URBAN', is_urgent: true, created_at: new Date(Date.now() - 150 * 60000).toISOString() }
];

const CORRIDOR_RANDOM_POOLS = [
  { med: 'Insulin Regular', area: 'Karond Chowk, Bhopal', zone: 'SEMI-URBAN' as const, lat: 23.2845, lng: 77.4023 },
  { med: 'Metformin 500mg', area: 'Sehore Mandi Zone', zone: 'RURAL' as const, lat: 23.2003, lng: 77.0857 },
  { med: 'Salbutamol Inhaler', area: 'Ashta Bypass', zone: 'RURAL' as const, lat: 23.0186, lng: 76.7206 },
  { med: 'Azithromycin 500mg', area: 'Old Bhopal Station', zone: 'URBAN' as const, lat: 23.2656, lng: 77.4201 },
  { med: 'Insulin Regular', area: 'Dewas Bus Stand', zone: 'URBAN' as const, lat: 22.9623, lng: 76.0511 },
  { med: 'ORS Sachet', area: 'Berasia Rural Hub', zone: 'RURAL' as const, lat: 23.6300, lng: 77.3400 },
  { med: 'Metformin SR 500mg', area: 'Palasia Square, Indore', zone: 'URBAN' as const, lat: 22.7250, lng: 75.8620 }
];

export default function DashboardPage() {
  const [insight, setInsight] = useState<string>('');
  const [insightGeneratedAt, setInsightGeneratedAt] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState<boolean>(true);
  const [velocity, setVelocity] = useState<VelocityItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [totalFailures, setTotalFailures] = useState<number>(73);
  const [urgentToday, setUrgentToday] = useState<number>(18);
  const [shortageMedsCount, setShortageMedsCount] = useState<number>(5);

  const [liveFeed, setLiveFeed] = useState<SearchFeedItem[]>(INITIAL_CORRIDOR_FEED);
  const [showAllFeedModal, setShowAllFeedModal] = useState<boolean>(false);
  const [feedFilter, setFeedFilter] = useState<'ALL' | 'RURAL' | 'URBAN' | 'URGENT'>('ALL');

  const [pharmaciesList, setPharmaciesList] = useState<PharmacyOption[]>([]);
  const [pendingPharmacies, setPendingPharmacies] = useState<PendingPharmacy[]>([]);

  // Simulation Panel State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [selectedSimulateArea, setSelectedSimulateArea] = useState('Karond');
  const [selectedSimulateMed, setSelectedSimulateMed] = useState('Insulin Regular');
  const [simulateResult, setSimulateResult] = useState<string | null>(null);
  const [simulateLoading, setSimulateLoading] = useState(false);

  // Distributor Alert SMS Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPhone, setAlertPhone] = useState('');
  const [alertSending, setAlertSending] = useState(false);
  const [alertSentStatus, setAlertSentStatus] = useState<string | null>(null);
  const [alertIsError, setAlertIsError] = useState(false);

  // Time elapsed counter
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Map references
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const heatLayerRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Fetch Radar Intelligence Data
  const fetchRadarData = useCallback(async () => {
    try {
      setInsightLoading(true);
      const res = await fetch('/api/radar');
      const data = await res.json();

      if (data) {
        setInsight(data.insight || '');
        setInsightGeneratedAt(data.generated_at || new Date().toISOString());
        setVelocity(data.velocity || []);
        setHeatmapData(data.heatmap || []);
        setTotalFailures(data.total_failures || 73);

        if (Array.isArray(data.velocity)) {
          setShortageMedsCount(data.velocity.length);
        }
      }
    } catch (err) {
      console.error('Radar data fetch error:', err);
    } finally {
      setInsightLoading(false);
      setSecondsAgo(0);
    }
  }, []);

  // 2. Fetch Auxiliary Data (Pharmacies & Pending)
  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const { data: pendingData } = await supabase
        .from('pharmacies')
        .select('id, name, area, phone, lat, lng')
        .eq('is_pending_approval', true);

      if (pendingData) {
        setPendingPharmacies(pendingData);
      }

      const simRes = await fetch('/api/simulate');
      const simData = await simRes.json();
      if (simData.pharmacies) {
        setPharmaciesList(simData.pharmacies);
      }
    } catch (err) {
      console.error('Aux data error:', err);
    }
  }, []);

  // 3. Initial Load, 30s Radar Refresh & 10s Simulated Realtime Search Emission
  useEffect(() => {
    fetchRadarData();
    fetchAuxiliaryData();

    const radarInterval = setInterval(() => {
      fetchRadarData();
      fetchAuxiliaryData();
    }, 30000);

    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    // Autonomous Corridor Telemetry Simulation
    const telemetryInterval = setInterval(() => {
      const randomItem = CORRIDOR_RANDOM_POOLS[Math.floor(Math.random() * CORRIDOR_RANDOM_POOLS.length)];
      const isUrgent = Math.random() > 0.6;

      const newEvent: SearchFeedItem = {
        id: `auto-${Date.now()}`,
        medicine_name: randomItem.med,
        area: randomItem.area,
        zoneType: randomItem.zone,
        lat: randomItem.lat,
        lng: randomItem.lng,
        is_urgent: isUrgent,
        created_at: new Date().toISOString()
      };

      setLiveFeed((prev) => [newEvent, ...prev.slice(0, 49)]);
      setTotalFailures((prev) => prev + 1);
      if (isUrgent) setUrgentToday((prev) => prev + 1);

      // Add to map circle
      if (leafletMapRef.current && window.L) {
        const L = window.L;
        const newCircle = L.circle([randomItem.lat, randomItem.lng], {
          radius: 1400,
          color: '#ef4444',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.6
        }).addTo(leafletMapRef.current);

        newCircle.bindPopup(
          `<div style="color:#0f172a;font-size:12px;font-family:sans-serif;"><b>⚡ LIVE INCOMING SHORTAGE</b><br/>Medicine: <b>${randomItem.med}</b><br/>Area: ${randomItem.area}</div>`
        );
        heatLayerRef.current.push(newCircle);
      }
    }, 12000);

    return () => {
      clearInterval(radarInterval);
      clearInterval(timer);
      clearInterval(telemetryInterval);
    };
  }, [fetchRadarData, fetchAuxiliaryData]);

  // 4. Dynamically Load Leaflet CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L) {
      setMapLoaded(true);
      return;
    }

    if (!document.getElementById('leaflet-cdn-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-cdn-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-cdn-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-cdn-js';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.async = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      document.body.appendChild(script);
    }
  }, []);

  // 5. Initialize Leaflet Map with CartoDB Dark Matter Tiles
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapRef.current) return;
    const L = window.L;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        center: [23.05, 76.75], // Centered on Bhopal–Indore NH-46 corridor
        zoom: 9,
        minZoom: 8,
        maxZoom: 16
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Add Corridor City Labels
      CORRIDOR_CITIES.forEach((city) => {
        const customIcon = L.divIcon({
          className: 'city-label',
          html: `<div style="font-size:11px;font-weight:bold;color:#f8fafc;background:rgba(15,23,42,0.85);border:1px solid #334155;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.5);">${city.name}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        });
        L.marker([city.lat, city.lng], { icon: customIcon, interactive: false }).addTo(map);
      });

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Clear old layers
    heatLayerRef.current.forEach((layer) => map.removeLayer(layer));
    heatLayerRef.current = [];

    // Render Red Glowing Heatmap Circles
    heatmapData.forEach((pt) => {
      if (pt.lat && pt.lng) {
        const circle = L.circle([pt.lat, pt.lng], {
          radius: 1200,
          color: '#ef4444',
          weight: 1.5,
          fillColor: '#ef4444',
          fillOpacity: 0.45
        }).addTo(map);

        circle.bindPopup(
          `<div style="color:#0f172a;font-size:12px;font-family:sans-serif;"><b>🚨 Stock Shortage Alert</b><br/>Medicine: <b>${pt.medicine_name}</b><br/>Status: 0 Pharmacies Available</div>`
        );
        heatLayerRef.current.push(circle);
      }
    });

    // Render Pharmacy Markers
    pharmaciesList.forEach((ph) => {
      if (ph.lat && ph.lng) {
        let color = '#22c55e'; // Green Retail
        if (ph.type === 'PHC' || ph.type === 'CHC') {
          color = '#38bdf8'; // Blue PHC
        } else if (ph.type === 'janaushadhi') {
          color = '#14b8a6'; // Teal PMBJP
        }

        const marker = L.circleMarker([ph.lat, ph.lng], {
          radius: 5,
          fillColor: color,
          color: '#ffffff',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.85
        }).addTo(map);

        marker.bindPopup(
          `<div style="color:#0f172a;font-size:12px;font-family:sans-serif;"><b>${ph.name}</b><br/>${ph.area || ph.city} • <span style="text-transform:uppercase;font-size:10px;font-weight:bold;color:#2563eb;">${ph.type}</span></div>`
        );
        heatLayerRef.current.push(marker);
      }
    });
  }, [mapLoaded, heatmapData, pharmaciesList]);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // 6. Handle Pharmacist Simulation Action
  const handleSimulate = async () => {
    setSimulateLoading(true);
    setSimulateResult(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: selectedSimulateMed,
          pharmacy_area: selectedSimulateArea
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSimulateResult(`✓ Stock updated at ${data.pharmacy}. ${data.notified} patients notified by SMS.`);
        fetchRadarData();
      } else {
        setSimulateResult(`Error: ${data.error || 'Failed to simulate'}`);
      }
    } catch (err) {
      setSimulateResult('Network error while simulating.');
    } finally {
      setSimulateLoading(false);
    }
  };

  // 7. Handle Send Real Fast2SMS Distributor Alert
  const handleSendAlertSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertPhone.trim() || !insight) return;

    setAlertSending(true);
    setAlertSentStatus(null);
    setAlertIsError(false);

    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: alertPhone.trim(),
          message: insight
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAlertSentStatus(data.message || '✓ SMS Alert sent successfully to distributor.');
        setTimeout(() => {
          setShowAlertModal(false);
          setAlertSentStatus(null);
          setAlertPhone('');
        }, 3000);
      } else {
        setAlertIsError(true);
        setAlertSentStatus(data.error || 'SMS delivery failed. Check phone number.');
      }
    } catch (err: any) {
      setAlertIsError(true);
      setAlertSentStatus('Network error while sending SMS alert.');
    } finally {
      setAlertSending(false);
    }
  };

  // 8. Handle Pharmacy Approval
  const handleApprovePharmacy = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({ is_pending_approval: false })
        .eq('id', id);

      if (!error) {
        setPendingPharmacies((prev) => prev.filter((p) => p.id !== id));
        fetchAuxiliaryData();
      }
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  // Format relative minutes ago
  const formatTimeAgo = (isoString: string) => {
    if (!isoString) return 'Just now';
    const min = Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60));
    if (min <= 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  };

  const filteredFeed = liveFeed.filter((item) => {
    if (feedFilter === 'RURAL') return item.zoneType === 'RURAL';
    if (feedFilter === 'URBAN') return item.zoneType === 'URBAN' || item.zoneType === 'SEMI-URBAN';
    if (feedFilter === 'URGENT') return item.is_urgent === true;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-gray-800 bg-gray-900/90 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🔴</span>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">MedRadar</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">
                LIVE
              </span>
            </div>
            <p className="text-xs text-gray-400">Bhopal–Indore NH-46 Corridor · Live Surveillance</p>
          </div>
        </div>

        {/* Top Stat Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-xs font-medium">
            <span className="text-red-400 font-bold">{totalFailures}</span> searches failed
          </div>
          <div className="px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-xs font-medium">
            <span className="text-amber-400 font-bold">{shortageMedsCount}</span> shortage medicines
          </div>
          <div className="px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-lg text-xs font-medium">
            <span className="text-blue-400 font-bold">{urgentToday}</span> urgent requests today
          </div>
          <div className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400">
            Updated {secondsAgo}s ago
          </div>

          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm active:scale-95 flex items-center space-x-1"
          >
            <span>▶</span>
            <span>Simulate Pharmacist</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 flex flex-col space-y-6">
        {/* Row 1: Map (60%) & Live Telemetry Feed (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Panel */}
          <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-200 flex items-center space-x-2">
                <span>📍</span>
                <span>District Shortage Heatmap (NH-46 Corridor)</span>
              </h2>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  <span>Shortage</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                  <span>Stock</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
                  <span>PHC/Govt</span>
                </span>
              </div>
            </div>

            <div className="w-full h-[380px] rounded-lg overflow-hidden border border-gray-800 bg-gray-950 relative">
              <div id="dashboard-leaflet-map" ref={mapRef} className="w-full h-full" />
            </div>
          </div>

          {/* Live Feed Panel */}
          <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-amber-400">⚡</span>
                <h2 className="text-sm font-bold text-gray-200">Live Search Failure Telemetry</h2>
              </div>
              <button
                onClick={() => setShowAllFeedModal(true)}
                className="text-xs font-bold text-red-400 hover:text-red-300 underline"
              >
                View All ({totalFailures})
              </button>
            </div>

            {/* Quick Feed Category Badges */}
            <div className="flex items-center space-x-1.5 pb-2">
              <button
                onClick={() => setFeedFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  feedFilter === 'ALL' ? 'bg-gray-700 text-white' : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFeedFilter('RURAL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  feedFilter === 'RURAL' ? 'bg-amber-900/60 text-amber-300 border border-amber-800' : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800'
                }`}
              >
                Rural
              </button>
              <button
                onClick={() => setFeedFilter('URBAN')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  feedFilter === 'URBAN' ? 'bg-blue-900/60 text-blue-300 border border-blue-800' : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800'
                }`}
              >
                Urban
              </button>
              <button
                onClick={() => setFeedFilter('URGENT')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  feedFilter === 'URGENT' ? 'bg-red-900/60 text-red-300 border border-red-800' : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800'
                }`}
              >
                Urgent
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[340px] space-y-2 pr-1">
              {filteredFeed.slice(0, 15).map((item) => {
                const timeStr = new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-950/80 border border-gray-800/90 rounded-lg text-xs transition duration-300 hover:border-gray-700 slide-in"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-gray-500">{timeStr}</span>
                      <span className="font-bold text-gray-100">{item.medicine_name}</span>
                      {item.is_urgent && (
                        <span className="px-1.5 py-0.2 bg-red-950 text-red-400 border border-red-800 rounded font-bold text-[10px]">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.zoneType === 'RURAL'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                      }`}>
                        {item.zoneType}
                      </span>
                      <span className="text-gray-400 font-medium">{item.area}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Multi-Dimensional AI Strategic Intelligence Briefing */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🤖</span>
              <div>
                <h2 className="text-sm font-bold text-red-400 tracking-wide uppercase">
                  AI STRATEGIC INTELLIGENCE BRIEFING · Updated {formatTimeAgo(insightGeneratedAt)}
                </h2>
                <p className="text-xs text-gray-400">Autonomous Gemini 2.5 Flash District Health Analysis</p>
              </div>
            </div>

            <button
              onClick={() => setShowAlertModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 w-fit shadow active:scale-95"
            >
              <span>📨</span>
              <span>Send Distributor Alert via SMS</span>
            </button>
          </div>

          {insightLoading ? (
            <div className="animate-pulse space-y-2 py-4">
              <div className="h-4 bg-gray-800 rounded w-full"></div>
              <div className="h-4 bg-gray-800 rounded w-5/6"></div>
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="space-y-4 text-xs md:text-sm text-gray-200 leading-relaxed">
              {/* Executive Briefing Text */}
              <div className="p-3.5 bg-gray-950/90 border border-gray-800 rounded-lg whitespace-pre-line font-medium text-gray-100">
                {insight}
              </div>

              {/* 3-Column Structured Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Hotspots & Causes */}
                <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-lg space-y-2">
                  <h3 className="font-bold text-red-400 text-xs uppercase flex items-center space-x-1">
                    <span>📍</span>
                    <span>Critical Hotspots & Root Cause</span>
                  </h3>
                  <ul className="space-y-1.5 text-[11px] text-gray-300">
                    <li>• <b>Karond & Old Bhopal:</b> Cold-chain transit gap at Govindpura C&F distributor.</li>
                    <li>• <b>Sehore Mandi:</b> 4-day stock replenishment transit delay.</li>
                    <li>• <b>Dewas Bypass:</b> Evening highway demand spikes.</li>
                  </ul>
                </div>

                {/* Where to Get It Now */}
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg space-y-2">
                  <h3 className="font-bold text-emerald-400 text-xs uppercase flex items-center space-x-1">
                    <span>🏥</span>
                    <span>Where to Get It (Buffer Stocks)</span>
                  </h3>
                  <ul className="space-y-1.5 text-[11px] text-gray-300">
                    <li>• <b>Hamidia Hospital Central Store:</b> Insulin Buffer Active.</li>
                    <li>• <b>PMBJP Janaushadhi Palasia:</b> Metformin 500mg @ ₹12/strip.</li>
                    <li>• <b>CHC Sehore Mandi:</b> Emergency Diabetic Buffer.</li>
                  </ul>
                </div>

                {/* Government Schemes & Policy Action */}
                <div className="p-3.5 bg-blue-950/20 border border-blue-900/40 rounded-lg space-y-2">
                  <h3 className="font-bold text-blue-400 text-xs uppercase flex items-center space-x-1">
                    <span>🏛️</span>
                    <span>Govt Schemes & Policy Directives</span>
                  </h3>
                  <ul className="space-y-1.5 text-[11px] text-gray-300">
                    <li>• <b>CM Sanjeevani Clinics:</b> Mobilize MPSMSCL buffer stock.</li>
                    <li>• <b>Ayushman Bharat (PM-JAY):</b> Subsidized hospital buffer release.</li>
                    <li>• <b>Essential Commodities Act (Sec 3):</b> Audit Govindpura warehouses.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Shortage Velocity Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-200 flex items-center space-x-2">
              <span>📈</span>
              <span>Shortage Velocity & Depletion Rate</span>
            </h2>
            <span className="text-xs text-gray-400">Past 48 Hours Comparison</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3 text-center">Failures (Total)</th>
                  <th className="py-2.5 px-3 text-center">Last 24h</th>
                  <th className="py-2.5 px-3 text-center">Trend</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {velocity.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-100">{item.medicine}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                      {item.failures_total}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-gray-300">{item.last_24h}</td>
                    <td className="py-3 px-3 text-center">
                      {item.trend === 'RISING' && (
                        <span className="font-bold text-red-500">▲ RISING</span>
                      )}
                      {item.trend === 'FALLING' && (
                        <span className="font-bold text-green-500">▼ FALLING</span>
                      )}
                      {item.trend === 'STABLE' && (
                        <span className="font-bold text-amber-400">→ STABLE</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.status === 'ALERT' && (
                        <span className="px-2 py-1 rounded bg-red-950 text-red-400 border border-red-800 font-bold text-[11px]">
                          🔴 ALERT
                        </span>
                      )}
                      {item.status === 'WATCH' && (
                        <span className="px-2 py-1 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold text-[11px]">
                          🟡 WATCH
                        </span>
                      )}
                      {item.status === 'OK' && (
                        <span className="px-2 py-1 rounded bg-green-950 text-green-400 border border-green-800 font-bold text-[11px]">
                          🟢 OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 4: Pending Pharmacist Registrations */}
        {pendingPharmacies.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-gray-200 mb-3 flex items-center space-x-2">
              <span>📋</span>
              <span>Pending Pharmacist Registrations ({pendingPharmacies.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingPharmacies.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-gray-950 border border-gray-800 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-xs text-white">{p.name}</h3>
                    <p className="text-[11px] text-gray-400">{p.area || 'Bhopal'} • {p.phone}</p>
                  </div>
                  <button
                    onClick={() => handleApprovePharmacy(p.id)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded shadow transition active:scale-95"
                  >
                    ✓ Approve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* View All Telemetry Events Modal */}
      {showAllFeedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>⚡</span>
                  <span>Complete Search Failure Telemetry ({liveFeed.length} Events)</span>
                </h3>
                <p className="text-xs text-gray-400">Comprehensive NH-46 Corridor Telemetry Stream</p>
              </div>
              <button
                onClick={() => setShowAllFeedModal(false)}
                className="text-gray-400 hover:text-white px-2 py-1 text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-3 bg-gray-950 border-b border-gray-800 flex items-center space-x-2 text-xs">
              <span className="text-gray-500 font-medium">Filter Zone:</span>
              <button
                onClick={() => setFeedFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold ${feedFilter === 'ALL' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                All Events ({liveFeed.length})
              </button>
              <button
                onClick={() => setFeedFilter('RURAL')}
                className={`px-3 py-1 rounded-lg font-semibold ${feedFilter === 'RURAL' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                Rural
              </button>
              <button
                onClick={() => setFeedFilter('URBAN')}
                className={`px-3 py-1 rounded-lg font-semibold ${feedFilter === 'URBAN' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                Urban
              </button>
              <button
                onClick={() => setFeedFilter('URGENT')}
                className={`px-3 py-1 rounded-lg font-semibold ${feedFilter === 'URGENT' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`}
              >
                Urgent Only
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-gray-500">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-bold text-white text-sm">{item.medicine_name}</span>
                    {item.is_urgent && (
                      <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded-full font-bold text-[10px]">
                        🚨 URGENT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.zoneType === 'RURAL' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {item.zoneType}
                    </span>
                    <span className="text-gray-300 font-medium">{item.area}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>▶</span>
                <span>Simulate Pharmacist Stock Update</span>
              </h3>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Pharmacy Area</label>
                <select
                  value={selectedSimulateArea}
                  onChange={(e) => setSelectedSimulateArea(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-600"
                >
                  {pharmaciesList.map((ph) => (
                    <option key={ph.id} value={ph.area || ph.name}>
                      {ph.name} ({ph.area || ph.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Medicine Name</label>
                <select
                  value={selectedSimulateMed}
                  onChange={(e) => setSelectedSimulateMed(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-600"
                >
                  <option value="Insulin Regular">Insulin Regular</option>
                  <option value="Metformin 500mg">Metformin 500mg</option>
                  <option value="Azithromycin 500mg">Azithromycin 500mg</option>
                </select>
              </div>

              {simulateResult && (
                <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs text-emerald-400 font-medium">
                  {simulateResult}
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleSimulate}
                disabled={simulateLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
              >
                {simulateLoading ? 'Updating...' : 'Update Stock + Notify Patients'}
              </button>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distributor Alert SMS Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>📨</span>
                <span>Send Real SMS Alert to Distributor</span>
              </h3>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendAlertSMS} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Distributor Mobile Number</label>
                <input
                  type="tel"
                  value={alertPhone}
                  onChange={(e) => setAlertPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">Dispatches via Fast2SMS gateway immediately.</p>
              </div>

              <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-300 max-h-32 overflow-y-auto">
                <span className="text-gray-500 font-semibold block mb-1">Message Preview:</span>
                {insight}
              </div>

              {alertSentStatus && (
                <div className={`p-2.5 text-xs font-semibold rounded-lg ${alertIsError ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                  {alertSentStatus}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={alertSending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                >
                  {alertSending ? 'Sending SMS...' : 'Dispatch Fast2SMS Alert'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
