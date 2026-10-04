/**
 * SAFAR Distance Engine
 * 
 * Production-grade geographic distance calculations:
 * 1. Numerically stable great-circle Haversine formula
 * 2. O(1) incremental distance accumulation for active trips
 * 3. Bounded floating-point precision (avoiding IEEE 754 drift)
 */

import { GpsCoordinate, DistanceState } from './types';

// WGS-84 Mean Earth Radius in Kilometers
export const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates great-circle distance between two GPS coordinates in Kilometers.
 * Uses the Haversine formula with radians conversion.
 * 
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Clamp 'a' to [0, 1] to guard against floating-point inaccuracies
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates great-circle distance in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Calculates total path distance for an array of coordinates in order.
 * 
 * Time Complexity: O(N) where N = number of points
 */
export function calculatePolylineDistanceKm(points: GpsCoordinate[]): number {
  if (!points || points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateHaversineDistanceKm(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude
    );
  }
  return roundToDecimals(totalDistance, 3);
}

/**
 * Creates a clean initial DistanceState for a newly started trip.
 */
export function createInitialDistanceState(plannedDistanceKm?: number): DistanceState {
  return {
    actualDistanceKm: 0,
    plannedDistanceKm: plannedDistanceKm ? roundToDecimals(plannedDistanceKm, 2) : undefined,
    remainingDistanceKm: plannedDistanceKm ? roundToDecimals(plannedDistanceKm, 2) : undefined,
    lastValidPoint: null,
    totalPingsProcessed: 0,
    validPingsCount: 0,
    rejectedPingsCount: 0,
  };
}

/**
 * Accumulates distance incrementally from a validated GPS point.
 * This is an O(1) operation that prevents expensive O(N) array recalculations on each telemetry ping.
 * 
 * @param currentState Current trip distance accumulator state
 * @param validPoint Validated GPS telemetry point
 * @param destinationCoords Optional destination coordinates to compute remaining distance
 */
export function accumulateDistance(
  currentState: DistanceState,
  validPoint: GpsCoordinate & { timestamp: number },
  destinationCoords?: GpsCoordinate | null
): DistanceState {
  let stepDistanceKm = 0;

  if (currentState.lastValidPoint) {
    stepDistanceKm = calculateHaversineDistanceKm(
      currentState.lastValidPoint.latitude,
      currentState.lastValidPoint.longitude,
      validPoint.latitude,
      validPoint.longitude
    );
  }

  const updatedActualKm = roundToDecimals(
    currentState.actualDistanceKm + stepDistanceKm,
    3
  );

  let updatedRemainingKm = currentState.remainingDistanceKm;
  if (destinationCoords) {
    updatedRemainingKm = roundToDecimals(
      calculateHaversineDistanceKm(
        validPoint.latitude,
        validPoint.longitude,
        destinationCoords.latitude,
        destinationCoords.longitude
      ),
      2
    );
  } else if (currentState.plannedDistanceKm) {
    updatedRemainingKm = Math.max(
      0,
      roundToDecimals(currentState.plannedDistanceKm - updatedActualKm, 2)
    );
  }

  return {
    actualDistanceKm: updatedActualKm,
    plannedDistanceKm: currentState.plannedDistanceKm,
    remainingDistanceKm: updatedRemainingKm,
    lastValidPoint: {
      latitude: validPoint.latitude,
      longitude: validPoint.longitude,
      timestamp: validPoint.timestamp,
    },
    totalPingsProcessed: currentState.totalPingsProcessed + 1,
    validPingsCount: currentState.validPingsCount + 1,
    rejectedPingsCount: currentState.rejectedPingsCount,
  };
}

/**
 * Utility to round a float to specific decimal places without precision artifacts.
 */
export function roundToDecimals(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
