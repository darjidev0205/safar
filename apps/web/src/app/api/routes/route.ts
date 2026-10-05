import { NextRequest, NextResponse } from 'next/server';
import { getCallerUser } from '../../../lib/caller-auth';

export const dynamic = 'force-dynamic';

interface LatLng {
  lat: number;
  lng: number;
}

// In-memory route cache (5 min TTL) to minimize Google Routes API billing
const SERVER_ROUTE_CACHE = new Map<string, { data: any; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const body = await req.json();
    const { origin, destination } = body;

    if (
      !origin ||
      !destination ||
      typeof origin.lat !== 'number' ||
      typeof origin.lng !== 'number' ||
      typeof destination.lat !== 'number' ||
      typeof destination.lng !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: { message: 'Valid origin and destination coordinates are required.' } },
        { status: 400 }
      );
    }

    // Cache key rounded to ~100m
    const cacheKey = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}->${destination.lat.toFixed(3)},${destination.lng.toFixed(3)}`;
    const cached = SERVER_ROUTE_CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({
        success: true,
        route: cached.data,
        cached: true,
      });
    }

    const apiKey =
      process.env.GOOGLE_MAPS_SERVER_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      'AIzaSyCzPMW0u5jVaw2EgF-xu2nx0FBW1h2270U';

    // Call Google Routes API (v2) or Directions API
    const routesApiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const routesPayload = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
    };

    let routeData: any = null;

    try {
      const response = await fetch(routesApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify(routesPayload),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.routes && json.routes.length > 0) {
          const r = json.routes[0];
          const distanceMeters = r.distanceMeters || 0;
          const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
          const durationSeconds = parseInt(r.duration?.replace('s', '') || '0', 10);
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

          routeData = {
            distanceKm,
            durationMinutes,
            distanceText: `${distanceKm} km`,
            durationText: `${durationMinutes} mins`,
            encodedPolyline: r.polyline?.encodedPolyline || '',
          };
        }
      }
    } catch (routeErr) {
      console.warn('Google Routes API fetch note:', routeErr);
    }

    // Fallback: Haversine distance with urban traffic multiplier if API call fails
    if (!routeData) {
      const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
      const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((origin.lat * Math.PI) / 180) *
          Math.cos((destination.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const straightKm = 6371 * c;
      const distanceKm = Math.round(straightKm * 1.35 * 10) / 10;
      const durationMinutes = Math.max(1, Math.round((distanceKm / 25) * 60));

      routeData = {
        distanceKm,
        durationMinutes,
        distanceText: `${distanceKm} km`,
        durationText: `${durationMinutes} mins`,
        encodedPolyline: '',
      };
    }

    // Store in cache for 5 minutes
    SERVER_ROUTE_CACHE.set(cacheKey, {
      data: routeData,
      expiresAt: Date.now() + 1000 * 60 * 5,
    });

    return NextResponse.json({
      success: true,
      route: routeData,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error in /api/routes:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Route calculation failed' } },
      { status: 500 }
    );
  }
}
