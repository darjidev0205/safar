'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Compass,
  Car,
  Sparkles,
  ExternalLink,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  MarigoldFlower,
  JasmineBloom,
  StarFlourish,
  FloralDivider,
} from '../../../components/ui/botanical-ornaments';
import { useAuth } from '../../../context/auth-context';

export default function GuestEventsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eventsData, setEventsData] = useState<any>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      try {
        const stored =
          typeof window !== 'undefined' ? localStorage.getItem('safar_guest_event') : null;
        let query = '';
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.joinCode || parsed.code) {
              query = `?eventCode=${parsed.joinCode || parsed.code}`;
            }
          } catch (e) {
            // ignore
          }
        }

        const res = await fetch(`/api/guest/events${query}`, {
          headers: {
            ...(profile?.id ? { 'x-user-id': profile.id } : {}),
            ...(profile?.email ? { 'x-user-email': profile.email } : {}),
          },
        });
        const json = await res.json();
        if (json.success) {
          setEventsData(json);
        }
      } catch (err) {
        console.error('Failed to load guest events:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
        <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest mt-3">
          Loading Ceremony Schedule...
        </span>
      </div>
    );
  }

  const ceremonies = eventsData?.ceremonies || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#E5DACB] shadow-xs invitation-frame relative overflow-hidden">
        <div className="absolute top-2 right-2 opacity-20 pointer-events-none">
          <MarigoldFlower className="w-20 h-20 text-terracotta-500" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-terracotta-700">
            Ceremonial Timetable
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-normal">
            {eventsData?.eventName || 'The Wedding Celebration'}
          </h1>
          <p className="text-xs text-charcoal-600">
            {eventsData?.city} &bull; Official Transportation Itinerary
          </p>
        </div>
      </div>

      {/* Ceremonies List */}
      <div className="space-y-4">
        {ceremonies.map((ceremony: any, idx: number) => {
          const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${ceremony.venueName} ${ceremony.venueAddress}`
          )}`;

          return (
            <div
              key={ceremony.id}
              className="bg-white/85 rounded-3xl p-5 sm:p-6 border border-[#E5DACB] shadow-xs space-y-4 relative overflow-hidden transition-all hover:shadow-sm"
            >
              {/* Sequence Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DACB]/60">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-warm-100 text-terracotta-800 text-[10px] font-bold uppercase tracking-wider border border-[#E5DACB]">
                    Ceremony {ceremony.sequence}
                  </span>
                  <span className="text-[11px] font-bold text-gold-700 uppercase tracking-wider">
                    {ceremony.eventType}
                  </span>
                </div>

                <span className="text-xs font-semibold text-charcoal-500">
                  {new Date(ceremony.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>

              {/* Ceremony Title & Timing */}
              <div className="space-y-1.5">
                <h2 className="font-serif text-xl sm:text-2xl text-charcoal-900 font-semibold">
                  {ceremony.name}
                </h2>
                <div className="flex items-center gap-2 text-xs text-charcoal-600">
                  <Clock className="w-3.5 h-3.5 text-terracotta-600" />
                  <span>
                    {ceremony.startTime} – {ceremony.endTime}
                  </span>
                </div>
              </div>

              {/* Venue & Map Link */}
              <div className="p-3.5 rounded-2xl bg-warm-50 border border-[#E5DACB] space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-900">
                      <MapPin className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />
                      <span>{ceremony.venueName}</span>
                    </div>
                    <p className="text-[11px] text-charcoal-500 pl-5">{ceremony.venueAddress}</p>
                  </div>

                  <a
                    href={googleMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-warm-100 border border-[#E5DACB] text-[11px] font-semibold text-terracotta-700 shadow-2xs flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>Directions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {ceremony.dressCode && (
                  <div className="pt-2 border-t border-[#E5DACB]/60 text-[11px] text-charcoal-600 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-gold-600 shrink-0" />
                    <span>
                      <strong className="text-charcoal-800">Ceremonial Attire:</strong>{' '}
                      {ceremony.dressCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Transport Pick-up Window */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2 text-charcoal-600">
                  <Car className="w-4 h-4 text-terracotta-600" />
                  <span>
                    Pick-up Window: <strong>{ceremony.pickupWindow} PM</strong>
                  </span>
                </div>

                <Link
                  href="/guest/rides"
                  className="text-xs font-bold text-charcoal-900 hover:text-terracotta-600 flex items-center gap-1 uppercase tracking-wider"
                >
                  View Ride <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 pb-2">
        <FloralDivider className="w-full max-w-xs mx-auto text-gold-500/80" />
      </div>
    </div>
  );
}
