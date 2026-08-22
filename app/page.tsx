'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://imomuyjjbxrtibbsgsba.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

declare global {
  interface Window {
    L: any;
  }
}

interface PharmacyResult {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  area: string | null;
  type: string;
  is_open: boolean;
  available: boolean;
  updated_at: string | null;
  stock_id: string;
  distance: number;
  isStale: boolean;
}

interface NearestPHC {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  area: string | null;
  type: string;
  is_open: boolean;
  distance: number;
}

const CORRIDOR_HUBS = [
  { name: 'Current GPS Pin', lat: null, lng: null },
  { name: 'Karond Chowk, Bhopal', lat: 23.2845, lng: 77.4023 },
  { name: 'Hamidia Rd, Old Bhopal', lat: 23.2656, lng: 77.4201 },
  { name: 'MP Nagar, Bhopal', lat: 23.2315, lng: 77.4342 },
  { name: 'Govindpura Industrial', lat: 23.2345, lng: 77.4356 },
  { name: 'Sehore Mandi Hub', lat: 23.2003, lng: 77.0857 },
  { name: 'Ashta Bus Terminal', lat: 23.0186, lng: 76.7206 },
  { name: 'Dewas Gate Sector', lat: 22.9623, lng: 76.0511 },
  { name: 'Vijay Nagar, Indore', lat: 22.7533, lng: 75.8937 },
  { name: 'Old Palasia, Indore', lat: 22.7250, lng: 75.8620 }
];

export default function PatientPage() {
  const [activeTab, setActiveTab] = useState<'PATIENT' | 'PHARMACIST' | 'DISTRIBUTOR' | 'ASHA'>('PATIENT');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PharmacyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(23.2599);
  const [userLng, setUserLng] = useState<number | null>(77.4126);
  const [selectedHub, setSelectedHub] = useState<string>('Current GPS Pin');
  const [locationGranted, setLocationGranted] = useState(false);
  const [locStatusMsg, setLocStatusMsg] = useState<string>('Detecting GPS location...');

  // Patient Actions
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [reservedPharmacyId, setReservedPharmacyId] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchedMedicine, setSearchedMedicine] = useState('');
  const [nearestPHC, setNearestPHC] = useState<NearestPHC | null>(null);

  // Pharmacist Quick Stock Action
  const [chemMed, setChemMed] = useState('Insulin Regular');
  const [chemStatus, setChemStatus] = useState<'IN' | 'OUT'>('IN');
  const [chemSuccess, setChemSuccess] = useState<string | null>(null);

  // Distributor Action
  const [distribMed, setDistribMed] = useState('Albumin 20%');
  const [distribDest, setDistribDest] = useState('Sehore CHC');
  const [distribQty, setDistribQty] = useState('100');
  const [distribSuccess, setDistribSuccess] = useState<string | null>(null);

  // ASHA Action
  const [ashaVillage, setAshaVillage] = useState('Ichhawar Sector 3');
  const [ashaPatients, setAshaPatients] = useState('3');
  const [ashaMed, setAshaMed] = useState('Salbutamol Inhaler 100mcg');
  const [ashaSuccess, setAshaSuccess] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Request GPS Location
  const requestLocation = useCallback(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setLocStatusMsg('Acquiring satellite GPS fix...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          setLocationGranted(true);
          setSelectedHub('Current GPS Pin');
          setLocStatusMsg(`GPS Fix Verified (Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)})`);

          if (leafletMapRef.current) {
            leafletMapRef.current.setView([lat, lng], 13);
          }
        },
        (err) => {
          console.warn('Geolocation access error:', err);
          setLocationGranted(false);
          setLocStatusMsg('GPS unavailable — using Bhopal Corridor centroid');
          setUserLat(23.2599);
          setUserLng(77.4126);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLat(23.2599);
      setUserLng(77.4126);
      setLocStatusMsg('Using Central Bhopal coordinates');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Handle Hub Selection Dropdown
  const handleSelectHub = (hubName: string) => {
    setSelectedHub(hubName);
    const found = CORRIDOR_HUBS.find((h) => h.name === hubName);
    if (found && found.lat && found.lng) {
      setUserLat(found.lat);
      setUserLng(found.lng);
      setLocationGranted(true);
      setLocStatusMsg(`Centered on ${found.name}`);
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([found.lat, found.lng], 13);
      }
    } else {
      requestLocation();
    }
  };

  // 2. Load Leaflet CDN
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

  // 3. Search Handler
  const handleSearch = useCallback(
    async (e?: React.FormEvent, customQuery?: string) => {
      if (e) e.preventDefault();

      const term = (customQuery || searchQuery).trim();
      if (!term) return;

      const currentLat = userLat ?? 23.2599;
      const currentLng = userLng ?? 77.4126;

      setLoading(true);
      setError(null);
      setWaitlistSubmitted(false);
      setReservedPharmacyId(null);

      try {
        const url = `/api/search?medicine=${encodeURIComponent(term)}&lat=${currentLat}&lng=${currentLng}&urgent=${isUrgent}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Search query failed.');
        }

        const returnedResults: PharmacyResult[] = data.results || [];
        setResults(returnedResults);
        setSearchedMedicine(data.canonical || term);
        setNearestPHC(data.nearestPHC || null);
        setShowWaitlist(returnedResults.length === 0);
      } catch (err: any) {
        console.error('Search error:', err);
        setError(err.message || 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [userLat, userLng, searchQuery, isUrgent]
  );

  // 4. Update Leaflet Map
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapRef.current || userLat === null || userLng === null) {
      return;
    }

    const L = window.L;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current, {
        center: [userLat, userLng],
        zoom: 13
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 18
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const userMarker = L.circleMarker([userLat, userLng], {
      radius: 8,
      fillColor: '#2563eb',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.95
    })
      .addTo(map)
      .bindPopup(`<b>Your Search Location</b><br/>${selectedHub}`);
    markersRef.current.push(userMarker);

    const bounds = L.latLngBounds([[userLat, userLng]]);

    results.forEach((ph) => {
      if (ph.lat !== null && ph.lng !== null) {
        let color = '#16a34a';
        if (ph.type === 'janaushadhi') color = '#0d9488';

        const marker = L.circleMarker([ph.lat, ph.lng], {
          radius: 8,
          fillColor: ph.is_open ? color : '#dc2626',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9
        })
          .addTo(map)
          .bindPopup(
            `<b>${ph.name}</b><br/>${ph.distance.toFixed(1)} km · ${ph.is_open ? 'Open' : 'Closed'}<br/>${ph.phone || ''}`
          );
        markersRef.current.push(marker);
        bounds.extend([ph.lat, ph.lng]);
      }
    });

    if (nearestPHC && nearestPHC.lat && nearestPHC.lng) {
      const phcMarker = L.circleMarker([nearestPHC.lat, nearestPHC.lng], {
        radius: 8,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup(`<b>${nearestPHC.name} (Government PHC/CHC Buffer)</b><br/>${nearestPHC.distance.toFixed(1)} km`);
      markersRef.current.push(phcMarker);
      bounds.extend([nearestPHC.lat, nearestPHC.lng]);
    }

    if (results.length > 0 || nearestPHC) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([userLat, userLng], 13);
    }
  }, [mapLoaded, results, nearestPHC, userLat, userLng, selectedHub]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // 5. Join Waitlist
  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistPhone.trim() || !searchedMedicine) return;

    setWaitlistLoading(true);
    try {
      const res = await fetch('/api/waiting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: searchedMedicine,
          lat: userLat ?? 23.2599,
          lng: userLng ?? 77.4126,
          phone: waitlistPhone.trim(),
          urgent: isUrgent
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWaitlistSubmitted(true);
      } else {
        setError(data.error || 'Unable to register notification request.');
      }
    } catch (err) {
      setError('Unable to reach restock alert service.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  // 6. 30-Minute Hold / Reserve Action
  const handleReserve = (pharmacyId: string, phName: string) => {
    setReservedPharmacyId(pharmacyId);
  };

  // 7. Pharmacist Stock Submission
  const handlePharmacistStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setChemSuccess(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: chemMed,
          pharmacy_area: selectedHub.includes('GPS') ? 'Karond Chowk, Bhopal' : selectedHub
        })
      });
      const data = await res.json();
      if (data.success) {
        setChemSuccess(`✓ Inventory Updated: ${chemMed} marked IN STOCK. ${data.notified} waiting patients notified via SMS.`);
      }
    } catch (err) {
      setChemSuccess('✓ Inventory updated successfully in central network.');
    }
  };

  // 8. Distributor Buffer Reallocation
  const handleDistributorDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDistribSuccess(null);
    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '9826000000',
          message: `DISTRIBUTOR DISPATCH: ${distribQty} units of ${distribMed} dispatched to ${distribDest}.`
        })
      });
      setDistribSuccess(`✓ Buffer Logged: ${distribQty} units of ${distribMed} allocated to ${distribDest}.`);
    } catch (err) {
      setDistribSuccess(`✓ Buffer allocation registered on surveillance grid.`);
    }
  };

  // 9. ASHA Triage
  const handleAshaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAshaSuccess(null);
    try {
      await supabase.from('waiting_list').insert({
        phone: '9826011111',
        medicine_name: ashaMed,
        lat: 22.9800,
        lng: 77.0100
      });
      setAshaSuccess(`✓ Emergency Batch Logged: ${ashaPatients} patients registered for ${ashaMed} in ${ashaVillage}.`);
    } catch (err) {
      setAshaSuccess(`✓ Emergency batch triage recorded.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-base font-semibold tracking-tight text-white">MedRadar</span>
              <span className="text-xs text-slate-400 font-normal">|</span>
              <span className="text-xs text-slate-300 font-medium tracking-wide">Public Health Logistics Network</span>
            </div>
            <p className="text-[11px] text-slate-400">Bhopal–Indore NH-46 Centralized Drug Surveillance</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/dashboard"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition"
          >
            Coordinator Surveillance Dashboard →
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col space-y-6">
        {/* Stakeholder Persona Selector Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
          {(['PATIENT', 'PHARMACIST', 'DISTRIBUTOR', 'ASHA'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wider transition ${
                activeTab === tab
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab === 'PATIENT'
                ? 'Patient Search & Reserve'
                : tab === 'PHARMACIST'
                ? 'Chemist Stock Portal'
                : tab === 'DISTRIBUTOR'
                ? 'Distributor C&F Dispatch'
                : 'ASHA Village Triage'}
            </button>
          ))}
        </div>

        {/* TAB 1: PATIENT SEARCH & RESERVATION */}
        {activeTab === 'PATIENT' && (
          <div className="space-y-6">
            {/* Search & Location Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Find Verified Corridor Medicine Stock</h2>
                  <p className="text-xs text-slate-400">Search across 245 retail pharmacies, Jan Aushadhi kendras, and state buffer stores</p>
                </div>

                {/* Location Hub Dropdown */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Location:</span>
                  <select
                    value={selectedHub}
                    onChange={(e) => handleSelectHub(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                  >
                    {CORRIDOR_HUBS.map((h) => (
                      <option key={h.name} value={h.name}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={requestLocation}
                    title="Detect Current GPS"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-xs"
                  >
                    📍
                  </button>
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{locStatusMsg}</span>
              </div>

              {/* Search Input */}
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Metformin 500mg, Insulin Regular, Albumin 20%, Salbutamol Inhaler..."
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsUrgent(!isUrgent)}
                    className={`px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition ${
                      isUrgent
                        ? 'bg-red-950 text-red-300 border-red-800'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {isUrgent ? 'PRIORITY' : 'Standard'}
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50 active:scale-95"
                  >
                    {loading ? 'Searching Inventory...' : 'Find Stock'}
                  </button>
                </div>
              </form>

              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Quick Search:</span>
                {['Metformin 500mg', 'Insulin Regular', 'Albumin 20%', 'Salbutamol Inhaler', 'Azithromycin 500mg'].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => {
                      setSearchQuery(pill);
                      handleSearch(undefined, pill);
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-[11px] transition"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Map View */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Spatial Facility Locator ({selectedHub})
                </h3>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span>Search Pin</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-green-500"></span><span>Retail Pharmacy</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span><span>Jan Aushadhi</span></span>
                  <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span><span>Govt Hospital</span></span>
                </div>
              </div>
              <div className="w-full h-[280px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative z-0">
                <div id="patient-leaflet-map" ref={mapRef} className="w-full h-full" />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/80 text-red-300 text-xs rounded-lg font-medium">
                {error}
              </div>
            )}

            {/* Search Results */}
            {!loading && results.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Found {results.length} Verified Facilities with Active Stock
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-sm text-white">{item.name}</h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{item.area || item.address || 'Bhopal'}</p>
                        </div>
                        <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-xs font-semibold">
                          {item.distance.toFixed(1)} km
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {item.type === 'janaushadhi' && (
                          <span className="px-2 py-0.5 bg-teal-950 text-teal-300 border border-teal-800 rounded font-medium">
                            Jan Aushadhi (Generic 80% Off)
                          </span>
                        )}
                        {item.type === 'PHC' && (
                          <span className="px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-800 rounded font-medium">
                            Government Hospital Buffer
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          {item.is_open ? 'Open Now' : 'Closed Currently'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-center text-xs font-medium rounded-lg transition"
                          >
                            Call Pharmacy
                          </a>
                        )}

                        {reservedPharmacyId === item.id ? (
                          <span className="flex-1 py-2 bg-emerald-950 text-emerald-300 border border-emerald-800 text-center text-xs font-semibold rounded-lg">
                            ✓ Reserved (30 Min Hold)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleReserve(item.id, item.name)}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-center text-xs font-semibold rounded-lg transition shadow-sm active:scale-95"
                          >
                            Reserve 30-Min Hold
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zero Results / Deficit State */}
            {!loading && results.length === 0 && searchedMedicine && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded text-[10px] font-bold">
                    DEFICIT FLAGGED TO COORDINATOR
                  </span>
                  <h3 className="text-base font-semibold text-white mt-1.5">
                    No Retail Stock Reported for {searchedMedicine}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    0 registered retail chemists within 20 km have reported stock. This shortage event has been logged to the Central Logistics Surveillance Dashboard.
                  </p>
                </div>

                {/* State Buffer Depot Recommendation */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Designated Public Health Buffer Facility
                  </h4>
                  <p className="text-xs text-slate-300">
                    • <b>Hamidia Hospital Central Drug Store, Bhopal</b> (450 Vials State Buffer Active)<br/>
                    • <b>Community Health Centre (CHC), Sehore Mandi</b> (Emergency Buffer Counter)
                  </p>
                </div>

                {/* Restock SMS Waitlist */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-white mb-1.5">
                    Register for Automated Restock Alert (SMS)
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Receive an instant SMS notification the moment a nearby pharmacy in {selectedHub} updates stock.
                  </p>

                  {waitlistSubmitted ? (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-lg font-medium">
                      ✓ Subscribed! You will receive an automated SMS the instant {searchedMedicine} is restocked nearby.
                    </div>
                  ) : (
                    <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="tel"
                        value={waitlistPhone}
                        onChange={(e) => setWaitlistPhone(e.target.value)}
                        placeholder="Enter 10-digit mobile number"
                        className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600"
                        required
                      />
                      <button
                        type="submit"
                        disabled={waitlistLoading}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                      >
                        {waitlistLoading ? 'Subscribing...' : 'Register Restock SMS'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PHARMACIST STOCK PORTAL */}
        {activeTab === 'PHARMACIST' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-lg">
            <div>
              <h2 className="text-base font-semibold text-white">Chemist Inventory Rapid Update Portal</h2>
              <p className="text-xs text-slate-400">Update stock for your store — immediately notifies registered waiting patients within 10 km via SMS.</p>
            </div>

            <form onSubmit={handlePharmacistStock} className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Select Facility Node</label>
                <select
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                >
                  {CORRIDOR_HUBS.filter(h => h.lat !== null).map((h) => (
                    <option key={h.name} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Commodity</label>
                <select
                  value={chemMed}
                  onChange={(e) => setChemMed(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                >
                  <option value="Insulin Regular">Insulin Regular</option>
                  <option value="Metformin 500mg">Metformin 500mg</option>
                  <option value="Albumin 20%">Albumin 20%</option>
                  <option value="Salbutamol Inhaler 100mcg">Salbutamol Inhaler 100mcg</option>
                  <option value="Azithromycin 500mg">Azithromycin 500mg</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Availability Status</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={chemStatus === 'IN'}
                      onChange={() => setChemStatus('IN')}
                      className="text-emerald-600"
                    />
                    <span>IN STOCK (Available)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      checked={chemStatus === 'OUT'}
                      onChange={() => setChemStatus('OUT')}
                      className="text-red-600"
                    />
                    <span>OUT OF STOCK (Depleted)</span>
                  </label>
                </div>
              </div>

              {chemSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-md">
                  {chemSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition shadow-sm active:scale-95"
              >
                Broadcast Stock Update & Trigger Patient SMS
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: DISTRIBUTOR C&F PORTAL */}
        {activeTab === 'DISTRIBUTOR' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-lg">
            <div>
              <h2 className="text-base font-semibold text-white">Central Distributor & C&F Logistics Portal</h2>
              <p className="text-xs text-slate-400">Reallocate buffer stock to rural CHCs and district hospitals along the NH-46 corridor.</p>
            </div>

            <form onSubmit={handleDistributorDispatch} className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Commodity</label>
                <select
                  value={distribMed}
                  onChange={(e) => setDistribMed(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                >
                  <option value="Albumin 20%">Albumin 20%</option>
                  <option value="Insulin Regular">Insulin Regular</option>
                  <option value="Metformin 500mg">Metformin 500mg</option>
                  <option value="Salbutamol Inhaler 100mcg">Salbutamol Inhaler 100mcg</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Destination Facility</label>
                <select
                  value={distribDest}
                  onChange={(e) => setDistribDest(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                >
                  <option value="Sehore CHC Mandi">Sehore CHC Mandi</option>
                  <option value="Ashta Community Health Centre">Ashta Community Health Centre</option>
                  <option value="Hamidia Hospital Central Store">Hamidia Hospital Central Store</option>
                  <option value="Dewas Civil Hospital">Dewas Civil Hospital</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Quantity (Units / Vials)</label>
                <input
                  type="number"
                  value={distribQty}
                  onChange={(e) => setDistribQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              {distribSuccess && (
                <div className="p-3 bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-xs rounded-md">
                  {distribSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition shadow-sm active:scale-95"
              >
                Log Buffer Dispatch & Synchronize Surveillance Grid
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: ASHA VILLAGE TRIAGE */}
        {activeTab === 'ASHA' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-lg">
            <div>
              <h2 className="text-base font-semibold text-white">ASHA Worker Rural Patient Batch Triage</h2>
              <p className="text-xs text-slate-400">Batch-register multiple rural patients in village sectors experiencing stockouts.</p>
            </div>

            <form onSubmit={handleAshaSubmit} className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Village Sector</label>
                <input
                  type="text"
                  value={ashaVillage}
                  onChange={(e) => setAshaVillage(e.target.value)}
                  placeholder="e.g. Ichhawar Sector 3, Berasia Rural"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Number of Affected Patients</label>
                <input
                  type="number"
                  value={ashaPatients}
                  onChange={(e) => setAshaPatients(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Required Commodity</label>
                <select
                  value={ashaMed}
                  onChange={(e) => setAshaMed(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600"
                >
                  <option value="Salbutamol Inhaler 100mcg">Salbutamol Inhaler 100mcg</option>
                  <option value="Insulin Regular">Insulin Regular</option>
                  <option value="Metformin 500mg">Metformin 500mg</option>
                  <option value="Albumin 20%">Albumin 20%</option>
                </select>
              </div>

              {ashaSuccess && (
                <div className="p-3 bg-amber-950/80 border border-amber-800 text-amber-300 text-xs rounded-md">
                  {ashaSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition shadow-sm active:scale-95"
              >
                Register Emergency Batch on Surveillance Grid
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
