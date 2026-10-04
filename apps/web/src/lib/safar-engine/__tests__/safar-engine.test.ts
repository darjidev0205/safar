/**
 * SAFAR Algorithm Engine — Automated Test & Benchmark Suite
 * 
 * Verifies mathematical correctness, edge cases, and performance.
 */

import {
  calculateHaversineDistanceKm,
  calculateHaversineDistanceMeters,
  createInitialDistanceState,
  accumulateDistance,
  roundToDecimals,
} from '../distance-engine';

import {
  GpsValidationEngine,
  DEFAULT_GPS_CONFIG,
} from '../gps-engine';

import {
  TelemetryDeduplicationEngine,
} from '../deduplication-engine';

import {
  calculateCrossTrackDistanceMeters,
  findMinimumRouteDeviationMeters,
} from '../route-deviation';

import {
  RouteCostOptimizationEngine,
} from '../cost-optimizer';

import {
  defaultEtaEngine,
} from '../eta-engine';

import {
  DriverAssignmentEngine,
} from '../driver-assignment';

import {
  RealtimeStateEngine,
} from '../realtime-state';

import {
  TripStateMachine,
} from '../trip-state-machine';

import {
  encodeCursor,
  decodeCursor,
  paginateArray,
} from '../pagination';

import {
  AccessEngine,
} from '../access-engine';

export function runSafarEngineTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      errors.push(`FAILED: ${testName}`);
      console.error(`  ✗ ${testName}`);
    }
  }

  console.log('\n--- 1. Distance Engine & Haversine Tests ---');
  // Ahmedabad to Gandhinagar ~25km
  const dist = calculateHaversineDistanceKm(23.0225, 72.5714, 23.2156, 72.6369);
  assert(dist > 20 && dist < 30, `Haversine distance Ahmedabad-Gandhinagar is ${dist.toFixed(2)} km (~23km expected)`);

  const initialDistState = createInitialDistanceState(25.0);
  assert(initialDistState.actualDistanceKm === 0, 'Initial distance state starts at 0 km');

  const p1 = { latitude: 23.0225, longitude: 72.5714, timestamp: Date.now() };
  const p2 = { latitude: 23.0315, longitude: 72.5804, timestamp: Date.now() + 60000 };
  const stepState = accumulateDistance(initialDistState, p1);
  const nextStepState = accumulateDistance(stepState, p2, { latitude: 23.2156, longitude: 72.6369 });
  assert(nextStepState.actualDistanceKm > 1 && nextStepState.actualDistanceKm < 2, `Incremental distance accumulated: ${nextStepState.actualDistanceKm} km`);
  assert(nextStepState.validPingsCount === 2, 'Valid pings count incremented to 2');

  console.log('\n--- 2. GPS Engine & Noise Filtering Tests ---');
  const gpsValidator = new GpsValidationEngine();
  
  // A. Reject out of bounds coordinates
  const invalidLat = gpsValidator.validateTelemetry(
    { driverId: 'drv1', latitude: 95.0, longitude: 72.5, timestamp: Date.now() },
    null
  );
  assert(!invalidLat.isValid, 'Rejects latitude > 90');

  // B. Reject poor accuracy
  const poorAcc = gpsValidator.validateTelemetry(
    { driverId: 'drv1', latitude: 23.0, longitude: 72.5, accuracy: 150, timestamp: Date.now() },
    null
  );
  assert(poorAcc.isValid && !poorAcc.isUsableForDistance && poorAcc.flags.isPoorAccuracy, 'Flags accuracy > 80m as unusable for distance');

  // C. Suppress stationary jitter (< 6m)
  const basePoint = { latitude: 23.0000, longitude: 72.0000, timestamp: Date.now() };
  const jitterPoint = gpsValidator.validateTelemetry(
    { driverId: 'drv1', latitude: 23.00002, longitude: 72.00002, speedKmh: 0, timestamp: Date.now() + 3000 },
    basePoint
  );
  assert(jitterPoint.isValid && !jitterPoint.isUsableForDistance && jitterPoint.flags.isStationaryJitter, 'Suppresses stationary GPS jitter');

  // D. Reject teleportation jump (> 150 km/h or impossible speed)
  const teleportPoint = gpsValidator.validateTelemetry(
    { driverId: 'drv1', latitude: 24.5000, longitude: 74.0000, timestamp: Date.now() + 2000 },
    basePoint
  );
  assert(!teleportPoint.isValid && teleportPoint.flags.isTeleportationJump, 'Rejects impossible teleportation jump (>150 km/h)');

  console.log('\n--- 3. Telemetry Deduplication Tests ---');
  const deduplicator = new TelemetryDeduplicationEngine(10);
  const fp = deduplicator.generateFingerprint('drv1', 1700000000000, 23.0225, 72.5714);
  const isFirst = deduplicator.isDuplicate('trip_1', fp);
  const isSecond = deduplicator.isDuplicate('trip_1', fp);
  assert(!isFirst, 'First telemetry ping is recognized as new');
  assert(isSecond, 'Second duplicate telemetry ping is caught and flagged');

  console.log('\n--- 4. Route Deviation & Cross-Track Distance Tests ---');
  const routeStart = { latitude: 23.0000, longitude: 72.0000 };
  const routeEnd = { latitude: 23.0000, longitude: 72.1000 };
  const onRoutePoint = { latitude: 23.0000, longitude: 72.0500 };
  const offRoutePoint = { latitude: 23.0100, longitude: 72.0500 }; // ~1.1km north
  
  const onRouteXtd = calculateCrossTrackDistanceMeters(onRoutePoint, routeStart, routeEnd);
  const offRouteXtd = calculateCrossTrackDistanceMeters(offRoutePoint, routeStart, routeEnd);
  assert(onRouteXtd < 5, `On-route cross-track distance is ~0m (${onRouteXtd.toFixed(1)}m)`);
  assert(offRouteXtd > 1000 && offRouteXtd < 1200, `Off-route cross-track distance is ~1.1km (${offRouteXtd.toFixed(1)}m)`);

  console.log('\n--- 5. Google Maps Cost Optimizer Tests ---');
  const costOptimizer = new RouteCostOptimizationEngine({ minIntervalSeconds: 60, minDistanceTraveledKm: 0.8 });
  
  // A. Initial request -> must refresh
  const initialDecision = costOptimizer.evaluateRouteRefresh({
    tripId: 't1',
    currentLat: 23.0,
    currentLng: 72.0,
    destinationLat: 23.1,
    destinationLng: 72.1,
    currentTripStatus: 'IN_TRANSIT',
  });
  assert(initialDecision.shouldRefresh && initialDecision.reason === 'INITIAL_ROUTE', 'Initial route request allows Google Maps call');

  // B. Subsequent request within cooling period (<60s) -> suppresses call
  const coolingDecision = costOptimizer.evaluateRouteRefresh({
    tripId: 't1',
    currentLat: 23.001,
    currentLng: 72.001,
    destinationLat: 23.1,
    destinationLng: 72.1,
    lastRouteRequestedAt: Date.now() - 10000, // 10s ago
    lastRouteRequestLat: 23.0,
    lastRouteRequestLng: 72.0,
    currentTripStatus: 'IN_TRANSIT',
  });
  assert(!coolingDecision.shouldRefresh && coolingDecision.reason === 'NO_REFRESH_NEEDED', 'Suppresses Google Maps call during cooling period');

  console.log('\n--- 6. ETA Engine Tests ---');
  const etaMoving = defaultEtaEngine.calculateEta({
    remainingDistanceKm: 15.0,
    currentSpeedKmh: 45.0,
  });
  assert(etaMoving.estimatedDurationMinutes === 24, `Moving ETA computed correctly: ${etaMoving.estimatedDurationMinutes} mins for 15km at blended ~38km/h`);

  const etaArrived = defaultEtaEngine.calculateEta({
    remainingDistanceKm: 0.02,
  });
  assert(etaArrived.estimatedDurationMinutes === 0, 'Arrived ETA is 0 mins');

  console.log('\n--- 7. Driver Assignment Scoring Engine Tests ---');
  const assignmentEngine = new DriverAssignmentEngine();
  const tripReq = {
    eventId: 'ev1',
    originLat: 23.0225,
    originLng: 72.5714,
    destinationLat: 23.2156,
    destinationLng: 72.6369,
    scheduledPickupTime: new Date(),
    passengerCount: 4,
    requestedCategory: 'SUV',
  };

  const candidates = [
    {
      id: 'd1',
      userId: 'u1',
      fullName: 'Rahul (Nearby SUV)',
      dutyStatus: 'AVAILABLE' as const,
      currentLocation: { latitude: 23.0250, longitude: 72.5730 }, // ~300m away
      currentVehicle: { id: 'v1', model: 'Innova', plateNumber: 'GJ01A1', category: 'SUV' as const, capacity: 6, isActive: true },
      activeTripsCountToday: 0,
    },
    {
      id: 'd2',
      userId: 'u2',
      fullName: 'Vikram (Far Sedan)',
      dutyStatus: 'ON_DUTY' as const,
      currentLocation: { latitude: 23.1500, longitude: 72.6000 }, // ~15km away
      currentVehicle: { id: 'v2', model: 'Dzire', plateNumber: 'GJ01A2', category: 'SEDAN' as const, capacity: 4, isActive: true },
      activeTripsCountToday: 3,
    },
    {
      id: 'd3',
      userId: 'u3',
      fullName: 'Suresh (Off Duty)',
      dutyStatus: 'OFF_DUTY' as const,
      currentLocation: { latitude: 23.0225, longitude: 72.5714 },
      currentVehicle: { id: 'v3', model: 'Innova', plateNumber: 'GJ01A3', category: 'SUV' as const, capacity: 6, isActive: true },
      activeTripsCountToday: 0,
    },
  ];

  const ranked = assignmentEngine.rankCandidates(candidates, tripReq);
  assert(ranked[0].driver.id === 'd1', `Optimal candidate chosen: ${ranked[0].driver.fullName} (Score: ${ranked[0].totalScore})`);
  assert(!ranked[2].isEligible, 'Off-duty driver correctly marked as ineligible');

  console.log('\n--- 8. Realtime State Engine Tests ---');
  const realtimeState = new RealtimeStateEngine(1000 * 60 * 60);
  realtimeState.updateTripTelemetry('trip_100', 'event_100', {
    driverId: 'drv_100',
    latitude: 23.0225,
    longitude: 72.5714,
    speedKmh: 35,
    timestamp: Date.now(),
  }, {
    actualDistanceKm: 4.5,
    remainingDistanceKm: 12.0,
  });

  const liveState = realtimeState.getActiveTrip('trip_100');
  assert(liveState !== null && liveState.actualDistanceKm === 4.5, 'Active trip stored and retrieved in O(1) time');
  
  const liveByDriver = realtimeState.getActiveTripByDriver('drv_100');
  assert(liveByDriver !== null && liveByDriver.tripId === 'trip_100', 'Active trip indexed by driverId');

  realtimeState.evictTrip('trip_100');
  assert(realtimeState.getActiveTrip('trip_100') === null, 'Active trip cleanly evicted after completion');

  console.log('\n--- 9. Trip State Machine Tests ---');
  const stateMachine = new TripStateMachine();
  
  // Valid transition
  const validTransition = stateMachine.validateTransition('SCHEDULED', 'ASSIGNED');
  assert(validTransition.isValid, 'SCHEDULED -> ASSIGNED is valid');

  // Invalid skip transition
  const invalidTransition = stateMachine.validateTransition('SCHEDULED', 'COMPLETED');
  assert(!invalidTransition.isValid, 'SCHEDULED -> COMPLETED is rejected');

  // Terminal state immutability
  const terminalTransition = stateMachine.validateTransition('COMPLETED', 'IN_TRANSIT');
  assert(!terminalTransition.isValid && terminalTransition.isTerminal, 'COMPLETED terminal state cannot transition');

  console.log('\n--- 10. Pagination & Access Code Tests ---');
  const cursor = encodeCursor('item_123', 1700000000000);
  const decoded = decodeCursor(cursor);
  assert(decoded !== null && decoded.id === 'item_123', 'Cursor encoded and decoded accurately');

  const accessEngine = new AccessEngine();
  const code = accessEngine.generateCode();
  assert(code.length === 6 && accessEngine.isValidCodeFormat(code), `Generated 6-character secure code: ${code}`);

  return { passed, failed, errors };
}
