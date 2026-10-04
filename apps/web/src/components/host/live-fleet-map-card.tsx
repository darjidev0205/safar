'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Car, ExternalLink, Navigation, LocateFixed } from 'lucide-react';
import { StatusBadge } from '../ui/status-badge';
import { StarFlourish } from '../ui/botanical-ornaments';
import { loadGoogleMaps } from '../../lib/google-maps';
import { useRealtimeTrip } from '../../lib/use-realtime-trip';

interface LiveFleetMapCardProps {
  onOpenLiveMap?: () => void;
}

const MAP_STYLES = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#fbf9f4' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e5ecf0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b5b4a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

export function LiveFleetMapCard({ onOpenLiveMap }: LiveFleetMapCardProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const activeDriverMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Connect to live real-time active trip stream
  const activeTrip = useRealtimeTrip('tr_101');

  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!mapRef.current) return;
        const goog = (window as any).google;

        const map = new goog.maps.Map(mapRef.current, {
          center: {
            lat: activeTrip.telemetry.currentLat || 23.0338,
            lng: activeTrip.telemetry.currentLng || 72.5256,
          },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'cooperative',
          styles: MAP_STYLES,
        });
        mapInstanceRef.current = map;

        // Pickup point marker (gold)
        new goog.maps.Marker({
          position: { lat: activeTrip.pickup.lat, lng: activeTrip.pickup.lng },
          map,
          title: activeTrip.pickup.name,
          icon: {
            path: goog.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#C49E64',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 5,
        });

        // Destination point marker (burgundy)
        new goog.maps.Marker({
          position: { lat: activeTrip.destination.lat, lng: activeTrip.destination.lng },
          map,
          title: activeTrip.destination.name,
          icon: {
            path: goog.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#8C2B32',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 5,
        });

        // Active driver vehicle marker (terracotta moving arrow)
        const driverMarker = new goog.maps.Marker({
          position: {
            lat: activeTrip.telemetry.currentLat,
            lng: activeTrip.telemetry.currentLng,
          },
          map,
          title: `${activeTrip.driver.name} (${activeTrip.vehicle.model})`,
          icon: {
            path: goog.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 7,
            rotation: activeTrip.telemetry.heading || 0,
            fillColor: '#C86D51',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 10,
        });
        activeDriverMarkerRef.current = driverMarker;

        const info = new goog.maps.InfoWindow({
          content: `<div style="font-family:sans-serif;font-size:11px;padding:4px 2px;max-width:180px">
            <strong>${activeTrip.vehicle.model}</strong><br/>
            ${activeTrip.vehicle.plateNumber}<br/>
            <span style="color:#C86D51;font-weight:bold">${activeTrip.driver.name}</span> &bull; ${activeTrip.telemetry.speedKmh} km/h
          </div>`,
        });
        driverMarker.addListener('click', () => info.open(map, driverMarker));

        setMapReady(true);
      })
      .catch(() => {});
  }, []);

  // Update marker position and heading in real-time when GPS coordinates change (no page refresh)
  useEffect(() => {
    if (!mapReady || !activeDriverMarkerRef.current) return;
    const goog = (window as any).google;
    const newPos = {
      lat: activeTrip.telemetry.currentLat,
      lng: activeTrip.telemetry.currentLng,
    };
    activeDriverMarkerRef.current.setPosition(newPos);
    activeDriverMarkerRef.current.setIcon({
      path: goog.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 7,
      rotation: activeTrip.telemetry.heading || 0,
      fillColor: '#C86D51',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    });
  }, [activeTrip.telemetry.currentLat, activeTrip.telemetry.currentLng, activeTrip.telemetry.heading, mapReady]);

  const etaMin = Math.max(1, Math.round(activeTrip.telemetry.remainingDistanceKm * 2.2));

  return (
    <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] overflow-hidden font-sans">
      <div className="px-5 py-4 border-b border-warm-200/80 flex items-center justify-between bg-warm-50/60">
        <div>
          <div className="flex items-center gap-1.5 font-serif font-bold text-sm text-charcoal-900">
            <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
            <span>Live Vehicle Tracking (Real GPS)</span>
          </div>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Real-time device GPS telemetry broadcast from active wedding chauffeurs
          </p>
        </div>
        {onOpenLiveMap && (
          <button
            onClick={onOpenLiveMap}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Full Map</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-warm-200/80">
        <div className="lg:col-span-7 p-4 bg-warm-50/50">
          <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-[#FAF7F2] border border-warm-300/80 shadow-inner">
            <div ref={mapRef} className="w-full h-full absolute inset-0" />
            {!mapReady && (
              <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-semibold text-charcoal-600 border border-warm-200 animate-pulse">
                  Connecting to real-time telemetry stream…
                </div>
              </div>
            )}
            {mapReady && (
              <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-warm-300 text-[11px] font-semibold text-charcoal-800 shadow-2xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live GPS &bull; Speed: {activeTrip.telemetry.speedKmh} km/h</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Active Convoys List */}
        <div className="lg:col-span-5 p-4 space-y-3 bg-white/95">
          {/* Active Trip Telemetry Card */}
          <div className="p-3.5 rounded-2xl border border-terracotta-200 bg-terracotta-50/20 space-y-2.5 transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-charcoal-900 text-white flex items-center justify-center">
                  <Car className="w-4 h-4 text-warm-200" />
                </div>
                <div>
                  <div className="font-bold text-xs text-charcoal-900 font-serif">
                    {activeTrip.driver.name} &bull; {activeTrip.vehicle.model}
                  </div>
                  <div className="text-[11px] font-mono text-terracotta-700 font-bold">
                    {activeTrip.vehicle.plateNumber}
                  </div>
                </div>
              </div>
              <StatusBadge status={activeTrip.status} size="sm" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-warm-200/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400 block">
                  Mileage Progress
                </span>
                <span className="font-bold text-charcoal-900">
                  {activeTrip.telemetry.actualDistanceKm.toFixed(1)} km{' '}
                  <span className="text-charcoal-400 font-normal">
                    / {activeTrip.telemetry.plannedDistanceKm.toFixed(1)} km
                  </span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-charcoal-400 block">
                  ETA to Venue
                </span>
                <span className="font-bold text-charcoal-900">{etaMin} min</span>
              </div>
            </div>
          </div>

          {/* Other Vehicles in Event Fleet */}
          {[
            {
              plate: 'GJ 01 CD 5678',
              model: 'Toyota Innova Crysta',
              driver: 'Amit Patel',
              status: 'ARRIVED',
              distance: '8.2 km / 8.2 km',
              eta: 'Arrived',
            },
            {
              plate: 'GJ 27 EF 9012',
              model: 'Toyota Camry Hybrid',
              driver: 'Suresh Kumar',
              status: 'SCHEDULED',
              distance: '0.0 km / 14.0 km',
              eta: '10:00 AM',
            },
          ].map((v, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl border border-warm-200/90 hover:border-warm-300 bg-warm-50/30 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-warm-100 border border-warm-200 flex items-center justify-center">
                  <Car className="w-4 h-4 text-charcoal-600" />
                </div>
                <div>
                  <div className="font-bold text-xs text-charcoal-900">{v.plate}</div>
                  <div className="text-[11px] text-charcoal-500">
                    {v.model} &bull; {v.driver}
                  </div>
                </div>
              </div>
              <div className="text-right space-y-0.5">
                <StatusBadge status={v.status} size="sm" />
                <div className="text-[10px] text-charcoal-400 font-medium">{v.eta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

