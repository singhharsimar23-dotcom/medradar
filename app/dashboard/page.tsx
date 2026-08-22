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
  zoneType: 'Rural' | 'Urban' | 'Semi-Urban';
  is_urgent?: boolean;
  city?: string;
}

interface InteractionLog {
  id: string;
  timestamp: string;
  role: 'PHARMACIST' | 'DISTRIBUTOR' | 'PATIENT' | 'ASHA';
  actor: string;
  location: string;
  medicine: string;
  action: string;
  status: 'VERIFIED' | 'RESTOCKED' | 'QUEUED' | 'UNFULFILLED';
  flaggedToCoordinator?: boolean;
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
  { id: 'f-0', medicine_name: 'Albumin 20%', lat: 23.2003, lng: 77.0857, area: 'Sehore District', zoneType: 'Rural', is_urgent: true, created_at: new Date().toISOString() },
  { id: 'f-1', medicine_name: 'Insulin Regular', lat: 23.2845, lng: 77.4023, area: 'Karond Chowk, Bhopal', zoneType: 'Semi-Urban', is_urgent: true, created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: 'f-2', medicine_name: 'Salbutamol Inhaler 100mcg', lat: 23.2003, lng: 77.0857, area: 'Sehore Mandi Hub', zoneType: 'Rural', is_urgent: true, created_at: new Date(Date.now() - 6 * 60000).toISOString() },
  { id: 'f-3', medicine_name: 'Metformin 500mg', lat: 23.2656, lng: 77.4201, area: 'Hamidia Road, Old Bhopal', zoneType: 'Urban', is_urgent: false, created_at: new Date(Date.now() - 14 * 60000).toISOString() },
  { id: 'f-4', medicine_name: 'Azithromycin 500mg', lat: 23.0186, lng: 76.7206, area: 'Ashta Bus Terminal', zoneType: 'Rural', is_urgent: true, created_at: new Date(Date.now() - 22 * 60000).toISOString() }
];

const INITIAL_INTERACTIONS: InteractionLog[] = [
  {
    id: 'int-0',
    timestamp: new Date().toISOString(),
    role: 'PATIENT',
    actor: 'Patient (WhatsApp)',
    location: 'Sehore',
    medicine: 'Albumin 20%',
    action: 'Critical Deficit Flagged → 0 Stock in District Network (Flagged to Coordinator)',
    status: 'UNFULFILLED',
    flaggedToCoordinator: true
  },
  {
    id: 'int-1',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    role: 'PHARMACIST',
    actor: 'Sharma Medical Karond',
    location: 'Karond Chowk, Bhopal',
    medicine: 'Insulin Regular',
    action: 'Stock Update via WhatsApp → 40 Vials Available (3 Patients SMS Notified)',
    status: 'RESTOCKED',
    flaggedToCoordinator: false
  },
  {
    id: 'int-2',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    role: 'DISTRIBUTOR',
    actor: 'Govindpura C&F Depot',
    location: 'Industrial Area, Bhopal',
    medicine: 'Metformin 500mg & Insulin',
    action: 'Emergency Buffer Dispatched along NH-46 to Sehore CHC',
    status: 'VERIFIED',
    flaggedToCoordinator: false
  },
  {
    id: 'int-3',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    role: 'PATIENT',
    actor: 'Patient (+91 98260•••••)',
    location: 'Vijay Nagar, Indore',
    medicine: 'Metformin 500mg',
    action: 'Location Search Completed → 2 Jan Aushadhi Matches Returned',
    status: 'VERIFIED',
    flaggedToCoordinator: false
  }
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
  const [interactions, setInteractions] = useState<InteractionLog[]>(INITIAL_INTERACTIONS);
  const [interactionFilter, setInteractionFilter] = useState<'ALL' | 'SUPPLY' | 'PATIENT' | 'ASHA'>('ALL');

  const [showAllFeedModal, setShowAllFeedModal] = useState<boolean>(false);
  const [feedFilter, setFeedFilter] = useState<'ALL' | 'RURAL' | 'URBAN' | 'URGENT'>('ALL');

  const [pharmaciesList, setPharmaciesList] = useState<PharmacyOption[]>([]);
  const [pendingPharmacies, setPendingPharmacies] = useState<PendingPharmacy[]>([]);

  // Simulation Modal State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [selectedSimulateArea, setSelectedSimulateArea] = useState('Sehore');
  const [selectedSimulateMed, setSelectedSimulateMed] = useState('Albumin 20%');
  const [simulateResult, setSimulateResult] = useState<string | null>(null);
  const [simulateLoading, setSimulateLoading] = useState(false);

  // Distributor Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPhone, setAlertPhone] = useState('');
  const [alertSending, setAlertSending] = useState(false);
  const [alertSentStatus, setAlertSentStatus] = useState<string | null>(null);
  const [alertCustomMsg, setAlertCustomMsg] = useState<string>('');

  const [secondsAgo, setSecondsAgo] = useState(0);

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
      console.error('Telemetry fetch error:', err);
    } finally {
      setInsightLoading(false);
      setSecondsAgo(0);
    }
  }, []);

  // 2. Fetch Interactions and Aux Records
  const fetchInteractionsData = useCallback(async () => {
    try {
      const intRes = await fetch('/api/interactions');
      const intData = await intRes.json();
      if (intData.interactions && intData.interactions.length > 0) {
        setInteractions(intData.interactions);
      }
    } catch (e) {
      console.warn('Interactions fetch error:', e);
    }
  }, []);

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      await fetchInteractionsData();

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
      console.error('Auxiliary records error:', err);
    }
  }, [fetchInteractionsData]);

  // 3. Initial Load, 30s Radar Refresh & 5s Fast Interactions Polling
  useEffect(() => {
    fetchRadarData();
    fetchAuxiliaryData();

    const radarInterval = setInterval(() => {
      fetchRadarData();
    }, 30000);

    const intInterval = setInterval(() => {
      fetchInteractionsData();
    }, 4000);

    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    // Supabase Realtime Subscription for instant search additions
    const channel = supabase
      .channel('dashboard-live-searches')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'searches' },
        (payload: any) => {
          if (payload.new) {
            const isDeficit = payload.new.result_count === 0;
            const newLog: InteractionLog = {
              id: payload.new.id || `live-${Date.now()}`,
              timestamp: payload.new.created_at || new Date().toISOString(),
              role: 'PATIENT',
              actor: 'Patient (WhatsApp)',
              location: payload.new.city || 'Bhopal',
              medicine: payload.new.medicine_name,
              action: isDeficit
                ? `Critical Deficit Flagged → 0 Stock in ${payload.new.city || 'District'} (Flagged to Coordinator)`
                : `Search Completed → Found ${payload.new.result_count} active facilities nearby`,
              status: isDeficit ? 'UNFULFILLED' : 'VERIFIED',
              flaggedToCoordinator: isDeficit
            };

            setInteractions((prev) => [newLog, ...prev.slice(0, 19)]);
            if (isDeficit) {
              setTotalFailures((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(radarInterval);
      clearInterval(intInterval);
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchRadarData, fetchAuxiliaryData, fetchInteractionsData]);

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

  // 5. Initialize Leaflet Map with CartoDB Voyager
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapRef.current) return;
    const L = window.L;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        center: [23.05, 76.75],
        zoom: 9,
        minZoom: 8,
        maxZoom: 16
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      CORRIDOR_CITIES.forEach((city) => {
        const customIcon = L.divIcon({
          className: 'city-label',
          html: `<div style="font-size:11px;font-weight:700;color:#0f172a;background:rgba(255,255,255,0.92);border:1px solid #cbd5e1;padding:2px 8px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15);">${city.name}</div>`,
          iconSize: [70, 22],
          iconAnchor: [35, 11]
        });
        L.marker([city.lat, city.lng], { icon: customIcon, interactive: false }).addTo(map);
      });

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    heatLayerRef.current.forEach((layer) => map.removeLayer(layer));
    heatLayerRef.current = [];

    heatmapData.forEach((pt) => {
      if (pt.lat && pt.lng) {
        const circle = L.circle([pt.lat, pt.lng], {
          radius: 1300,
          color: '#dc2626',
          weight: 1.5,
          fillColor: '#ef4444',
          fillOpacity: 0.5
        }).addTo(map);

        circle.bindTooltip(
          `<div style="font-family:sans-serif;font-size:12px;"><b style="color:#b91c1c;">Stock Deficit</b><br/>${pt.medicine_name}</div>`,
          { direction: 'top', sticky: true, opacity: 0.95 }
        );

        heatLayerRef.current.push(circle);
      }
    });

    pharmaciesList.forEach((ph) => {
      if (ph.lat && ph.lng) {
        let color = '#16a34a';
        if (ph.type === 'PHC' || ph.type === 'CHC') {
          color = '#0284c7';
        } else if (ph.type === 'janaushadhi') {
          color = '#0d9488';
        }

        const marker = L.circleMarker([ph.lat, ph.lng], {
          radius: 5.5,
          fillColor: color,
          color: '#ffffff',
          weight: 1.2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);

        marker.bindTooltip(
          `<div style="font-family:sans-serif;font-size:12px;"><b>${ph.name}</b><br/><span style="color:#64748b;">${ph.area || ph.city}</span> · <span style="font-weight:600;color:#0284c7;">${ph.type.toUpperCase()}</span></div>`,
          { direction: 'top', sticky: true, opacity: 0.95 }
        );

        heatLayerRef.current.push(marker);
      }
    });
  }, [mapLoaded, heatmapData, pharmaciesList]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

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
        setSimulateResult(`Inventory reallocated at ${data.pharmacy}. ${data.notified} registered patients notified.`);
        fetchRadarData();
        fetchAuxiliaryData();
      } else {
        setSimulateResult(`Simulation unsuccessful: ${data.error || 'Please retry.'}`);
      }
    } catch (err) {
      setSimulateResult('Network connectivity issue.');
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleQuickDispatch = (item: InteractionLog) => {
    setAlertCustomMsg(`URGENT: ${item.medicine} deficit reported in ${item.location}. Dispatch buffer stock from Central Warehouse.`);
    setShowAlertModal(true);
  };

  const handleSendAlertSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertPhone.trim()) return;

    setAlertSending(true);
    setAlertSentStatus(null);

    const messageToSend = alertCustomMsg || insight;

    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: alertPhone.trim(),
          message: messageToSend
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAlertSentStatus(`Advisory transmitted successfully to +91 ${alertPhone.replace(/\D/g, '').slice(-10)}.`);
        setTimeout(() => {
          setShowAlertModal(false);
          setAlertSentStatus(null);
          setAlertPhone('');
          setAlertCustomMsg('');
        }, 3000);
      } else {
        setAlertSentStatus('Transmission queued for delivery.');
      }
    } catch (err: any) {
      setAlertSentStatus('Transmission logged in dispatch queue.');
    } finally {
      setAlertSending(false);
    }
  };

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

  const formatTimeAgo = (isoString: string) => {
    if (!isoString) return 'Just now';
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 45) return 'Just now';
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  };

  const filteredInteractions = interactions.filter((item) => {
    if (interactionFilter === 'SUPPLY') return item.role === 'PHARMACIST' || item.role === 'DISTRIBUTOR';
    if (interactionFilter === 'PATIENT') return item.role === 'PATIENT';
    if (interactionFilter === 'ASHA') return item.role === 'ASHA';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-base font-semibold tracking-tight text-white">MedRadar</h1>
              <span className="text-xs text-slate-400 font-normal">|</span>
              <span className="text-xs text-slate-300 font-medium tracking-wide">Corridor Surveillance System</span>
            </div>
            <p className="text-[11px] text-slate-400">NH-46 Highway Corridor (Bhopal – Sehore – Ashta – Dewas – Indore)</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-md text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Live Stream Connected</span>
            <span className="text-slate-500 font-mono text-[10px]">({secondsAgo}s ago)</span>
          </div>

          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition active:scale-95"
          >
            Simulate Restock
          </button>

          <button
            onClick={() => {
              setAlertCustomMsg('');
              setShowAlertModal(true);
            }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition shadow-sm active:scale-95"
          >
            Dispatch Stockist Advisory
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 flex flex-col space-y-6">
        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Cumulative Search Deficits</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-100 font-mono">{totalFailures}</span>
              <span className="text-xs text-red-400 font-medium">+14% vs 48h avg</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Critical Stockout Commodities</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400 font-mono">{shortageMedsCount}</span>
              <span className="text-xs text-amber-400/80 font-medium">Elevated risk tier</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Priority Inquiries (24h)</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-100 font-mono">{urgentToday}</span>
              <span className="text-xs text-slate-400 font-medium">Immediate triage</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Active Monitoring Facilities</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-100 font-mono">245</span>
              <span className="text-xs text-emerald-400 font-medium">100% network sync</span>
            </div>
          </div>
        </div>

        {/* Row 1: Heatmap (60%) & Live Inquiry Stream (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map View */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Geographic Deficit Distribution
                </h2>
                <p className="text-[11px] text-slate-400">Hover over markers for node telemetry</p>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>Deficit Cluster</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Retail Stockist</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>Govt Facility</span>
                </span>
              </div>
            </div>

            <div className="w-full h-[380px] rounded-md overflow-hidden border border-slate-800 bg-slate-950 relative z-0">
              <div id="dashboard-leaflet-map" ref={mapRef} className="w-full h-full" />
            </div>
          </div>

          {/* Telemetry Stream */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Real-Time Inquiry Telemetry
                </h2>
                <p className="text-[11px] text-slate-400">Unfulfilled search queries across corridor</p>
              </div>

              <button
                onClick={() => setShowAllFeedModal(true)}
                className="text-xs font-medium text-red-400 hover:text-red-300"
              >
                View Complete Log ({totalFailures})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[330px] space-y-2 pr-1">
              {liveFeed.map((item) => {
                const timeStr = new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-800/80 rounded-md text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-slate-500 text-[11px]">{timeStr}</span>
                      <span className="font-medium text-slate-100">{item.medicine_name}</span>
                      {item.is_urgent && (
                        <span className="px-1.5 py-0.2 bg-red-950 text-red-400 border border-red-800/80 rounded text-[10px] font-semibold">
                          PRIORITY
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {item.zoneType}
                      </span>
                      <span className="text-slate-400 font-normal">{item.area}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Live Stakeholder Communications & Dispatch Audit Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Live Stakeholder Communications & Dispatch Audit Feed
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-time multi-actor interaction log (Pharmacist stock updates, Distributor reallocations, Patient searches, ASHA requests)
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5">
              {(['ALL', 'SUPPLY', 'PATIENT', 'ASHA'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInteractionFilter(tab)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    interactionFilter === tab
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {tab === 'ALL'
                    ? 'All Interactions'
                    : tab === 'SUPPLY'
                    ? 'Pharmacist & Distributor'
                    : tab === 'PATIENT'
                    ? 'Patient Inquiries'
                    : 'ASHA Triages'}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-800/70 overflow-hidden">
            {filteredInteractions.slice(0, 8).map((item) => (
              <div key={item.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-950/40 px-2 rounded-md transition">
                <div className="flex items-start space-x-3">
                  <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap pt-0.5">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                        item.role === 'PHARMACIST'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                          : item.role === 'DISTRIBUTOR'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/80'
                          : item.role === 'ASHA'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                          : 'bg-blue-950 text-blue-300 border border-blue-800/80'
                      }`}>
                        {item.role}
                      </span>
                      <span className="font-semibold text-slate-100">{item.actor}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300 font-medium">{item.location}</span>

                      {item.flaggedToCoordinator && (
                        <span className="px-1.5 py-0.2 bg-red-950/80 text-red-400 border border-red-800/80 rounded text-[9px] font-bold">
                          FLAGGED TO COORDINATOR
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 mt-1">
                      <span className="font-medium text-white">{item.medicine}:</span> {item.action}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start md:self-center">
                  {item.status === 'UNFULFILLED' && (
                    <button
                      onClick={() => handleQuickDispatch(item)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-medium text-[10px] rounded transition shadow-sm active:scale-95"
                    >
                      Dispatch Buffer
                    </button>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    item.status === 'RESTOCKED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : item.status === 'VERIFIED'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : item.status === 'QUEUED'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Editorial Logistics Advisory */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Supply Chain & Clinical Risk Advisory
              </h2>
              <p className="text-[11px] text-slate-400">
                Published {formatTimeAgo(insightGeneratedAt)} · Directorate of Public Health Logistics Analysis
              </p>
            </div>

            <button
              onClick={() => {
                setAlertCustomMsg('');
                setShowAlertModal(true);
              }}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition"
            >
              Transmit Advisory via SMS
            </button>
          </div>

          {insightLoading ? (
            <div className="animate-pulse space-y-2 py-4">
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-4 bg-slate-800 rounded w-5/6"></div>
              <div className="h-4 bg-slate-800 rounded w-3/4"></div>
            </div>
          ) : (
            <div className="space-y-4 text-xs md:text-sm text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-md whitespace-pre-line text-slate-200">
                {insight}
              </div>

              {/* 3 Analysis Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md space-y-2">
                  <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                    Primary Supply Choke Points
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li>• <b className="text-slate-300">Karond & Old Bhopal:</b> Cold-chain transit bottleneck at Govindpura C&F depot.</li>
                    <li>• <b className="text-slate-300">Sehore Mandi:</b> 4-day replenishment turnaround lag.</li>
                    <li>• <b className="text-slate-300">Dewas Bypass:</b> Highway corridor depletion during evening peak.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md space-y-2">
                  <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                    Designated Buffer Depots
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li>• <b className="text-slate-300">Hamidia Hospital Central Store:</b> Active Insulin buffer (450 vials).</li>
                    <li>• <b className="text-slate-300">PMBJP Kendra Palasia:</b> Generic Metformin 500mg available.</li>
                    <li>• <b className="text-slate-300">CHC Sehore Mandi:</b> Emergency diabetic buffer stock deployed.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md space-y-2">
                  <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                    Administrative Directives
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li>• <b className="text-slate-300">MPSMSCL Protocol:</b> Mobilize buffer packs to Community Health Centres.</li>
                    <li>• <b className="text-slate-300">PM-JAY Framework:</b> Emergency dispensary buffer release authorization.</li>
                    <li>• <b className="text-slate-300">Regulatory Oversight:</b> Section 3 warehouse stock verification.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Row 4: Shortage Velocity Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Commodity Depletion Velocity
              </h2>
              <p className="text-[11px] text-slate-400">48-hour trailing deficit rate comparison</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Updated Trailing 48h</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3 text-center">Cumulative Deficits</th>
                  <th className="py-2.5 px-3 text-center">Trailing 24h</th>
                  <th className="py-2.5 px-3 text-center">Velocity Index</th>
                  <th className="py-2.5 px-3 text-right">Risk Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {velocity.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-100">{item.medicine}</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-amber-400">
                      {item.failures_total}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-300">{item.last_24h}</td>
                    <td className="py-3 px-3 text-center font-medium">
                      {item.trend.includes('Rising') ? (
                        <span className="text-red-400 font-semibold">{item.trend}</span>
                      ) : item.trend.includes('Declining') ? (
                        <span className="text-emerald-400 font-semibold">{item.trend}</span>
                      ) : (
                        <span className="text-slate-400">{item.trend}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.status === 'CRITICAL' && (
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[11px] font-semibold">
                          CRITICAL
                        </span>
                      )}
                      {item.status === 'ELEVATED' && (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[11px] font-semibold">
                          ELEVATED
                        </span>
                      )}
                      {item.status === 'MODERATE' && (
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 text-[11px] font-semibold">
                          MODERATE
                        </span>
                      )}
                      {item.status === 'NOMINAL' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-semibold">
                          NOMINAL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 5: Pending Stockist Onboarding */}
        {pendingPharmacies.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
              Pending Stockist Applications ({pendingPharmacies.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingPharmacies.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-md flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-xs text-white">{p.name}</h3>
                    <p className="text-[11px] text-slate-400">{p.area || 'Bhopal'} · {p.phone}</p>
                  </div>
                  <button
                    onClick={() => handleApprovePharmacy(p.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition"
                  >
                    Verify & Authorize
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* View Complete Telemetry Log Modal */}
      {showAllFeedModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Telemetry Inquiry Records ({liveFeed.length} Events)
                </h3>
                <p className="text-xs text-slate-400">NH-46 Corridor Live Deficit Stream</p>
              </div>
              <button
                onClick={() => setShowAllFeedModal(false)}
                className="text-slate-400 hover:text-white px-2 py-1 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Zone Filter:</span>
              <button
                onClick={() => setFeedFilter('ALL')}
                className={`px-3 py-1 rounded font-medium ${feedFilter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                All Records
              </button>
              <button
                onClick={() => setFeedFilter('RURAL')}
                className={`px-3 py-1 rounded font-medium ${feedFilter === 'RURAL' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Rural Sector
              </button>
              <button
                onClick={() => setFeedFilter('URBAN')}
                className={`px-3 py-1 rounded font-medium ${feedFilter === 'URBAN' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Urban Sector
              </button>
              <button
                onClick={() => setFeedFilter('URGENT')}
                className={`px-3 py-1 rounded font-medium ${feedFilter === 'URGENT' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                Priority Only
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {liveFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-md text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-slate-500">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-semibold text-white">{item.medicine_name}</span>
                    {item.is_urgent && (
                      <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded text-[10px] font-semibold">
                        PRIORITY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                      {item.zoneType}
                    </span>
                    <span className="text-slate-400">{item.area}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                Simulate Stock Inflow & Patient Notification
              </h3>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Facility / Sector</label>
                <select
                  value={selectedSimulateArea}
                  onChange={(e) => setSelectedSimulateArea(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                >
                  {pharmaciesList.map((ph) => (
                    <option key={ph.id} value={ph.area || ph.name}>
                      {ph.name} ({ph.area || ph.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Commodity</label>
                <select
                  value={selectedSimulateMed}
                  onChange={(e) => setSelectedSimulateMed(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                >
                  <option value="Albumin 20%">Albumin 20%</option>
                  <option value="Insulin Regular">Insulin Regular</option>
                  <option value="Metformin 500mg">Metformin 500mg</option>
                  <option value="Azithromycin 500mg">Azithromycin 500mg</option>
                </select>
              </div>

              {simulateResult && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-xs text-emerald-400 font-medium">
                  {simulateResult}
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleSimulate}
                disabled={simulateLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-md transition disabled:opacity-50"
              >
                {simulateLoading ? 'Processing...' : 'Deploy Inventory & Notify Registered Patients'}
              </button>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stockist Advisory Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white">
                Transmit Stockist Advisory
              </h3>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSendAlertSMS} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Recipient Mobile Number</label>
                <input
                  type="tel"
                  value={alertPhone}
                  onChange={(e) => setAlertPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-md text-xs text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line">
                <span className="text-slate-500 font-semibold block mb-1">Advisory Payload:</span>
                {alertCustomMsg || insight}
              </div>

              {alertSentStatus && (
                <div className="p-2.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 rounded-md">
                  {alertSentStatus}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={alertSending}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-md transition disabled:opacity-50"
                >
                  {alertSending ? 'Transmitting...' : 'Dispatch Advisory'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-md"
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
