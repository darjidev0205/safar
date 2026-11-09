/**
 * SAFAR — Driver Location Service & Offline Resilient Telemetry Pipeline
 *
 * Implements PR 4 Ground-Truth Telemetry Engine:
 * - Browser Geolocation watchPosition with high accuracy
 * - Monotonic sequence numbering
 * - Offline localStorage queueing with retry on network reconnection
 * - Batch upload to POST /api/driver/duties/:dutyId/location-batches
 * - GPS Signal health metrics (Accuracy, Sync Latency, Queue Backlog)
 */

export interface DriverPosition {
  latitude: number;
  longitude: number;
  accuracy: number; // metres
  heading: number | null; // degrees, null if unavailable
  speed: number | null; // m/s, null if unavailable
  timestamp: number; // epoch ms
  sequence?: number;
}

export type LocationError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED';

export interface LocationServiceCallbacks {
  onPosition: (pos: DriverPosition) => void;
  onError: (error: LocationError) => void;
  onSyncStateChange?: (state: TelemetrySyncState) => void;
}

export interface TelemetrySyncState {
  isTracking: boolean;
  isOnline: boolean;
  queuedPingsCount: number;
  lastSyncedAt: Date | null;
  accuracyMeters: number | null;
  lastError: string | null;
}

export interface QueuedPing {
  sequence: number;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  sampledAt: string;
  tripId?: string | null;
}

const QUEUE_STORAGE_KEY = 'safar_driver_offline_pings_queue';
const SEQ_STORAGE_KEY = 'safar_driver_sequence_counter';

let _watchId: number | null = null;
let _batchUploadTimer: any = null;
let _currentDutyId: string | null = null;
let _currentTripId: string | null = null;
let _activeCallbacks: LocationServiceCallbacks | null = null;

function getNextSequence(): number {
  if (typeof window === 'undefined') return 1;
  const current = parseInt(localStorage.getItem(SEQ_STORAGE_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(SEQ_STORAGE_KEY, next.toString());
  return next;
}

function getStoredQueue(): QueuedPing[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredQueue(queue: QueuedPing[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-500))); // Cap at 500
  } catch (err) {
    console.warn('Failed to persist driver telemetry queue to localStorage:', err);
  }
}

/**
 * Upload queued location pings to server
 */
export async function flushTelemetryQueue(dutyId: string): Promise<boolean> {
  const queue = getStoredQueue();
  if (queue.length === 0) return true;

  const batchToUpload = queue.slice(0, 50); // Upload up to 50 pings in a batch

  try {
    const response = await fetch(`/api/driver/duties/${dutyId}/location-batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: typeof navigator !== 'undefined' ? navigator.userAgent : 'driver_web_client',
        pings: batchToUpload,
      }),
    });

    if (response.ok) {
      // Remove uploaded items from queue
      const uploadedSeqs = new Set(batchToUpload.map((p) => p.sequence));
      const remainingQueue = queue.filter((p) => !uploadedSeqs.has(p.sequence));
      saveStoredQueue(remainingQueue);

      if (_activeCallbacks?.onSyncStateChange) {
        _activeCallbacks.onSyncStateChange({
          isTracking: Boolean(_watchId !== null),
          isOnline: true,
          queuedPingsCount: remainingQueue.length,
          lastSyncedAt: new Date(),
          accuracyMeters: batchToUpload[batchToUpload.length - 1]?.accuracy ?? null,
          lastError: null,
        });
      }
      return true;
    } else {
      console.warn(`Location batch upload failed with status ${response.status}`);
      return false;
    }
  } catch (err: any) {
    console.warn('Network offline or error uploading telemetry batch:', err?.message);
    if (_activeCallbacks?.onSyncStateChange) {
      _activeCallbacks.onSyncStateChange({
        isTracking: Boolean(_watchId !== null),
        isOnline: false,
        queuedPingsCount: queue.length,
        lastSyncedAt: null,
        accuracyMeters: null,
        lastError: err?.message || 'Network offline',
      });
    }
    return false;
  }
}

/**
 * Start watching the driver's real GPS position and upload batches.
 * Returns a cleanup function that stops watching.
 */
export function startDriverLocationWatch(
  callbacks: LocationServiceCallbacks,
  dutyId?: string,
  tripId?: string
): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    callbacks.onError('NOT_SUPPORTED');
    return () => {};
  }

  _currentDutyId = dutyId || null;
  _currentTripId = tripId || null;
  _activeCallbacks = callbacks;

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 3_000,
  };

  const handleSuccess = (pos: GeolocationPosition) => {
    const sequence = getNextSequence();
    const driverPos: DriverPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
      sequence,
    };

    callbacks.onPosition(driverPos);

    // Queue point in local storage
    const currentQueue = getStoredQueue();
    currentQueue.push({
      sequence,
      latitude: driverPos.latitude,
      longitude: driverPos.longitude,
      heading: driverPos.heading,
      speed: driverPos.speed,
      accuracy: driverPos.accuracy,
      sampledAt: new Date(driverPos.timestamp).toISOString(),
      tripId: _currentTripId,
    });
    saveStoredQueue(currentQueue);

    // If queue reaches 5 items or if dutyId is set, trigger flush
    if (_currentDutyId && currentQueue.length >= 5) {
      flushTelemetryQueue(_currentDutyId);
    }
  };

  const handleError = (err: GeolocationPositionError) => {
    let code: LocationError;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        code = 'PERMISSION_DENIED';
        break;
      case err.POSITION_UNAVAILABLE:
        code = 'POSITION_UNAVAILABLE';
        break;
      case err.TIMEOUT:
        code = 'TIMEOUT';
        break;
      default:
        code = 'POSITION_UNAVAILABLE';
    }
    callbacks.onError(code);
  };

  _watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

  // Periodic flush every 7 seconds while active
  if (_currentDutyId) {
    _batchUploadTimer = setInterval(() => {
      if (_currentDutyId) {
        flushTelemetryQueue(_currentDutyId);
      }
    }, 7000);
  }

  return () => {
    if (_watchId !== null) {
      navigator.geolocation.clearWatch(_watchId);
      _watchId = null;
    }
    if (_batchUploadTimer !== null) {
      clearInterval(_batchUploadTimer);
      _batchUploadTimer = null;
    }
    _activeCallbacks = null;
  };
}

/**
 * Get a single one-shot position reading.
 */
export function getCurrentDriverPosition(): Promise<DriverPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('NOT_SUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  });
}

/** Human-readable error messages for UI display */
export function locationErrorMessage(code: LocationError): string {
  switch (code) {
    case 'PERMISSION_DENIED':
      return 'Location access denied. Please allow location permission in your browser.';
    case 'POSITION_UNAVAILABLE':
      return 'Your location is currently unavailable.';
    case 'TIMEOUT':
      return 'Location request timed out. Retrying…';
    case 'NOT_SUPPORTED':
      return 'Location is not supported on this device.';
  }
}
