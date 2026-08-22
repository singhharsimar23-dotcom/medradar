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
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          setLocationGranted(true);

          if (leafletMapRef.current) {
            leafletMapRef.current.setView([lat, lng], 13);
          }
        },
        (err) => {
          console.warn('Geolocation access error:', err);
          setError('Location access required to calculate accurate distance.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

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
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      if (!locationGranted || userLat === null || userLng === null) {
        setError('Please enable location access to find nearby pharmacies.');
        return;
      }

      if (!searchQuery.trim()) return;

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
          throw new Error(data.error || 'Search query failed.');
        }

        const returnedResults: PharmacyResult[] = data.results || [];
        setResults(returnedResults);
        setSearchedMedicine(data.canonical || searchQuery.trim());
        setNearestPHC(data.nearestPHC || null);
        setShowWaitlist(returnedResults.length === 0);
      } catch (err: any) {
        console.error('Search error:', err);
        setError(err.message || 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [locationGranted, userLat, userLng, searchQuery, isUrgent]
  );

  // 4. Update Map
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapRef.current || userLat === null || userLng === null) {
      return;
    }

    const L = window.L;

    if (!leafletMapRef.current) {
      const map = L.map(mapRef.current).setView([userLat, userLng], 13);
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
      radius: 7,
      fillColor: '#2563eb',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.95
    })
      .addTo(map)
      .bindPopup('<b>Your Current Location</b>');
    markersRef.current.push(userMarker);

    const bounds = L.latLngBounds([[userLat, userLng]]);

    results.forEach((ph) => {
      if (ph.lat !== null && ph.lng !== null) {
        const marker = L.circleMarker([ph.lat, ph.lng], {
          radius: 8,
          fillColor: ph.is_open ? '#16a34a' : '#dc2626',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9
        })
          .addTo(map)
          .bindPopup(
            `<b>${ph.name}</b><br/>${ph.distance.toFixed(1)} km · ${ph.is_open ? 'Open' : 'Closed'}`
          );
        markersRef.current.push(marker);
        bounds.extend([ph.lat, ph.lng]);
      }
    });

    if (nearestPHC && nearestPHC.lat && nearestPHC.lng) {
      const phcMarker = L.circleMarker([nearestPHC.lat, nearestPHC.lng], {
        radius: 7.5,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup(`<b>${nearestPHC.name} (Government PHC/CHC)</b><br/>${nearestPHC.distance.toFixed(1)} km`);
      markersRef.current.push(phcMarker);
      bounds.extend([nearestPHC.lat, nearestPHC.lng]);
    }

    if (results.length > 0 || nearestPHC) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([userLat, userLng], 13);
    }
  }, [mapLoaded, results, nearestPHC, userLat, userLng]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // 5. Realtime stock subscription
  useEffect(() => {
    if (!searchedMedicine) return;

    const firstWord = searchedMedicine.trim().split(/\s+/)[0];
    const channel = supabase
      .channel('stock-sync')
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

  // 6. Join Waitlist
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
        setError(data.error || 'Unable to register notification request.');
      }
    } catch (err) {
      console.error('Waitlist registration error:', err);
      setError('Unable to reach restock alert service.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const formatMinutesAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Recently verified';
    const diffMin = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60));
    if (diffMin <= 1) return 'Just now';
    if (diffMin < 60) return `Verified ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `Verified ${diffHours}h ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-12">
      {/* Header */}
      <header className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
          <span className="text-base font-semibold tracking-tight text-slate-900">MedRadar</span>
          <span className="text-xs text-slate-400 font-normal">|</span>
          <span className="text-xs text-slate-500 font-medium">Bhopal Region</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-lg mx-auto px-4 pt-5 flex-1 flex flex-col space-y-4">
        {/* Search Box */}
        <section className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Medicine or Formula Name
              </label>
              <button
                type="button"
                onClick={() => setIsUrgent(!isUrgent)}
                className={`text-xs px-2.5 py-1 font-medium rounded border transition ${
                  isUrgent
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                Mark as Critical
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Metformin 500mg, Insulin Regular, Paracetamol..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2.5 px-4 rounded-md shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Checking local pharmacy inventory...' : 'Find Verified Stock'}
            </button>
          </form>
        </section>

        {/* Location Notice */}
        {!locationGranted && (
          <section className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg flex flex-col space-y-2">
            <p className="text-xs font-medium text-amber-900">
              Location access is required to compute driving distance to nearest stockists.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs py-2 px-3 rounded-md transition"
            >
              Allow GPS Location
            </button>
          </section>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-medium">
            {error}
          </div>
        )}

        {/* Map View */}
        {results.length > 0 && (
          <section className="rounded-lg overflow-hidden border border-slate-300 shadow-sm">
            <div id="patient-leaflet-map" ref={mapRef} className="w-full h-[240px] bg-slate-100" />
          </section>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <section className="flex flex-col space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Verified Locations ({results.length} Available Nearby)
            </h2>

            <div className="flex flex-col space-y-2.5">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">{item.name}</h3>
                      <p className="text-xs text-slate-500">{item.area || item.address || 'Bhopal'}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.distance.toFixed(1)} km
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {item.type === 'PHC' && (
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 font-medium px-2 py-0.5 rounded">
                        Government PHC
                      </span>
                    )}
                    {item.type === 'janaushadhi' && (
                      <span className="bg-teal-50 text-teal-700 border border-teal-200 font-medium px-2 py-0.5 rounded">
                        Jan Aushadhi Kendra
                      </span>
                    )}
                    {!item.is_open && (
                      <span className="text-red-600 font-semibold">Closed currently</span>
                    )}
                    {item.isStale && (
                      <span className="text-amber-600 font-medium">Pending 6h re-verification</span>
                    )}
                    <span className="text-slate-400">· {formatMinutesAgo(item.updated_at)}</span>
                  </div>

                  {item.phone && (
                    <div className="pt-1.5">
                      <a
                        href={`tel:${item.phone}`}
                        className="w-full flex items-center justify-center bg-slate-900 hover:bg-black text-white font-medium text-xs py-2 rounded-md transition"
                      >
                        Contact Pharmacy ({item.phone})
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
          <section className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-red-600">No Retail Stock Reported</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                0 registered retail chemists within 15km have reported active inventory of {searchedMedicine}.
              </p>
            </div>

            {/* Public Health Alternative */}
            {nearestPHC && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 space-y-1">
                <p className="font-semibold">
                  Designated Public Facility: {nearestPHC.name} ({nearestPHC.distance.toFixed(1)} km)
                </p>
                <p className="text-blue-700">Generic equivalents stocked under Essential Drugs List.</p>
                {nearestPHC.phone && (
                  <a
                    href={`tel:${nearestPHC.phone}`}
                    className="inline-block mt-1 text-xs font-semibold text-blue-800 underline"
                  >
                    Contact {nearestPHC.phone}
                  </a>
                )}
              </div>
            )}

            {/* Restock Notification Form */}
            <div className="pt-2 border-t border-slate-200 flex flex-col space-y-2.5">
              <p className="text-xs font-semibold text-slate-800">
                Register for Automated Restock Notification (SMS)
              </p>

              {waitlistSubmitted ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-md">
                  Request registered. You will receive an instant SMS notification as soon as a verified pharmacy within 10km updates stock.
                </div>
              ) : (
                <form onSubmit={handleJoinWaitlist} className="flex flex-col space-y-2">
                  <input
                    type="tel"
                    value={waitlistPhone}
                    onChange={(e) => setWaitlistPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                    required
                  />

                  <button
                    type="submit"
                    disabled={waitlistLoading}
                    className="w-full bg-slate-900 hover:bg-black text-white font-medium text-xs py-2 rounded-md transition disabled:opacity-50"
                  >
                    {waitlistLoading ? 'Registering...' : 'Register Restock Alert'}
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
