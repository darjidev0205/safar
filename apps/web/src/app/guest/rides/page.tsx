'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Clock,
  PhoneCall,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Navigation,
  QrCode,
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { GoogleMapView } from '../../../components/ui/google-map-view';
import { useAuth } from '../../../context/auth-context';

export default function GuestRidesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rideData, setRideData] = useState<any>(null);
  const [showBoardingModal, setShowBoardingModal] = useState(false);

  const fetchLiveRide = async (isManual = false) => {
    if (isManual) setRefreshing(true);
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

      const res = await fetch(`/api/guest/dashboard${query}`, {
        headers: {
          ...(profile?.id ? { 'x-user-id': profile.id } : {}),
          ...(profile?.email ? { 'x-user-email': profile.email } : {}),
        },
      });

      const json = await res.json();
      if (json.success && json.ride) {
        setRideData(json.ride);
      }
    } catch (err) {
      console.error('Error polling live ride:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveRide();

    // Live GPS telemetry polling interval (every 8 seconds)
    const interval = setInterval(() => {
      fetchLiveRide();
    }, 8000);

    return () => clearInterval(interval);
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
        <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest mt-3">
          Connecting to Dispatch Telemetry...
        </span>
      </div>
    );
  }

  // If no ride assigned yet
  if (!rideData) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-5 text-center">
        <div className="bg-white/80 rounded-3xl p-8 border border-[#E5DACB] shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-warm-100 text-charcoal-600 mx-auto flex items-center justify-center">
            <Car className="w-7 h-7 text-charcoal-700" />
          </div>
          <h2 className="font-serif text-2xl text-charcoal-900 font-bold">No Active Ride Assigned</h2>
          <p className="text-xs text-charcoal-600 leading-relaxed max-w-xs mx-auto">
            Your ceremonial chauffeur will be scheduled before the next function. Check the Events
            tab to view scheduled ceremony departure windows.
          </p>
          <div className="pt-2">
            <Link
              href="/guest/events"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-charcoal-900 text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-charcoal-800 transition-all"
            >
              <span>View Ceremony Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Status mapping
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRIVER_ARRIVED':
        return {
          label: 'DRIVER HAS ARRIVED CURBSIDE',
          color: 'bg-emerald-600 text-white border-emerald-500',
          pulse: true,
        };
      case 'RIDE_IN_PROGRESS':
        return {
          label: 'RIDE IN PROGRESS',
          color: 'bg-charcoal-900 text-white border-charcoal-800',
          pulse: true,
        };
      case 'DRIVER_ON_THE_WAY':
        return {
          label: `EN ROUTE • ${rideData.etaMinutes} MIN AWAY`,
          color: 'bg-terracotta-600 text-white border-terracotta-500',
          pulse: false,
        };
      case 'RIDE_COMPLETED':
        return {
          label: 'RIDE COMPLETED',
          color: 'bg-sage-600 text-white border-sage-500',
          pulse: false,
        };
      default:
        return {
          label: 'CHAUFFEUR ASSIGNED',
          color: 'bg-warm-100 text-charcoal-800 border-[#E5DACB]',
          pulse: false,
        };
    }
  };

  const statusConfig = getStatusBadge(rideData.status);

  return (
    <div className="space-y-4 max-w-md md:max-w-3xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. TOP 45-55% SCREEN: LIVE GOOGLE MAP VIEW                                */}
      {/* ========================================================================= */}
      <div className="relative">
        <GoogleMapView
          driverLocation={
            rideData.vehicle
              ? { lat: rideData.vehicle.currentLat, lng: rideData.vehicle.currentLng }
              : undefined
          }
          pickupLocation={rideData.pickupCoordinates || { lat: 23.0225, lng: 72.5714 }}
          destinationLocation={rideData.destinationCoordinates || { lat: 23.0338, lng: 72.585 }}
          pickupName={rideData.pickupLocation}
          destinationName={rideData.destinationVenue}
          vehicleModel={rideData.vehicle?.model || 'Executive SUV'}
          className="w-full h-[280px] sm:h-[340px] md:h-[400px]"
        />

        {/* Refresh telemetry control */}
        <button
          onClick={() => fetchLiveRide(true)}
          className="absolute top-3 left-3 z-10 px-2.5 py-1.5 rounded-full apple-glass-floating shadow-xs text-charcoal-700 hover:text-charcoal-950 flex items-center gap-1.5 text-[11px] font-semibold transition-all active:scale-95"
          title="Refresh GPS telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-terracotta-600' : ''}`} />
          <span>Live</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. BOTTOM FLOATING APPLE-GLASS RIDE INFORMATION CARD                       */}
      {/* ========================================================================= */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-[#E5DACB] shadow-sm space-y-4">
        {/* Status Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <div
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-2xs flex items-center gap-1.5 ${statusConfig.color}`}
          >
            {statusConfig.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
            <span>{statusConfig.label}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
              ETA
            </span>
            <span className="font-serif text-lg font-bold text-charcoal-900 leading-none">
              {rideData.etaMinutes} min
            </span>
          </div>
        </div>

        {/* Chauffeur & Vehicle Details */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-warm-50 border border-[#E5DACB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-charcoal-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Car className="w-6 h-6 text-warm-200" />
            </div>
            <div>
              <h3 className="font-bold text-charcoal-900 text-sm sm:text-base leading-tight">
                {rideData.driver?.name || 'Rahul Patel'}
              </h3>
              <p className="text-xs text-charcoal-600 font-medium">
                {rideData.vehicle?.model || 'Toyota Innova Crysta'}
              </p>
              <p className="text-[11px] font-mono font-bold text-terracotta-700 tracking-wider uppercase mt-0.5">
                {rideData.vehicle?.plateNumber || 'GJ01AB1234'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rideData.driver?.phone && (
              <a
                href={`tel:${rideData.driver.phone}`}
                className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center active:scale-95"
                title="Call Chauffeur"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => setShowBoardingModal(true)}
              className="p-3 rounded-2xl bg-charcoal-900 hover:bg-charcoal-800 text-white transition-all shadow-xs flex items-center justify-center active:scale-95"
              title="Show Boarding Pass & QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Route Pick-up & Destination Segment */}
        <div className="p-3.5 rounded-2xl bg-warm-50 border border-[#E5DACB] space-y-3">
          {/* Pickup */}
          <div className="flex items-start gap-2.5">
            <div className="w-3 h-3 rounded-full bg-gold-600 border-2 border-white shadow-2xs mt-1 shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block">
                Curbside Pick-up
              </span>
              <p className="text-xs font-bold text-charcoal-900">{rideData.pickupLocation}</p>
              <p className="text-[11px] text-charcoal-500">{rideData.pickupAddress}</p>
            </div>
          </div>

          {/* Dotted Route Connector */}
          <div className="ml-1.5 h-3 border-l-2 border-dashed border-charcoal-300" />

          {/* Destination */}
          <div className="flex items-start gap-2.5">
            <div className="w-3 h-3 rounded-full bg-burgundy-700 border-2 border-white shadow-2xs mt-1 shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block">
                Ceremony Destination
              </span>
              <p className="text-xs font-bold text-charcoal-900">{rideData.destinationVenue}</p>
              <p className="text-[11px] text-charcoal-500">{rideData.destinationAddress}</p>
            </div>
          </div>
        </div>

        {/* Telemetry Footer with Distance & Boarding Code */}
        <div className="flex items-center justify-between px-2 pt-1 text-xs">
          <div className="text-charcoal-600">
            Distance Remaining: <strong className="text-charcoal-900">{rideData.distanceKm} km</strong>
          </div>
          <div className="text-charcoal-600">
            Boarding PIN:{' '}
            <strong className="font-mono text-terracotta-700 font-bold text-sm">
              {rideData.boardingCode}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOARDING PASS & QR MODAL                                               */}
      {/* ========================================================================= */}
      {showBoardingModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowBoardingModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 border border-[#E5DACB] shadow-2xl text-center space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-700">
                SAFAR Digital Boarding Pass
              </span>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Verified Passenger PIN
              </h3>
              <p className="text-xs text-charcoal-500">
                Share this PIN with your chauffeur before departure.
              </p>
            </div>

            {/* Large 4-digit PIN */}
            <div className="py-4 px-6 rounded-2xl bg-warm-50 border border-[#E5DACB] inline-block mx-auto">
              <span className="font-mono text-3xl font-black tracking-[0.3em] text-charcoal-950">
                {rideData.boardingCode}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-warm-50/80 text-xs text-charcoal-600 text-left space-y-1">
              <div>
                <strong>Chauffeur:</strong> {rideData.driver?.name}
              </div>
              <div>
                <strong>Vehicle:</strong> {rideData.vehicle?.model} ({rideData.vehicle?.plateNumber})
              </div>
              <div>
                <strong>Destination:</strong> {rideData.destinationVenue}
              </div>
            </div>

            <button
              onClick={() => setShowBoardingModal(false)}
              className="w-full py-3 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold uppercase tracking-wider"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
