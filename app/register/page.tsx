'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function PharmacistRegisterPage() {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGetLocation = () => {
    setLocating(true);
    setError(null);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocating(false);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setError('GPS location nahi mila. Kripya GPS on karein.');
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError('Aapke browser mein GPS support nahi hai.');
      setLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !area.trim() || !phone.trim()) {
      setError('Kripya sabhi zaroori fields bharein.');
      return;
    }

    if (lat === null || lng === null) {
      setError('Kripya GPS location button daba kar location capture karein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          area: area.trim(),
          phone: phone.trim(),
          lat,
          lng
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Registration submit nahi ho payi. Dobara koshish karein.');
      }
    } catch (err: any) {
      console.error('Register submit error:', err);
      setError('Network error. Kripya thodi der baad koshish karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-12">
      <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🔴</span>
          <span className="text-xl font-bold tracking-tight text-gray-900">MedRadar</span>
          <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
            Pharmacist Portal
          </span>
        </div>
        <Link href="/" className="text-xs font-bold text-red-600 hover:underline">
          Finder
        </Link>
      </header>

      <main className="w-full max-w-md mx-auto px-4 pt-6 flex flex-col space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-gray-900">Medical Store Register Karein</h1>
          <p className="text-xs text-gray-500">
            MedRadar network se judein aur apne ilaqe ke marizon tak dawa pahunchayein.
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
            <div className="text-3xl">✓</div>
            <h2 className="text-base font-bold text-green-900">Registration submit ho gayi.</h2>
            <p className="text-sm text-green-700">
              24 ghante mein verify karke activate karenge.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Medical Store / Pharmacy Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sharma Medical Store"
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Area / Colony / Landmark *
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Karond Chowk, Bhopal"
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                WhatsApp Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number"
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Is number se aap WhatsApp bot se stock update karenge.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Exact Shop Location (GPS) *
              </label>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="w-full min-h-[44px] bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-2"
              >
                <span>📍</span>
                <span>{locating ? 'GPS location le rahe hain...' : lat ? `Location Saved (${lat.toFixed(4)}, ${lng?.toFixed(4)})` : 'Click to Capture Current GPS Location'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2.5 rounded-lg shadow disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Register Store'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
