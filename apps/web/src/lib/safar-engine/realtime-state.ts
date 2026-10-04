/**
 * SAFAR Realtime State Engine
 * 
 * High-performance in-memory state registry for active trips and live driver telemetry.
 * 
 * Objectives:
 * 1. O(1) average lookup for high-frequency live tracking queries
 * 2. Automatic TTL eviction for completed/idle trips (preventing memory leaks)
 * 3. Thread-safe, atomic updates within Node.js event loop
 * 
 * Memory Complexity: Bounded O(M) where M = count of concurrently active trips
 */

import { ActiveTripState, RawGpsTelemetry } from './types';

export class RealtimeStateEngine {
  private trips = new Map<string, ActiveTripState>();
  private driverToTripMap = new Map<string, string>(); // driverId -> tripId
  private eventToTripsMap = new Map<string, Set<string>>(); // eventId -> Set<tripId>
  private readonly maxInactiveTtlMs: number;
  private sweepInterval: NodeJS.Timeout | null = null;

  constructor(maxInactiveTtlMs = 1000 * 60 * 60 * 2) {
    // 2 hours idle TTL
    this.maxInactiveTtlMs = maxInactiveTtlMs;

    if (typeof setInterval !== 'undefined') {
      this.sweepInterval = setInterval(() => this.sweepExpiredState(), 1000 * 60 * 5);
      if (this.sweepInterval.unref) {
        this.sweepInterval.unref();
      }
    }
  }

  /**
   * Retrieves active trip state in O(1) time.
   */
  public getActiveTrip(tripId: string): ActiveTripState | null {
    return this.trips.get(tripId) || null;
  }

  /**
   * Retrieves active trip state by driverId in O(1) time.
   */
  public getActiveTripByDriver(driverId: string): ActiveTripState | null {
    const tripId = this.driverToTripMap.get(driverId);
    if (!tripId) return null;
    return this.trips.get(tripId) || null;
  }

  /**
   * Retrieves all active trips for an event in O(K) where K = active event trips.
   */
  public getActiveTripsByEvent(eventId: string): ActiveTripState[] {
    const tripIds = this.eventToTripsMap.get(eventId);
    if (!tripIds) return [];

    const activeList: ActiveTripState[] = [];
    tripIds.forEach((id) => {
      const state = this.trips.get(id);
      if (state) activeList.push(state);
    });
    return activeList;
  }

  /**
   * Updates or initializes active trip telemetry state.
   */
  public updateTripTelemetry(
    tripId: string,
    eventId: string,
    telemetry: RawGpsTelemetry,
    extra: {
      actualDistanceKm: number;
      remainingDistanceKm?: number;
      plannedDistanceKm?: number;
      etaMinutes?: number;
      status?: string;
    }
  ): ActiveTripState {
    const now = Date.now();
    let state = this.trips.get(tripId);

    if (!state) {
      state = {
        tripId,
        eventId,
        driverId: telemetry.driverId,
        vehicleId: telemetry.vehicleId,
        status: extra.status || 'IN_TRANSIT',
        currentLat: telemetry.latitude,
        currentLng: telemetry.longitude,
        heading: telemetry.heading,
        speedKmh: telemetry.speedKmh,
        accuracy: telemetry.accuracy,
        actualDistanceKm: extra.actualDistanceKm,
        plannedDistanceKm: extra.plannedDistanceKm,
        remainingDistanceKm: extra.remainingDistanceKm,
        etaMinutes: extra.etaMinutes,
        lastUpdated: now,
        isOnline: true,
        breadcrumbs: [],
      };
      this.trips.set(tripId, state);

      // Map indexing
      this.driverToTripMap.set(telemetry.driverId, tripId);
      let eventSet = this.eventToTripsMap.get(eventId);
      if (!eventSet) {
        eventSet = new Set<string>();
        this.eventToTripsMap.set(eventId, eventSet);
      }
      eventSet.add(tripId);
    } else {
      // Incremental state update
      state.currentLat = telemetry.latitude;
      state.currentLng = telemetry.longitude;
      state.heading = telemetry.heading !== undefined ? telemetry.heading : state.heading;
      state.speedKmh = telemetry.speedKmh !== undefined ? telemetry.speedKmh : state.speedKmh;
      state.accuracy = telemetry.accuracy !== undefined ? telemetry.accuracy : state.accuracy;
      state.actualDistanceKm = extra.actualDistanceKm;
      if (extra.remainingDistanceKm !== undefined) state.remainingDistanceKm = extra.remainingDistanceKm;
      if (extra.etaMinutes !== undefined) state.etaMinutes = extra.etaMinutes;
      if (extra.status) state.status = extra.status;
      state.lastUpdated = now;
      state.isOnline = true;
    }

    // Keep bounded breadcrumb history (last 50 points)
    state.breadcrumbs.push({
      lat: telemetry.latitude,
      lng: telemetry.longitude,
      timestamp: telemetry.timestamp || now,
    });
    if (state.breadcrumbs.length > 50) {
      state.breadcrumbs.shift();
    }

    return state;
  }

  /**
   * Evicts state when a trip is completed or cancelled.
   */
  public evictTrip(tripId: string): void {
    const state = this.trips.get(tripId);
    if (!state) return;

    this.driverToTripMap.delete(state.driverId);

    const eventSet = this.eventToTripsMap.get(state.eventId);
    if (eventSet) {
      eventSet.delete(tripId);
      if (eventSet.size === 0) {
        this.eventToTripsMap.delete(state.eventId);
      }
    }

    this.trips.delete(tripId);
  }

  /**
   * Sweeps expired idle trips.
   */
  public sweepExpiredState(): number {
    const now = Date.now();
    let count = 0;

    this.trips.forEach((state, tripId) => {
      if (now - state.lastUpdated > this.maxInactiveTtlMs) {
        this.evictTrip(tripId);
        count++;
      }
    });

    return count;
  }

  public getActiveTripCount(): number {
    return this.trips.size;
  }

  public destroy(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    this.trips.clear();
    this.driverToTripMap.clear();
    this.eventToTripsMap.clear();
  }
}

export const defaultRealtimeStateEngine = new RealtimeStateEngine();
