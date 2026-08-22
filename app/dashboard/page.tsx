'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://imomuyjjbxrtibbsgsba.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

declare global {
  interface Window {
    maplibregl: any;
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
  area?: string;
  is_urgent?: boolean;
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

export default function DashboardPage() {
  const [insight, setInsight] = useState<string>('');
  const [insightGeneratedAt, setInsightGeneratedAt] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState<boolean>(true);
  const [velocity, setVelocity] = useState<VelocityItem[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [totalFailures, setTotalFailures] = useState<number>(0);
  const [urgentToday, setUrgentToday] = useState<number>(0);
  const [shortageMedsCount, setShortageMedsCount] = useState<number>(0);

  const [liveFeed, setLiveFeed] = useState<SearchFeedItem[]>([]);
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

  // Time elapsed counter
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Map references
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const pharmacyMarkersRef = useRef<any[]>([]);
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
        setTotalFailures(data.total_failures || 0);

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

  // 2. Fetch Live Feed & Pending Pharmacies
  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const { data: feedData } = await supabase
        .from('searches')
        .select('*')
        .eq('result_count', 0)
        .order('created_at', { ascending: false })
        .limit(15);

      if (feedData) {
        setLiveFeed(feedData);
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { count: urgentCount } = await supabase
        .from('searches')
        .select('*', { count: 'exact', head: true })
        .eq('is_urgent', true)
        .gte('created_at', startOfToday.toISOString());

      if (urgentCount !== null) {
        setUrgentToday(urgentCount);
      }

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

  // 3. Initial Load and 30-Second Refresh Cycle
  useEffect(() => {
    fetchRadarData();
    fetchAuxiliaryData();

    const interval = setInterval(() => {
      fetchRadarData();
      fetchAuxiliaryData();
    }, 30000);

    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [fetchRadarData, fetchAuxiliaryData]);

  // 4. Dynamically Load MapLibre CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.maplibregl) {
      setMapLoaded(true);
      return;
    }

    if (!document.getElementById('maplibre-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('maplibre-js')) {
      const script = document.createElement('script');
      script.id = 'maplibre-js';
      script.src = 'https://unpkg.com/maplibre-gl/dist/maplibre-gl.js';
      script.async = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    }
  }, []);

  // 5. Initialize MapLibre Vector Map
  useEffect(() => {
    if (!mapLoaded || !window.maplibregl || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = new window.maplibregl.Map({
        container: mapRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [76.75, 23.05],
        zoom: 9,
        minZoom: 8,
        maxBounds: [
          [75.60, 22.60],
          [77.65, 23.50]
        ]
      });

      map.addControl(new window.maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
        // Add native MapLibre Heatmap source & layer
        map.addSource('failures', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: heatmapData.map((f) => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
              properties: { medicine: f.medicine_name, weight: 1 }
            }))
          }
        });

        map.addLayer({
          id: 'failures-heat',
          type: 'heatmap',
          source: 'failures',
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(33,102,172,0)',
              0.2,
              'rgb(103,169,207)',
              0.4,
              'rgb(254,204,92)',
              0.6,
              'rgb(253,141,60)',
              0.8,
              'rgb(240,59,32)',
              1,
              'rgb(189,0,38)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 20, 14, 40],
            'heatmap-opacity': 0.85
          }
        });

        // Add Fixed City Labels
        CORRIDOR_CITIES.forEach((city) => {
          const el = document.createElement('div');
          el.innerHTML = city.name;
          el.style.cssText =
            'font-size:11px;font-weight:700;color:#0f172a;background:rgba(255,255,255,0.9);padding:2px 6px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,0.3);pointer-events:none;';
          new window.maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([city.lng, city.lat])
            .addTo(map);
        });
      });

      mapInstanceRef.current = map;
    }
  }, [mapLoaded, heatmapData]);

  // 6. Update Heatmap Data Dynamically
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const source = map.getSource('failures');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: heatmapData.map((f) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
          properties: { medicine: f.medicine_name, weight: 1 }
        }))
      });
    }
  }, [heatmapData]);

  // 7. Update Pharmacy Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.maplibregl) return;
    const map = mapInstanceRef.current;

    pharmacyMarkersRef.current.forEach((m) => m.remove());
    pharmacyMarkersRef.current = [];

    pharmaciesList.forEach((ph) => {
      if (ph.lat && ph.lng) {
        let color = '#16a34a'; // green
        if (ph.type === 'PHC' || ph.type === 'CHC') {
          color = '#3b82f6'; // blue
        } else if (ph.type === 'janaushadhi') {
          color = '#0d9488'; // teal
        } else if (ph.type === 'district_hospital' || ph.type === 'hospital') {
          color = '#7c3aed'; // purple
        }

        const el = document.createElement('div');
        el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid #fff;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.4);`;

        const popup = new window.maplibregl.Popup({ offset: 6, closeButton: false }).setHTML(
          `<div style="color:#0f172a;font-size:11px;"><b>${ph.name}</b><br/>${ph.area || ph.city} • ${ph.type}</div>`
        );

        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([ph.lng, ph.lat])
          .setPopup(popup)
          .addTo(map);

        pharmacyMarkersRef.current.push(marker);
      }
    });
  }, [pharmaciesList]);

  // Cleanup Map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 8. Supabase Realtime Subscriptions
  useEffect(() => {
    const stockChannel = supabase
      .channel('dashboard-stock')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stock' },
        () => {
          fetchRadarData();
        }
      )
      .subscribe();

    const searchChannel = supabase
      .channel('dashboard-searches')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'searches' },
        (payload: any) => {
          if (payload.new && payload.new.result_count === 0) {
            setLiveFeed((prev) => [payload.new as SearchFeedItem, ...prev.slice(0, 14)]);
            setTotalFailures((prev) => prev + 1);

            setHeatmapData((prev) => [
              ...prev,
              {
                lat: payload.new.lat,
                lng: payload.new.lng,
                medicine_name: payload.new.medicine_name
              }
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(searchChannel);
    };
  }, [fetchRadarData]);

  // 9. Handle Pharmacist Simulation Action
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

  // 10. Handle Send SMS Alert to Distributor
  const handleSendAlertSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertPhone.trim() || !insight) return;

    setAlertSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: alertPhone.trim(),
          medicine_name: 'Distributor Alert',
          found: true
        })
      });
      if (res.ok) {
        setAlertSentStatus('✓ Alert message queued to distributor.');
        setTimeout(() => {
          setShowAlertModal(false);
          setAlertSentStatus(null);
          setAlertPhone('');
        }, 2000);
      }
    } catch (err) {
      setAlertSentStatus('Failed to send SMS alert.');
    } finally {
      setAlertSending(false);
    }
  };

  // 11. Handle Pharmacy Approval
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

  const formatInsightTimeAgo = (isoString: string) => {
    if (!isoString) return '1';
    const min = Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60));
    return min <= 1 ? '1' : `${min}`;
  };

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
        {/* Row 1: Map (60%) & Live Feed (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Panel */}
          <div className="lg:col-span-7 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-200 flex items-center space-x-2">
                <span>📍</span>
                <span>District Vector Shortage Heatmap (MapLibre GL)</span>
              </h2>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  <span>Heatmap</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                  <span>Stock</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
                  <span>PHC</span>
                </span>
              </div>
            </div>

            <div className="w-full h-[380px] rounded-lg overflow-hidden border border-gray-800 bg-gray-950">
              <div ref={mapRef} className="w-full h-full" />
            </div>
          </div>

          {/* Live Feed Panel */}
          <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-200 flex items-center space-x-2">
                <span>⚡</span>
                <span>Live Search Failure Feed</span>
              </h2>
              <span className="text-xs text-gray-500">Realtime Stream</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
              {liveFeed.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  Awaiting real-time search telemetry...
                </div>
              ) : (
                liveFeed.map((item) => {
                  const timeStr = new Date(item.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-950/70 border border-gray-800/80 rounded-lg text-xs transition duration-300 hover:border-gray-700 slide-in"
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
                      <span className="text-gray-400 font-medium">{item.area || 'Karond'}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Shortage Velocity Table */}
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

        {/* Row 3: AI Insight Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <h2 className="text-xs font-bold text-red-400 tracking-wider uppercase flex items-center space-x-1.5">
              <span>🤖</span>
              <span>AI INSIGHT · Updated {formatInsightTimeAgo(insightGeneratedAt)} min ago</span>
            </h2>

            <button
              onClick={() => setShowAlertModal(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold border border-gray-700 transition flex items-center space-x-1.5 w-fit"
            >
              <span>📨</span>
              <span>Send Distributor Alert via SMS</span>
            </button>
          </div>

          {insightLoading ? (
            <div className="animate-pulse space-y-2 py-2">
              <div className="h-4 bg-gray-800 rounded w-full"></div>
              <div className="h-4 bg-gray-800 rounded w-5/6"></div>
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            </div>
          ) : (
            <p className="text-sm md:text-base text-gray-200 leading-relaxed font-medium">
              {insight}
            </p>
          )}
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
                <span>Send SMS Alert to Distributor</span>
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
                <label className="text-xs text-gray-400 block mb-1">Distributor Phone Number</label>
                <input
                  type="tel"
                  value={alertPhone}
                  onChange={(e) => setAlertPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-300">
                <span className="text-gray-500 font-semibold block mb-1">Message Preview:</span>
                {insight}
              </div>

              {alertSentStatus && (
                <div className="p-2 text-xs font-semibold text-emerald-400">
                  {alertSentStatus}
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={alertSending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                >
                  {alertSending ? 'Sending...' : 'Send SMS'}
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
