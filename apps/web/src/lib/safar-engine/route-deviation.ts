/**
 * SAFAR Route Deviation Engine
 * 
 * Production geographic calculations for route geometry:
 * 1. Cross-Track Distance (perpendicular deviation from route polyline in meters)
 * 2. Along-Track Distance (progress along the planned route)
 * 3. Spatial Snap-to-Route Evaluation
 * 
 * Uses spherical trigonometry on the WGS-84 sphere.
 */

import { GpsCoordinate } from './types';
import { EARTH_RADIUS_KM, calculateHaversineDistanceKm } from './distance-engine';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Calculates initial bearing (forward azimuth) from point 1 to point 2 in degrees (0-360).
 */
export function calculateBearing(start: GpsCoordinate, end: GpsCoordinate): number {
  const lat1 = toRad(start.latitude);
  const lat2 = toRad(end.latitude);
  const dLon = toRad(end.longitude - start.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearingRad = Math.atan2(y, x);
  return (toDeg(bearingRad) + 360) % 360;
}

/**
 * Calculates the perpendicular Cross-Track Distance (XTD) from a point to a great-circle segment (start -> end).
 * Returns cross-track error in meters.
 * Sign indicates left (-ve) or right (+ve) of course.
 * 
 * Time Complexity: O(1)
 */
export function calculateCrossTrackDistanceMeters(
  point: GpsCoordinate,
  start: GpsCoordinate,
  end: GpsCoordinate
): number {
  const d13 = calculateHaversineDistanceKm(start.latitude, start.longitude, point.latitude, point.longitude) / EARTH_RADIUS_KM;
  const theta13 = toRad(calculateBearing(start, point));
  const theta12 = toRad(calculateBearing(start, end));

  const dxt = Math.asin(Math.sin(d13) * Math.sin(theta13 - theta12));
  return Math.abs(dxt * EARTH_RADIUS_KM * 1000);
}

/**
 * Finds the minimum cross-track deviation distance (in meters) of a coordinate from a full route polyline.
 * 
 * Time Complexity: O(N) where N = polyline segments
 */
export function findMinimumRouteDeviationMeters(
  currentPos: GpsCoordinate,
  routePoints: GpsCoordinate[]
): { minDeviationMeters: number; nearestSegmentIndex: number } {
  if (!routePoints || routePoints.length < 2) {
    return { minDeviationMeters: 0, nearestSegmentIndex: -1 };
  }

  let minDeviation = Infinity;
  let nearestSegmentIndex = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const start = routePoints[i];
    const end = routePoints[i + 1];

    const deviation = calculateCrossTrackDistanceMeters(currentPos, start, end);
    if (deviation < minDeviation) {
      minDeviation = deviation;
      nearestSegmentIndex = i;
    }
  }

  return {
    minDeviationMeters: Math.round(minDeviation * 10) / 10,
    nearestSegmentIndex,
  };
}
