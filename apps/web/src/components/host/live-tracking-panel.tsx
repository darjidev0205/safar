'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Navigation, LocateFixed } from 'lucide-react';
import { SectionHeader } from './section-header';
import { VehicleCard, VehicleCardData } from './vehicle-card';
import { loadGoogleMaps } from '../../lib/google-maps';
import { useRealtimeTrip } from '../../lib/use-realtime-trip';
import { StarFlourish } from '../ui/botanical-ornaments';

interface LiveTrackingPanelProps {
  onOpenLiveMap?: () => void;
  className?: string;
}

const MAP_STYLES = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#fbf9f4' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e5ecf0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b5b4a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

export function LiveTrackingPanel({ onOpenLiveMap, className = '' }: LiveTrackingPanelProps) {
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
          zoomControl: true,
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

  // Update marker position and heading in real-time when GPS coordinates change
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

  // Consistent vehicle fleet roster for live dashboard
  const vehicles: VehicleCardData[] = [
    {
      driverName: activeTrip.driver.name || 'Rahul Patel',
      vehicleModel: activeTrip.vehicle.model || 'Toyota Innova Crysta',
      plateNumber: activeTrip.vehicle.plateNumber || 'GJ 01 AB 1234',
      status: activeTrip.status || 'IN_TRANSIT',
      actualDistanceKm: activeTrip.telemetry.actualDistanceKm || 12.7,
      plannedDistanceKm: activeTrip.telemetry.plannedDistanceKm || 23.5,
      eta: etaMin,
      isSelected: true,
    },
    {
      driverName: 'Amit Patel',
      vehicleModel: 'Toyota Innova Crysta',
      plateNumber: 'GJ 01 CD 5678',
      status: 'ARRIVED',
      actualDistanceKm: 8.2,
      plannedDistanceKm: 8.2,
      eta: 'Arrived',
      isSelected: false,
    },
    {
      driverName: 'Suresh Kumar',
      vehicleModel: 'Toyota Camry Hybrid',
      plateNumber: 'GJ 27 EF 9012',
      status: 'SCHEDULED',
      actualDistanceKm: 0.0,
      plannedDistanceKm: 14.0,
      eta: '10:00 AM',
      isSelected: false,
    },
  ];

  return (
    <div
      className={`rounded-3xl bg-white border border-[#E8E2D9] shadow-card overflow-hidden font-sans ${className}`}
    >
      {/* Panel Header */}
      <div className="px-6 py-4.5 border-b border-warm-200/80 bg-warm-50/60 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StarFlourish className="w-3 h-3 text-gold-600" />
            <h3 className="font-serif font-bold text-base text-charcoal-900 tracking-tight">
              Live Vehicle Tracking
            </h3>
          </div>
          <p className="text-xs text-charcoal-500 font-sans mt-0.5">
            Real-time GPS telemetry broadcast from active celebration chauffeurs
          </p>
        </div>

        <Link
          href="/host/live"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta-700 hover:text-terracotta-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Full GPS Console</span>
        </Link>
      </div>

      {/* Balanced Two-Column Layout: Left ~68% Map, Right ~32% Vehicle List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-warm-200/80 min-w-0">
        {/* Large Map Panel (68%) */}
        <div className="lg:col-span-8 p-4 sm:p-5 bg-warm-50/40 min-w-0">
          <div className="relative h-[340px] sm:h-[380px] w-full rounded-2xl overflow-hidden bg-[#FAF7F2] border border-warm-300/80 shadow-inner">
            <div ref={mapRef} className="w-full h-full absolute inset-0" />
            {!mapReady && (
              <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold text-charcoal-700 border border-warm-200 shadow-sm animate-pulse flex items-center gap-2">
                  <LocateFixed className="w-3.5 h-3.5 text-terracotta-600 animate-spin" />
                  <span>Connecting to real-time telemetry stream…</span>
                </div>
              </div>
            )}
            {mapReady && (
              <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-warm-300 text-xs font-semibold text-charcoal-800 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live GPS &bull; Speed: {activeTrip.telemetry.speedKmh} km/h</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle List Panel (32%) */}
        <div className="lg:col-span-4 p-4 sm:p-5 space-y-3 bg-white flex flex-col justify-start min-w-0">
          <div className="flex items-center justify-between text-xs text-charcoal-500 font-sans pb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-charcoal-400">
              Active Vehicles ({vehicles.length})
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              1 On Trip
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-0.5">
            {vehicles.map((v, idx) => (
              <VehicleCard key={idx} vehicle={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
