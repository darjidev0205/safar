/**
 * SAFAR Algorithmic Engine — Type Definitions
 * 
 * Core domain types for telemetry, geographic calculations,
 * state machines, driver scoring, and route cost optimization.
 */

export interface GpsCoordinate {
  latitude: number;
  longitude: number;
}

export interface RawGpsTelemetry {
  updateId?: string;
  driverId: string;
  tripId?: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number; // meters (horizontal accuracy)
  speedKmh?: number; // km/h
  speedMs?: number; // m/s
  heading?: number | null; // 0-360 degrees
  timestamp: number; // Unix timestamp in milliseconds
}

export interface GpsValidationConfig {
  maxAllowedAccuracyMeters: number; // default: 80m
  maxFeasibleSpeedKmh: number; // default: 150 km/h
  maxJumpDistanceMeters: number; // default: 500m
  minJumpTimeSeconds: number; // default: 3s
  minStationaryJitterDistanceMeters: number; // default: 6m
  maxFutureTimestampSkewMs: number; // default: 60,000ms (1 min)
  maxStaleTimestampAgeMs: number; // default: 86,400,000ms (24h)
}

export interface GpsValidationResult {
  isValid: boolean;
  isUsableForDistance: boolean;
  distanceDeltaKm: number;
  impliedSpeedKmh: number;
  timeDeltaSec: number;
  rejectionReason?: string;
  flags: {
    isPoorAccuracy: boolean;
    isStationaryJitter: boolean;
    isTeleportationJump: boolean;
    isTimestampSkewed: boolean;
    isDuplicate: boolean;
  };
}

export interface DistanceState {
  actualDistanceKm: number;
  plannedDistanceKm?: number;
  remainingDistanceKm?: number;
  lastValidPoint: GpsCoordinate & { timestamp: number } | null;
  totalPingsProcessed: number;
  validPingsCount: number;
  rejectedPingsCount: number;
}

export interface RouteRefreshInput {
  tripId: string;
  currentLat: number;
  currentLng: number;
  currentSpeedKmh?: number;
  destinationLat: number;
  destinationLng: number;
  lastRouteRequestedAt?: number; // ms timestamp
  lastRouteRequestLat?: number;
  lastRouteRequestLng?: number;
  routeGeometryPoints?: GpsCoordinate[];
  currentTripStatus: string;
}

export interface RouteRefreshDecision {
  shouldRefresh: boolean;
  reason: 'INITIAL_ROUTE' | 'TIME_ELAPSED' | 'DISTANCE_ELAPSED' | 'OFF_ROUTE_DEVIATION' | 'DESTINATION_CHANGED' | 'STATUS_CHANGED' | 'NO_REFRESH_NEEDED';
  crossTrackDistanceMeters?: number;
  distanceSinceLastRequestKm?: number;
  timeSinceLastRequestSec?: number;
}

export interface EtaCalculationInput {
  remainingDistanceKm: number;
  currentSpeedKmh?: number;
  historicalAverageSpeedKmh?: number;
  isCityTraffic?: boolean;
}

export interface EtaCalculationResult {
  estimatedDurationMinutes: number;
  estimatedArrivalTime: Date;
  confidenceScore: number; // 0.0 to 1.0
  isEstimatedFromAverage: boolean;
}

export interface DriverCandidate {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber?: string;
  dutyStatus: 'AVAILABLE' | 'ON_DUTY' | 'ON_TRIP' | 'OFF_DUTY' | 'BREAK';
  currentLocation?: GpsCoordinate;
  lastPingAt?: Date | null;
  currentVehicle?: {
    id: string;
    model: string;
    plateNumber: string;
    category: 'SEDAN' | 'SUV' | 'TEMPO_TRAVELLER' | 'LUXURY_SEDAN' | 'BUS';
    capacity: number;
    isActive: boolean;
  } | null;
  activeTripsCountToday: number;
}

export interface TripRequirement {
  id?: string;
  eventId: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  scheduledPickupTime: Date;
  passengerCount: number;
  requestedCategory?: string;
}

export interface ScoredDriverCandidate {
  driver: DriverCandidate;
  isEligible: boolean;
  ineligibilityReason?: string;
  totalScore: number; // 0 - 100
  scoreBreakdown: {
    proximityScore: number; // distance to pickup
    capacityFitScore: number; // matching passenger count
    dutyStatusScore: number; // available vs on_duty
    categoryMatchScore: number; // matching vehicle category
    workloadScore: number; // fairer distribution
  };
  distanceToPickupKm?: number;
  estimatedTimeToPickupMin?: number;
}

export interface ActiveTripState {
  tripId: string;
  eventId: string;
  driverId: string;
  vehicleId?: string;
  status: string;
  currentLat: number;
  currentLng: number;
  heading?: number | null;
  speedKmh?: number;
  accuracy?: number;
  actualDistanceKm: number;
  plannedDistanceKm?: number;
  remainingDistanceKm?: number;
  etaMinutes?: number;
  lastUpdated: number; // ms epoch
  isOnline: boolean;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}
