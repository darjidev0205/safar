import { PrismaClient, Role, TripStatus, DutyStatus, PlaceType } from '@prisma/client';
import { TrackingService } from '../services/api/src/modules/tracking/tracking.service';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Mock EventsGateway for testing socket event emissions
class MockEventsGateway {
  emittedPositions: any[] = [];
  emittedPings: any[] = [];
  emittedSOS: any[] = [];

  emitTripPosition(eventId: string, tripId: string, payload: any) {
    this.emittedPositions.push({ eventId, tripId, payload });
  }

  emitLocationPing(eventId: string, tripId: string | null, payload: any) {
    this.emittedPings.push({ eventId, tripId, payload });
  }

  emitSOSAlert(eventId: string, payload: any) {
    this.emittedSOS.push({ eventId, payload });
  }
}

const mockGateway = new MockEventsGateway();
const trackingService = new TrackingService(prisma as any, mockGateway as any);

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${desc}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${desc}`);
  }
}

async function runPR4TelemetrySuite() {
  console.log(`================================================================`);
  console.log(`  SAFAR PR 4: TELEMETRY, GPS PIPELINE & ETA REGRESSION SUITE   `);
  console.log(`================================================================\n`);

  const tag = Date.now();
  const createdUserIds: string[] = [];
  const createdAccountIds: string[] = [];
  const createdEventIds: string[] = [];

  try {
    // ------------------------------------------------------------------------
    // SETUP: Host, Account, Event, Driver, Vehicle & Places in Jaipur
    // ------------------------------------------------------------------------
    console.log(`--- SECTION 1: Test Environment & Convoys Setup ---`);

    const hostUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-host-pr4-${tag}`,
        email: `host-pr4-${tag}@test.com`,
        fullName: 'Maharaja Jai Singh (Host)',
        role: Role.ACCOUNT_OWNER,
      },
    });
    createdUserIds.push(hostUser.id);

    const account = await prisma.account.create({
      data: {
        name: `Royal Jaipur Weddings ${tag}`,
        slug: `royal-jaipur-${tag}`,
        ownerId: hostUser.id,
        members: {
          create: {
            userId: hostUser.id,
            role: Role.ACCOUNT_OWNER,
          },
        },
      },
    });
    createdAccountIds.push(account.id);

    const event = await prisma.event.create({
      data: {
        accountId: account.id,
        creatorId: hostUser.id,
        name: `Jaipur Palace Royal Wedding ${tag}`,
        city: 'Jaipur',
        startDate: new Date('2026-12-20T09:00:00Z'),
        endDate: new Date('2026-12-24T23:00:00Z'),
        joinCode: `JPR${crypto.randomInt(100, 999)}`,
        status: 'ACTIVE',
      },
    });
    createdEventIds.push(event.id);

    // Origin: Rambagh Palace, Jaipur (26.8973, 75.8087)
    const originPlace = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'Rambagh Palace Hotel',
        address: 'Bhawani Singh Road, Jaipur',
        latitude: 26.8973,
        longitude: 75.8087,
        type: PlaceType.HOTEL,
      },
    });

    // Destination: City Palace, Jaipur (26.9258, 75.8237) - approx 3.5 km straight-line, ~4.6 km road
    const destPlace = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'City Palace Courtyard Banquet',
        address: 'Jaleb Chowk, Jaipur',
        latitude: 26.9258,
        longitude: 75.8237,
        type: PlaceType.VENUE,
      },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        accountId: account.id,
        model: 'Toyota Innova Crysta (Luxury 7-Seater)',
        plateNumber: `RJ14-ROYAL-${crypto.randomInt(1000, 9999)}`,
        category: 'SUV',
        capacity: 7,
        isActive: true,
      },
    });

    const driverUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-drv-pr4-${tag}`,
        email: `driver-pr4-${tag}@test.com`,
        fullName: 'Surendra Rathore (Chauffeur)',
        role: Role.DRIVER,
      },
    });
    createdUserIds.push(driverUser.id);

    const driver = await prisma.driver.create({
      data: {
        accountId: account.id,
        userId: driverUser.id,
        licenseNumber: `RJ-DL-PR4-${crypto.randomInt(10000, 99999)}`,
        isVerified: true,
        approvalStatus: 'APPROVED',
        dutyStatus: DutyStatus.ON_DUTY,
        currentVehicleId: vehicle.id,
      },
    });

    const duty = await prisma.duty.create({
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        status: DutyStatus.ON_DUTY,
        startedAt: new Date(),
      },
    });

    const trip = await prisma.trip.create({
      data: {
        eventId: event.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        originPlaceId: originPlace.id,
        destinationPlaceId: destPlace.id,
        scheduledPickupTime: new Date(Date.now() + 1800000),
        status: TripStatus.IN_TRANSIT,
        passengerCount: 3,
        plannedDistanceKm: 4.8,
        actualDistanceKm: 0,
      },
    });

    const guestUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-gst-pr4-${tag}`,
        email: `guest-pr4-${tag}@test.com`,
        fullName: 'Princess Ananya Devi',
        role: Role.GUEST,
      },
    });
    createdUserIds.push(guestUser.id);

    const guest = await prisma.guest.create({
      data: {
        eventId: event.id,
        userId: guestUser.id,
        fullName: 'Princess Ananya Devi',
        email: guestUser.email,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        eventId: event.id,
        tripId: trip.id,
        guestId: guest.id,
        originPlaceId: originPlace.id,
        destinationPlaceId: destPlace.id,
        requestedPickupTime: new Date(),
        passengerCount: 2,
        status: 'CONFIRMED',
        boardingCode: '5821',
      },
    });

    assert(Boolean(duty.id && trip.id && booking.id), 'Active duty, trip and booking initialized');

    // ------------------------------------------------------------------------
    // TEST 1: LOCATION BATCH INGESTION & KINEMATIC VALIDATION
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 2: Batch Ingestion & Physics Gating ---`);

    const now = Date.now();

    // 5-point realistic movement batch along Bhawani Singh Road towards City Palace
    const legitimateBatch = {
      deviceId: 'safar-driver-phone-test',
      pings: [
        {
          sequence: 1,
          latitude: 26.8973,
          longitude: 75.8087,
          accuracy: 8,
          speed: 8.5,
          heading: 35,
          sampledAt: new Date(now - 90000).toISOString(),
        },
        {
          sequence: 2,
          latitude: 26.9015,
          longitude: 75.8112,
          accuracy: 6,
          speed: 11.2,
          heading: 32,
          sampledAt: new Date(now - 60000).toISOString(),
        },
        {
          sequence: 3,
          latitude: 26.9055,
          longitude: 75.8135,
          accuracy: 5,
          speed: 10.5,
          heading: 30,
          sampledAt: new Date(now - 30000).toISOString(),
        },
        // Anomaly 1: Impossible teleportation velocity jump (speed > 500 km/h)
        {
          sequence: 4,
          latitude: 27.5000,
          longitude: 76.5000, // 100 km away in 10 seconds!
          accuracy: 10,
          speed: 15.0,
          heading: 30,
          sampledAt: new Date(now - 20000).toISOString(),
        },
        // Anomaly 2: Poor accuracy fix (> 100m)
        {
          sequence: 5,
          latitude: 26.9075,
          longitude: 75.8145,
          accuracy: 180, // High uncertainty, reject
          speed: 9.0,
          heading: 28,
          sampledAt: new Date(now - 15000).toISOString(),
        },
        // Point 6: Valid next location
        {
          sequence: 6,
          latitude: 26.9095,
          longitude: 75.8160,
          accuracy: 7,
          speed: 9.8,
          heading: 25,
          sampledAt: new Date(now).toISOString(),
        },
      ],
    };

    const ingestResult = await trackingService.ingestLocationBatch(
      driverUser.id,
      duty.id,
      legitimateBatch
    );

    assert(ingestResult.success === true, 'Batch ingestion succeeded');
    assert(ingestResult.acceptedCount === 4, 'Exactly 4 valid points accepted (2 rejected: teleport jump & poor accuracy)');
    assert(ingestResult.rejectedCount === 2, 'Exactly 2 anomalous points filtered out by kinematic pipeline');
    assert(ingestResult.actualDistanceKm > 1.5, `Legitimate distance accumulated: ${ingestResult.actualDistanceKm} km`);
    assert(ingestResult.remainingDistanceKm !== null && ingestResult.remainingDistanceKm > 0, `Road remaining distance calculated: ${ingestResult.remainingDistanceKm} km`);
    assert(ingestResult.etaMinutes !== null && ingestResult.etaMinutes > 0, `Authoritative dynamic ETA calculated: ${ingestResult.etaMinutes} min`);

    // ------------------------------------------------------------------------
    // TEST 2: IDEMPOTENT DEDUPLICATION GATE
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 3: Idempotent Deduplication & Replay Prevention ---`);

    // Replay the exact same batch (e.g. mobile reconnects after offline mode)
    const replayResult = await trackingService.ingestLocationBatch(
      driverUser.id,
      duty.id,
      legitimateBatch
    );

    assert(replayResult.acceptedCount === 0, 'Zero duplicate pings written to database on replay');
    assert(replayResult.duplicateCount === 4, 'All 4 previously accepted sequence numbers recognized as duplicates');
    assert(replayResult.actualDistanceKm === ingestResult.actualDistanceKm, 'Distance driven unchanged: zero false double-counting on replay');

    // ------------------------------------------------------------------------
    // TEST 3: UNAUTHORIZED INGESTION ACCESS CONTROL
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 4: Duty Ingestion Access Control ---`);

    let unauthorizedBlocked = false;
    try {
      await trackingService.ingestLocationBatch(
        guestUser.id, // Guest user attempts to post driver telemetry
        duty.id,
        {
          pings: [
            {
              sequence: 99,
              latitude: 26.90,
              longitude: 75.80,
              sampledAt: new Date().toISOString(),
            },
          ],
        }
      );
    } catch (err: any) {
      unauthorizedBlocked = err.message.includes('not authorized');
    }

    assert(unauthorizedBlocked, 'ForbiddenException: Non-driver user blocked from submitting telemetry for driver duty');

    // ------------------------------------------------------------------------
    // TEST 4: VERSIONED WEBSOCKET TELEMETRY BROADCAST
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 5: Versioned trip.position.v1 Realtime Broadcast ---`);

    assert(mockGateway.emittedPositions.length > 0, 'trip.position.v1 event emitted to WebSocket gateway');
    const lastEmitted = mockGateway.emittedPositions[mockGateway.emittedPositions.length - 1];
    assert(lastEmitted.payload.type === 'trip.position.v1', 'Payload specifies contract type "trip.position.v1"');
    assert(lastEmitted.payload.tripId === trip.id, 'Payload correctly bound to tripId');
    assert(lastEmitted.payload.position.lat === 26.9095, 'Payload contains latest verified latitude');
    assert(lastEmitted.payload.isStale === false, 'Fresh telemetry correctly tagged with isStale: false');

    // ------------------------------------------------------------------------
    // TEST 5: HOST LIVE FLEET SNAPSHOT & STALENESS GATING
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 6: Host Live Fleet Snapshot & Staleness Detection ---`);

    // Fresh snapshot check (within 60s)
    const freshFleetSnapshot = await trackingService.getEventLiveSnapshot(event.id, hostUser.id);
    assert(freshFleetSnapshot.totalVehicles >= 1, 'Host live fleet snapshot returns deployed vehicles');
    const trackedVehicle = freshFleetSnapshot.vehicles.find((v) => v.vehicleId === vehicle.id);
    assert(Boolean(trackedVehicle), 'Tracked vehicle present in host snapshot');
    assert(trackedVehicle?.isStale === false, 'Recently updated vehicle marked isStale: false');
    assert(trackedVehicle?.signalStatus === 'LIVE', 'Signal status is LIVE while within 60s threshold');

    // Simulate GPS signal going stale by setting lastPingAt on vehicle & trip to 2 minutes ago
    const staleTime = new Date(Date.now() - 120000); // 120 seconds ago
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { lastPingAt: staleTime },
    });
    await prisma.trip.update({
      where: { id: trip.id },
      data: { lastPingAt: staleTime },
    });

    const staleFleetSnapshot = await trackingService.getEventLiveSnapshot(event.id, hostUser.id);
    const staleVehicle = staleFleetSnapshot.vehicles.find((v) => v.vehicleId === vehicle.id);
    assert(staleVehicle?.isStale === true, 'Vehicle with 120s-old ping correctly tagged isStale: true');
    assert(staleVehicle?.signalStatus === 'STALE', 'Signal status switches from LIVE to STALE');
    assert((staleVehicle?.staleSeconds || 0) >= 115, `Stale age accurately reported: ${staleVehicle?.staleSeconds}s ago`);
    assert(staleFleetSnapshot.staleCount >= 1, 'Host summary counter reflects stale vehicle count');

    // ------------------------------------------------------------------------
    // TEST 6: SCOPED GUEST LIVE TRACKING SNAPSHOT
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 7: Scoped Guest Live Tracking Privacy ---`);

    // Authorized guest reads their own booking live telemetry
    const guestLiveTelemetry = await trackingService.getBookingLiveSnapshot(booking.id, guestUser.id);
    assert(guestLiveTelemetry.bookingId === booking.id, 'Guest successfully retrieved live ride telemetry for their booking');
    assert(guestLiveTelemetry.trip?.driver?.name === 'Surendra Rathore (Chauffeur)', 'Chauffeur name correctly resolved for guest');
    assert(guestLiveTelemetry.trip?.vehicle?.plateNumber === vehicle.plateNumber, 'Assigned vehicle plate correctly resolved');
    assert(guestLiveTelemetry.trip?.telemetry?.signalStatus === 'STALE', 'Guest UI receives STALE indicator when driver GPS has lagged');

    // Unauthorized intruder tries to spy on guest's vehicle
    const intruderUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-intruder-${tag}`,
        email: `intruder-${tag}@test.com`,
        fullName: 'Intruder Malicious',
        role: Role.GUEST,
      },
    });
    createdUserIds.push(intruderUser.id);

    let privacyLeakCaught = false;
    try {
      await trackingService.getBookingLiveSnapshot(booking.id, intruderUser.id);
    } catch (err: any) {
      privacyLeakCaught = err.message.includes('Access denied');
    }

    assert(privacyLeakCaught, 'Privacy gate: Unrelated guest blocked from viewing another passenger\'s live ride telemetry');

    // ------------------------------------------------------------------------
    // CLEANUP TEST DATA
    // ------------------------------------------------------------------------
    console.log(`\n--- Cleanup Test Artifacts ---`);
    await prisma.locationPing.deleteMany({ where: { driverId: driver.id } });
    await prisma.booking.deleteMany({ where: { eventId: event.id } });
    await prisma.trip.deleteMany({ where: { eventId: event.id } });
    await prisma.duty.deleteMany({ where: { driverId: driver.id } });
    await prisma.place.deleteMany({ where: { eventId: event.id } });
    await prisma.driver.deleteMany({ where: { accountId: account.id } });
    await prisma.vehicle.deleteMany({ where: { accountId: account.id } });
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    await prisma.accountMember.deleteMany({ where: { accountId: { in: createdAccountIds } } });
    await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    console.log(`\n================================================================`);
    console.log(`  PR 4 REGRESSION SUITE RESULTS`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`================================================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during PR 4 regression suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPR4TelemetrySuite();
