'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Clock,
  MapPin,
  Users,
  Copy,
  Check,
  ArrowRight,
  KeyRound,
  Sparkles,
  PhoneCall,
  Compass,
  Calendar,
  ShieldCheck,
  QrCode,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  MarigoldFlower,
  OliveBranch,
  JasmineBloom,
  StarFlourish,
  FloralDivider,
} from '../../components/ui/botanical-ornaments';
import { useAuth } from '../../context/auth-context';

export default function GuestHomePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Time-based dynamic personalized greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else if (hour >= 17 && hour < 22) {
      setGreeting('Good Evening');
    } else {
      setGreeting('Good Night');
    }
  }, []);

  // 2. Fetch live guest dashboard data from real database API
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Check for stored event code if any
      const storedEvent =
        typeof window !== 'undefined' ? localStorage.getItem('safar_guest_event') : null;
      let codeParam = '';
      if (storedEvent) {
        try {
          const parsed = JSON.parse(storedEvent);
          if (parsed.joinCode || parsed.code) {
            codeParam = `?eventCode=${parsed.joinCode || parsed.code}`;
          }
        } catch (e) {
          // ignore
        }
      }

      const res = await fetch(`/api/guest/dashboard${codeParam}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(profile?.id ? { 'x-user-id': profile.id } : {}),
          ...(profile?.email ? { 'x-user-email': profile.email } : {}),
        },
      });

      const json = await res.json();
      if (json.success) {
        setDashboardData(json);
      }
    } catch (err) {
      console.error('Failed to load guest dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    setJoining(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/guest/dashboard?eventCode=${cleanCode}`, {
        headers: {
          ...(profile?.id ? { 'x-user-id': profile.id } : {}),
          ...(profile?.email ? { 'x-user-email': profile.email } : {}),
        },
      });
      const data = await res.json();
      if (data.success && data.hasEvent) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('safar_guest_event', JSON.stringify(data.event));
        }
        setDashboardData(data);
      } else {
        setErrorMsg('Wedding event code not found. Please verify with the host.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not verify code');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
        <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest mt-3">
          Loading Ceremonial Itinerary...
        </span>
      </div>
    );
  }

  // If guest is not associated with any event yet, show embossed join card
  if (!dashboardData?.hasEvent) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] invitation-frame relative overflow-hidden text-center space-y-5">
          <div className="absolute top-2 right-2 opacity-30">
            <MarigoldFlower className="w-12 h-12 text-terracotta-500" />
          </div>

          <div className="w-14 h-14 rounded-2xl bg-warm-100 text-terracotta-600 mx-auto flex items-center justify-center border border-[#E5DACB]">
            <KeyRound className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-700">
              Wedding Invitation Pass
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-charcoal-900">
              Join Your Celebration
            </h1>
            <p className="text-xs text-charcoal-600 leading-relaxed max-w-xs mx-auto font-sans">
              Please enter the single master event code from your wedding invitation card to view
              all ceremonies (Mehndi, Sangeet, Wedding, Reception) and family transport.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-3 pt-2">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. JPR26A"
              maxLength={10}
              className="w-full text-center tracking-[0.3em] font-mono text-xl uppercase font-bold py-3.5 px-4 rounded-2xl border border-charcoal-300 bg-warm-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
            />

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={joining || !joinCodeInput.trim()}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-700 hover:to-terracotta-800 text-white font-bold text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.985]"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Access Wedding Portal</span>}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { event, family, functions, nextFunction, ride } = dashboardData;
  const guestFirstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Guest';

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. PERSONALIZED GREETING & CEREMONY BANNER                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] invitation-frame relative overflow-hidden">
        {/* Subtle Botanical Corner Watermark */}
        <div className="absolute -top-3 -right-3 opacity-25 pointer-events-none hidden sm:block">
          <MarigoldFlower className="w-20 h-20 text-terracotta-600" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta-700">
                {greeting}, {guestFirstName}
              </span>
              <span className="w-1 h-1 rounded-full bg-charcoal-300" />
              <span className="text-[11px] font-medium text-charcoal-500 uppercase tracking-wider">
                {family?.name || 'Shah Family'}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl text-charcoal-900 font-normal">
              {event?.name || 'The Wedding Celebration'}
            </h1>

            <p className="text-xs text-charcoal-600 flex items-center gap-2 pt-0.5">
              <span>{event?.city}</span>
              <span>&bull;</span>
              <span>
                {new Date(event?.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                –{' '}
                {new Date(event?.endDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </p>
          </div>

          {/* Master Join Code Badge with One-Tap Copy */}
          <div className="self-start sm:self-center">
            <button
              onClick={() => handleCopyCode(event?.joinCode)}
              className="px-3.5 py-1.5 rounded-xl bg-warm-100 hover:bg-warm-200 border border-[#E5DACB] text-xs font-semibold text-charcoal-800 flex items-center gap-2 transition-all shadow-2xs group active:scale-[0.985]"
              title="Click to copy wedding pass code"
            >
              <span className="text-[11px] uppercase tracking-wider text-charcoal-500">Master Pass:</span>
              <span className="font-mono font-bold text-charcoal-900">{event?.joinCode}</span>
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-charcoal-400 group-hover:text-charcoal-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. WEDDING FUNCTIONS ITINERARY & GUEST ATTENDANCE MANIFEST                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5DACB]/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-terracotta-600" />
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal-800">
              Ceremonies &amp; Attendance ({functions?.length || 0})
            </span>
          </div>
          <span className="text-[11px] font-medium text-charcoal-500 uppercase tracking-wider">
            One Master Pass: {event?.joinCode}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(functions || []).map((fn: any) => (
            <div
              key={fn.id}
              className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] hover:border-terracotta-300/80 transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 bg-amber-50 px-2 py-0.5 rounded border border-gold-200">
                    {fn.eventType || 'Ceremony'}
                  </span>
                  <h4 className="font-serif text-base font-bold text-charcoal-900 mt-1">
                    {fn.name}
                  </h4>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    fn.isAttending !== false
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-warm-100 text-charcoal-500 border border-warm-200'
                  }`}
                >
                  {fn.isAttending !== false ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Attending</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-charcoal-400" />
                      <span>Not Attending</span>
                    </>
                  )}
                </span>
              </div>

              <div className="text-xs text-charcoal-600 space-y-1 font-sans">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-charcoal-400" />
                  <span>
                    {new Date(fn.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    &bull; {fn.startTime} – {fn.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-terracotta-600" />
                  <span className="font-medium text-charcoal-900">{fn.venueName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. YOUR RIDE CARD (REAL DISPATCH & STATUS)                                */}
      {/* ========================================================================= */}
      {ride ? (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-warm-100">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-terracotta-600" />
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal-800">
                Your Assigned Transport &bull; {ride.functionName || 'Ceremonial Transfer'}
              </span>
            </div>

            {/* Ride Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                ride.status === 'RIDE_IN_PROGRESS' || ride.status === 'DRIVER_ARRIVED'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-warm-100 text-terracotta-800 border border-warm-300'
              }`}
            >
              {ride.status === 'DRIVER_ARRIVED'
                ? 'Driver Arrived Curbside'
                : ride.status === 'DRIVER_ON_THE_WAY'
                ? `En Route (${ride.etaMinutes} min)`
                : ride.status === 'RIDE_IN_PROGRESS'
                ? 'Ride in Progress'
                : 'Chauffeur Assigned'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vehicle & Chauffeur Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-charcoal-900 text-white flex items-center justify-center font-bold shadow-xs">
                  <Car className="w-6 h-6 text-warm-200" />
                </div>
                <div>
                  <h4 className="font-bold text-charcoal-900 text-base font-serif">
                    {ride.vehicle?.model || 'Executive SUV'}
                  </h4>
                  <p className="text-xs font-mono font-semibold text-charcoal-500 uppercase">
                    {ride.vehicle?.plateNumber || 'GJ01AB1234'} &bull; {ride.vehicle?.capacity || 4} Seats
                  </p>
                </div>
              </div>

              {ride.driver && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9]">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400">
                      Chauffeur
                    </span>
                    <p className="text-xs font-bold text-charcoal-900">{ride.driver.name}</p>
                  </div>
                  {ride.driver.phoneNumber && (
                    <a
                      href={`tel:${ride.driver.phoneNumber}`}
                      className="p-2 rounded-xl bg-white border border-[#E8E2D9] text-terracotta-600 hover:bg-terracotta-50 transition-colors shadow-2xs"
                      title="Call Chauffeur"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Pickup & Destination Details */}
            <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9] space-y-2.5 flex flex-col justify-between font-sans">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gold-600 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-charcoal-400 font-bold block">
                      Pickup Point
                    </span>
                    <p className="text-xs font-bold text-charcoal-900">{ride.pickupLocation}</p>
                    <p className="text-[11px] text-charcoal-500 line-clamp-1">{ride.pickupAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-burgundy-700 mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-charcoal-400 font-bold block">
                      Ceremony Destination
                    </span>
                    <p className="text-xs font-bold text-charcoal-900">{ride.destinationVenue}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-warm-200/60 flex items-center justify-between text-xs">
                <span className="text-charcoal-500 font-medium">
                  Distance: <strong>{ride.distanceKm} km</strong>
                </span>
                <span className="text-charcoal-500 font-medium">
                  Boarding PIN: <strong className="font-mono text-terracotta-700">{ride.boardingCode}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action CTA to Live Ride Tracking */}
          <div className="pt-2">
            <Link
              href="/guest/rides"
              className="w-full py-3 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold tracking-widest uppercase shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.985]"
            >
              <span>View Live Ride &amp; Route Map</span>
              <ArrowRight className="w-4 h-4 text-warm-300" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-warm-100 text-charcoal-600 mx-auto flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
          <h4 className="font-serif text-lg font-bold text-charcoal-900">
            Transport Assignment in Preparation
          </h4>
          <p className="text-xs text-charcoal-600 max-w-sm mx-auto font-sans">
            Your host mobility desk is currently mapping vehicles and chauffeurs for your family.
            Real-time pickup details will appear automatically before each ceremony.
          </p>
        </div>
      )}
    </div>
  );
}
