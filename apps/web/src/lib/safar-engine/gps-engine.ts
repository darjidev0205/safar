/**
 * SAFAR GPS Engine & Noise Filter
 * 
 * Multi-stage production pipeline for raw GPS telemetry:
 * 1. Schema & Finite Numerical Validation
 * 2. Coordinate Geodetic Bounds (-90..90, -180..180)
 * 3. Timestamp Skew & Staleness Gating
 * 4. Horizontal Accuracy Thresholding (rejection of low-confidence fixes)
 * 5. Stationary Jitter Suppression (prevents distance accumulation while stopped)
 * 6. Impossible Teleportation Jump Rejection (velocity & spatial-time validation)
 */

import {
  RawGpsTelemetry,
  GpsValidationConfig,
  GpsValidationResult,
  GpsCoordinate,
} from './types';
import { calculateHaversineDistanceKm } from './distance-engine';
import { telemetryDeduplicator } from './deduplication-engine';

export const DEFAULT_GPS_CONFIG: GpsValidationConfig = {
  maxAllowedAccuracyMeters: 80,
  maxFeasibleSpeedKmh: 150,
  maxJumpDistanceMeters: 500,
  minJumpTimeSeconds: 3,
  minStationaryJitterDistanceMeters: 6,
  maxFutureTimestampSkewMs: 60 * 1000, // 1 minute into future
  maxStaleTimestampAgeMs: 24 * 60 * 60 * 1000, // 24 hours max
};

export class GpsValidationEngine {
  private config: GpsValidationConfig;

  constructor(customConfig?: Partial<GpsValidationConfig>) {
    this.config = { ...DEFAULT_GPS_CONFIG, ...customConfig };
  }

  /**
   * Validates raw incoming GPS telemetry against geodetic and physics constraints.
   * 
   * @param telemetry Raw incoming telemetry payload
   * @param previousPoint Previous valid accepted GPS coordinate and timestamp
   * @returns Comprehensive validation outcome with usability flags
   */
  public validateTelemetry(
    telemetry: RawGpsTelemetry,
    previousPoint: (GpsCoordinate & { timestamp: number }) | null
  ): GpsValidationResult {
    const flags = {
      isPoorAccuracy: false,
      isStationaryJitter: false,
      isTeleportationJump: false,
      isTimestampSkewed: false,
      isDuplicate: false,
    };

    // 1. Basic Numerical & Geodetic Boundary Check
    if (
      typeof telemetry.latitude !== 'number' ||
      typeof telemetry.longitude !== 'number' ||
      !Number.isFinite(telemetry.latitude) ||
      !Number.isFinite(telemetry.longitude)
    ) {
      return {
        isValid: false,
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        rejectionReason: 'Invalid non-finite latitude or longitude coordinates',
        flags,
      };
    }

    if (telemetry.latitude < -90 || telemetry.latitude > 90) {
      return {
        isValid: false,
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        rejectionReason: `Latitude out of bounds: ${telemetry.latitude} (must be -90 to +90)`,
        flags,
      };
    }

    if (telemetry.longitude < -180 || telemetry.longitude > 180) {
      return {
        isValid: false,
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        rejectionReason: `Longitude out of bounds: ${telemetry.longitude} (must be -180 to +180)`,
        flags,
      };
    }

    // 2. Timestamp Skew & Staleness Check
    const now = Date.now();
    const timestamp = telemetry.timestamp || now;
    if (timestamp > now + this.config.maxFutureTimestampSkewMs) {
      flags.isTimestampSkewed = true;
      return {
        isValid: false,
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        rejectionReason: `Future timestamp detected (skew > ${this.config.maxFutureTimestampSkewMs / 1000}s)`,
        flags,
      };
    }

    if (now - timestamp > this.config.maxStaleTimestampAgeMs) {
      flags.isTimestampSkewed = true;
      return {
        isValid: false,
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        rejectionReason: `Stale timestamp older than 24 hours`,
        flags,
      };
    }

    // 3. Deduplication Check
    const partitionKey = telemetry.tripId || telemetry.driverId;
    const fingerprint = telemetryDeduplicator.generateFingerprint(
      telemetry.driverId,
      timestamp,
      telemetry.latitude,
      telemetry.longitude,
      telemetry.updateId
    );

    if (telemetryDeduplicator.isDuplicate(partitionKey, fingerprint)) {
      flags.isDuplicate = true;
      return {
        isValid: true, // Known position, but duplicate event
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        rejectionReason: 'Duplicate GPS telemetry event ignored',
        flags,
      };
    }

    // 4. Accuracy Filter
    if (
      typeof telemetry.accuracy === 'number' &&
      telemetry.accuracy > this.config.maxAllowedAccuracyMeters
    ) {
      flags.isPoorAccuracy = true;
      return {
        isValid: true, // Legitimate ping for coarse tracking
        isUsableForDistance: false, // Do not add to official distance
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        rejectionReason: `Poor accuracy (${Math.round(telemetry.accuracy)}m > ${this.config.maxAllowedAccuracyMeters}m)`,
        flags,
      };
    }

    // If no previous point, accept as the initial baseline fix
    if (!previousPoint) {
      return {
        isValid: true,
        isUsableForDistance: true,
        distanceDeltaKm: 0,
        impliedSpeedKmh: 0,
        timeDeltaSec: 0,
        flags,
      };
    }

    // 5. Differential Physics & Spatial Calculations
    const distanceDeltaKm = calculateHaversineDistanceKm(
      previousPoint.latitude,
      previousPoint.longitude,
      telemetry.latitude,
      telemetry.longitude
    );
    const distanceDeltaMeters = distanceDeltaKm * 1000;

    // Minimum time difference guard of 0.2s to prevent division by zero
    const timeDeltaSec = Math.max(0.2, (timestamp - previousPoint.timestamp) / 1000);
    const impliedSpeedKmh = distanceDeltaKm / (timeDeltaSec / 3600);

    // 6. Stationary Jitter Filter (drift while parked at red lights/venues)
    if (
      distanceDeltaMeters < this.config.minStationaryJitterDistanceMeters &&
      (!telemetry.speedKmh || telemetry.speedKmh < 4)
    ) {
      flags.isStationaryJitter = true;
      return {
        isValid: true,
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh,
        timeDeltaSec,
        rejectionReason: `Stationary jitter (${distanceDeltaMeters.toFixed(1)}m movement suppressed)`,
        flags,
      };
    }

    // 7. Impossible Teleportation Jump Rejection
    const isOverSpeedLimit = impliedSpeedKmh > this.config.maxFeasibleSpeedKmh;
    const isImpossibleFastJump =
      distanceDeltaMeters > this.config.maxJumpDistanceMeters &&
      timeDeltaSec < this.config.minJumpTimeSeconds;

    if (isOverSpeedLimit || isImpossibleFastJump) {
      flags.isTeleportationJump = true;
      return {
        isValid: false,
        isUsableForDistance: false,
        distanceDeltaKm: 0,
        impliedSpeedKmh,
        timeDeltaSec,
        rejectionReason: `Teleportation jump rejected (${Math.round(impliedSpeedKmh)} km/h over ${Math.round(distanceDeltaMeters)}m in ${timeDeltaSec.toFixed(1)}s)`,
        flags,
      };
    }

    // All validation stages passed successfully
    return {
      isValid: true,
      isUsableForDistance: true,
      distanceDeltaKm,
      impliedSpeedKmh,
      timeDeltaSec,
      flags,
    };
  }
}

// Export default singleton validator
export const defaultGpsValidator = new GpsValidationEngine();
