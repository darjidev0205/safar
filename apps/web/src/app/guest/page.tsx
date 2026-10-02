'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Clock,
  Info,
  LifeBuoy,
  Copy,
  CheckCircle2,
  QrCode,
  ArrowRight,
  KeyRound,
  MapPin,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/status-badge';
import { EmptyState } from '../../components/ui/empty-state';
import { useAuth } from '../../context/auth-context';

export default function GuestHomePage() {
  const { profile } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinedEvent, setJoinedEvent] = useState<any>(null);
  const [showBoardingModal, setShowBoardingModal] = useState(false);

  // Check demo mode environment configuration
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('safar_guest_event');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.name) {
            setJoinedEvent(parsed);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      // If demo mode is explicitly enabled, provide sample joined event
      if (isDemoMode) {
        setJoinedEvent({
          name: 'Aarav & Diya Wedding',
          city: 'Ahmedabad',
          dates: '14–17 Nov 2026',
          code: 'ADW26X',
        });
      }
    }
  }, [isDemoMode]);

  const nextRide = {
    time: 'Today • 10:30 AM',
    pickup: 'The Grand Hotel',
    destination: 'The Celebration Venue',
    category: 'Sedan',
    seats: 4,
    status: 'ON_TIME',
    duration: '6 min',
    distance: '1.8 km',
    boardingCode: '4827',
  };

  const handleCopyCode = () => {
    if (joinedEvent?.code) {
      navigator.clipboard.writeText(joinedEvent.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // If new guest has not joined an event yet
  if (!joinedEvent) {
    return (
      <div className="py-12 max-w-md mx-auto space-y-4">
        <EmptyState
          icon={KeyRound}
          title="Join an Event"
          description="Enter the 6-character event code from your wedding or celebration invitation to access shuttle schedules, book private transit, and track vehicles live."
          actionLabel="Enter Event Code"
          onAction={() => window.location.href = '/guest/join'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Event Header Card with Background and Event Code Pill */}
      <div className="relative rounded-2xl overflow-hidden bg-charcoal-900 text-white shadow-md">
        <div
          className="h-44 w-full bg-cover bg-center brightness-[0.75]"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-900/30 to-transparent flex flex-col justify-end p-5">
          <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight">
            {joinedEvent.name}
          </h1>
          <p className="text-xs text-charcoal-300 font-medium mt-0.5">
            {joinedEvent.city} &bull; {joinedEvent.dates}
          </p>

          {/* Event Code Pill with Copy Button */}
          <div className="mt-3 inline-flex items-center self-start bg-charcoal-900/85 backdrop-blur-md rounded-xl p-1 pr-1.5 border border-white/15 gap-2 text-xs">
            <span className="px-2 py-0.5 text-[11px] font-medium text-charcoal-300">
              Event Code: <strong className="text-white font-mono">{joinedEvent.code}</strong>
            </span>
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {copiedCode ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Quick Action Cards */}
      <div className="grid grid-cols-4 gap-2.5">
        <Link
          href="/guest/book"
          className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
            <Car className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-charcoal-800">Book Ride</span>
        </Link>

        <Link
          href="/guest/rides"
          className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-charcoal-800">My Rides</span>
        </Link>

        <Link
          href="/guest/event"
          className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
            <Info className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-charcoal-800">Event Info</span>
        </Link>

        <button
          onClick={() => alert('Host Transport Concierge Hotline: +91 98765 00000')}
          className="p-3 rounded-2xl bg-white border border-charcoal-200/80 shadow-xs hover:border-safar-400 flex flex-col items-center justify-center gap-1.5 transition-all text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-safar-50 text-safar-700 flex items-center justify-center group-hover:bg-safar-100 transition-colors">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-charcoal-800">Support</span>
        </button>
      </div>

      {/* "Your Next Ride" Card */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-charcoal-900">Your Next Ride</h2>
          <Link
            href="/guest/rides"
            className="text-xs font-semibold text-safar-700 hover:text-safar-800"
          >
            View All
          </Link>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-charcoal-600">
            {nextRide.time}
          </div>

          {/* Route Progression Timeline */}
          <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-charcoal-200">
            <div className="relative">
              <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-charcoal-900 ring-4 ring-white" />
              <div className="font-bold text-xs text-charcoal-900">{nextRide.pickup}</div>
              <div className="text-[11px] text-charcoal-500">Ahmedabad</div>
            </div>
            <div className="relative">
              <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-safar-600 ring-4 ring-white" />
              <div className="font-bold text-xs text-charcoal-900">{nextRide.destination}</div>
              <div className="text-[11px] text-charcoal-500">Ahmedabad</div>
            </div>
          </div>

          {/* Vehicle & CTA Row */}
          <div className="flex items-center justify-between pt-2 border-t border-charcoal-100">
            <div>
              <div className="font-bold text-xs text-charcoal-900">{nextRide.category}</div>
              <div className="text-[11px] text-charcoal-500">{nextRide.seats} seats</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="ON_TIME" size="sm" />
              <button
                onClick={() => setShowBoardingModal(true)}
                className="px-3 py-1.5 rounded-xl bg-safar-600 hover:bg-safar-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Track Ride
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Boarding Pass Modal */}
      {showBoardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-charcoal-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-semibold text-safar-700 uppercase tracking-wider">
                Confirmed Ride
              </span>
              <h3 className="text-lg font-bold text-charcoal-900">Your Boarding Pass</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Show this 4-digit code to your driver upon arrival.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-warm-100 border border-charcoal-200">
              <span className="text-[11px] uppercase font-bold tracking-wider text-charcoal-500">
                Boarding Code
              </span>
              <div className="text-3xl font-black font-mono tracking-widest text-safar-700 mt-1">
                {nextRide.boardingCode}
              </div>
            </div>

            <div className="p-3 bg-white border border-charcoal-200 rounded-xl inline-block shadow-inner">
              <div className="w-36 h-36 bg-charcoal-900 p-2 rounded-lg flex items-center justify-center text-white">
                <QrCode className="w-28 h-28 text-white" />
              </div>
            </div>

            <button
              onClick={() => setShowBoardingModal(false)}
              className="w-full py-2.5 rounded-xl bg-charcoal-900 text-white font-semibold text-xs hover:bg-charcoal-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
