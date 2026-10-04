/**
 * SAFAR Google Maps Cost Optimization & Route Decision Engine
 * 
 * Prevents expensive API call bursts ($0.005 per Directions request) by evaluating:
 * 1. Time threshold since last route request (minimum cooling interval)
 * 2. Distance threshold traveled since last route request
 * 3. Spatial off-route deviation (significant detour detection)
 * 4. Trip state transitions (e.g. driver embarking or destination change)
 * 
 * Returns deterministic decision on whether to invoke Google Routes API or use local telemetry.
 */

import { RouteRefreshInput, RouteRefreshDecision } from './types';
import { calculateHaversineDistanceKm } from './distance-engine';
import { findMinimumRouteDeviationMeters } from './route-deviation';

export interface CostOptimizerConfig {
  minIntervalSeconds: number; // default: 60s minimum between Google API calls
  minDistanceTraveledKm: number; // default: 0.8 km before refreshing route
  offRouteThresholdMeters: number; // default: 120m off route triggers recalculation
  forceRefreshOnStatusChange: boolean; // default: true
}

export const DEFAULT_COST_OPTIMIZER_CONFIG: CostOptimizerConfig = {
  minIntervalSeconds: 60,
  minDistanceTraveledKm: 0.8,
  offRouteThresholdMeters: 120,
  forceRefreshOnStatusChange: true,
};

export class RouteCostOptimizationEngine {
  private config: CostOptimizerConfig;

  constructor(customConfig?: Partial<CostOptimizerConfig>) {
    this.config = { ...DEFAULT_COST_OPTIMIZER_CONFIG, ...customConfig };
  }

  /**
   * Evaluates whether a route recalculation from Google Maps is necessary.
   * 
   * @param input Route refresh evaluation parameters
   * @returns RouteRefreshDecision object
   */
  public evaluateRouteRefresh(input: RouteRefreshInput): RouteRefreshDecision {
    const now = Date.now();

    // 1. Initial Route Request (no previous request exists)
    if (!input.lastRouteRequestedAt || !input.lastRouteRequestLat || !input.lastRouteRequestLng) {
      return {
        shouldRefresh: true,
        reason: 'INITIAL_ROUTE',
      };
    }

    const timeSinceLastRequestSec = Math.max(0, (now - input.lastRouteRequestedAt) / 1000);

    const distanceSinceLastRequestKm = calculateHaversineDistanceKm(
      input.lastRouteRequestLat,
      input.lastRouteRequestLng,
      input.currentLat,
      input.currentLng
    );

    // 2. Cooling Period Enforcement
    // If under minimum interval, suppress unless major off-route deviation is detected
    const isUnderCoolingPeriod = timeSinceLastRequestSec < this.config.minIntervalSeconds;

    // 3. Off-Route Deviation Check
    let crossTrackDistanceMeters = 0;
    if (input.routeGeometryPoints && input.routeGeometryPoints.length >= 2) {
      const deviationResult = findMinimumRouteDeviationMeters(
        { latitude: input.currentLat, longitude: input.currentLng },
        input.routeGeometryPoints
      );
      crossTrackDistanceMeters = deviationResult.minDeviationMeters;

      if (crossTrackDistanceMeters > this.config.offRouteThresholdMeters) {
        // Off route by significant margin (>120m)
        if (timeSinceLastRequestSec >= 15) {
          // Allow re-route after at least 15s debounce
          return {
            shouldRefresh: true,
            reason: 'OFF_ROUTE_DEVIATION',
            crossTrackDistanceMeters,
            distanceSinceLastRequestKm,
            timeSinceLastRequestSec,
          };
        }
      }
    }

    // 4. Distance Traveled Threshold (e.g. driven > 800m and > 60s elapsed)
    if (!isUnderCoolingPeriod && distanceSinceLastRequestKm >= this.config.minDistanceTraveledKm) {
      return {
        shouldRefresh: true,
        reason: 'DISTANCE_ELAPSED',
        crossTrackDistanceMeters,
        distanceSinceLastRequestKm,
        timeSinceLastRequestSec,
      };
    }

    // 5. Periodic Time Refresh (e.g. 3 minutes elapsed for fresh traffic ETA)
    if (timeSinceLastRequestSec >= this.config.minIntervalSeconds * 3) {
      return {
        shouldRefresh: true,
        reason: 'TIME_ELAPSED',
        crossTrackDistanceMeters,
        distanceSinceLastRequestKm,
        timeSinceLastRequestSec,
      };
    }

    // No route refresh needed — continue using local interpolation
    return {
      shouldRefresh: false,
      reason: 'NO_REFRESH_NEEDED',
      crossTrackDistanceMeters,
      distanceSinceLastRequestKm,
      timeSinceLastRequestSec,
    };
  }
}

// Global Cost Optimizer Singleton
export const defaultRouteCostOptimizer = new RouteCostOptimizationEngine();
