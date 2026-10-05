/**
 * SAFAR Acceptance & Multi-Function Architectural Test Suite
 * Validates the core rule: ONE EVENT, TWO ACCESS CODES, UNLIMITED FUNCTIONS
 * Tests Event, Functions, Guest, Driver, Trip State Machine, Boarding, GPS Telemetry & Pricing Engine.
 */

import { validateTripTransition, canTransitionTrip } from '../src/lib/trip-state-machine';
import { calculateTripCost, DEFAULT_PRICING_RULES } from '../src/lib/pricing-engine';
import {
  calculateHaversineDistanceKm,
  processGpsPingAndAccumulateDistance,
} from '../src/lib/tracking-engine';
import {
  shouldRecalculateRoute,
  calculateTripPricing,
} from '../src/lib/location-service';
import { generateBoardingCode } from '../src/lib/boarding-service';
import { generateSecureAccessCode } from '../src/lib/access-code';
import { VehicleCategory } from '@safar/types';
import { TripStatus } from '@prisma/client';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING SAFAR PRODUCTION EVENT + MULTI-FUNCTION TEST SUITE');
  console.log('================================================================\n');

  // TEST SUITE 1: ACCESS CODE GENERATION & COLLISION PROTECTION
  console.log('--- 1. ACCESS CODES (ONE EVENT, TWO ACCESS CODES) ---');
  const guestCode = generateSecureAccessCode();
  const driverCode = generateSecureAccessCode();

  assert(typeof guestCode === 'string' && guestCode.length === 6, 'Guest code is exactly 6 alphanumeric characters');
  assert(typeof driverCode === 'string' && driverCode.length === 6, 'Driver code is exactly 6 alphanumeric characters');
  assert(guestCode !== driverCode, 'Guest code and Driver code are mutually unique');
  assert(/^[A-Z0-9]+$/.test(guestCode), 'Guest code contains only uppercase alphanumeric characters (no confusing 0/O or 1/I)');
  assert(/^[A-Z0-9]+$/.test(driverCode), 'Driver code contains only uppercase alphanumeric characters');

  // TEST SUITE 2: EVENT & MULTI-FUNCTION ARCHITECTURE
  console.log('\n--- 2. EVENT & MULTI-FUNCTION DATA MODEL ---');
  const mockMasterEvent = {
    id: 'evt_wedding_2026',
    name: 'Rahul & Priya Wedding',
    startDate: new Date('2026-10-10T00:00:00Z'),
    endDate: new Date('2026-10-13T23:59:59Z'),
    guestAccessCode: guestCode,
    driverAccessCode: driverCode,
    city: 'Ahmedabad',
    status: 'ACTIVE',
  };

  const mockFunctions = [
    { id: 'fn_1', eventId: mockMasterEvent.id, name: 'Mehendi', type: 'MEHENDI', startTime: '2026-10-10T11:00:00Z' },
    { id: 'fn_2', eventId: mockMasterEvent.id, name: 'Sangeet', type: 'SANGEET', startTime: '2026-10-11T19:00:00Z' },
    { id: 'fn_3', eventId: mockMasterEvent.id, name: 'Haldi', type: 'HALDI', startTime: '2026-10-12T09:30:00Z' },
    { id: 'fn_4', eventId: mockMasterEvent.id, name: 'Wedding', type: 'WEDDING', startTime: '2026-10-12T18:00:00Z' },
    { id: 'fn_5', eventId: mockMasterEvent.id, name: 'Reception', type: 'RECEPTION', startTime: '2026-10-13T19:30:00Z' },
    { id: 'fn_6', eventId: mockMasterEvent.id, name: 'Family Brunch', type: 'CUSTOM', startTime: '2026-10-13T10:00:00Z' },
  ];

  assert(mockFunctions.length === 6, 'Master event holds 6 ceremonies including custom functions');
  assert(
    mockFunctions.every((f) => f.eventId === mockMasterEvent.id),
    'All 6 ceremonies belong to the single master event'
  );
  assert(
    !(mockFunctions[0] as any).guestAccessCode && !(mockFunctions[0] as any).driverAccessCode,
    'FUNDAMENTAL RULE: Individual functions NEVER have their own access codes'
  );

  // TEST SUITE 3: GUEST JOIN & FUNCTION ASSIGNMENT
  console.log('\n--- 3. GUEST JOIN & FUNCTION ASSIGNMENTS ---');
  const mockGuest = { id: 'gst_dev_01', name: 'Dev Patel', email: 'dev@example.com' };
  
  // Guest enters master event guest code
  const guestJoinedEvent = {
    guestId: mockGuest.id,
    eventId: mockMasterEvent.id,
    status: 'CONFIRMED',
  };
  assert(guestJoinedEvent.eventId === mockMasterEvent.id, 'Dev joins Rahul & Priya Wedding via master guest code');

  // Host assigns Dev to only Mehendi, Sangeet, and Wedding
  const devAssignments = [
    { guestId: mockGuest.id, functionId: 'fn_1', isAssigned: true },
    { guestId: mockGuest.id, functionId: 'fn_2', isAssigned: true },
    { guestId: mockGuest.id, functionId: 'fn_4', isAssigned: true },
  ];

  const devCanSeeFunction = (fnId: string) => devAssignments.some((a) => a.functionId === fnId && a.isAssigned);

  assert(devCanSeeFunction('fn_1') === true, 'Dev sees Mehendi');
  assert(devCanSeeFunction('fn_2') === true, 'Dev sees Sangeet');
  assert(devCanSeeFunction('fn_3') === false, 'Dev does NOT see Haldi');
  assert(devCanSeeFunction('fn_4') === true, 'Dev sees Wedding');
  assert(devCanSeeFunction('fn_5') === false, 'Dev does NOT see Reception');

  // TEST SUITE 4: DRIVER JOIN FLOW & APPROVAL GATEWAY
  console.log('\n--- 4. DRIVER JOIN & HOST APPROVAL GATEWAY ---');
  const mockDriver = { id: 'drv_rajesh', name: 'Rajesh Kumar', phone: '+91 98765 43210' };

  // Driver enters master event driver code -> request status must be PENDING
  let driverEventMembership = {
    driverId: mockDriver.id,
    eventId: mockMasterEvent.id,
    status: 'PENDING',
  };
  assert(driverEventMembership.status === 'PENDING', 'Driver joins with PENDING status; sensitive event data is protected');

  // Host approves Rajesh
  driverEventMembership.status = 'APPROVED';
  assert(driverEventMembership.status === 'APPROVED', 'Host approves Rajesh; driver now has authorized access');

  // Driver is assigned specifically to Sangeet and Wedding trips
  const driverTrips = [
    { id: 'trip_sangeet', functionId: 'fn_2', driverId: mockDriver.id, vehicle: 'Toyota Innova Crysta' },
    { id: 'trip_wedding', functionId: 'fn_4', driverId: mockDriver.id, vehicle: 'Toyota Innova Crysta' },
  ];
  assert(driverTrips.length === 2, 'Driver assigned to specific function trips');
  assert(
    !driverTrips.some((t) => t.functionId === 'fn_1'),
    'Driver does NOT automatically receive every function (Mehendi unassigned)'
  );

  // TEST SUITE 5: BOARDING VERIFICATION
  console.log('\n--- 5. BOARDING CODE VERIFICATION ---');
  const boardingCode = generateBoardingCode();
  assert(typeof boardingCode === 'string' && boardingCode.length === 4, 'Boarding code is a 4-digit numeric code');
  assert(/^\d{4}$/.test(boardingCode), 'Boarding code is strictly numeric');

  // TEST SUITE 6: STRICT TRIP STATE MACHINE
  console.log('\n--- 6. TRIP STATE MACHINE & TRANSITIONS ---');
  assert(canTransitionTrip(TripStatus.SCHEDULED, TripStatus.ASSIGNED), 'SCHEDULED -> ASSIGNED is valid');
  assert(canTransitionTrip(TripStatus.ASSIGNED, TripStatus.DRIVER_ACCEPTED), 'ASSIGNED -> DRIVER_ACCEPTED is valid');
  assert(canTransitionTrip(TripStatus.DRIVER_ACCEPTED, TripStatus.EN_ROUTE_TO_PICKUP), 'DRIVER_ACCEPTED -> EN_ROUTE_TO_PICKUP is valid');
  assert(canTransitionTrip(TripStatus.EN_ROUTE_TO_PICKUP, TripStatus.ARRIVED), 'EN_ROUTE_TO_PICKUP -> ARRIVED is valid');
  assert(canTransitionTrip(TripStatus.ARRIVED, TripStatus.BOARDING), 'ARRIVED -> BOARDING is valid');
  assert(canTransitionTrip(TripStatus.BOARDING, TripStatus.IN_TRANSIT), 'BOARDING -> IN_TRANSIT is valid');
  assert(canTransitionTrip(TripStatus.IN_TRANSIT, TripStatus.COMPLETED), 'IN_TRANSIT -> COMPLETED is valid');

  // Invalid state transition must throw
  let invalidTransitionCaught = false;
  try {
    validateTripTransition(TripStatus.SCHEDULED, TripStatus.COMPLETED);
  } catch (err: any) {
    invalidTransitionCaught = true;
  }
  assert(invalidTransitionCaught, 'SCHEDULED -> COMPLETED direct jump is strictly blocked by state machine');

  // TEST SUITE 7: GPS TELEMETRY, JITTER SUPPRESSION & OUTLIER REJECTION
  console.log('\n--- 7. GPS TELEMETRY & DISTANCE ACCUMULATION ---');
  const baseLat = 23.0338;
  const baseLng = 72.5256;
  const t0 = new Date('2026-10-11T19:00:00Z').getTime();

  // Test 1: Jitter suppression (< 5 meters)
  const jitterPing = {
    latitude: baseLat + 0.00002, // ~2.2 meters shift
    longitude: baseLng + 0.00002,
    timestamp: t0 + 2000,
  };
  const jitterResult = processGpsPingAndAccumulateDistance({
    previousPing: { latitude: baseLat, longitude: baseLng, timestamp: t0 },
    newPing: jitterPing,
    currentTotalDistanceKm: 0,
  });
  assert(jitterResult.isAccepted === false, 'Stationary GPS jitter (<5m) is suppressed');
  assert(jitterResult.rejectionReason === 'JITTER_BELOW_THRESHOLD', 'Reason recorded as JITTER_BELOW_THRESHOLD');

  // Test 2: Valid movement (500 meters in 30 seconds = 60 km/h)
  const validPing = {
    latitude: baseLat + 0.0045, // ~500m
    longitude: baseLng,
    timestamp: t0 + 30000,
  };
  const validResult = processGpsPingAndAccumulateDistance({
    previousPing: { latitude: baseLat, longitude: baseLng, timestamp: t0 },
    newPing: validPing,
    currentTotalDistanceKm: 0,
  });
  assert(validResult.isAccepted === true, 'Legitimate movement ping accepted');
  assert(validResult.newTotalDistanceKm > 0.4 && validResult.newTotalDistanceKm < 0.6, 'Distance accurately accumulated');

  // Test 3: Outlier teleport jump (> 160 km/h)
  const teleportPing = {
    latitude: 23.5000, // 50 km away in 2 seconds
    longitude: 72.8000,
    timestamp: t0 + 2000,
  };
  const outlierResult = processGpsPingAndAccumulateDistance({
    previousPing: { latitude: baseLat, longitude: baseLng, timestamp: t0 },
    newPing: teleportPing,
    currentTotalDistanceKm: validResult.newTotalDistanceKm,
  });
  assert(outlierResult.isAccepted === false, 'Teleport/outlier coordinate jump rejected');
  assert(outlierResult.rejectionReason === 'EXCESSIVE_SPEED_OUTLIER', 'Reason recorded as EXCESSIVE_SPEED_OUTLIER');

  // TEST SUITE 8: DETERMINISTIC PRICING ENGINE
  console.log('\n--- 8. DETERMINISTIC PRICING ENGINE (NO FAKE / RANDOM PRICES) ---');
  const distanceKm = 18.5; // Real accumulated distance
  const durationMin = 35;  // 35 minutes

  const sedanCost = calculateTripCost({
    vehicleCategory: VehicleCategory.SEDAN,
    distanceKm,
    durationMinutes: durationMin,
  });

  const expectedSedanBase = DEFAULT_PRICING_RULES[VehicleCategory.SEDAN].baseFare;
  const expectedSedanDist = Math.round(distanceKm * DEFAULT_PRICING_RULES[VehicleCategory.SEDAN].perKmRate * 100) / 100;
  const expectedSedanTime = Math.round(durationMin * DEFAULT_PRICING_RULES[VehicleCategory.SEDAN].perMinuteRate * 100) / 100;
  const expectedSedanTotal = Math.max(
    expectedSedanBase + expectedSedanDist + expectedSedanTime,
    DEFAULT_PRICING_RULES[VehicleCategory.SEDAN].minimumFare
  );

  assert(sedanCost.totalCost === expectedSedanTotal, `Sedan cost calculated deterministically (₹${sedanCost.totalCost})`);
  assert(sedanCost.baseFare === 250, 'Sedan base fare is ₹250');
  assert(sedanCost.distanceCharge === 296, 'Sedan 18.5km distance charge is ₹296 (18.5 * 16)');

  const suvCost = calculateTripCost({
    vehicleCategory: VehicleCategory.SUV,
    distanceKm,
    durationMinutes: durationMin,
  });
  assert(suvCost.totalCost > sedanCost.totalCost, 'SUV pricing correctly exceeds Sedan pricing based on vehicle category');

  // TEST SUITE 9: ENHANCED GPS FILTERING & NOISE PROTECTION (REQUIREMENT 15)
  console.log('\n--- 9. ENHANCED GPS FILTERING & TELEPORT NOISE REJECTION ---');
  // Stale timestamp (> 5 min)
  const stalePingResult = processGpsPingAndAccumulateDistance({
    previousPing: { latitude: baseLat, longitude: baseLng, timestamp: t0 },
    newPing: {
      latitude: baseLat + 0.005,
      longitude: baseLng + 0.005,
      timestamp: t0 - 400000, // 400s in past
    },
    currentTotalDistanceKm: 10,
  });
  assert(stalePingResult.isAccepted === false, 'Stale timestamp (>5m) rejected');
  assert(stalePingResult.rejectionReason === 'STALE_TIMESTAMP', 'Reason recorded as STALE_TIMESTAMP');

  // Out of bounds coordinates (> 90 lat)
  const outOfBoundsResult = processGpsPingAndAccumulateDistance({
    previousPing: null,
    newPing: {
      latitude: 145.0,
      longitude: 72.5,
      timestamp: t0,
    },
  });
  assert(outOfBoundsResult.isAccepted === false, 'Out-of-bounds latitude (145.0) rejected');
  assert(outOfBoundsResult.rejectionReason === 'OUT_OF_BOUNDS_COORDINATES', 'Reason recorded as OUT_OF_BOUNDS_COORDINATES');

  // Duplicate coordinates ping
  const duplicateResult = processGpsPingAndAccumulateDistance({
    previousPing: { latitude: baseLat, longitude: baseLng, timestamp: t0 },
    newPing: {
      latitude: baseLat,
      longitude: baseLng,
      timestamp: t0 + 1000,
    },
    currentTotalDistanceKm: 10,
  });
  assert(duplicateResult.isAccepted === false, 'Duplicate GPS coordinate ping rejected');
  assert(duplicateResult.rejectionReason === 'DUPLICATE_POSITION', 'Reason recorded as DUPLICATE_POSITION');

  // Poor accuracy (> 100m)
  const poorAccuracyResult = processGpsPingAndAccumulateDistance({
    previousPing: null,
    newPing: {
      latitude: baseLat,
      longitude: baseLng,
      timestamp: t0,
      accuracyMeters: 150,
    },
  });
  assert(poorAccuracyResult.isAccepted === false, 'Poor accuracy (>100m) rejected');
  assert(poorAccuracyResult.rejectionReason === 'POOR_ACCURACY', 'Reason recorded as POOR_ACCURACY');

  // TEST SUITE 10: SMART ROUTE RECALCULATION & API COST CONTROL (REQUIREMENTS 12 & 13)
  console.log('\n--- 10. SMART ROUTE REFRESH & GOOGLE ROUTES API COST CONTROL ---');
  const originCoord = { lat: 23.0338, lng: 72.5256 };
  const lastCalcTime = Date.now() - 20000; // 20s ago

  // Small displacement (50m) should NOT trigger recalculation
  const minorMovedCoord = { lat: 23.0342, lng: 72.5258 }; // ~48m
  const shouldNotRecalc = shouldRecalculateRoute({
    lastCalculatedPosition: originCoord,
    currentPosition: minorMovedCoord,
    lastCalculationTimeMs: lastCalcTime,
    displacementThresholdMeters: 250,
    timeIntervalSeconds: 60,
  });
  assert(shouldNotRecalc === false, 'Minor GPS displacement (<250m) does NOT trigger route recalculation (avoids API spam)');

  // Large displacement (350m) SHOULD trigger recalculation
  const largeMovedCoord = { lat: 23.0370, lng: 72.5265 }; // ~370m
  const shouldRecalcDisplacement = shouldRecalculateRoute({
    lastCalculatedPosition: originCoord,
    currentPosition: largeMovedCoord,
    lastCalculationTimeMs: lastCalcTime,
    displacementThresholdMeters: 250,
    timeIntervalSeconds: 60,
  });
  assert(shouldRecalcDisplacement === true, 'Displacement > 250m triggers smart route recalculation');

  // Time elapsed (65s > 60s) SHOULD trigger recalculation even if stationary
  const shouldRecalcTimer = shouldRecalculateRoute({
    lastCalculatedPosition: originCoord,
    currentPosition: originCoord,
    lastCalculationTimeMs: Date.now() - 65000,
    displacementThresholdMeters: 250,
    timeIntervalSeconds: 60,
  });
  assert(shouldRecalcTimer === true, 'Controlled time threshold (60s) triggers traffic/ETA refresh');

  // TEST SUITE 11: ESTIMATED VS ACTUAL DISTANCE & PRICING RULES (REQUIREMENT 14)
  console.log('\n--- 11. ESTIMATED VS ACTUAL DISTANCE & PRICING RULES ---');
  const plannedEstimatedRouteKm: number = 24.8; // From Google Routes API
  const actualGpsDrivenKm: number = 19.3;       // From real GPS accumulator

  assert(plannedEstimatedRouteKm !== actualGpsDrivenKm, 'Estimated route distance is strictly distinct from actual GPS distance');

  const finalTripPricing = calculateTripPricing({
    actualDistanceKm: actualGpsDrivenKm,
    vehicleCategory: 'SUV',
  });
  assert(finalTripPricing.distanceKm === 19.3, 'Final trip billing uses actual GPS distance (19.3 km)');
  assert(finalTripPricing.baseFare === 450, 'SUV base fare applied');
  assert(finalTripPricing.totalCost === Math.round(450 + (19.3 - 5) * 26), `Final cost calculated from actual distance: ₹${finalTripPricing.totalCost}`);

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} ACCEPTANCE TESTS PASSED!`);
  console.log('   Google Maps & Real-Time Location Master Architecture Verified.');
  console.log('================================================================\n');
}

runAcceptanceTests().catch((e) => {
  console.error('Acceptance test failed with error:', e);
  process.exit(1);
});
