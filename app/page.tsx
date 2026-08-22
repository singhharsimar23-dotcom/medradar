'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Browser-level Supabase client for realtime subscription
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

export default function PatientPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PharmacyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchedMedicine, setSearchedMedicine] = useState('');
  const [nearestPHC, setNearestPHC] = useState<NearestPHC | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Request User Location
  const requestLocation = useCallback(() => {
    setError(null);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocationGranted(true);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setError('Location nahi mila. GPS on karke try karo.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('Aapke phone mein geolocation support nahi hai.');
    }
  }, []);

  // Try auto-requesting location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // 2. Dynamically Load Leaflet via CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.L) {
      setMapLoaded(true);
      return;
    }

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-cdn-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-cdn-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
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

  // 3. Search Execution Function
  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      if (!locationGranted || userLat === null || userLng === null) {
        setError('Pehle location allow karo');
        return;
      }

      if (!searchQuery.trim()) {
        return;
      }

      setLoading(true);
      setError(null);
      setWaitlistSubmitted(false);

      try {
        const url = `/api/search?medicine=${encodeURIComponent(
          searchQuery.trim()
        )}&lat=${userLat}&lng=${userLng}&urgent=${isUrgent}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Search karne mein dikkat aayi');
        }

        const returnedResults: PharmacyResult[] = data.results || [];
        setResults(returnedResults);
        setSearchedMedicine(data.canonical || searchQuery.trim());
        setNearestPHC(data.nearestPHC || null);
        setShowWaitlist(returnedResults.length === 0);
      } catch (err: any) {
        console.error('Search error:', err);
        setError(err.message || 'Network error. Kripya dobara koshish karein.');
      } finally {
        setLoading(false);
      }
    },
    [locationGranted, userLat, userLng, searchQuery, isUrgent]
  );

  // 4. Initialize & Update Leaflet Map
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapRef.current || userLat === null || userLng === null) {
      return;
    }

    const L = window.L;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current).setView([userLat, userLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(map);
      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Add Blue User Marker
    const userMarker = L.circleMarker([userLat, userLng], {
      radius: 8,
      fillColor: '#2563eb',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    })
      .addTo(map)
      .bindPopup('<b>Aapki Location</b>');
    markersRef.current.push(userMarker);

    const bounds = L.latLngBounds([[userLat, userLng]]);

    // Add Green Markers for Result Pharmacies
    results.forEach((ph) => {
      if (ph.lat !== null && ph.lng !== null) {
        const marker = L.circleMarker([ph.lat, ph.lng], {
          radius: 9,
          fillColor: '#16a34a',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        })
          .addTo(map)
          .bindPopup(
            `<b>${ph.name}</b><br/>${ph.distance} km • ${ph.is_open ? 'Open' : 'Closed'}`
          );
        markersRef.current.push(marker);
        bounds.extend([ph.lat, ph.lng]);
      }
    });

    // Add Gray Marker for nearestPHC if present
    if (nearestPHC && nearestPHC.lat !== null && nearestPHC.lng !== null) {
      const phcMarker = L.circleMarker([nearestPHC.lat, nearestPHC.lng], {
        radius: 8,
        fillColor: '#64748b',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup(`<b>${nearestPHC.name} (Sarkaari)</b><br/>${nearestPHC.distance} km`);
      markersRef.current.push(phcMarker);
      bounds.extend([nearestPHC.lat, nearestPHC.lng]);
    }

    if (results.length > 0 || nearestPHC) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([userLat, userLng], 13);
    }

    return () => {
      // Map cleanup on unmount
    };
  }, [mapLoaded, results, nearestPHC, userLat, userLng]);

  // 5. Supabase Realtime Subscription for Stock Updates
  useEffect(() => {
    if (!searchedMedicine) return;

    const firstWord = searchedMedicine.trim().split(/\s+/)[0];
    const channel = supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stock' },
        (payload: any) => {
          if (
            payload.new &&
            payload.new.available === true &&
            payload.new.medicine_name?.toLowerCase().includes(firstWord.toLowerCase())
          ) {
            handleSearch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchedMedicine, handleSearch]);

  // 6. Submit Waitlist Handler
  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistPhone.trim() || userLat === null || userLng === null || !searchedMedicine) {
      return;
    }

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
        setError(data.error || 'Waitlist join karne mein dikkat aayi.');
      }
    } catch (err) {
      console.error('Waitlist submit error:', err);
      setError('SMS service se connect nahi ho paya.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Helper to format updated_at time in minutes
  const formatMinutesAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Recently';
    const diffMin = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60));
    if (diffMin <= 1) return 'Abhi-abhi';
    if (diffMin < 60) return `Updated ${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `Updated ${diffHours}h ago`;
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans pb-12">
      {/* Minimal Header */}
      <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <span className="text-xl leading-none">🔴</span>
          <span className="text-xl font-bold tracking-tight text-gray-900">MedRadar</span>
          <span className="text-xs font-semibold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded">
            Bhopal
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto px-4 pt-4 flex-1 flex flex-col space-y-4">
        {/* Search Section */}
        <section className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <form onSubmit={handleSearch} className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Dawa ka naam likhein</label>
              <button
                type="button"
                onClick={() => setIsUrgent(!isUrgent)}
                className={`min-h-[44px] px-3 py-1 text-sm font-semibold rounded-lg border transition-colors flex items-center space-x-1 ${
                  isUrgent
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                <span>🚨</span>
                <span>Urgent</span>
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch(e);
              }}
              placeholder="Medicine name... (Metformin, Crocin, Insulin)"
              className="w-full min-h-[44px] px-3 py-2 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />

            <p className="text-xs text-gray-500">Brand ya generic naam — dono chalega</p>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold text-base py-2.5 px-4 rounded-lg shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Dhundh rahe hain...' : '🔍 Dhundho'}
            </button>
          </form>
        </section>

        {/* Location Section (when location not granted) */}
        {!locationGranted && (
          <section className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col space-y-2">
            <p className="text-sm font-medium text-amber-900">
              📍 Location zaruri hai medicine dhundhne ke liye
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="w-full min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm py-2 px-4 rounded-lg shadow-sm"
            >
              Location Allow Karo
            </button>
          </section>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Leaflet Map Section (shown after search when results exist) */}
        {results.length > 0 && (
          <section className="rounded-xl overflow-hidden border border-gray-300 shadow-sm">
            <div id="medradar-map" ref={mapRef} className="w-full h-[250px] bg-gray-100" />
          </section>
        )}

        {/* Results Section */}
        {loading && (
          <div className="text-center py-8 text-gray-500 font-medium text-base">
            ⏳ Dhundh rahe hain...
          </div>
        )}

        {!loading && results.length > 0 && (
          <section className="flex flex-col space-y-3">
            <h2 className="text-base font-bold text-gray-900">
              ✅ {searchedMedicine} mila — {results.length} pharmacy nearby
            </h2>

            <div className="flex flex-col space-y-3">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.area || item.address || 'Bhopal'}</p>
                    </div>
                    <span className="bg-green-100 text-green-700 border border-green-200 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                      {item.distance.toFixed(1)} km
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {item.type === 'PHC' && (
                      <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">
                        PHC
                      </span>
                    )}
                    {item.type === 'janaushadhi' && (
                      <span className="bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                        Janaushadhi
                      </span>
                    )}
                    {!item.is_open && (
                      <span className="text-red-600 font-bold">❌ CLOSED</span>
                    )}
                    {item.isStale && (
                      <span className="text-orange-500 font-semibold">⚠️ 6h+ purana data</span>
                    )}
                    <span className="text-gray-400">• {formatMinutesAgo(item.updated_at)}</span>
                  </div>

                  {item.phone && (
                    <div className="pt-2">
                      <a
                        href={`tel:${item.phone}`}
                        className="w-full min-h-[44px] flex items-center justify-center bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-lg"
                      >
                        📞 Call ({item.phone})
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Zero Result State */}
        {!loading && results.length === 0 && searchedMedicine && (
          <section className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col space-y-4">
            <div>
              <h2 className="text-base font-bold text-red-600">❌ {searchedMedicine} nahi mila</h2>
              <p className="text-sm text-gray-600 mt-1">
                0 pharmacies within 15km have stock
              </p>
            </div>

            {/* Sarkaari Option (Nearest PHC / Janaushadhi) */}
            {nearestPHC && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                <p className="font-semibold">
                  🏥 Sarkaari option: {nearestPHC.name} ({nearestPHC.distance}km)
                </p>
                <p className="text-xs text-blue-700 mt-0.5">Generic medicines available</p>
                {nearestPHC.phone && (
                  <a
                    href={`tel:${nearestPHC.phone}`}
                    className="inline-block mt-2 text-xs font-bold text-blue-800 underline"
                  >
                    📞 Call {nearestPHC.phone}
                  </a>
                )}
              </div>
            )}

            {/* SMS Waitlist Section */}
            <div className="pt-2 border-t border-gray-200 flex flex-col space-y-3">
              <p className="text-sm font-semibold text-gray-800">
                📱 SMS alert chahiye jab stock milega?
              </p>

              {waitlistSubmitted ? (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold rounded-lg">
                  ✓ Done! SMS aayega jab paas mein milega.
                </div>
              ) : (
                <form onSubmit={handleJoinWaitlist} className="flex flex-col space-y-2.5">
                  <input
                    type="tel"
                    value={waitlistPhone}
                    onChange={(e) => setWaitlistPhone(e.target.value)}
                    placeholder="Phone number (10-digit)"
                    className="w-full min-h-[44px] px-3 py-2 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    required
                  />

                  <button
                    type="submit"
                    disabled={waitlistLoading}
                    className="w-full min-h-[44px] bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-lg disabled:opacity-50"
                  >
                    {waitlistLoading ? 'Saving...' : 'Notify Karo'}
                  </button>
                </form>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
