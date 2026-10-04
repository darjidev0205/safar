/**
 * SAFAR — Google Maps Platform Loader
 *
 * Loads the Google Maps JS SDK exactly once for the entire app.
 * Components call `loadGoogleMaps()` and await the result.
 * Subsequent calls return the already-resolved promise.
 *
 * Libraries: places (Places API autocomplete), routes
 */

const SCRIPT_ID = 'safar-google-maps-script';

let _loadPromise: Promise<void> | null = null;

export function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? 'AIzaSyCzPMW0u5jVaw2EgF-xu2nx0FBW1h2270U';
}

export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as any).google?.maps?.Map;
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser.'));
  }

  // If already loaded and Map constructor is available
  if ((window as any).google?.maps?.Map) {
    return Promise.resolve();
  }

  if (_loadPromise) return _loadPromise;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.'));
  }

  _loadPromise = new Promise<void>((resolve, reject) => {
    // Check if script element is already in DOM
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement;

    const waitForGoogleMaps = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).google?.maps?.Map && (window as any).google?.maps?.DirectionsService) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 100) {
          clearInterval(interval);
          _loadPromise = null;
          reject(new Error('Timed out waiting for Google Maps libraries to initialize.'));
        }
      }, 50);
    };

    if (existingScript) {
      waitForGoogleMaps();
      return;
    }

    const callbackName = '__safarGoogleMapsCallback_' + Math.random().toString(36).substring(2, 9);
    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      waitForGoogleMaps();
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      _loadPromise = null;
      delete (window as any)[callbackName];
      reject(new Error('Google Maps script failed to load. Please verify your network connection and API key.'));
    };

    document.head.appendChild(script);
  });

  return _loadPromise;
}
