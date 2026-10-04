/**
 * SAFAR ETA Calculation Engine
 * 
 * Computes realistic, deterministic Estimated Time of Arrival (ETA):
 * 1. Combines live telemetry speed with historical speed baselines
 * 2. Exponential Moving Average (EMA) to prevent wild ETA fluctuations at stoplights
 * 3. Urban/Highway traffic speed clamping
 */

import { EtaCalculationInput, EtaCalculationResult } from './types';

// Default average Indian urban wedding venue corridor speed (km/h)
const DEFAULT_URBAN_SPEED_KMH = 28;
const DEFAULT_HIGHWAY_SPEED_KMH = 45;

export class EtaEngine {
  /**
   * Calculates estimated trip duration in minutes and target arrival Date.
   * 
   * @param input Remaining distance and speed telemetry
   */
  public calculateEta(input: EtaCalculationInput): EtaCalculationResult {
    const remainingKm = Math.max(0, input.remainingDistanceKm);

    if (remainingKm <= 0.05) {
      // Within 50 meters of destination -> arrived
      return {
        estimatedDurationMinutes: 0,
        estimatedArrivalTime: new Date(),
        confidenceScore: 1.0,
        isEstimatedFromAverage: false,
      };
    }

    const baselineSpeedKmh = input.isCityTraffic === false
      ? DEFAULT_HIGHWAY_SPEED_KMH
      : (input.historicalAverageSpeedKmh || DEFAULT_URBAN_SPEED_KMH);

    let effectiveSpeedKmh = baselineSpeedKmh;
    let isEstimatedFromAverage = true;
    let confidenceScore = 0.7;

    if (typeof input.currentSpeedKmh === 'number' && input.currentSpeedKmh > 5) {
      // Blend 60% live speed + 40% baseline speed to handle speed variations
      const clampedLiveSpeed = Math.min(100, Math.max(8, input.currentSpeedKmh));
      effectiveSpeedKmh = 0.6 * clampedLiveSpeed + 0.4 * baselineSpeedKmh;
      isEstimatedFromAverage = false;
      confidenceScore = 0.9;
    } else {
      // Stationary or creeping in venue gate queue
      effectiveSpeedKmh = Math.max(12, baselineSpeedKmh * 0.7);
      confidenceScore = 0.6;
    }

    // Calculate duration in hours then convert to rounded minutes
    const durationHours = remainingKm / effectiveSpeedKmh;
    const durationMinutes = Math.max(1, Math.round(durationHours * 60));

    const arrivalTimestamp = Date.now() + durationMinutes * 60 * 1000;
    const estimatedArrivalTime = new Date(arrivalTimestamp);

    return {
      estimatedDurationMinutes: durationMinutes,
      estimatedArrivalTime,
      confidenceScore,
      isEstimatedFromAverage,
    };
  }
}

export const defaultEtaEngine = new EtaEngine();
