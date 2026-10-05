/**
 * SAFAR — Unified Location, Places & Routes Service
 *
 * Core shared service consumed by HOST, GUEST, and DRIVER.
 * Powers:
 * - Address search & Place Autocomplete (debounced, session-aware, cached)
 * - Reverse geocoding & "Use Current Location"
 * - Smart Route calculation via Google Routes / Directions API with caching
 * - Threshold-based route refresh (prevents expensive API calls on every GPS ping)
 * - Actual GPS distance vs. Estimated route distance
 * - Transportation pricing engine
 */

import { loadGoogleMaps, getGoogleMapsApiKey } from './google-maps';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface StructuredPlace {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
  polylinePath: LatLng[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  cached: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLACE AUTOCOMPLETE WITH DEBOUNCE, SESSION TOKEN & CACHING
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const PLACES_CACHE = new Map<string, CacheEntry<PlaceSuggestion[]>>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes cache for place suggestions

let activeSessionToken: any = null;

/**
 * Returns an existing AutocompleteSessionToken or creates a new one.
 * Session tokens group the autocomplete requests and the subsequent place details request
 * into a single billing transaction.
 */
export function getOrCreateSessionToken(): any {
  if (typeof window === 'undefined') return null;
  const goog = (window as any).google;
  if (!goog?.maps?.places?.AutocompleteSessionToken) return null;

  if (!activeSessionToken) {
    activeSessionToken = new goog.maps.places.AutocompleteSessionToken();
  }
  return activeSessionToken;
}

/**
 * Resets the session token after a place is selected and details are fetched.
 */
export function resetSessionToken(): void {
  activeSessionToken = null;
}

/**
 * Search places using Google Places AutocompleteService with:
 * - Minimum character threshold (>= 3 chars)
 * - Stale request cancellation via requestId
 * - Local caching for identical queries
 * - Session token support for cost control
 */
let latestRequestId = 0;

export async function searchPlaces(
  query: string,
  countryCode: string = 'in'
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  // Check in-memory cache
  const cacheKey = `${countryCode}:${trimmed.toLowerCase()}`;
  const cached = PLACES_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  await loadGoogleMaps();
  const goog = (window as any).google;
  if (!goog?.maps?.places?.AutocompleteService) {
    throw new Error('Google Places AutocompleteService unavailable');
  }

  const currentRequestId = ++latestRequestId;
  const service = new goog.maps.places.AutocompleteService();
  const sessionToken = getOrCreateSessionToken();

  return new Promise<PlaceSuggestion[]>((resolve, reject) => {
    service.getPlacePredictions(
      {
        input: trimmed,
        componentRestrictions: { country: countryCode },
        types: ['geocode', 'establishment'],
        sessionToken,
      },
      (predictions: any[] | null, status: string) => {
        // Discard if a newer search request was initiated in the meantime
        if (currentRequestId !== latestRequestId) {
          return resolve([]);
        }

        if (status === goog.maps.places.PlacesServiceStatus.OK && predictions) {
          const results: PlaceSuggestion[] = predictions.map((p) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
          }));

          // Store in cache
          PLACES_CACHE.set(cacheKey, { data: results, timestamp: Date.now() });
          resolve(results);
        } else if (
          status === goog.maps.places.PlacesServiceStatus.ZERO_RESULTS ||
          status === 'ZERO_RESULTS'
        ) {
          resolve([]);
        } else {
          // Non-fatal error / limit
          console.warn('Google Places Autocomplete status:', status);
          resolve([]);
        }
      }
    );
  });
}

/**
 * Fetch detailed geometry and formatted address for a selected place.
 * Uses a dummy element for PlacesService as required by Maps JS API.
 */
const PLACE_DETAILS_CACHE = new Map<string, CacheEntry<StructuredPlace>>();

export async function getPlaceDetails(placeId: string): Promise<StructuredPlace | null> {
  if (!placeId) return null;

  const cached = PLACE_DETAILS_CACHE.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  await loadGoogleMaps();
  const goog = (window as any).google;
  if (!goog?.maps?.places?.PlacesService) return null;

  // Temporary div required by PlacesService
  const dummyDiv = document.createElement('div');
  const service = new goog.maps.places.PlacesService(dummyDiv);
  const sessionToken = getOrCreateSessionToken();

  return new Promise<StructuredPlace | null>((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry'],
        sessionToken,
      },
      (place: any, status: string) => {
        // Reset session token after getDetails consumes it
        resetSessionToken();

        if (status === goog.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const result: StructuredPlace = {
            placeId: place.place_id || placeId,
            name: place.name || place.formatted_address || 'Selected Location',
            address: place.formatted_address || place.name || '',
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          };

          PLACE_DETAILS_CACHE.set(placeId, { data: result, timestamp: Date.now() });
          resolve(result);
        } else {
          console.warn('PlacesService.getDetails failed with status:', status);
          resolve(null);
        }
      }
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REVERSE GEOCODING & CURRENT LOCATION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reverse geocode a latitude/longitude pair into a human-readable address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<StructuredPlace | null> {
  await loadGoogleMaps();
  const goog = (window as any).google;
  if (!goog?.maps?.Geocoder) return null;

  const geocoder = new goog.maps.Geocoder();

  return new Promise<StructuredPlace | null>((resolve) => {
    geocoder.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const first = results[0];
          resolve({
            placeId: first.place_id || `coords_${lat.toFixed(4)}_${lng.toFixed(4)}`,
            name: first.address_components?.[0]?.long_name || first.formatted_address || 'Current Location',
            address: first.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            latitude: lat,
            longitude: lng,
          });
        } else {
          resolve({
            placeId: `coords_${lat.toFixed(4)}_${lng.toFixed(4)}`,
            name: 'Current Location',
            address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            latitude: lat,
            longitude: lng,
          });
        }
      }
    );
  });
}

/**
 * Get device coordinates from browser GPS and reverse geocode them.
 */
export async function getCurrentUserLocation(): Promise<StructuredPlace> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  const coords = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission denied. Please allow location access in your browser settings.'));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('GPS signal unavailable. Please ensure your device location is enabled.'));
        } else {
          reject(new Error('Could not determine current location.'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });

  const geocoded = await reverseGeocode(coords.lat, coords.lng);
  return (
    geocoded || {
      placeId: `gps_${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}`,
      name: 'Current Location',
      address: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
      latitude: coords.lat,
      longitude: coords.lng,
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SMART ROUTE SERVICE WITH CACHING & THRESHOLD REFRESH
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_CACHE = new Map<string, CacheEntry<RouteResult>>();
const ROUTE_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes cache for same endpoints

function getRouteKey(origin: LatLng, destination: LatLng): string {
  // Round to 3 decimals (~100m tolerance) so minor GPS flutter hits cache
  const oLat = origin.lat.toFixed(3);
  const oLng = origin.lng.toFixed(3);
  const dLat = destination.lat.toFixed(3);
  const dLng = destination.lng.toFixed(3);
  return `${oLat},${oLng}->${dLat},${dLng}`;
}

/**
 * Smart route calculation using DirectionsService.
 * Memoizes results to prevent excessive API billing.
 */
export async function calculateRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResult> {
  const cacheKey = getRouteKey(origin, destination);
  const cached = ROUTE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  await loadGoogleMaps();
  const goog = (window as any).google;
  if (!goog?.maps?.DirectionsService) {
    throw new Error('Google Maps DirectionsService unavailable');
  }

  const service = new goog.maps.DirectionsService();

  return new Promise<RouteResult>((resolve, reject) => {
    service.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: goog.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
      },
      (result: any, status: string) => {
        if (status === 'OK' && result?.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0];
          const distanceKm = Math.round((leg.distance.value / 1000) * 10) / 10;
          const durationMinutes = Math.max(1, Math.round(leg.duration.value / 60));

          // Extract path points for polyline
          const polylinePath: LatLng[] = (result.routes[0].overview_path || []).map((p: any) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));

          const bounds = result.routes[0].bounds
            ? {
                north: result.routes[0].bounds.getNorthEast().lat(),
                east: result.routes[0].bounds.getNorthEast().lng(),
                south: result.routes[0].bounds.getSouthWest().lat(),
                west: result.routes[0].bounds.getSouthWest().lng(),
              }
            : undefined;

          const routeResult: RouteResult = {
            distanceKm,
            durationMinutes,
            distanceText: leg.distance.text || `${distanceKm} km`,
            durationText: leg.duration.text || `${durationMinutes} mins`,
            polylinePath,
            bounds,
            cached: false,
          };

          ROUTE_CACHE.set(cacheKey, { data: routeResult, timestamp: Date.now() });
          resolve(routeResult);
        } else {
          console.warn('DirectionsService request returned:', status);
          // Fallback: estimate straight-line distance + urban factor
          const straightKm = calculateHaversineDistanceKm(
            origin.lat,
            origin.lng,
            destination.lat,
            destination.lng
          );
          const estimatedKm = Math.round(straightKm * 1.35 * 10) / 10;
          const estimatedMins = Math.max(1, Math.round((estimatedKm / 25) * 60));

          resolve({
            distanceKm: estimatedKm,
            durationMinutes: estimatedMins,
            distanceText: `${estimatedKm} km`,
            durationText: `${estimatedMins} mins`,
            polylinePath: [origin, destination],
            cached: false,
          });
        }
      }
    );
  });
}

/**
 * Intelligent Route Recalculation Check (Requirement 13)
 *
 * Checks if the route should be recalculated:
 * 1. Driver has moved meaningful distance (> 250m)
 * 2. Controlled time interval has passed (e.g. 60s)
 * 3. Never recalculate on every GPS update!
 */
export function shouldRecalculateRoute({
  lastCalculatedPosition,
  currentPosition,
  lastCalculationTimeMs,
  displacementThresholdMeters = 250,
  timeIntervalSeconds = 60,
}: {
  lastCalculatedPosition: LatLng | null;
  currentPosition: LatLng;
  lastCalculationTimeMs: number;
  displacementThresholdMeters?: number;
  timeIntervalSeconds?: number;
}): boolean {
  if (!lastCalculatedPosition) return true;

  const now = Date.now();
  const secondsElapsed = (now - lastCalculationTimeMs) / 1000;

  // If time threshold passed, recalculate to refresh traffic/ETA
  if (secondsElapsed >= timeIntervalSeconds) {
    return true;
  }

  // Calculate distance moved since last route calculation
  const distanceMovedKm = calculateHaversineDistanceKm(
    lastCalculatedPosition.lat,
    lastCalculatedPosition.lng,
    currentPosition.lat,
    currentPosition.lng
  );

  const distanceMovedMeters = distanceMovedKm * 1000;
  return distanceMovedMeters >= displacementThresholdMeters;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HAVERSINE & TRANSPORTATION PRICING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 < -90 || lat1 > 90 ||
    lat2 < -90 || lat2 > 90 ||
    lon1 < -180 || lon1 > 180 ||
    lon2 < -180 || lon2 > 180
  ) {
    return 0;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Transportation Pricing Engine (Requirement 14)
 * Calculates the final trip cost strictly from actual GPS distance traveled.
 */
export interface TripFare {
  baseFare: number;
  distanceKm: number;
  ratePerKm: number;
  totalCost: number;
  currency: string;
}

export function calculateTripPricing({
  actualDistanceKm,
  vehicleCategory = 'SUV',
}: {
  actualDistanceKm: number;
  vehicleCategory?: string;
}): TripFare {
  // Rates per vehicle class in INR
  const pricingTable: Record<string, { base: number; perKm: number; minDistance: number }> = {
    SEDAN: { base: 250, perKm: 18, minDistance: 5 },
    SUV: { base: 450, perKm: 26, minDistance: 5 },
    PREMIUM_SUV: { base: 750, perKm: 38, minDistance: 5 },
    TEMPO_TRAVELLER: { base: 1200, perKm: 42, minDistance: 10 },
  };

  const plan = pricingTable[vehicleCategory] || pricingTable.SUV;
  const billableDistance = Math.max(actualDistanceKm, plan.minDistance);
  const total = Math.round(plan.base + (billableDistance - plan.minDistance) * plan.perKm);

  return {
    baseFare: plan.base,
    distanceKm: Math.round(actualDistanceKm * 10) / 10,
    ratePerKm: plan.perKm,
    totalCost: total,
    currency: '₹',
  };
}
