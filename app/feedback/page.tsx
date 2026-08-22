'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function FeedbackContent() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const med = searchParams.get('med') || searchParams.get('medicine') || '';
  const result = (searchParams.get('result') || '').toUpperCase();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function submitFeedback() {
      if (!phone || !med) {
        setStatus('Invalid link parameters.');
        setLoading(false);
        return;
      }

      const found = result === 'YES' || result === 'TRUE' || result === 'FOUND';

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            medicine_name: med,
            found
          })
        });

        if (res.ok) {
          setStatus('✓ Shukriya! Aapka feedback note ho gaya. MedRadar better banta rahega.');
        } else {
          setStatus('✓ Shukriya! Feedback record ho gaya.');
        }
      } catch (e) {
        console.error('Feedback error:', e);
        setStatus('✓ Shukriya! Feedback note ho gaya.');
      } finally {
        setLoading(false);
      }
    }

    submitFeedback();
  }, [phone, med, result]);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center shadow-sm space-y-4">
        <div className="text-3xl">🔴</div>
        <h1 className="text-xl font-bold text-gray-900">MedRadar Feedback</h1>

        {loading ? (
          <p className="text-sm text-gray-500">Processing your feedback...</p>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-semibold leading-relaxed">
            {status}
          </div>
        )}

        <div className="pt-4">
          <Link
            href="/"
            className="inline-block w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg"
          >
            Go to Medicine Finder
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <FeedbackContent />
    </Suspense>
  );
}
