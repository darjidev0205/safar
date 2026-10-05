'use client';

import React, { useState } from 'react';
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
  LocateFixed,
} from 'lucide-react';
import { GoogleMapView } from '../../../components/ui/google-map-view';
import { useAuth } from '../../../context/auth-context';
import { useRealtimeTrip } from '../../../lib/use-realtime-trip';

export default function GuestRidesPage() {
  const { profile } = useAuth();
  const [showBoardingModal, setShowBoardingModal] = useState(false);

  // Connect to live real-time trip telemetry via Firestore listener + REST fallback
  const trip = useRealtimeTrip('tr_101');

  // Status mapping
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ARRIVED':
      case 'DRIVER_ARRIVED':
        return {
          label: 'DRIVER HAS ARRIVED CURBSIDE',
          color: 'bg-emerald-600 text-white border-emerald-500',
          pulse: true,
        };
      case 'IN_TRANSIT':
      case 'RIDE_IN_PROGRESS':
        return {
          label: 'RIDE IN PROGRESS',
          color: 'bg-charcoal-900 text-white border-charcoal-800',
          pulse: true,
        };
      case 'EN_ROUTE_TO_PICKUP':
      case 'DRIVER_ON_THE_WAY':
        return {
          label: `DRIVER IS ON THE WAY &bull; ${Math.max(1, Math.round(trip.telemetry.remainingDistanceKm * 2.2))} MIN AWAY`,
          color: 'bg-terracotta-600 text-white border-terracotta-500',
          pulse: false,
        };
      case 'COMPLETED':
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

  const statusConfig = getStatusBadge(trip.status);
  const etaMinutes = Math.max(1, Math.round(trip.telemetry.remainingDistanceKm * 2.2));

  return (
    <div className="space-y-4 max-w-md md:max-w-3xl mx-auto font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP 45-55% SCREEN: LIVE GOOGLE MAP VIEW                                */}
      {/* ========================================================================= */}
      <div className="relative">
        <GoogleMapView
          driverLocation={{
            lat: trip.telemetry.currentLat,
            lng: trip.telemetry.currentLng,
          }}
          pickupLocation={{ lat: trip.pickup.lat, lng: trip.pickup.lng }}
          destinationLocation={{ lat: trip.destination.lat, lng: trip.destination.lng }}
          pickupName={trip.pickup.name}
          destinationName={trip.destination.name}
          vehicleModel={trip.vehicle.model}
          driverHeading={trip.telemetry.heading || 0}
          breadcrumbs={trip.breadcrumbs}
          isLiveTracking={true}
          lastPingAt={trip.telemetry.lastPingAt}
          className="w-full h-[280px] sm:h-[340px] md:h-[400px]"
        />

        {/* Live status badge */}
        <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-xs text-charcoal-800 flex items-center gap-2 text-[11px] font-semibold border border-warm-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live GPS Telemetry</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BOTTOM FLOATING RIDE INFORMATION CARD                                  */}
      {/* ========================================================================= */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-[#E5DACB] shadow-sm space-y-4">
        {/* Status Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <div
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-2xs flex items-center gap-1.5 ${statusConfig.color}`}
            dangerouslySetInnerHTML={{ __html: statusConfig.label }}
          />

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
              ETA
            </span>
            <span className="font-serif text-lg font-bold text-charcoal-900 leading-none">
              {etaMinutes} min
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
              <h3 className="font-bold text-charcoal-900 text-sm sm:text-base leading-tight font-serif">
                {trip.driver.name}
              </h3>
              <p className="text-xs text-charcoal-600 font-medium">
                {trip.vehicle.model}
              </p>
              <p className="text-[11px] font-mono font-bold text-terracotta-700 tracking-wider uppercase mt-0.5">
                {trip.vehicle.plateNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {trip.driver.phone && (
              <a
                href={`tel:${trip.driver.phone}`}
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
              <p className="text-xs font-bold text-charcoal-900">{trip.pickup.name}</p>
              <p className="text-[11px] text-charcoal-500">{trip.pickup.address}</p>
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
              <p className="text-xs font-bold text-charcoal-900">{trip.destination.name}</p>
              <p className="text-[11px] text-charcoal-500">{trip.destination.address}</p>
            </div>
          </div>
        </div>

        {/* Telemetry Footer with Live Distance & PIN */}
        <div className="flex items-center justify-between px-2 pt-1 text-xs">
          <div className="text-charcoal-600 flex items-center gap-1.5">
            <LocateFixed className="w-3.5 h-3.5 text-terracotta-600" />
            <span>
              Distance away:{' '}
              <strong className="text-charcoal-900">
                {trip.telemetry.remainingDistanceKm.toFixed(1)} km
              </strong>{' '}
              <span className="text-charcoal-400">
                ({trip.telemetry.actualDistanceKm.toFixed(1)} km driven)
              </span>
            </span>
          </div>
          <div className="text-charcoal-600">
            Boarding PIN:{' '}
            <strong className="font-mono text-terracotta-700 font-bold text-sm">
              4827
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
                4827
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-warm-50/80 text-xs text-charcoal-600 text-left space-y-1">
              <div>
                <strong>Chauffeur:</strong> {trip.driver.name}
              </div>
              <div>
                <strong>Vehicle:</strong> {trip.vehicle.model} ({trip.vehicle.plateNumber})
              </div>
              <div>
                <strong>Destination:</strong> {trip.destination.name}
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
