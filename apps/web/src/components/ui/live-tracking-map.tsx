'use client';

import React, { useState } from 'react';
import {
  Car,
  Clock,
  Compass,
  MapPin,
  Navigation,
  ShieldCheck,
  Maximize2,
  Minimize2,
  PhoneCall,
  Radio,
  LocateFixed,
  AlertCircle,
} from 'lucide-react';
import { GoogleMapView, LatLng } from './google-map-view';

export interface LiveTrackingMapProps {
  tripId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  tripStatus?: string;
  pickupLocation: LatLng;
  destinationLocation: LatLng;
  pickupName?: string;
  destinationName?: string;
  driverLocation?: LatLng;
  driverHeading?: number;
  driverSpeedKmh?: number;
  actualDistanceKm?: number;
  remainingDistanceKm?: number;
  plannedDistanceKm?: number;
  lastPingAt?: string | number | Date;
  breadcrumbs?: LatLng[];
  isDriverView?: boolean;
  className?: string;
}

export function LiveTrackingMap({
  driverName = 'Rajesh Kumar',
  driverPhone = '+91 98765 43210',
  vehicleModel = 'Toyota Innova Crysta',
  vehiclePlate = 'GJ 01 AB 1234',
  tripStatus = 'IN_TRANSIT',
  pickupLocation,
  destinationLocation,
  pickupName = 'Pickup Location',
  destinationName = 'Ceremony Venue',
  driverLocation,
  driverHeading = 0,
  driverSpeedKmh = 0,
  actualDistanceKm = 0,
  remainingDistanceKm = 3.2,
  plannedDistanceKm = 18.5,
  lastPingAt,
  breadcrumbs = [],
  isDriverView = false,
  className = '',
}: LiveTrackingMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic ETA calculation (average 25km/h in urban Indian traffic)
  const etaMinutes = Math.max(1, Math.round(((remainingDistanceKm || 3) / 25) * 60));

  return (
    <div
      className={`relative font-sans ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-charcoal-950 p-4 sm:p-6 flex flex-col'
          : `space-y-4 ${className}`
      }`}
    >
      {/* Map Container */}
      <div className={`relative ${isFullscreen ? 'flex-1 rounded-3xl overflow-hidden' : ''}`}>
        <GoogleMapView
          driverLocation={driverLocation}
          pickupLocation={pickupLocation}
          destinationLocation={destinationLocation}
          pickupName={pickupName}
          destinationName={destinationName}
          driverHeading={driverHeading}
          vehicleModel={vehicleModel}
          isLiveTracking={true}
          lastPingAt={lastPingAt}
          breadcrumbs={breadcrumbs}
          className={
            isFullscreen
              ? 'w-full h-full min-h-[400px]'
              : 'w-full h-[280px] sm:h-[360px] md:h-[420px]'
          }
        />

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-3 left-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm text-charcoal-800 hover:text-terracotta-700 shadow-xs border border-[#E5DACB] active:scale-95 transition-all"
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand Map'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Floating Ride Information Panel */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-[#E5DACB] shadow-sm space-y-4">
        {/* Header with Chauffeur and ETA */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-terracotta-100/70 border border-terracotta-200/80 text-terracotta-800 flex items-center justify-center font-bold text-base font-serif shrink-0">
              {driverName.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta-700 block">
                {isDriverView ? 'Current Assignment' : 'Your Chauffeur'}
              </span>
              <h3 className="text-base font-bold font-serif text-charcoal-900 leading-tight">
                {driverName}
              </h3>
              <p className="text-xs text-charcoal-500 font-sans mt-0.5">
                {vehicleModel} &bull; <strong className="font-mono text-charcoal-700">{vehiclePlate}</strong>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
              Estimated Arrival
            </span>
            <div className="text-xl font-bold font-serif text-charcoal-900 leading-none mt-0.5">
              {etaMinutes} min
            </div>
            <span className="text-[11px] font-semibold text-terracotta-700 block mt-0.5">
              {remainingDistanceKm ? `${remainingDistanceKm.toFixed(1)} km away` : 'Approaching'}
            </span>
          </div>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-1 border-t border-warm-100 text-center">
          <div className="p-2.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block mb-0.5">
              GPS Speed
            </span>
            <span className="text-sm font-bold font-mono text-charcoal-900">
              {driverSpeedKmh ? `${Math.round(driverSpeedKmh)} km/h` : '--'}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block mb-0.5">
              Actual Driven
            </span>
            <span className="text-sm font-bold font-mono text-terracotta-700">
              {actualDistanceKm ? `${actualDistanceKm.toFixed(1)} km` : '0.0 km'}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D9]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block mb-0.5">
              Planned Route
            </span>
            <span className="text-sm font-bold font-mono text-charcoal-700">
              {plannedDistanceKm ? `${plannedDistanceKm.toFixed(1)} km` : '18.5 km'}
            </span>
          </div>
        </div>

        {/* Contact Chauffeur */}
        {!isDriverView && driverPhone && (
          <div className="pt-1 flex items-center justify-between gap-3">
            <a
              href={`tel:${driverPhone}`}
              className="flex-1 py-2.5 px-4 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-98 shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Chauffeur</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
