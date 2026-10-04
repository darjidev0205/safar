'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navigation, Compass, MapPin, Radio, ArrowRight, ShieldAlert, CheckCircle2, WifiOff, LocateFixed } from 'lucide-react';
import { GoogleMapView } from '../../../components/ui/google-map-view';
import { useRealtimeTrip } from '../../../lib/use-realtime-trip';
import { DriverGpsTracker, TrackingState } from '../../../lib/tracking-engine';

export default function DriverNavigationPage() {
  const trip = useRealtimeTrip('tr_101');
  const trackerRef = useRef<DriverGpsTracker | null>(null);
  const [deviceGps, setDeviceGps] = useState<TrackingState | null>(null);

  useEffect(() => {
    const tracker = new DriverGpsTracker({
      tripId: 'tr_101',
      driverId: 'drv_101',
      plannedDistanceKm: 23.5,
      destinationCoords: { lat: 23.0225, lng: 72.5714 },
    });
    trackerRef.current = tracker;

    // Start real GPS tracking on navigation screen
    tracker.startTracking();

    const unsub = tracker.subscribe((st) => {
      setDeviceGps(st);
    });

    return () => {
      tracker.stopTracking();
      unsub();
    };
  }, []);

  const currentLat = deviceGps?.currentPoint?.latitude ?? trip.telemetry.currentLat;
  const currentLng = deviceGps?.currentPoint?.longitude ?? trip.telemetry.currentLng;
  const rawSpeed = deviceGps?.currentPoint?.speed;
  const speedDisplay = rawSpeed !== null && rawSpeed !== undefined && rawSpeed >= 0
    ? `${Math.round(rawSpeed * 3.6)} km/h`
    : deviceGps?.speedKmh
    ? `${deviceGps.speedKmh} km/h`
    : '-- km/h';

  const heading = deviceGps?.heading ?? trip.telemetry.heading ?? null;
  const accuracy = deviceGps?.currentPoint?.accuracy ?? trip.telemetry.accuracy ?? null;
  const actualDistanceKm = deviceGps?.actualDistanceKm ?? trip.telemetry.actualDistanceKm ?? 0;
  const remainingDistanceKm = deviceGps?.remainingDistanceKm ?? trip.telemetry.remainingDistanceKm ?? 23.5;
  const plannedDistanceKm = trip.telemetry.plannedDistanceKm ?? 23.5;

  // Real ETA calculation based on remaining distance and average urban wedding convoy speed (25 km/h)
  const estimatedMins = Math.max(1, Math.round((remainingDistanceKm / 25) * 60));

  // Dynamic Google Maps Directions URL
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${currentLat},${currentLng}`
  )}&destination=${encodeURIComponent(
    `${trip.destination.lat},${trip.destination.lng}`
  )}&travelmode=driving`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900 tracking-tight">
            Active Turn-by-Turn Navigation
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            En route to: <strong className="text-charcoal-800">{trip.destination.name}</strong>
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {deviceGps?.isTracking
            ? 'GPS Active (Real Device)'
            : deviceGps?.permissionStatus === 'denied'
            ? 'GPS Denied'
            : 'GPS Active (Real Device)'}
        </div>
      </div>

      {/* GPS Accuracy Warning if noise > 50m */}
      {accuracy !== null && accuracy > 50 && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-2 text-xs font-sans">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>GPS accuracy low (&plusmn;{Math.round(accuracy)}m). Telemetry is filtering noise.</span>
        </div>
      )}

      {/* Offline Alert Banner */}
      {deviceGps && !deviceGps.isOnline && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between text-xs font-sans shadow-xs animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-700" />
            <span className="font-semibold">
              Connection lost &mdash; tracking will sync when connection returns.
            </span>
          </div>
          {deviceGps.queuedPingsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
              {deviceGps.queuedPingsCount} pings queued
            </span>
          )}
        </div>
      )}

      {/* Main Navigation Map & Turn Card */}
      <div className="rounded-3xl overflow-hidden bg-white border border-[#E8E2D9] shadow-sm space-y-4 p-5 sm:p-6">
        {/* Next Maneuver Banner */}
        <div className="p-4 rounded-2xl bg-charcoal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta-600 flex items-center justify-center text-white shadow-xs">
              <Navigation className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <div className="text-xs font-medium text-warm-300">
                {remainingDistanceKm < 0.5 ? 'Approaching Venue' : `In ${remainingDistanceKm < 1 ? `${Math.round(remainingDistanceKm * 1000)} meters` : `${remainingDistanceKm.toFixed(1)} km`}`}
              </div>
              <div className="text-sm sm:text-base font-bold truncate max-w-[200px] sm:max-w-md">
                Proceed toward {trip.destination.name}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold font-serif text-warm-100">
              {estimatedMins} min
            </div>
            <div className="text-[11px] text-warm-300 font-mono">{remainingDistanceKm.toFixed(1)} km remaining</div>
          </div>
        </div>

        {/* Live Distance Matrix Bar */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-sans p-3 bg-warm-50 rounded-2xl border border-[#E8E2D9]">
          <div>
            <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Actual Driven</span>
            <span className="text-sm sm:text-base font-bold text-terracotta-700">{actualDistanceKm.toFixed(1)} km</span>
          </div>
          <div className="border-x border-warm-200">
            <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Remaining</span>
            <span className="text-sm sm:text-base font-bold text-charcoal-900">{remainingDistanceKm.toFixed(1)} km</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Total Route</span>
            <span className="text-sm sm:text-base font-bold text-charcoal-700">{plannedDistanceKm} km</span>
          </div>
        </div>

        {/* Live Google Map Visualizer */}
        <div className="relative rounded-2xl overflow-hidden border border-[#E8E2D9] shadow-inner">
          <GoogleMapView
            driverLocation={{ lat: currentLat, lng: currentLng }}
            pickupLocation={{ lat: trip.pickup.lat, lng: trip.pickup.lng }}
            destinationLocation={{ lat: trip.destination.lat, lng: trip.destination.lng }}
            pickupName={trip.pickup.name}
            destinationName={trip.destination.name}
            driverHeading={heading || 0}
            vehicleModel={trip.vehicle.model}
            breadcrumbs={deviceGps?.breadcrumbs || trip.breadcrumbs}
            isLiveTracking={true}
            className="w-full h-72 sm:h-96"
          />

          {/* Telemetry Floating Card */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono text-charcoal-800 shadow-sm flex items-center gap-3 z-10">
            <div>
              <span className="text-[10px] text-charcoal-400 block font-sans">SPEED</span>
              <strong className="text-sm font-bold">{speedDisplay}</strong>
            </div>
            <div className="w-px h-6 bg-warm-200" />
            <div>
              <span className="text-[10px] text-charcoal-400 block font-sans">ACCURACY</span>
              <strong className="text-sm font-bold">{accuracy !== null ? `\u00B1${Math.round(accuracy)} m` : '-- m'}</strong>
            </div>
            <div className="w-px h-6 bg-warm-200" />
            <div>
              <span className="text-[10px] text-charcoal-400 block font-sans">HEADING</span>
              <strong className="text-sm font-bold">{heading !== null && heading !== undefined ? `${Math.round(heading)}\u00B0` : '--\u00B0'}</strong>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            href="/driver"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-semibold text-charcoal-700 hover:bg-warm-50 text-center transition-colors"
          >
            Back to Console
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={googleMapsNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-[#E8E2D9] bg-white text-xs font-semibold text-charcoal-800 hover:bg-warm-50 text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-terracotta-600" />
              Navigate &#x2197;
            </a>

            <Link
              href="/driver/verification"
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.985]"
            >
              Arrived &bull; Verify Boarding Pass <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


