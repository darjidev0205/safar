'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Navigation,
  MapPin,
  Compass,
  ExternalLink,
  WifiOff,
  AlertTriangle,
  LocateFixed,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { loadGoogleMaps, getGoogleMapsApiKey } from '../../lib/google-maps';
import {
  LatLng,
  calculateRoute,
  shouldRecalculateRoute,
  RouteResult,
} from '../../lib/location-service';
import { AnimatedDriverMarker } from '../../lib/marker-animator';

export { type LatLng };

interface GoogleMapViewProps {
  /** Optional live driver/vehicle position */
  driverLocation?: LatLng;
  /** Pickup/origin coordinates (required) */
  pickupLocation: LatLng;
  /** Drop/destination coordinates (required) */
  destinationLocation: LatLng;
  pickupName?: string;
  destinationName?: string;
  /** Heading in degrees for the driver arrow marker */
  driverHeading?: number;
  vehicleModel?: string;
  /** Show the live GPS telemetry pill */
  isLiveTracking?: boolean;
  /** Timestamp of the last received driver GPS ping */
  lastPingAt?: string | number | Date;
  /** Whether to request and render a driving route */
  showRoute?: boolean;
  /** Real GPS breadcrumb path driven by vehicle */
  breadcrumbs?: LatLng[];
  /** Override container classes (height MUST be set by caller) */
  className?: string;
}

/** SAFAR warm map style — matches the luxury Indian wedding brand aesthetic */
const SAFAR_MAP_STYLES = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#fbf9f4' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e5ecf0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f5efe6' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b5b4a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8f0e5' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d4c4b0' }] },
];

export function GoogleMapView({
  driverLocation,
  pickupLocation,
  destinationLocation,
  pickupName = 'Pickup Point',
  destinationName = 'Ceremony Venue',
  driverHeading = 0,
  vehicleModel = 'Vehicle',
  isLiveTracking = false,
  lastPingAt,
  showRoute = true,
  breadcrumbs = [],
  className = 'w-full h-full min-h-[260px] sm:min-h-[340px]',
}: GoogleMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverAnimatorRef = useRef<AnimatedDriverMarker | null>(null);
  const routePolylineRef = useRef<any>(null);
  const breadcrumbsPolylineRef = useRef<any>(null);

  // Smart route refresh tracking
  const lastRouteCalculationRef = useRef<{
    position: LatLng;
    timeMs: number;
  } | null>(null);

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'no-key'>('loading');
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);

  const apiKey = getGoogleMapsApiKey();

  // Stale location detection (Requirement 25: >120s old)
  const isStale = (() => {
    if (!lastPingAt) return false;
    const pingTime = new Date(lastPingAt).getTime();
    if (isNaN(pingTime)) return false;
    const diffSeconds = (Date.now() - pingTime) / 1000;
    return diffSeconds > 120;
  })();

  const staleTimeAgo = (() => {
    if (!lastPingAt) return '';
    const pingTime = new Date(lastPingAt).getTime();
    if (isNaN(pingTime)) return '';
    const minutes = Math.max(1, Math.round((Date.now() - pingTime) / 60000));
    return `${minutes} min ago`;
  })();

  // External Google Maps directions URL for "Navigate" button
  const currentOrigin = driverLocation ?? pickupLocation;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${currentOrigin.lat},${currentOrigin.lng}`
  )}&destination=${encodeURIComponent(
    `${destinationLocation.lat},${destinationLocation.lng}`
  )}&travelmode=driving`;

  /** Fit bounds to show all active markers */
  const fitMapBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const goog = (window as any).google;
    if (!goog?.maps?.LatLngBounds) return;

    const bounds = new goog.maps.LatLngBounds();
    bounds.extend({ lat: pickupLocation.lat, lng: pickupLocation.lng });
    bounds.extend({ lat: destinationLocation.lat, lng: destinationLocation.lng });
    if (driverLocation) {
      bounds.extend({ lat: driverLocation.lat, lng: driverLocation.lng });
    }
    mapInstanceRef.current.fitBounds(bounds, 50);
  }, [pickupLocation, destinationLocation, driverLocation]);

  /** Draw or update route polyline using smart cached RouteResult */
  const updateRoute = useCallback(
    async (origin: LatLng, dest: LatLng, forceRefresh = false) => {
      if (!mapInstanceRef.current || !showRoute) return;
      const goog = (window as any).google;

      const shouldUpdate =
        forceRefresh ||
        !lastRouteCalculationRef.current ||
        shouldRecalculateRoute({
          lastCalculatedPosition: lastRouteCalculationRef.current.position,
          currentPosition: origin,
          lastCalculationTimeMs: lastRouteCalculationRef.current.timeMs,
          displacementThresholdMeters: 250,
          timeIntervalSeconds: 60,
        });

      if (!shouldUpdate) return;

      try {
        const routeData = await calculateRoute(origin, dest);
        setRouteInfo(routeData);
        lastRouteCalculationRef.current = {
          position: origin,
          timeMs: Date.now(),
        };

        if (routePolylineRef.current) {
          routePolylineRef.current.setMap(null);
        }

        routePolylineRef.current = new goog.maps.Polyline({
          path: routeData.polylinePath,
          geodesic: true,
          strokeColor: '#C86D51',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map: mapInstanceRef.current,
          zIndex: 6,
        });
      } catch (err) {
        console.warn('Smart route update note:', err);
      }
    },
    [showRoute]
  );

  /** Initialize Google Map */
  const initMap = useCallback(async () => {
    if (!mapContainerRef.current) return;
    const goog = (window as any).google;
    if (!goog?.maps?.Map) return;

    try {
      const center = driverLocation ?? pickupLocation;

      const map = new goog.maps.Map(mapContainerRef.current, {
        center: { lat: center.lat, lng: center.lng },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: goog.maps.ControlPosition.RIGHT_CENTER },
        gestureHandling: 'cooperative',
        styles: SAFAR_MAP_STYLES,
      });
      mapInstanceRef.current = map;

      // Pickup marker (gold circle with white center)
      new goog.maps.Marker({
        position: { lat: pickupLocation.lat, lng: pickupLocation.lng },
        map,
        title: pickupName,
        icon: {
          path: goog.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#C49E64',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        zIndex: 10,
      });

      // Destination marker (terracotta pin)
      new goog.maps.Marker({
        position: { lat: destinationLocation.lat, lng: destinationLocation.lng },
        map,
        title: destinationName,
        icon: {
          path: goog.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#C86D51',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        zIndex: 10,
      });

      // Live driver marker with Smooth Animator
      driverAnimatorRef.current = new AnimatedDriverMarker({
        map,
        initialPosition: driverLocation || null,
        initialHeading: driverHeading,
        vehicleTitle: vehicleModel,
        iconColor: '#0f172a',
      });

      // Initial route calculation
      if (showRoute) {
        const routeOrigin = driverLocation ?? pickupLocation;
        await updateRoute(routeOrigin, destinationLocation, true);
      }

      fitMapBounds();
    } catch (err) {
      console.error('Error initializing map:', err);
      throw err;
    }
  }, [
    pickupLocation,
    destinationLocation,
    driverLocation,
    pickupName,
    destinationName,
    driverHeading,
    vehicleModel,
    showRoute,
    updateRoute,
    fitMapBounds,
  ]);

  // Boot: load SDK then init map
  useEffect(() => {
    if (!apiKey) {
      setLoadState('no-key');
      return;
    }
    setLoadState('loading');
    let isCancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (!isCancelled) {
          initMap()
            .then(() => {
              if (!isCancelled) setLoadState('ready');
            })
            .catch(() => {
              if (!isCancelled) setLoadState('error');
            });
        }
      })
      .catch((err) => {
        console.warn('Google Maps SDK load error:', err);
        if (!isCancelled) setLoadState('error');
      });

    return () => {
      isCancelled = true;
      if (driverAnimatorRef.current) {
        driverAnimatorRef.current.destroy();
        driverAnimatorRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
      }
      if (breadcrumbsPolylineRef.current) {
        breadcrumbsPolylineRef.current.setMap(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly glide driver marker on GPS updates (Requirement 8)
  useEffect(() => {
    if (loadState !== 'ready' || !driverAnimatorRef.current || !driverLocation) return;

    driverAnimatorRef.current.moveTo(driverLocation, driverHeading, {
      durationMs: 2000,
    });

    // Check smart route refresh
    if (showRoute) {
      updateRoute(driverLocation, destinationLocation, false);
    }
  }, [driverLocation, driverHeading, loadState, destinationLocation, showRoute, updateRoute]);

  // Update real GPS breadcrumb polyline
  useEffect(() => {
    if (loadState !== 'ready' || !mapInstanceRef.current) return;
    const goog = (window as any).google;

    if (!breadcrumbs || breadcrumbs.length < 2) {
      if (breadcrumbsPolylineRef.current) {
        breadcrumbsPolylineRef.current.setMap(null);
        breadcrumbsPolylineRef.current = null;
      }
      return;
    }

    const pathCoords = breadcrumbs.map((p) => ({ lat: p.lat, lng: p.lng }));

    if (breadcrumbsPolylineRef.current) {
      breadcrumbsPolylineRef.current.setPath(pathCoords);
    } else {
      breadcrumbsPolylineRef.current = new goog.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#087F76',
        strokeOpacity: 0.85,
        strokeWeight: 3.5,
        map: mapInstanceRef.current,
        zIndex: 8,
      });
    }
  }, [breadcrumbs, loadState]);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-[#F4EFE6] border border-[#E5DACB]/80 shadow-inner ${className}`}
    >
      {/* Real Google Map container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full absolute inset-0 transition-opacity duration-300 ${
          loadState === 'ready' ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Loading state — stylised fallback canvas */}
      {loadState === 'loading' && (
        <div className="w-full h-full absolute inset-0">
          <FallbackCanvas
            pickupName={pickupName}
            destinationName={destinationName}
            driverLocation={driverLocation}
            driverHeading={driverHeading}
          />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-[#E5DACB] shadow-xs">
            <div className="w-2 h-2 rounded-full bg-terracotta-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-charcoal-700 uppercase tracking-wider">
              Loading Google Maps…
            </span>
          </div>
        </div>
      )}

      {/* No API key configured */}
      {loadState === 'no-key' && (
        <div className="w-full h-full absolute inset-0">
          <FallbackCanvas
            pickupName={pickupName}
            destinationName={destinationName}
            driverLocation={driverLocation}
            driverHeading={driverHeading}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-warm-50/70 backdrop-blur-sm p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <p className="text-xs font-semibold text-charcoal-700 max-w-[220px]">
              Google Maps API key not configured.
            </p>
          </div>
        </div>
      )}

      {/* Load error */}
      {loadState === 'error' && (
        <div className="w-full h-full absolute inset-0">
          <FallbackCanvas
            pickupName={pickupName}
            destinationName={destinationName}
            driverLocation={driverLocation}
            driverHeading={driverHeading}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-warm-50/70 backdrop-blur-sm p-4 text-center">
            <WifiOff className="w-6 h-6 text-charcoal-500" />
            <p className="text-xs font-semibold text-charcoal-700 max-w-[220px]">
              Map unavailable.{' '}
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta-600 underline font-semibold"
              >
                Open in Google Maps
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Floating Controls Bar (Top Right) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {/* Recenter button */}
        {loadState === 'ready' && (
          <button
            type="button"
            onClick={fitMapBounds}
            className="p-2 rounded-full bg-white/90 backdrop-blur-sm text-charcoal-700 hover:text-terracotta-700 shadow-xs border border-[#E5DACB] active:scale-95 transition-all"
            title="Recenter Map View"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>
        )}

        {/* External Google Maps directions */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-charcoal-800 hover:text-terracotta-700 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all border border-[#E5DACB]"
          title="Open in Google Maps App"
        >
          <Compass className="w-3.5 h-3.5 text-terracotta-600" />
          <span>Navigate</span>
          <ExternalLink className="w-3 h-3 text-charcoal-400" />
        </a>
      </div>

      {/* Bottom Floating Telemetry & Status Badges */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        {/* Left: GPS Live or Stale Status */}
        {isLiveTracking && loadState === 'ready' && (
          <div className="pointer-events-auto">
            {isStale ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/95 backdrop-blur-sm border border-amber-300 text-amber-800 shadow-xs">
                <Clock className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Driver location updating… ({staleTimeAgo})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-[#E5DACB] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 -ml-2.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-800">
                  Live GPS
                </span>
              </div>
            )}
          </div>
        )}

        {/* Right: Route Distance / ETA Pill */}
        {routeInfo && (
          <div className="pointer-events-auto ml-auto px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-[#E5DACB] shadow-xs flex items-center gap-2 text-[11px] font-semibold text-charcoal-800">
            <span>{routeInfo.distanceText}</span>
            <span className="text-charcoal-300">&bull;</span>
            <span className="text-terracotta-700 font-bold">{routeInfo.durationText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback stylised SVG canvas shown during loading / on error
// ─────────────────────────────────────────────────────────────────────────────
function FallbackCanvas({
  pickupName,
  destinationName,
  driverLocation,
  driverHeading,
}: {
  pickupName?: string;
  destinationName?: string;
  driverLocation?: LatLng;
  driverHeading?: number;
}) {
  return (
    <div className="w-full h-full absolute inset-0">
      <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="roadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E2D7C8" strokeWidth="1" />
            <circle cx="30" cy="30" r="1.5" fill="#D7C9B5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#roadGrid)" />
        <path d="M-50,180 Q100,120 250,220 T550,160" fill="none" stroke="#DCE6EB" strokeWidth="28" strokeLinecap="round" />
        <path d="M 50,260 C 130,220 180,180 220,120 S 320,80 380,50" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <path d="M 60,250 C 140,210 190,170 230,120 S 330,85 370,60" fill="none" stroke="#C86D51" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 5" />
      </svg>

      {/* Pickup pin */}
      <div className="absolute left-[15%] bottom-[20%] flex flex-col items-center -translate-x-1/2">
        <div className="w-8 h-8 rounded-full bg-[#C49E64] border-2 border-white shadow-md flex items-center justify-center animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
        <div className="mt-1 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-charcoal-800 shadow-2xs border border-[#E5DACB] max-w-[120px] truncate text-center">
          {pickupName}
        </div>
      </div>

      {/* Destination pin */}
      <div className="absolute right-[18%] top-[14%] flex flex-col items-center translate-x-1/2">
        <div className="w-9 h-9 rounded-full bg-[#C86D51] border-2 border-white shadow-md flex items-center justify-center">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <div className="mt-1 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-charcoal-800 shadow-2xs border border-[#E5DACB] max-w-[140px] truncate text-center">
          {destinationName}
        </div>
      </div>

      {/* Driver pin */}
      {driverLocation && (
        <div
          className="absolute left-[45%] top-[42%] flex flex-col items-center -translate-x-1/2"
          style={{ transform: `rotate(${(driverHeading ?? 0) - 45}deg)` }}
        >
          <div className="w-10 h-10 rounded-full bg-charcoal-900 border-2 border-white shadow-lg flex items-center justify-center">
            <Navigation className="w-4 h-4 text-warm-100 transform -rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
