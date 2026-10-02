'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

function GuestJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = (searchParams.get('code') || '').toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check demo mode environment configuration
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length >= 4) {
      // Check stored host events first
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('safar_host_events');
        if (stored) {
          try {
            const events = JSON.parse(stored);
            const found = events.find((ev: any) => ev.joinCode === trimmed);
            if (found) {
              setPreview({
                name: found.name,
                city: found.city,
                dates: `${new Date(found.startDate).toLocaleDateString()} – ${new Date(found.endDate).toLocaleDateString()}`,
                venues: found.description || 'Event Venues & Shuttles',
              });
              setError(null);
              return;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (isDemoMode && trimmed === 'ADW26X') {
        setPreview({
          name: 'Aarav & Diya Wedding',
          city: 'Ahmedabad',
          dates: '14–17 Nov 2026',
          venues: 'The Grand Hotel, The Celebration Venue',
        });
        setError(null);
      } else {
        // Generic active event identified
        setPreview({
          name: `Event ${trimmed}`,
          city: 'Host Destination',
          dates: 'Active Transportation Schedule',
          venues: 'Official Transit Routes & Venues',
        });
        setError(null);
      }
    } else {
      setPreview(null);
    }
  }, [code, isDemoMode]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a valid 6-character event code.');
      return;
    }

    const eventRecord = preview || {
      name: `Event ${trimmed}`,
      code: trimmed,
      city: 'Host Destination',
      dates: 'Active Transportation Schedule',
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('safar_guest_event', JSON.stringify({ ...eventRecord, code: trimmed }));
    }

    router.push('/guest');
  };

  return (
    <div className="py-8 max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-safar-50 text-safar-700 mx-auto flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-charcoal-900 tracking-tight">
          Join Event Transportation
        </h1>
        <p className="text-xs text-charcoal-500">
          Enter the 6-character code from your wedding or event invitation.
        </p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-charcoal-200/90 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
              Event Join Code
            </label>
            <input
              type="text"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ADW26X"
              className="w-full text-center tracking-widest text-2xl font-mono font-bold py-3 rounded-2xl border border-charcoal-300 focus:outline-none focus:ring-2 focus:ring-safar-500 uppercase"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Preview Card */}
          {preview && (
            <div className="p-4 rounded-2xl bg-warm-50 border border-charcoal-200 text-left space-y-1.5 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-safar-700">
                Event Identified
              </span>
              <h3 className="font-bold text-sm text-charcoal-900">{preview.name}</h3>
              <p className="text-xs text-charcoal-500">
                {preview.city} &bull; {preview.dates}
              </p>
              <p className="text-[11px] text-charcoal-400">
                Venues: {preview.venues}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-safar-600 hover:bg-safar-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            Enter Event Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function GuestJoinPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-xs text-charcoal-400">Loading event join details...</div>}>
      <GuestJoinContent />
    </Suspense>
  );
}
