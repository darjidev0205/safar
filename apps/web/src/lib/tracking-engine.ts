/**
 * Geospatial GPS Telemetry & Distance Accumulator Engine
 * Implements Haversine distance, jitter filtering, speed thresholding,
 * and teleport outlier rejection.
 */

export interface GpsPing {
  latitude: number;
  longitude: number;
  timestamp: Date | string | number;
  accuracyMeters?: number;
  speedKmh?: number;
  heading?: number;
}

export interface AccumulationResult {
  deltaDistanceKm: number;
  newTotalDistanceKm: number;
  isAccepted: boolean;
  rejectionReason?:
    | 'JITTER_BELOW_THRESHOLD'
    | 'EXCESSIVE_SPEED_OUTLIER'
    | 'INVALID_COORDINATES'
    | 'POOR_ACCURACY'
    | 'STALE_TIMESTAMP'
    | 'DUPLICATE_POSITION'
    | 'OUT_OF_BOUNDS_COORDINATES';
}

const EARTH_RADIUS_KM = 6371;
const MIN_DISTANCE_THRESHOLD_KM = 0.005; // 5 meters (ignores stationary GPS flutter)
const MAX_PLAUSIBLE_SPEED_KMH = 160;    // 160 km/h (rejects GPS teleport jumps)
const MAX_ACCEPTABLE_ACCURACY_M = 100;  // 100m (rejects low accuracy cell-tower pings)
const MAX_TIMESTAMP_AGE_MS = 300000;    // 5 minutes (rejects stale historical pings)

/**
 * Calculates great-circle distance between two coordinates using Haversine formula.
 */
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
 * Validates and accumulates a new GPS ping onto current trip distance.
 */
export function processGpsPingAndAccumulateDistance({
  previousPing,
  newPing,
  currentTotalDistanceKm = 0,
}: {
  previousPing?: GpsPing | null;
  newPing: GpsPing;
  currentTotalDistanceKm?: number;
}): AccumulationResult {
  // Validate coordinates
  if (
    typeof newPing.latitude !== 'number' ||
    typeof newPing.longitude !== 'number' ||
    isNaN(newPing.latitude) ||
    isNaN(newPing.longitude)
  ) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: false,
      rejectionReason: 'INVALID_COORDINATES',
    };
  }

  // Check physical coordinate boundaries
  if (
    newPing.latitude < -90 ||
    newPing.latitude > 90 ||
    newPing.longitude < -180 ||
    newPing.longitude > 180
  ) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: false,
      rejectionReason: 'OUT_OF_BOUNDS_COORDINATES',
    };
  }

  // Filter stale timestamps (> 5 min old or older than previous ping)
  const pingTime = new Date(newPing.timestamp).getTime();
  if (previousPing) {
    const prevTime = new Date(previousPing.timestamp).getTime();
    if (pingTime < prevTime) {
      return {
        deltaDistanceKm: 0,
        newTotalDistanceKm: currentTotalDistanceKm,
        isAccepted: false,
        rejectionReason: 'STALE_TIMESTAMP',
      };
    }
  }

  if (Date.now() - pingTime > MAX_TIMESTAMP_AGE_MS) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: false,
      rejectionReason: 'STALE_TIMESTAMP',
    };
  }

  // Filter poor accuracy
  if (newPing.accuracyMeters && newPing.accuracyMeters > MAX_ACCEPTABLE_ACCURACY_M) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: false,
      rejectionReason: 'POOR_ACCURACY',
    };
  }

  // Check duplicate position
  if (
    previousPing &&
    previousPing.latitude === newPing.latitude &&
    previousPing.longitude === newPing.longitude
  ) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: false,
      rejectionReason: 'DUPLICATE_POSITION',
    };
  }

  // First ping of trip: initialize without incrementing distance
  if (!previousPing) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: true,
    };
  }

  const distanceKm = calculateHaversineDistanceKm(
    previousPing.latitude,
    previousPing.longitude,
    newPing.latitude,
    newPing.longitude
  );

  // Check minimum movement threshold (skip jitter while parked or waiting at venue)
  if (distanceKm < MIN_DISTANCE_THRESHOLD_KM) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: false,
      rejectionReason: 'JITTER_BELOW_THRESHOLD',
    };
  }

  // Check time delta and implied speed
  const prevTime = new Date(previousPing.timestamp).getTime();
  const newTime = new Date(newPing.timestamp).getTime();
  const elapsedSeconds = Math.max(1, (newTime - prevTime) / 1000);

  const impliedSpeedKmh = (distanceKm / elapsedSeconds) * 3600;

  // Reject outlier teleportation / coordinate jumps
  if (impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH) {
    return {
      deltaDistanceKm: 0,
      newTotalDistanceKm: currentTotalDistanceKm,
      isAccepted: false,
      rejectionReason: 'EXCESSIVE_SPEED_OUTLIER',
    };
  }

  const roundedDelta = Math.round(distanceKm * 1000) / 1000;
  const newTotal = Math.round((currentTotalDistanceKm + roundedDelta) * 1000) / 1000;

  return {
    deltaDistanceKm: roundedDelta,
    newTotalDistanceKm: newTotal,
    isAccepted: true,
  };
}

export interface TrackingState {
  isTracking: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt';
  isOnline: boolean;
  currentPoint: { latitude: number; longitude: number; speed?: number | null; accuracy?: number | null } | null;
  previousValidPoint: { latitude: number; longitude: number } | null;
  actualDistanceKm: number;
  plannedDistanceKm: number;
  remainingDistanceKm: number;
  speedKmh: number;
  heading: number | null;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
  queuedPingsCount: number;
  lastSyncedAt: Date | string | null;
  errorMessage: string | null;
}

export interface DriverGpsTrackerConfig {
  tripId: string;
  driverId: string;
  plannedDistanceKm?: number;
  destinationCoords?: { lat: number; lng: number };
  initialActualDistanceKm?: number;
}

export class DriverGpsTracker {
  private config: DriverGpsTrackerConfig;
  private state: TrackingState;
  private listeners: Set<(state: TrackingState) => void> = new Set();
  private watchId: number | null = null;
  private lastPing: GpsPing | null = null;
  private lastNetworkSyncTime: number = 0;
  private queuedPings: Array<{
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    speedKmh?: number;
    heading?: number;
    timestamp: number | string;
  }> = [];
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor(config: DriverGpsTrackerConfig) {
    this.config = config;
    this.state = {
      isTracking: false,
      permissionStatus: 'prompt',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      currentPoint: null,
      previousValidPoint: null,
      actualDistanceKm: config.initialActualDistanceKm || 0,
      plannedDistanceKm: config.plannedDistanceKm || 23.5,
      remainingDistanceKm: config.plannedDistanceKm || 23.5,
      speedKmh: 0,
      heading: null,
      breadcrumbs: [],
      queuedPingsCount: 0,
      lastSyncedAt: null,
      errorMessage: null,
    };
  }

  public subscribe(callback: (state: TrackingState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  private async sendPingToBackend(payload: any) {
    if (!this.config.tripId) return;
    try {
      await fetch(`/api/trips/${this.config.tripId}/gps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.state.lastSyncedAt = new Date().toISOString();
      this.notify();
    } catch (err) {
      console.warn('GPS ping sync note:', err);
    }
  }

  private flushOfflineQueue() {
    if (this.queuedPings.length === 0 || !this.config.tripId) return;
    const latest = this.queuedPings[this.queuedPings.length - 1];
    this.queuedPings = [];
    this.state.queuedPingsCount = 0;
    this.notify();
    this.sendPingToBackend(latest);
  }

  public startTracking() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.state.errorMessage = 'Geolocation is not supported by this device';
      this.notify();
      return;
    }

    // Monitor network connectivity
    this.onlineListener = () => {
      this.state.isOnline = true;
      this.notify();
      this.flushOfflineQueue();
    };
    this.offlineListener = () => {
      this.state.isOnline = false;
      this.notify();
    };
    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);

    this.state.isTracking = true;
    this.notify();

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        const newPing: GpsPing = {
          latitude,
          longitude,
          timestamp: pos.timestamp,
          accuracyMeters: accuracy,
          speedKmh: speed !== null && speed >= 0 ? Math.round(speed * 3.6) : undefined,
          heading: heading !== null && heading >= 0 ? heading : undefined,
        };

        const res = processGpsPingAndAccumulateDistance({
          previousPing: this.lastPing,
          newPing,
          currentTotalDistanceKm: this.state.actualDistanceKm,
        });

        if (res.isAccepted) {
          this.state.previousValidPoint = this.lastPing
            ? { latitude: this.lastPing.latitude, longitude: this.lastPing.longitude }
            : null;
          this.lastPing = newPing;
          this.state.actualDistanceKm = res.newTotalDistanceKm;
          this.state.remainingDistanceKm = Math.max(
            0,
            Math.round((this.state.plannedDistanceKm - res.newTotalDistanceKm) * 10) / 10
          );
        }

        this.state.currentPoint = {
          latitude,
          longitude,
          speed,
          accuracy,
        };
        this.state.speedKmh = newPing.speedKmh || 0;
        this.state.heading = heading ?? null;
        this.state.breadcrumbs.push({ lat: latitude, lng: longitude, timestamp: pos.timestamp });
        if (this.state.breadcrumbs.length > 50) this.state.breadcrumbs.shift();
        this.state.permissionStatus = 'granted';

        this.notify();

        // Requirement 16: Adaptive Sampling Throttling
        if (res.isAccepted && this.config.tripId) {
          const currentSpeed = newPing.speedKmh || 0;
          // Stationary (<3km/h): 10s | Slow (3-15km/h): 5s | Driving (>15km/h): 2.5s
          const syncIntervalMs = currentSpeed < 3 ? 10000 : currentSpeed < 15 ? 5000 : 2500;
          const now = Date.now();
          const timeSinceSync = now - this.lastNetworkSyncTime;

          const pingPayload = {
            latitude,
            longitude,
            accuracyMeters: accuracy,
            speedKmh: newPing.speedKmh,
            heading: heading ?? undefined,
            timestamp: new Date(pos.timestamp).toISOString(),
          };

          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            this.queuedPings.push(pingPayload);
            this.state.queuedPingsCount = this.queuedPings.length;
            this.notify();
          } else if (timeSinceSync >= syncIntervalMs || !this.lastNetworkSyncTime) {
            this.lastNetworkSyncTime = now;
            this.sendPingToBackend(pingPayload);
          }
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          this.state.permissionStatus = 'denied';
        }
        this.state.errorMessage = err.message;
        this.notify();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  }

  public stopTracking() {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.onlineListener && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineListener);
      this.onlineListener = null;
    }
    if (this.offlineListener && typeof window !== 'undefined') {
      window.removeEventListener('offline', this.offlineListener);
      this.offlineListener = null;
    }
    this.state.isTracking = false;
    this.notify();
  }

  public getState(): TrackingState {
    return { ...this.state };
  }
}
