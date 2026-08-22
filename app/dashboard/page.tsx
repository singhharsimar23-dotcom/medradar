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
  const leafletMapRef = useRef<any>(null);
  const heatLayerRef = useRef<any[]>([]);
  const mapLoadedRef = useRef(false);

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
      // Fetch recent 15 failed searches
      const { data: feedData } = await supabase
        .from('searches')
        .select('*')
        .eq('result_count', 0)
        .order('created_at', { ascending: false })
        .limit(15);

      if (feedData) {
        setLiveFeed(feedData);
      }

      // Count urgent today
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

      // Fetch pending pharmacies
      const { data: pendingData } = await supabase
        .from('pharmacies')
        .select('id, name, area, phone, lat, lng')
        .eq('is_pending_approval', true);

      if (pendingData) {
        setPendingPharmacies(pendingData);
      }

      // Fetch pharmacies list for simulation dropdown
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

  // 4. Dynamically Load Leaflet CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L) {
      mapLoadedRef.current = true;
      initMap();
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
        mapLoadedRef.current = true;
        initMap();
      };
      document.body.appendChild(script);
    }

    function initMap() {
      if (!mapRef.current || leafletMapRef.current) return;
      const L = window.L;

      const map = L.map(mapRef.current).setView([23.2599, 77.4126], 12);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 18
      }).addTo(map);

      leafletMapRef.current = map;
      renderHeatAndMarkers(heatmapData, pharmaciesList);
    }
  }, []);

  // 5. Render Heatmap and Pharmacy Markers on Leaflet Map
  const renderHeatAndMarkers = useCallback((heatPoints: HeatmapPoint[], pharms: PharmacyOption[]) => {
    if (!leafletMapRef.current || !window.L) return;
    const L = window.L;
    const map = leafletMapRef.current;

    // Clear old heat/circle layers
    heatLayerRef.current.forEach((layer) => map.removeLayer(layer));
    heatLayerRef.current = [];

    // Cluster nearby failure points (within 500m / ~0.0045 deg)
    const clusters: { lat: number; lng: number; count: number; medicines: Set<string> }[] = [];

    heatPoints.forEach((pt) => {
      let merged = false;
      for (const cl of clusters) {
        const dLat = Math.abs(cl.lat - pt.lat);
        const dLng = Math.abs(cl.lng - pt.lng);
        if (dLat < 0.005 && dLng < 0.005) {
          cl.count += 1;
          cl.medicines.add(pt.medicine_name);
          merged = true;
          break;
        }
      }
      if (!merged) {
        clusters.push({
          lat: pt.lat,
          lng: pt.lng,
          count: 1,
          medicines: new Set([pt.medicine_name])
        });
      }
    });

    // Render Red Cluster Circles
    clusters.forEach((cl) => {
      const radius = Math.min(800 + cl.count * 150, 2500);
      const opacity = Math.min(0.25 + cl.count * 0.1, 0.7);

      const circle = L.circle([cl.lat, cl.lng], {
        radius: radius,
        color: '#ef4444',
        weight: 1,
        fillColor: '#ef4444',
        fillOpacity: opacity
      }).addTo(map);

      circle.bindPopup(
        `<div style="color:#111; font-size:12px;"><b>🚨 Shortage Cluster</b><br/>Failures: ${cl.count}<br/>Medicines: ${Array.from(cl.medicines).join(', ')}</div>`
      );

      heatLayerRef.current.push(circle);
    });

    // Render Pharmacy Markers
    pharms.forEach((ph) => {
      if (ph.lat && ph.lng) {
        let color = '#22c55e'; // default available
        if (ph.type === 'PHC' || ph.type === 'janaushadhi') {
          color = '#38bdf8'; // blue for govt
        }

        const marker = L.circleMarker([ph.lat, ph.lng], {
          radius: 6,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(
          `<div style="color:#111; font-size:12px;"><b>${ph.name}</b><br/>${ph.area || ph.city}<br/>Type: ${ph.type}</div>`
        );

        heatLayerRef.current.push(marker);
      }
    });
  }, []);

  useEffect(() => {
    if (mapLoadedRef.current && leafletMapRef.current) {
      renderHeatAndMarkers(heatmapData, pharmaciesList);
    }
  }, [heatmapData, pharmaciesList, renderHeatAndMarkers]);

  // 6. Supabase Realtime Subscriptions
  useEffect(() => {
    // Subscribe to stock updates
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

    // Subscribe to searches updates for live feed & map
    const searchChannel = supabase
      .channel('dashboard-searches')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'searches' },
        (payload: any) => {
          if (payload.new && payload.new.result_count === 0) {
            setLiveFeed((prev) => [payload.new as SearchFeedItem, ...prev.slice(0, 14)]);
            setTotalFailures((prev) => prev + 1);

            // Add real-time failure circle to Leaflet map
            if (leafletMapRef.current && window.L && payload.new.lat && payload.new.lng) {
              const L = window.L;
              const newCircle = L.circle([payload.new.lat, payload.new.lng], {
                radius: 1000,
                color: '#f87171',
                weight: 2,
                fillColor: '#ef4444',
                fillOpacity: 0.6
              }).addTo(leafletMapRef.current);

              newCircle.bindPopup(
                `<div style="color:#111; font-size:12px;"><b>⚡ LIVE SHORTAGE</b><br/>${payload.new.medicine_name}</div>`
              );
              heatLayerRef.current.push(newCircle);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(searchChannel);
    };
  }, [fetchRadarData]);

  // 7. Handle Pharmacist Simulation Action
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

  // 8. Handle Send SMS Alert to Distributor
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

  // 9. Handle Pharmacy Approval
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

  // Helper to format minute count from timestamp
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
            <p className="text-xs text-gray-400">Bhopal District · Coordination & Surveillance</p>
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
                <span>District Shortage Heatmap (Bhopal)</span>
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
                      className="flex items-center justify-between px-3 py-2 bg-gray-950/70 border border-gray-800/80 rounded-lg text-xs transition duration-300 hover:border-gray-700"
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

      {/* Simulator Modal / Panel */}
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
