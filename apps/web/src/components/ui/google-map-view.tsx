'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Navigation, MapPin, Compass, ExternalLink, RefreshCw } from 'lucide-react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GoogleMapViewProps {
  driverLocation?: Coordinates;
  pickupLocation: Coordinates;
  destinationLocation: Coordinates;
  pickupName?: string;
  destinationName?: string;
  driverHeading?: number;
  vehicleModel?: string;
  isLiveTracking?: boolean;
  className?: string;
}

export function GoogleMapView({
  driverLocation,
  pickupLocation,
  destinationLocation,
  pickupName = 'Pickup Point',
  destinationName = 'Ceremony Venue',
  driverHeading = 45,
  vehicleModel = 'Vehicle',
  isLiveTracking = true,
  className = 'w-full h-full min-h-[260px] sm:min-h-[340px]',
}: GoogleMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // External Google Maps directions URL
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    `${pickupLocation.lat},${pickupLocation.lng}`
  )}&destination=${encodeURIComponent(
    `${destinationLocation.lat},${destinationLocation.lng}`
  )}&travelmode=driving`;

  // Dynamically load Google Maps script if API key is present
  useEffect(() => {
    if (!apiKey) {
      setGoogleAvailable(false);
      return;
    }

    if ((window as any).google?.maps) {
      setGoogleAvailable(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,routes`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleAvailable(true);
      script.onerror = () => setGoogleAvailable(false);
      document.head.appendChild(script);
    }
  }, [apiKey]);

  // Initialize real Google Map if available
  useEffect(() => {
    if (googleAvailable && mapContainerRef.current && (window as any).google?.maps) {
      try {
        const google = (window as any).google;
        const center = driverLocation || pickupLocation;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ color: '#fbf9f4' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e5ecf0' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#ffffff' }],
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#555555' }],
            },
          ],
        });

        // Pickup Marker
        new google.maps.Marker({
          position: pickupLocation,
          map,
          title: pickupName,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#C49E64',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        // Destination Marker
        new google.maps.Marker({
          position: destinationLocation,
          map,
          title: destinationName,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#C86D51',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        // Driver Marker (Live Vehicle)
        if (driverLocation) {
          new google.maps.Marker({
            position: driverLocation,
            map,
            title: vehicleModel,
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 7,
              rotation: driverHeading,
              fillColor: '#1F2421',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
          });
        }

        setMapLoaded(true);
      } catch (err) {
        console.warn('Google Maps initialization fallback to interactive canvas', err);
        setGoogleAvailable(false);
      }
    }
  }, [googleAvailable, driverLocation, pickupLocation, destinationLocation]);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-[#F4EFE6] border border-[#E5DACB]/80 shadow-inner ${className}`}>
      {/* Container for Google Map instance */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* High-fidelity fallback / stylized vector route canvas when API key is loading or offline */}
      {(!googleAvailable || !mapLoaded) && (
        <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-4 select-none">
          {/* Subtle map road network grid vector */}
          <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="roadGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#E2D7C8" strokeWidth="1" />
                <circle cx="30" cy="30" r="1.5" fill="#D7C9B5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#roadGrid)" />

            {/* Simulated River / Waterway */}
            <path
              d="M-50,180 Q100,120 250,220 T550,160"
              fill="none"
              stroke="#DCE6EB"
              strokeWidth="28"
              strokeLinecap="round"
            />

            {/* Major Arterial Route Path */}
            <path
              d="M 50,260 C 130,220 180,180 220,120 S 320,80 380,50"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="8"
              strokeLinecap="round"
            />

            {/* Live Navigation Route with animated dash */}
            <path
              d="M 60,250 C 140,210 190,170 230,120 S 330,85 370,60"
              fill="none"
              stroke="#C86D51"
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-route-dash"
            />
          </svg>

          {/* Pickup Point Pin on Canvas */}
          <div className="absolute left-[15%] bottom-[20%] flex flex-col items-center -translate-x-1/2">
            <div className="w-8 h-8 rounded-full bg-gold-500 border-2 border-white shadow-md flex items-center justify-center animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <div className="mt-1 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-charcoal-800 shadow-2xs border border-[#E5DACB] max-w-[120px] truncate text-center">
              {pickupName}
            </div>
          </div>

          {/* Destination Venue Pin on Canvas */}
          <div className="absolute right-[18%] top-[14%] flex flex-col items-center translate-x-1/2">
            <div className="w-9 h-9 rounded-full bg-burgundy-700 border-2 border-white shadow-md flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="mt-1 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-charcoal-800 shadow-2xs border border-[#E5DACB] max-w-[140px] truncate text-center">
              {destinationName}
            </div>
          </div>

          {/* Driver Vehicle Pin on Canvas */}
          {driverLocation && (
            <div
              className="absolute left-[45%] top-[42%] flex flex-col items-center -translate-x-1/2 transition-all duration-1000"
              style={{ transform: `rotate(${driverHeading - 45}deg)` }}
            >
              <div className="w-10 h-10 rounded-full bg-charcoal-900 border-2 border-white shadow-lg flex items-center justify-center">
                <Navigation className="w-4 h-4 text-warm-100 transform -rotate-45" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Map Utility Bar (Apple Glass) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <a
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full apple-glass-floating text-[11px] font-semibold text-charcoal-800 hover:text-terracotta-700 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
          title="Open in Google Maps App"
        >
          <Compass className="w-3.5 h-3.5 text-terracotta-600" />
          <span>Google Maps</span>
          <ExternalLink className="w-3 h-3 text-charcoal-400" />
        </a>
      </div>

      {/* Live Telemetry Pill */}
      {isLiveTracking && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full apple-glass-floating shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 -ml-2.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-800">
            GPS Signal Active
          </span>
        </div>
      )}
    </div>
  );
}
