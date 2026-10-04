'use client';

import { useState, useEffect, useRef } from 'react';
import { firestore, doc } from './firebase';
import { onSnapshot } from 'firebase/firestore';

export interface LiveTripState {
  tripId: string;
  status: string;
  driver: {
    id?: string;
    name: string;
    phone: string;
  };
  vehicle: {
    id?: string;
    model: string;
    plateNumber: string;
    category?: string;
    capacity?: number;
  };
  pickup: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  telemetry: {
    currentLat: number;
    currentLng: number;
    speedKmh: number;
    heading: number | null;
    accuracy?: number;
    actualDistanceKm: number;
    plannedDistanceKm: number;
    remainingDistanceKm: number;
    lastPingAt: string | number;
  };
  breadcrumbs: Array<{ lat: number; lng: number; timestamp?: number }>;
  isLiveConnected: boolean;
  lastSyncedAt: number;
  loading: boolean;
}

export function useRealtimeTrip(tripId: string, initialData?: Partial<LiveTripState>) {
  const [tripState, setTripState] = useState<LiveTripState>({
    tripId: tripId || 'tr_101',
    status: initialData?.status || 'IN_TRANSIT',
    driver: initialData?.driver || {
      name: 'Rahul Patel',
      phone: '+91 98765 43210',
    },
    vehicle: initialData?.vehicle || {
      model: 'Toyota Innova Crysta',
      plateNumber: 'GJ 01 AB 1234',
      category: 'SUV',
      capacity: 6,
    },
    pickup: initialData?.pickup || {
      name: 'The Grand Hotel',
      address: 'Lobby Gate 2, SG Highway, Ahmedabad',
      lat: 23.0395,
      lng: 72.558,
    },
    destination: initialData?.destination || {
      name: 'The Celebration Venue',
      address: 'North Lawn, Sindhu Bhavan Road, Ahmedabad',
      lat: 23.0225,
      lng: 72.5714,
    },
    telemetry: initialData?.telemetry || {
      currentLat: 23.0338,
      currentLng: 72.5256,
      speedKmh: 38,
      heading: 74,
      accuracy: 5,
      actualDistanceKm: 12.7,
      plannedDistanceKm: 23.5,
      remainingDistanceKm: 8.4,
      lastPingAt: Date.now(),
    },
    breadcrumbs: initialData?.breadcrumbs || [],
    isLiveConnected: false,
    lastSyncedAt: Date.now(),
    loading: true,
  });

  const isMounted = useRef(true);

  // 1. Fetch initial state & setup REST fallback polling
  const fetchTripDetails = async () => {
    if (!tripId) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/tracking`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.trip && isMounted.current) {
          setTripState((prev) => ({
            ...prev,
            ...json.trip,
            loading: false,
            lastSyncedAt: Date.now(),
          }));
        }
      }
    } catch (err) {
      console.warn('Could not poll trip tracking endpoint:', err);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchTripDetails();

    // 2. Real-time Firestore document listener for instantaneous updates
    let unsubscribeFirestore: (() => void) | null = null;
    if (tripId) {
      try {
        const docRef = doc(firestore, 'live_trips', tripId);
        unsubscribeFirestore = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists() && isMounted.current) {
              const data = snapshot.data();
              setTripState((prev) => {
                const newBreadcrumbs = [...prev.breadcrumbs];
                if (
                  data.latitude &&
                  data.longitude &&
                  (newBreadcrumbs.length === 0 ||
                    newBreadcrumbs[newBreadcrumbs.length - 1].lat !== data.latitude ||
                    newBreadcrumbs[newBreadcrumbs.length - 1].lng !== data.longitude)
                ) {
                  newBreadcrumbs.push({
                    lat: data.latitude,
                    lng: data.longitude,
                    timestamp: data.timestamp || Date.now(),
                  });
                }

                return {
                  ...prev,
                  status: data.status || prev.status,
                  telemetry: {
                    ...prev.telemetry,
                    currentLat: data.latitude || prev.telemetry.currentLat,
                    currentLng: data.longitude || prev.telemetry.currentLng,
                    speedKmh: data.speedKmh ?? prev.telemetry.speedKmh,
                    heading: data.heading ?? prev.telemetry.heading,
                    accuracy: data.accuracy ?? prev.telemetry.accuracy,
                    actualDistanceKm: data.actualDistanceKm ?? prev.telemetry.actualDistanceKm,
                    remainingDistanceKm: data.remainingDistanceKm ?? prev.telemetry.remainingDistanceKm,
                    plannedDistanceKm: data.plannedDistanceKm ?? prev.telemetry.plannedDistanceKm,
                    lastPingAt: data.lastUpdated || Date.now(),
                  },
                  breadcrumbs: newBreadcrumbs.slice(-100),
                  isLiveConnected: true,
                  lastSyncedAt: Date.now(),
                  loading: false,
                };
              });
            }
          },
          (err) => {
            console.warn('Firestore snapshot notice (fallback to REST polling):', err);
          }
        );
      } catch (err) {
        console.warn('Error setting up Firestore listener:', err);
      }
    }

    // 3. Fallback heartbeat interval (every 8s) to maintain sync across networks
    const pollInterval = setInterval(() => {
      fetchTripDetails();
    }, 8000);

    return () => {
      isMounted.current = false;
      if (unsubscribeFirestore) unsubscribeFirestore();
      clearInterval(pollInterval);
    };
  }, [tripId]);

  return tripState;
}
