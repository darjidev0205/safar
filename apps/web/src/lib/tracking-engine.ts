/**
 * SAFAR — Real GPS Tracking & Distance Calculation Engine
 *
 * Implements production-grade vehicle telemetry:
 * 1. Device GPS as single source of truth (navigator.geolocation.watchPosition)
 * 2. Strict Noise & Jump Filtering (rejects poor accuracy & unrealistic jumps)
 * 3. Sequential Haversine Distance Accumulation (calculates real km driven)
 * 4. Adaptive Throttling (5-10s while moving, 30s heartbeat when stationary)
 * 5. Offline Queueing & Recovery Buffer (no data loss during network drops)
 * 6. Privacy & Lifecycle Enforcement (active ONLY during trip)
 */

export interface RawGpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  heading: number | null; // degrees (0-360)
  speed: number | null; // m/s
  timestamp: number; // ms epoch
}

export interface TelemetryPayload {
  tripId: string;
  driverId: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speedKmh: number;
  heading: number | null;
  timestamp: number;
  actualDistanceKm: number;
  remainingDistanceKm?: number;
  plannedDistanceKm?: number;
  status: string;
  offlineBufferedCount?: number;
}

export interface TrackingState {
  isTracking: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable' | 'timeout';
  isOnline: boolean;
  currentPoint: RawGpsPoint | null;
  previousValidPoint: RawGpsPoint | null;
  actualDistanceKm: number;
  plannedDistanceKm: number;
  remainingDistanceKm: number;
  speedKmh: number;
  heading: number | null;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
  queuedPingsCount: number;
  lastSyncedAt: number | null;
  errorMessage: string | null;
}

export type TrackingListener = (state: TrackingState) => void;

import {
  calculateHaversineDistanceKm,
  defaultGpsValidator,
} from './safar-engine';

export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
}

function isValidGpsPoint(
  newPoint: RawGpsPoint,
  previousPoint: RawGpsPoint | null
): { valid: boolean; distanceKm: number; reason?: string } {
  const result = defaultGpsValidator.validateTelemetry(
    {
      driverId: 'driver_client',
      latitude: newPoint.latitude,
      longitude: newPoint.longitude,
      accuracy: newPoint.accuracy,
      speedKmh: newPoint.speed ? newPoint.speed * 3.6 : undefined,
      heading: newPoint.heading,
      timestamp: newPoint.timestamp,
    },
    previousPoint
  );

  return {
    valid: result.isValid && result.isUsableForDistance,
    distanceKm: result.distanceDeltaKm,
    reason: result.rejectionReason,
  };
}

// ============================================================================
// DRIVER GPS TRACKER CLASS
// ============================================================================

export class DriverGpsTracker {
  private tripId: string;
  private driverId: string;
  private vehicleId?: string;
  private plannedDistanceKm: number;
  private destinationCoords?: { lat: number; lng: number };

  private watchId: number | null = null;
  private state: TrackingState;
  private listeners: Set<TrackingListener> = new Set();

  private offlineQueue: TelemetryPayload[] = [];
  private lastTransmissionTime = 0;
  private lastTransmissionPoint: RawGpsPoint | null = null;
  private isTransmitting = false;

  constructor(config: {
    tripId: string;
    driverId: string;
    vehicleId?: string;
    plannedDistanceKm?: number;
    destinationCoords?: { lat: number; lng: number };
    initialActualDistanceKm?: number;
  }) {
    this.tripId = config.tripId;
    this.driverId = config.driverId;
    this.vehicleId = config.vehicleId;
    this.plannedDistanceKm = config.plannedDistanceKm || 0;
    this.destinationCoords = config.destinationCoords;

    this.state = {
      isTracking: false,
      permissionStatus: 'prompt',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      currentPoint: null,
      previousValidPoint: null,
      actualDistanceKm: config.initialActualDistanceKm || 0,
      plannedDistanceKm: this.plannedDistanceKm,
      remainingDistanceKm: this.plannedDistanceKm,
      speedKmh: 0,
      heading: null,
      breadcrumbs: [],
      queuedPingsCount: 0,
      lastSyncedAt: null,
      errorMessage: null,
    };

    this.initNetworkListeners();
    this.loadOfflineQueue();
  }

  private initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notifyListeners();
      this.flushOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notifyListeners();
    });
  }

  private loadOfflineQueue() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`safar_queue_${this.tripId}`);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
        this.state.queuedPingsCount = this.offlineQueue.length;
      }
    } catch (e) {
      // ignore
    }
  }

  private saveOfflineQueue() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`safar_queue_${this.tripId}`, JSON.stringify(this.offlineQueue));
      this.state.queuedPingsCount = this.offlineQueue.length;
    } catch (e) {
      // ignore
    }
  }

  public subscribe(listener: TrackingListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  /**
   * Starts tracking driver GPS via navigator.geolocation.watchPosition.
   */
  public async startTracking(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.state.permissionStatus = 'unavailable';
      this.state.errorMessage = 'Geolocation is not supported by your device browser.';
      this.notifyListeners();
      return false;
    }

    if (this.state.isTracking) return true;

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 3000,
    };

    return new Promise((resolve) => {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.handlePositionUpdate(pos);
          if (!this.state.isTracking) {
            this.state.isTracking = true;
            this.state.permissionStatus = 'granted';
            this.state.errorMessage = null;
            this.notifyListeners();
            resolve(true);
          }
        },
        (err) => {
          this.handlePositionError(err);
          if (!this.state.isTracking) {
            resolve(false);
          }
        },
        options
      );
    });
  }

  private handlePositionUpdate(pos: GeolocationPosition) {
    const rawPoint: RawGpsPoint = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp || Date.now(),
    };

    const speedKmh = pos.coords.speed !== null && pos.coords.speed >= 0
      ? Math.round(pos.coords.speed * 3.6)
      : 0;

    const { valid, distanceKm } = isValidGpsPoint(rawPoint, this.state.previousValidPoint);

    if (valid) {
      // Sequential Real KM Accumulation
      const newActualDistance = Math.round((this.state.actualDistanceKm + distanceKm) * 100) / 100;

      // Calculate remaining distance from current point to destination venue
      let remainingKm = this.state.remainingDistanceKm;
      if (this.destinationCoords) {
        remainingKm = Math.round(
          calculateHaversineKm(
            rawPoint.latitude,
            rawPoint.longitude,
            this.destinationCoords.lat,
            this.destinationCoords.lng
          ) * 10
        ) / 10;
      }

      this.state.currentPoint = rawPoint;
      this.state.previousValidPoint = rawPoint;
      this.state.actualDistanceKm = newActualDistance;
      this.state.remainingDistanceKm = remainingKm;
      this.state.speedKmh = speedKmh;
      this.state.heading = rawPoint.heading;
      this.state.errorMessage = null;

      // Keep recent breadcrumb trail (max 100 points)
      this.state.breadcrumbs = [
        ...this.state.breadcrumbs.slice(-99),
        { lat: rawPoint.latitude, lng: rawPoint.longitude, timestamp: rawPoint.timestamp },
      ];

      this.notifyListeners();
      this.evaluateTransmission(rawPoint);
    } else {
      // Point rejected due to noise or jitter, but update speed display if available
      this.state.speedKmh = speedKmh;
      this.notifyListeners();
    }
  }

  private handlePositionError(err: GeolocationPositionError) {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        this.state.permissionStatus = 'denied';
        this.state.errorMessage = 'Location permission was denied. Please allow GPS access in your browser settings to track this trip.';
        break;
      case err.POSITION_UNAVAILABLE:
        this.state.permissionStatus = 'unavailable';
        this.state.errorMessage = 'GPS signal unavailable. Please ensure location services are enabled on your device.';
        break;
      case err.TIMEOUT:
        this.state.permissionStatus = 'timeout';
        this.state.errorMessage = 'GPS location request timed out. Retrying…';
        break;
    }
    this.notifyListeners();
  }

  /**
   * Evaluates whether to broadcast the location based on distance / time thresholds.
   */
  private evaluateTransmission(point: RawGpsPoint) {
    const now = Date.now();
    const timeSinceLastSend = (now - this.lastTransmissionTime) / 1000;

    let distanceSinceLastSendKm = 0;
    if (this.lastTransmissionPoint) {
      distanceSinceLastSendKm = calculateHaversineKm(
        this.lastTransmissionPoint.latitude,
        this.lastTransmissionPoint.longitude,
        point.latitude,
        point.longitude
      );
    }

    // Rules:
    // 1. If moved >= 15 meters and >= 5 seconds have passed -> transmit
    // 2. If time >= 10 seconds and vehicle is in motion -> transmit
    // 3. If stationary, heartbeat transmission every 30 seconds
    const shouldTransmit =
      !this.lastTransmissionPoint ||
      (distanceSinceLastSendKm >= 0.015 && timeSinceLastSend >= 5) ||
      (timeSinceLastSend >= 10 && (point.speed || 0) > 1.5) ||
      timeSinceLastSend >= 30;

    if (shouldTransmit) {
      this.lastTransmissionTime = now;
      this.lastTransmissionPoint = point;
      this.transmitPayload({
        tripId: this.tripId,
        driverId: this.driverId,
        vehicleId: this.vehicleId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        speedKmh: this.state.speedKmh,
        heading: point.heading,
        timestamp: point.timestamp,
        actualDistanceKm: this.state.actualDistanceKm,
        remainingDistanceKm: this.state.remainingDistanceKm,
        plannedDistanceKm: this.state.plannedDistanceKm,
        status: 'IN_TRANSIT',
      });
    }
  }

  private async transmitPayload(payload: TelemetryPayload) {
    if (!this.state.isOnline) {
      this.offlineQueue.push(payload);
      this.saveOfflineQueue();
      return;
    }

    try {
      this.isTransmitting = true;
      const res = await fetch('/api/driver/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          bufferedPings: this.offlineQueue,
        }),
      });

      if (res.ok) {
        this.state.lastSyncedAt = Date.now();
        this.offlineQueue = [];
        this.saveOfflineQueue();
      } else {
        this.offlineQueue.push(payload);
        this.saveOfflineQueue();
      }
    } catch (err) {
      this.offlineQueue.push(payload);
      this.saveOfflineQueue();
    } finally {
      this.isTransmitting = false;
      this.notifyListeners();
    }
  }

  private async flushOfflineQueue() {
    if (this.offlineQueue.length === 0 || !this.state.isOnline) return;
    const latestPoint = this.state.currentPoint;
    if (!latestPoint) return;

    await this.transmitPayload({
      tripId: this.tripId,
      driverId: this.driverId,
      vehicleId: this.vehicleId,
      latitude: latestPoint.latitude,
      longitude: latestPoint.longitude,
      accuracy: latestPoint.accuracy,
      speedKmh: this.state.speedKmh,
      heading: latestPoint.heading,
      timestamp: latestPoint.timestamp,
      actualDistanceKm: this.state.actualDistanceKm,
      remainingDistanceKm: this.state.remainingDistanceKm,
      plannedDistanceKm: this.state.plannedDistanceKm,
      status: 'IN_TRANSIT',
    });
  }

  /**
   * Stops tracking and cleans up device GPS watchers.
   */
  public stopTracking() {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.state.isTracking = false;
    this.notifyListeners();
  }

  public getState(): TrackingState {
    return { ...this.state };
  }
}
