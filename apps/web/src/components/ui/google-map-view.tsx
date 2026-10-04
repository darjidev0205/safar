'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation, MapPin, Compass, ExternalLink, WifiOff, AlertTriangle } from 'lucide-react';
import { loadGoogleMaps, getGoogleMapsApiKey } from '../../lib/google-maps';

export interface LatLng {
  lat: number;
  lng: number;
}

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
  /** Whether to request and render a driving route via DirectionsService */
  showRoute?: boolean;
  /** Real GPS breadcrumb path driven by vehicle */
  breadcrumbs?: LatLng[];
  /** Override container classes (height MUST be set by caller) */
  className?: string;
}

/** SAFAR warm map style — matches the brand color palette */
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
  showRoute = true,
  breadcrumbs = [],
  className = 'w-full h-full min-h-[260px] sm:min-h-[340px]',
}: GoogleMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const breadcrumbsPolylineRef = useRef<any>(null);

  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'no-key'>('loading');

  const apiKey = getGoogleMapsApiKey();

  // External Google Maps directions URL for "Navigate" button
  const currentOrigin = driverLocation ?? pickupLocation;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${currentOrigin.lat},${currentOrigin.lng}`
  )}&destination=${encodeURIComponent(
    `${destinationLocation.lat},${destinationLocation.lng}`
  )}&travelmode=driving`;

  /** Create or update driver marker */
  const upsertDriverMarker = useCallback(
    (map: any, goog: any, location: LatLng) => {
      try {
        const icon = {
          path: goog.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          rotation: driverHeading,
          fillColor: '#0f172a',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        };
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setPosition(location);
          driverMarkerRef.current.setIcon(icon);
        } else {
          driverMarkerRef.current = new goog.maps.Marker({
            position: location,
            map,
            title: vehicleModel,
            icon,
            zIndex: 10,
          });
        }
      } catch (e) {
        console.warn('Driver marker update notice:', e);
      }
    },
    [driverHeading, vehicleModel]
  );

  /** Initialize real Google Map */
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

      // Pickup marker (gold circle)
      new goog.maps.Marker({
        position: pickupLocation,
        map,
        title: pickupName,
        icon: {
          path: goog.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#C49E64',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        zIndex: 5,
      });

      // Destination marker (terracotta arrow)
      new goog.maps.Marker({
        position: destinationLocation,
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
        zIndex: 5,
      });

      // Driver marker
      if (driverLocation) {
        upsertDriverMarker(map, goog, driverLocation);
      }

      // Route via DirectionsService
      if (showRoute && goog.maps.DirectionsService) {
        const directionsService = new goog.maps.DirectionsService();
        const renderer = new goog.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#C86D51',
            strokeOpacity: 0.85,
            strokeWeight: 4,
          },
        });
        renderer.setMap(map);
        directionsRendererRef.current = renderer;

        directionsService.route(
          {
            origin: pickupLocation,
            destination: destinationLocation,
            travelMode: goog.maps.TravelMode.DRIVING,
          },
          (result: any, status: string) => {
            if (status === 'OK' && result) {
              renderer.setDirections(result);
            } else {
              // Fit bounds manually when directions API returns non-OK
              const bounds = new goog.maps.LatLngBounds();
              bounds.extend(pickupLocation);
              bounds.extend(destinationLocation);
              if (driverLocation) bounds.extend(driverLocation);
              map.fitBounds(bounds, 60);
            }
          }
        );
      } else {
        const bounds = new goog.maps.LatLngBounds();
        bounds.extend(pickupLocation);
        bounds.extend(destinationLocation);
        if (driverLocation) bounds.extend(driverLocation);
        map.fitBounds(bounds, 60);
      }
    } catch (mapErr) {
      console.error('Error initializing map:', mapErr);
      throw mapErr;
    }
  }, [pickupLocation, destinationLocation, driverLocation, pickupName, destinationName, showRoute, upsertDriverMarker]);

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
        console.warn('Google Maps SDK load warning:', err);
        if (!isCancelled) setLoadState('error');
      });

    return () => {
      isCancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update driver marker when its prop changes (no full reinit)
  useEffect(() => {
    if (loadState !== 'ready' || !mapInstanceRef.current || !driverLocation) return;
    const goog = (window as any).google;
    upsertDriverMarker(mapInstanceRef.current, goog, driverLocation);
  }, [driverLocation, loadState, upsertDriverMarker]);

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
        strokeOpacity: 0.9,
        strokeWeight: 4,
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

      {/* Loading state — show stylised fallback canvas */}
      {loadState === 'loading' && (
        <div className="w-full h-full absolute inset-0">
          <FallbackCanvas
            pickupName={pickupName}
            destinationName={destinationName}
            driverLocation={driverLocation}
            driverHeading={driverHeading}
          />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-[#E5DACB] shadow-xs">
            <div className="w-2 h-2 rounded-full bg-terracotta-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-charcoal-700 uppercase tracking-wider">Loading Map…</span>
          </div>
        </div>
      )}

      {/* No API key */}
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
            <p className="text-xs font-semibold text-charcoal-700 max-w-[200px]">
              Map API key not configured.
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
            <p className="text-xs font-semibold text-charcoal-700 max-w-[200px]">
              Map unavailable.{' '}
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta-600 underline"
              >
                Open in Google Maps
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Floating Navigate button */}
      <div className="absolute top-3 right-3 z-10">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-semibold text-charcoal-800 hover:text-terracotta-700 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all border border-[#E5DACB]"
          title="Open in Google Maps"
        >
          <Compass className="w-3.5 h-3.5 text-terracotta-600" />
          <span>Navigate</span>
          <ExternalLink className="w-3 h-3 text-charcoal-400" />
        </a>
      </div>

      {/* Live GPS pill */}
      {isLiveTracking && loadState === 'ready' && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-[#E5DACB] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 -ml-2.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-800">GPS Live</span>
        </div>
      )}
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
        <div className="w-8 h-8 rounded-full bg-gold-500 border-2 border-white shadow-md flex items-center justify-center animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
        <div className="mt-1 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-charcoal-800 shadow-2xs border border-[#E5DACB] max-w-[120px] truncate text-center">
          {pickupName}
        </div>
      </div>

      {/* Destination pin */}
      <div className="absolute right-[18%] top-[14%] flex flex-col items-center translate-x-1/2">
        <div className="w-9 h-9 rounded-full bg-terracotta-500 border-2 border-white shadow-md flex items-center justify-center">
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
