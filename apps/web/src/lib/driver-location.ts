/**
 * SAFAR — Driver Location Service
 *
 * Abstracts browser Geolocation API for the driver experience.
 * Architecture is prepared for future backend/WebSocket integration:
 *
 *   Driver browser
 *     → captureLocation()
 *       → (future) POST /api/driver/location
 *         → WebSocket broadcast
 *           → Host + Guest dashboards
 *
 * Currently captures real GPS coordinates when the driver grants
 * permission, without faking any data.
 */

export interface DriverPosition {
  latitude: number;
  longitude: number;
  accuracy: number; // metres
  heading: number | null; // degrees, null if unavailable
  speed: number | null; // m/s, null if unavailable
  timestamp: number; // epoch ms
}

export type LocationError =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED';

export interface LocationServiceCallbacks {
  onPosition: (pos: DriverPosition) => void;
  onError: (error: LocationError) => void;
}

let _watchId: number | null = null;

/**
 * Start watching the driver's real GPS position.
 * Returns a cleanup function that stops watching.
 *
 * NOTE: No fake data is generated. If the browser doesn't support
 * geolocation or the user denies permission, onError is called.
 */
export function startDriverLocationWatch(callbacks: LocationServiceCallbacks): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    callbacks.onError('NOT_SUPPORTED');
    return () => {};
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 5_000,
  };

  const handleSuccess = (pos: GeolocationPosition) => {
    const driverPos: DriverPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    };
    callbacks.onPosition(driverPos);

    // TODO: When backend is ready, POST position to /api/driver/location
    // sendPositionToBackend(driverPos);
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

  return () => {
    if (_watchId !== null) {
      navigator.geolocation.clearWatch(_watchId);
      _watchId = null;
    }
  };
}

/**
 * Get a single one-shot position reading.
 */
export function getCurrentDriverPosition(): Promise<DriverPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
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
