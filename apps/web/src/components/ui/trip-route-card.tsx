'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navigation, MapPin, Clock, Ruler, ExternalLink, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '../../lib/google-maps';
import { GoogleMapView, LatLng } from './google-map-view';

export interface TripLocation {
  placeId?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
}

interface TripRouteCardProps {
  pickup: TripLocation;
  destination: TripLocation;
  driverLocation?: LatLng;
  /** Show the Navigate button */
  showNavigate?: boolean;
  /** Map height class e.g. "h-[260px]" */
  mapHeightClass?: string;
  /** Additional vehicle info to show */
  vehicleModel?: string;
  className?: string;
}

interface RouteInfo {
  distanceText: string;
  durationText: string;
  durationValue: number; // seconds
}

/**
 * SAFAR — Reusable Trip Route Card
 *
 * Shows a Google Map with pickup → destination route,
 * plus structured distance / ETA details below.
 * Used by Host trip planner, Driver dashboard, Guest ride view.
 */
export function TripRouteCard({
  pickup,
  destination,
  driverLocation,
  showNavigate = true,
  mapHeightClass = 'h-[220px]',
  vehicleModel,
  className = '',
}: TripRouteCardProps) {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState(false);

  const pickupLatLng: LatLng = { lat: pickup.latitude, lng: pickup.longitude };
  const destLatLng: LatLng = { lat: destination.latitude, lng: destination.longitude };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${pickup.latitude},${pickup.longitude}`
  )}&destination=${encodeURIComponent(
    `${destination.latitude},${destination.longitude}`
  )}&travelmode=driving`;

  const fetchRoute = useCallback(async () => {
    setRouteLoading(true);
    setRouteError(false);

    try {
      await loadGoogleMaps();
      const goog = (window as any).google;
      const service = new goog.maps.DistanceMatrixService();

      service.getDistanceMatrix(
        {
          origins: [{ lat: pickup.latitude, lng: pickup.longitude }],
          destinations: [{ lat: destination.latitude, lng: destination.longitude }],
          travelMode: goog.maps.TravelMode.DRIVING,
          unitSystem: goog.maps.UnitSystem.METRIC,
        },
        (response: any, status: string) => {
          if (status === 'OK') {
            const element = response?.rows?.[0]?.elements?.[0];
            if (element?.status === 'OK') {
              setRouteInfo({
                distanceText: element.distance.text,
                durationText: element.duration.text,
                durationValue: element.duration.value,
              });
            } else {
              setRouteError(true);
            }
          } else {
            setRouteError(true);
          }
          setRouteLoading(false);
        }
      );
    } catch {
      setRouteError(true);
      setRouteLoading(false);
    }
  }, [pickup.latitude, pickup.longitude, destination.latitude, destination.longitude]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  return (
    <div className={`rounded-3xl bg-white border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06)] overflow-hidden ${className}`}>
      {/* Map */}
      <GoogleMapView
        pickupLocation={pickupLatLng}
        destinationLocation={destLatLng}
        driverLocation={driverLocation}
        pickupName={pickup.name}
        destinationName={destination.name}
        vehicleModel={vehicleModel}
        showRoute={true}
        isLiveTracking={!!driverLocation}
        className={`w-full ${mapHeightClass} rounded-none rounded-t-3xl`}
      />

      {/* Route info strip */}
      <div className="px-4 py-3.5 border-t border-[#E8E2D9] bg-warm-50/60">
        {/* Pickup → Destination labels */}
        <div className="flex items-start gap-2 mb-3">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gold-500 shrink-0" />
            <div className="w-px flex-1 bg-warm-300 min-h-[16px]" />
            <MapPin className="w-3 h-3 text-terracotta-600 shrink-0" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Pickup</p>
              <p className="text-xs font-bold text-charcoal-900 leading-tight">{pickup.name}</p>
              {pickup.address && (
                <p className="text-[11px] text-charcoal-500 truncate">{pickup.address}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Destination</p>
              <p className="text-xs font-bold text-charcoal-900 leading-tight">{destination.name}</p>
              {destination.address && (
                <p className="text-[11px] text-charcoal-500 truncate">{destination.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Distance & ETA row */}
        <div className="flex items-center justify-between pt-2 border-t border-warm-200/80">
          <div className="flex items-center gap-3 text-xs">
            {routeLoading ? (
              <div className="flex items-center gap-1.5 text-charcoal-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px]">Calculating route…</span>
              </div>
            ) : routeError ? (
              <span className="text-[11px] text-charcoal-400">Route info unavailable</span>
            ) : routeInfo ? (
              <>
                <div className="flex items-center gap-1 text-charcoal-700">
                  <Ruler className="w-3.5 h-3.5 text-charcoal-400" />
                  <span className="font-bold">{routeInfo.distanceText}</span>
                </div>
                <span className="text-charcoal-300">•</span>
                <div className="flex items-center gap-1 text-charcoal-700">
                  <Clock className="w-3.5 h-3.5 text-charcoal-400" />
                  <span className="font-bold">{routeInfo.durationText}</span>
                </div>
              </>
            ) : null}
          </div>

          {showNavigate && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
            >
              <Navigation className="w-3 h-3" />
              Navigate
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
