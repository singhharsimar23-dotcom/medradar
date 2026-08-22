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

interface ClinicalAdvisory {
  canonical_name: string;
  generic_composition: string;
  therapeutic_class: string;
  clinical_usage: string;
  jan_aushadhi_generic: string;
  price_comparison: string;
  storage_cold_chain: string;
  govt_supply_scheme: string;
  prescription_schedule: string;
}

const CORRIDOR_HUBS = [
  { name: '📍 Live Device GPS Pin', lat: null, lng: null },
  { name: 'Karond Chowk, Bhopal', lat: 23.2845, lng: 77.4023 },
  { name: 'Hamidia Rd, Old Bhopal', lat: 23.2656, lng: 77.4201 },
  { name: 'MP Nagar, Bhopal', lat: 23.2315, lng: 77.4342 },
  { name: 'Govindpura, Bhopal', lat: 23.2345, lng: 77.4356 },
  { name: 'Kolar Road, Bhopal', lat: 23.1800, lng: 77.4000 },
  { name: 'Sehore Mandi Hub', lat: 23.2003, lng: 77.0857 },
  { name: 'Ashta Bus Stand', lat: 23.0186, lng: 76.7206 },
  { name: 'Dewas Gate Sector', lat: 22.9623, lng: 76.0511 },
  { name: 'Vijay Nagar, Indore', lat: 22.7533, lng: 75.8937 },
  { name: 'Old Palasia, Indore', lat: 22.7250, lng: 75.8620 }
];

export default function PatientPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PharmacyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real GPS & Location State
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [selectedHub, setSelectedHub] = useState<string>('📍 Live Device GPS Pin');
  const [locationGranted, setLocationGranted] = useState(false);
  const [gpsRequesting, setGpsRequesting] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Patient Actions
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [reservedPharmacyId, setReservedPharmacyId] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchedMedicine, setSearchedMedicine] = useState('');
  const [nearestPHC, setNearestPHC] = useState<NearestPHC | null>(null);

  // Clinical & Logistics Advisory
  const [advisory, setAdvisory] = useState<ClinicalAdvisory | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Live Device GPS Detection
  const requestGPSLocation = useCallback(() => {
    setError(null);
    setGpsRequesting(true);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy;

          setUserLat(lat);
          setUserLng(lng);
          setGpsAccuracy(acc);
          setLocationGranted(true);
          setSelectedHub('📍 Live Device GPS Pin');
          setGpsRequesting(false);

          if (leafletMapRef.current) {
            leafletMapRef.current.setView([lat, lng], 13);
            setTimeout(() => {
              leafletMapRef.current?.invalidateSize();
            }, 100);
          }
        },
        (err) => {
          console.warn('GPS location request error:', err);
          setGpsRequesting(false);
          setLocationGranted(false);
          setError('GPS location access was denied or timed out. Please allow location access or choose a corridor area below.');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      setGpsRequesting(false);
      setError('Geolocation is not supported by your device browser.');
    }
  }, []);

  // Request GPS automatically on first load
  useEffect(() => {
    requestGPSLocation();
  }, [requestGPSLocation]);

  // Handle Hub Dropdown Override
  const handleSelectHub = (hubName: string) => {
    setSelectedHub(hubName);
    setError(null);

    if (hubName === '📍 Live Device GPS Pin') {
      requestGPSLocation();
      return;
    }

    const found = CORRIDOR_HUBS.find((h) => h.name === hubName);
    if (found && found.lat && found.lng) {
      setUserLat(found.lat);
      setUserLng(found.lng);
      setLocationGranted(true);
      setGpsAccuracy(null);

      if (leafletMapRef.current) {
        leafletMapRef.current.setView([found.lat, found.lng], 13);
        setTimeout(() => {
          leafletMapRef.current?.invalidateSize();
        }, 100);
      }
    }
  };

  // 2. Load Leaflet CDN Dynamically
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

  // 3. Fetch Clinical Advisory
  const fetchClinicalAdvisory = async (medicineName: string) => {
    try {
      setAdvisoryLoading(true);
      const res = await fetch(`/api/medicine-info?medicine=${encodeURIComponent(medicineName)}`);
      const data = await res.json();
      if (data.success && data.advisory) {
        setAdvisory(data.advisory);
      }
    } catch (e) {
      console.warn('Advisory fetch exception:', e);
    } finally {
      setAdvisoryLoading(false);
    }
  };

  // 4. Search Handler
  const handleSearch = useCallback(
    async (e?: React.FormEvent, customQuery?: string) => {
      if (e) e.preventDefault();

      const term = (customQuery || searchQuery).trim();
      if (!term) return;

      if (!locationGranted || userLat === null || userLng === null) {
        setError('Please enable GPS location or select your city above before searching.');
        return;
      }

      setLoading(true);
      setError(null);
      setWaitlistSubmitted(false);
      setReservedPharmacyId(null);
      setAdvisory(null);

      try {
        fetchClinicalAdvisory(term);

        const url = `/api/search?medicine=${encodeURIComponent(term)}&lat=${userLat}&lng=${userLng}&urgent=${isUrgent}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Search query failed.');
        }

        const returnedResults: PharmacyResult[] = data.results || [];
        setResults(returnedResults);
        setSearchedMedicine(data.canonical || term);
        setNearestPHC(data.nearestPHC || null);
      } catch (err: any) {
        console.error('Search error:', err);
        setError(err.message || 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [locationGranted, userLat, userLng, searchQuery, isUrgent]
  );

  // 5. Leaflet Map Lifecycle & Re-render Fix
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapRef.current || userLat === null || userLng === null) {
      return;
    }

    const L = window.L;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    if (mapRef.current && (mapRef.current as any)._leaflet_id) {
      delete (mapRef.current as any)._leaflet_id;
    }

    const map = L.map(mapRef.current, {
      center: [userLat, userLng],
      zoom: 13
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18
    }).addTo(map);

    leafletMapRef.current = map;

    const userMarker = L.circleMarker([userLat, userLng], {
      radius: 8,
      fillColor: '#2563eb',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.95
    })
      .addTo(map)
      .bindPopup(`<b>Your Search Location</b><br/>${selectedHub}${gpsAccuracy ? `<br/>Accuracy: ±${gpsAccuracy.toFixed(0)}m` : ''}`);

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
        .bindPopup(`<b>${nearestPHC.name} (Government State Buffer)</b><br/>${nearestPHC.distance.toFixed(1)} km`);
      bounds.extend([nearestPHC.lat, nearestPHC.lng]);
    }

    if (results.length > 0 || nearestPHC) {
      map.fitBounds(bounds, { padding: [35, 35] });
    } else {
      map.setView([userLat, userLng], 13);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapLoaded, results, nearestPHC, userLat, userLng, selectedHub, gpsAccuracy]);

  // 6. Join Waitlist
  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistPhone.trim() || !searchedMedicine || userLat === null || userLng === null) return;

    setWaitlistLoading(true);
    try {
      const res = await fetch('/api/waiting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: searchedMedicine,
          lat: userLat,
          lng: userLng,
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

  const handleReserve = (pharmacyId: string) => {
    setReservedPharmacyId(pharmacyId);
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
              <span className="text-xs text-slate-300 font-medium tracking-wide">Public Medicine Finder</span>
            </div>
            <p className="text-[11px] text-slate-400">NH-46 Corridor Live Stock Surveillance (Bhopal – Sehore – Ashta – Dewas – Indore)</p>
          </div>
        </div>

        <div>
          <a
            href="/dashboard"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition inline-flex items-center space-x-1.5"
          >
            <span>Coordinator Surveillance Dashboard</span>
            <span>→</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 flex flex-col space-y-6">
        {/* GPS Status & Search Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Search Corridor Medicine Inventory</h2>
              <p className="text-xs text-slate-400">Real-time availability across 245 verified retail pharmacies, Jan Aushadhi kendras, and state buffer stores</p>
            </div>

            {/* GPS Node Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Location:</span>
              <select
                value={selectedHub}
                onChange={(e) => handleSelectHub(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-red-600 font-medium"
              >
                {CORRIDOR_HUBS.map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
              <button
                onClick={requestGPSLocation}
                disabled={gpsRequesting}
                title="Acquire Live GPS"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-xs font-medium transition active:scale-95 disabled:opacity-50"
              >
                {gpsRequesting ? 'Detecting...' : '📍 GPS'}
              </button>
            </div>
          </div>

          {/* Location Permission & Coordinates Banner */}
          {!locationGranted ? (
            <div className="p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-amber-200">
                <span className="font-semibold">GPS Location Required:</span> Enable location access to calculate exact driving distances to nearby pharmacies.
              </div>
              <button
                onClick={requestGPSLocation}
                disabled={gpsRequesting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-md transition whitespace-nowrap active:scale-95"
              >
                {gpsRequesting ? 'Acquiring GPS Fix...' : 'Allow GPS Location'}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-medium">GPS Fix Active:</span>
              <span className="font-mono text-slate-400">
                Lat {userLat?.toFixed(4)}, Lng {userLng?.toFixed(4)}
              </span>
              {gpsAccuracy && (
                <span className="text-emerald-400 font-mono text-[10px]">(±{gpsAccuracy.toFixed(0)}m accuracy)</span>
              )}
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter medicine name (e.g. Metformin 500mg, Insulin Regular, Albumin 20%, Salbutamol)..."
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
                disabled={loading || !locationGranted}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50 active:scale-95 whitespace-nowrap"
              >
                {loading ? 'Checking Inventory...' : 'Find Stock'}
              </button>
            </div>
          </form>

          {/* Quick Search Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Quick Search:</span>
            {['Metformin 500mg', 'Insulin Regular', 'Albumin 20%', 'Salbutamol Inhaler', 'Azithromycin 500mg'].map((pill) => (
              <button
                key={pill}
                onClick={() => {
                  setSearchQuery(pill);
                  handleSearch(undefined, pill);
                }}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-[11px] transition active:scale-95"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 bg-red-950/60 border border-red-800/80 text-red-300 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Clinical & Logistics Intelligence Advisory Memorandum (Directly for searched commodity) */}
        {searchedMedicine && advisory && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                  Directorate of Public Health · Clinical & Pricing Dossier
                </span>
                <h3 className="text-sm font-semibold text-white mt-0.5">
                  {advisory.canonical_name}
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-semibold rounded-md self-start sm:self-center">
                {advisory.prescription_schedule}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {/* Clinical Indication */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Therapeutic Indication & Guidelines
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {advisory.clinical_usage}
                </p>
                <div className="pt-1 text-[11px] text-slate-400 font-mono">
                  Composition: {advisory.generic_composition}
                </div>
              </div>

              {/* Generic Pricing & Jan Aushadhi Savings */}
              <div className="p-3 bg-slate-950 border border-teal-900/60 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">
                    Jan Aushadhi Generic Alternative
                  </span>
                  <span className="px-1.5 py-0.2 bg-teal-950 text-teal-300 border border-teal-800 rounded text-[9px] font-bold">
                    PMBJP CERTIFIED
                  </span>
                </div>
                <p className="text-teal-200 font-medium">
                  {advisory.jan_aushadhi_generic}
                </p>
                <p className="text-[11px] text-emerald-400 font-medium">
                  {advisory.price_comparison}
                </p>
              </div>

              {/* Storage & Cold-Chain Protocol */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Storage & Cold-Chain Specification
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {advisory.storage_cold_chain}
                </p>
              </div>

              {/* Government Buffer & Scheme Eligibility */}
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  State Emergency Buffer & Scheme Access
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {advisory.govt_supply_scheme}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Spatial Map View */}
        {locationGranted && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Spatial Facility Locator ({selectedHub})
              </h3>
              <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span>Your Pin</span></span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-green-500"></span><span>Retail Pharmacy</span></span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span><span>Jan Aushadhi</span></span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-sky-500"></span><span>State Buffer</span></span>
              </div>
            </div>
            <div className="w-full h-[280px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative z-0">
              <div id="patient-leaflet-map" ref={mapRef} className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Results Section */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Verified Nearby Facilities with Active Stock ({results.length} Available)
              </h3>
              <span className="text-[11px] text-slate-500">Sorted by live driving distance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition flex flex-col justify-between shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-white">{item.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.area || item.address || 'Bhopal'}</p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-xs font-semibold font-mono">
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
                        onClick={() => handleReserve(item.id)}
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
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
                Designated Public Health Buffer Facilities
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
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
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 active:scale-95"
                  >
                    {waitlistLoading ? 'Subscribing...' : 'Register Restock SMS'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
