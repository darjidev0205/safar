'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Car,
  ExternalLink,
  Navigation,
  LocateFixed,
  Clock,
  Compass,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '../ui/status-badge';
import { StarFlourish } from '../ui/botanical-ornaments';
import { loadGoogleMaps } from '../../lib/google-maps';
import { useRealtimeTrip } from '../../lib/use-realtime-trip';
import { AnimatedDriverMarker } from '../../lib/marker-animator';
import { LatLng } from '../../lib/location-service';

interface LiveFleetMapCardProps {
  eventId?: string;
  onOpenLiveMap?: () => void;
}

interface FleetDriverItem {
  id: string;
  name: string;
  phone: string;
  vehicleModel: string;
  plateNumber: string;
  functionName: string;
  status: string;
  currentLat: number;
  currentLng: number;
  heading: number;
  speedKmh: number;
  distanceAwayKm: number;
  etaMinutes: number;
  isStale: boolean;
  staleSeconds: number | null;
  signalStatus: 'LIVE' | 'STALE';
}

const MAP_STYLES = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#fbf9f4' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e5ecf0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f5efe6' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b5b4a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

export function LiveFleetMapCard({ eventId, onOpenLiveMap }: LiveFleetMapCardProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkersMapRef = useRef<Map<string, any>>(new Map());
  const activeAnimatorRef = useRef<AnimatedDriverMarker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [fleetDrivers, setFleetDrivers] = useState<FleetDriverItem[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(true);

  // Fetch live fleet data from API
  const fetchLiveFleet = useCallback(async () => {
    if (!eventId) {
      setIsLoadingFleet(false);
      return;
    }
    try {
      const res = await fetch(`/api/events/${eventId}/live`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.vehicles)) {
          const mapped: FleetDriverItem[] = data.vehicles
            .filter((v: any) => v.currentLat && v.currentLng)
            .map((v: any) => ({
              id: v.vehicleId,
              name: v.driver?.name || 'Assigned Driver',
              phone: v.driver?.phone || '',
              vehicleModel: v.model,
              plateNumber: v.plateNumber,
              functionName: v.trip?.destination || 'Active Fleet Route',
              status: v.trip?.status || (v.driver?.dutyStatus === 'ON_DUTY' ? 'AVAILABLE' : 'OFF_DUTY'),
              currentLat: v.currentLat,
              currentLng: v.currentLng,
              heading: 0,
              speedKmh: 0,
              distanceAwayKm: v.trip?.remainingDistanceKm || 0,
              etaMinutes: Math.max(1, Math.round((v.trip?.remainingDistanceKm || 2) * 2.2)),
              isStale: Boolean(v.isStale),
              staleSeconds: v.staleSeconds,
              signalStatus: v.signalStatus || (v.isStale ? 'STALE' : 'LIVE'),
            }));
          setFleetDrivers(mapped);
          if (mapped.length > 0 && !selectedDriverId) {
            setSelectedDriverId(mapped[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching live fleet snapshot:', err);
    } finally {
      setIsLoadingFleet(false);
    }
  }, [eventId, selectedDriverId]);

  useEffect(() => {
    fetchLiveFleet();
    const interval = setInterval(fetchLiveFleet, 7000);
    return () => clearInterval(interval);
  }, [fetchLiveFleet]);

  const selectedDriver =
    fleetDrivers.find((d) => d.id === selectedDriverId) || fleetDrivers[0];

  // Initialize Map
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!mapRef.current) return;
        const goog = (window as any).google;

        const map = new goog.maps.Map(mapRef.current, {
          center: {
            lat: selectedDriver.currentLat,
            lng: selectedDriver.currentLng,
          },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: MAP_STYLES,
        });
        mapInstanceRef.current = map;

        // Render markers for all fleet drivers
        fleetDrivers.forEach((driver) => {
          const marker = new goog.maps.Marker({
            position: { lat: driver.currentLat, lng: driver.currentLng },
            map,
            title: `${driver.name} (${driver.vehicleModel})`,
            icon: {
              path: goog.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6.5,
              rotation: driver.heading,
              fillColor: driver.isStale ? '#94a3b8' : '#0f172a',
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            zIndex: 8,
          });
          driverMarkersMapRef.current.set(driver.id, marker);
        });

        setMapReady(true);
      })
      .catch((err) => console.warn('Host fleet map init notice:', err));
  }, []);

  // Update marker positions when fleetDrivers updates
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const goog = (window as any).google;
    if (!goog?.maps) return;

    fleetDrivers.forEach((driver) => {
      const existingMarker = driverMarkersMapRef.current.get(driver.id);
      if (existingMarker) {
        existingMarker.setPosition({ lat: driver.currentLat, lng: driver.currentLng });
      } else {
        const marker = new goog.maps.Marker({
          position: { lat: driver.currentLat, lng: driver.currentLng },
          map: mapInstanceRef.current,
          title: `${driver.name} (${driver.vehicleModel})`,
          icon: {
            path: goog.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6.5,
            rotation: driver.heading,
            fillColor: driver.isStale ? '#94a3b8' : '#0f172a',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 8,
        });
        driverMarkersMapRef.current.set(driver.id, marker);
      }
    });
  }, [fleetDrivers, mapReady]);

  // Focus map on selected driver (Requirement 29: Clicking a driver focuses map)
  const handleSelectDriver = (driver: FleetDriverItem) => {
    setSelectedDriverId(driver.id);
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.panTo({
      lat: driver.currentLat,
      lng: driver.currentLng,
    });
    mapInstanceRef.current.setZoom(14);
  };

  // Recenter map on all drivers
  const handleFitAll = () => {
    if (!mapInstanceRef.current || fleetDrivers.length === 0) return;
    const goog = (window as any).google;
    if (!goog?.maps?.LatLngBounds) return;

    const bounds = new goog.maps.LatLngBounds();
    fleetDrivers.forEach((d) => bounds.extend({ lat: d.currentLat, lng: d.currentLng }));
    mapInstanceRef.current.fitBounds(bounds, 40);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-[0_8px_30px_-4px_rgba(70,50,40,0.06),0_2px_6px_-1px_rgba(70,50,40,0.03)] overflow-hidden font-sans">
      {/* Top Panel Header */}
      <div className="px-5 py-4 border-b border-warm-200/80 flex items-center justify-between bg-warm-50/60">
        <div>
          <div className="flex items-center gap-1.5 font-serif font-bold text-sm text-charcoal-900">
            <StarFlourish className="w-2.5 h-2.5 text-gold-600" />
            <span>Live Transportation Fleet Tracking</span>
          </div>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Real-time GPS telemetry across ceremonial convoys &bull; Click any chauffeur to focus map
          </p>
        </div>

        <div className="flex items-center gap-2">
          {mapReady && (
            <button
              type="button"
              onClick={handleFitAll}
              className="px-3 py-1.5 rounded-full bg-white text-xs font-semibold text-charcoal-700 hover:text-terracotta-700 border border-warm-200 shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Fit Fleet</span>
            </button>
          )}

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-warm-200/80">
        {/* Map Container (7 cols) */}
        <div className="lg:col-span-7 p-4 bg-warm-50/50">
          <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-[#FAF7F2] border border-warm-300/80 shadow-inner">
            <div ref={mapRef} className="w-full h-full absolute inset-0" />
            {!mapReady && (
              <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-charcoal-600 border border-warm-200 animate-pulse">
                  Connecting to real-time telemetry stream…
                </div>
              </div>
            )}
            {mapReady && selectedDriver && (
              <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-warm-300 text-[11px] font-semibold text-charcoal-800 shadow-2xs flex items-center gap-2">
                {selectedDriver.isStale ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-amber-800 font-bold uppercase text-[9px] tracking-wider bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Stale Signal ({selectedDriver.staleSeconds ? Math.floor(selectedDriver.staleSeconds / 60) : 1}m ago)
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-800 font-bold uppercase text-[9px] tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Live
                    </span>
                  </span>
                )}
                <span>
                  Tracking: <strong className="text-terracotta-700">{selectedDriver.name}</strong> &bull; {selectedDriver.speedKmh} km/h
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Active Convoys List (5 cols) */}
        <div className="lg:col-span-5 p-4 space-y-3 bg-white/95">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-charcoal-400 px-1">
            <span>Active Event Fleet ({fleetDrivers.length})</span>
            {fleetDrivers.some((d) => d.isStale) && (
              <span className="text-amber-700 font-semibold lowercase">
                ({fleetDrivers.filter((d) => d.isStale).length} stale)
              </span>
            )}
          </div>

          {fleetDrivers.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-warm-200 bg-warm-50/40 space-y-2">
              <Car className="w-8 h-8 text-charcoal-300 mx-auto" />
              <div className="text-xs font-bold text-charcoal-700 font-serif">No Active Chauffeur Telemetry</div>
              <p className="text-[11px] text-charcoal-500 max-w-xs mx-auto">
                Vehicles and drivers will appear on this map as soon as drivers report ON_DUTY or begin transit.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {fleetDrivers.map((driver) => {
                const isSelected = driver.id === selectedDriverId;
                return (
                  <div
                    key={driver.id}
                    onClick={() => handleSelectDriver(driver)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-terracotta-400 bg-terracotta-50/30 shadow-xs ring-1 ring-terracotta-400/40'
                        : 'border-warm-200/90 hover:border-warm-300 bg-warm-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-serif ${
                            isSelected
                              ? 'bg-charcoal-900 text-white'
                              : 'bg-warm-100 text-charcoal-700 border border-warm-200'
                          }`}
                        >
                          {driver.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-charcoal-900 font-serif flex items-center gap-1.5">
                            <span>{driver.name}</span>
                            {driver.isStale ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-bold">
                                STALE
                              </span>
                            ) : (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-sans font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-charcoal-500 font-sans">
                            {driver.vehicleModel} &bull; <span className="font-mono text-charcoal-700">{driver.plateNumber}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={driver.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-warm-200/60 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-charcoal-400 block">
                          Assigned Function
                        </span>
                        <span className="font-semibold text-charcoal-800 text-[11px] truncate block">
                          {driver.functionName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-charcoal-400 block">
                          ETA &bull; Distance
                        </span>
                        <span className="font-bold text-terracotta-700 text-[11px]">
                          {driver.status === 'ARRIVED'
                            ? 'Arrived Curbside'
                            : `${driver.etaMinutes} min (${driver.distanceAwayKm.toFixed(1)} km)`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
