import { PrismaClient, Role, DutyStatus, PlaceType, NotificationChannel } from '@prisma/client';
import { TripStatus } from '@safar/types';
import { NotificationsService } from '../services/api/src/modules/notifications/notifications.service';
import { ReportsService } from '../services/api/src/modules/reports/reports.service';
import { TripsService } from '../services/api/src/modules/trips/trips.service';
import { TrackingService } from '../services/api/src/modules/tracking/tracking.service';

const prisma = new PrismaClient();

// Mock EventsGateway for testing socket event emissions
class MockEventsGateway {
  emittedPositions: any[] = [];
  emittedPings: any[] = [];
  emittedSOS: any[] = [];
  emittedNotifications: any[] = [];
  emittedTripUpdates: any[] = [];

  emitTripPosition(eventId: string, tripId: string, payload: any) {
    this.emittedPositions.push({ eventId, tripId, payload });
  }

  emitLocationPing(eventId: string, tripId: string | null, payload: any) {
    this.emittedPings.push({ eventId, tripId, payload });
  }

  emitSOSAlert(eventId: string, payload: any) {
    this.emittedSOS.push({ eventId, payload });
  }

  emitNotification(userId: string, payload: any) {
    this.emittedNotifications.push({ userId, payload });
  }

  emitTripUpdate(eventId: string, tripId: string, payload: any) {
    this.emittedTripUpdates.push({ eventId, tripId, payload });
  }
}

const mockGateway = new MockEventsGateway();
const notificationsService = new NotificationsService(prisma as any, mockGateway as any);
const reportsService = new ReportsService(prisma as any);
const tripsService = new TripsService(prisma as any, notificationsService as any);
const trackingService = new TrackingService(prisma as any, mockGateway as any, notificationsService as any);

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

async function runPR5OperationsSuite() {
  console.log(`================================================================`);
  console.log(`  SAFAR PR 5: COMMUNICATIONS, OPERATIONS & RECONCILIATION SUITE `);
  console.log(`================================================================\n`);

  const tag = Date.now();
  const createdUserIds: string[] = [];
  const createdAccountIds: string[] = [];
  const createdEventIds: string[] = [];

  try {
    // ------------------------------------------------------------------------
    // SETUP: Host, Account, Event, Function, Driver, Vehicle, Guest & Trip
    // ------------------------------------------------------------------------
    console.log(`--- SECTION 1: Test Environment & Wedding Setup ---`);

    const hostUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-host-pr5-${tag}`,
        phoneNumber: `+91987000${String(tag).slice(-4)}`,
        fullName: 'Vikramaditya Singhania',
        role: Role.ACCOUNT_OWNER,
      },
    });
    createdUserIds.push(hostUser.id);

    const guestUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-guest-pr5-${tag}`,
        phoneNumber: `+91987111${String(tag).slice(-4)}`,
        fullName: 'Ananya Deshmukh',
        role: Role.GUEST,
      },
    });
    createdUserIds.push(guestUser.id);

    const driverUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-driver-pr5-${tag}`,
        phoneNumber: `+91987222${String(tag).slice(-4)}`,
        fullName: 'Mahesh Chauffeur',
        role: Role.DRIVER,
      },
    });
    createdUserIds.push(driverUser.id);

    const account = await prisma.account.create({
      data: {
        name: `Singhania Royal Weddings ${tag}`,
        slug: `singhania-${tag}`,
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
        name: `Singhania-Kapoor Grand Nuptials ${tag}`,
        city: 'Udaipur',
        joinCode: `SK${String(tag).slice(-4)}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 86400000),
      },
    });
    createdEventIds.push(event.id);

    // Places
    const hotelPlace = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'The Oberoi Udaivilas',
        address: 'Haridas Ji Ki Magri, Udaipur',
        latitude: 24.5774,
        longitude: 73.6738,
        type: PlaceType.HOTEL,
      },
    });

    const venuePlace = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'City Palace Manek Chowk',
        address: 'Old City, Udaipur',
        latitude: 24.5764,
        longitude: 73.6835,
        type: PlaceType.VENUE,
      },
    });

    // Function
    const sangeetFunction = await prisma.function.create({
      data: {
        eventId: event.id,
        placeId: venuePlace.id,
        name: 'Royal Sangeet & Sangeet Sandhya',
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
      },
    });

    // Vehicle (Innova Crysta, 6-Seater)
    const vehicle = await prisma.vehicle.create({
      data: {
        accountId: account.id,
        model: 'Toyota Innova Crysta',
        plateNumber: `RJ 27 AB ${String(tag).slice(-4)}`,
        capacity: 6,
        category: 'SUV',
        isActive: true,
      },
    });

    // Driver
    const driver = await prisma.driver.create({
      data: {
        accountId: account.id,
        userId: driverUser.id,
        licenseNumber: `RJ27-${String(tag).slice(-6)}`,
        isVerified: true,
        approvalStatus: 'APPROVED',
        currentVehicleId: vehicle.id,
      },
    });

    // Guest Profile
    const guest = await prisma.guest.create({
      data: {
        eventId: event.id,
        userId: guestUser.id,
        fullName: guestUser.fullName,
        phoneNumber: guestUser.phoneNumber,
      },
    });

    await prisma.eventGuest.create({
      data: {
        eventId: event.id,
        guestId: guest.id,
      },
    });

    // Create Trip (Scheduled)
    const scheduledPickup = new Date(Date.now() + 1800000); // 30 mins from now
    const trip = await prisma.trip.create({
      data: {
        eventId: event.id,
        functionId: sangeetFunction.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        originPlaceId: hotelPlace.id,
        destinationPlaceId: venuePlace.id,
        pickupLocation: hotelPlace.name,
        destination: venuePlace.name,
        scheduledPickupTime: scheduledPickup,
        plannedDistanceKm: 4.5,
        status: TripStatus.SCHEDULED,
      },
    });

    // Create Booking for Guest (2 Seats)
    const booking = await prisma.booking.create({
      data: {
        eventId: event.id,
        tripId: trip.id,
        guestId: guest.id,
        originPlaceId: hotelPlace.id,
        destinationPlaceId: venuePlace.id,
        passengerCount: 2,
        requestedPickupTime: scheduledPickup,
        status: 'CONFIRMED',
        boardingCode: '7821',
      },
    });

    assert(Boolean(trip.id && booking.id), 'Initial event, function, driver, vehicle, trip & booking established');

    // ------------------------------------------------------------------------
    // SECTION 2: Multi-Channel Notification Orchestration & Idempotency
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 2: Multi-Channel Notifications & Idempotency ---`);

    // Test 1: Send IN_APP notification
    const notif1 = await notificationsService.sendNotification({
      userId: guestUser.id,
      eventId: event.id,
      title: 'Welcome to Udaipur',
      message: 'Your itinerary is now active in SAFAR.',
      channel: NotificationChannel.IN_APP,
    });
    assert(notif1.deduplicated === false, 'Notification 1 dispatched as new message');
    assert(notif1.notification.isRead === false, 'Notification 1 defaults to unread');

    const deliveries1 = await prisma.notificationDelivery.findMany({
      where: { notificationId: notif1.notification.id },
    });
    assert(
      deliveries1.some((d) => d.channel === NotificationChannel.IN_APP && d.status === 'DELIVERED'),
      'IN_APP delivery recorded as DELIVERED'
    );

    // Test 2: Send HIGH-priority PUSH notification (generates multi-channel fallback records)
    const notif2 = await notificationsService.sendNotification({
      userId: driverUser.id,
      eventId: event.id,
      title: 'Duty Confirmation',
      message: 'Please review and acknowledge your upcoming shuttle run.',
      channel: NotificationChannel.PUSH,
      priority: 'HIGH',
      idempotencyKey: `duty_confirm_${tag}`,
    });
    assert(notif2.deduplicated === false, 'High-priority notification 2 created');

    const deliveries2 = await prisma.notificationDelivery.findMany({
      where: { notificationId: notif2.notification.id },
    });
    const channelsDelivered = deliveries2.map((d) => d.channel);
    assert(
      channelsDelivered.includes(NotificationChannel.PUSH) &&
        channelsDelivered.includes(NotificationChannel.WHATSAPP) &&
        channelsDelivered.includes(NotificationChannel.IN_APP),
      'High-priority notification generates multi-channel PUSH + WHATSAPP + IN_APP delivery attempts'
    );

    // Test 3: Idempotency & Deduplication
    const notif2Retry = await notificationsService.sendNotification({
      userId: driverUser.id,
      eventId: event.id,
      title: 'Duty Confirmation Duplicate',
      message: 'Duplicate payload that must be safely deduplicated.',
      channel: NotificationChannel.PUSH,
      priority: 'HIGH',
      idempotencyKey: `duty_confirm_${tag}`,
    });
    assert(notif2Retry.deduplicated === true, 'Repeated dispatch with identical idempotencyKey detected as deduplicated');
    assert(notif2Retry.notification.id === notif2.notification.id, 'Deduplicated return matches original notification ID');

    const deliveryCountAfterRetry = await prisma.notificationDelivery.count({
      where: { notificationId: notif2.notification.id },
    });
    assert(
      deliveryCountAfterRetry === deliveries2.length,
      'No duplicate delivery records generated on idempotent replay'
    );

    // ------------------------------------------------------------------------
    // SECTION 3: State-Driven Transition Triggers
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 3: State-Driven Transition Triggers ---`);

    // Test 4: TRIP_ASSIGNED
    await notificationsService.sendTripAssigned(trip.id);
    const assignedNotif = await prisma.notification.findFirst({
      where: { userId: driverUser.id, type: 'TRIP_ASSIGNED' },
    });
    assert(Boolean(assignedNotif), 'Driver received actionable TRIP_ASSIGNED notification');
    assert(
      assignedNotif?.idempotencyKey === `trip:${trip.id}:ASSIGNED`,
      'TRIP_ASSIGNED stamped with deterministic trip idempotency key'
    );

    // Test 5: ETA_APPROACHING (Triggered ONCE when ETA <= 10 min)
    // 8 mins = 480 seconds, remaining distance 3.2 km
    await notificationsService.checkAndSendEtaApproaching(trip.id, 480, 3.2);
    const etaNotif = await prisma.notification.findFirst({
      where: { userId: guestUser.id, type: 'ETA_APPROACHING' },
    });
    assert(Boolean(etaNotif), 'Guest received ETA_APPROACHING notification (~8 mins away)');
    assert(
      etaNotif?.message.includes('8 mins away') || etaNotif?.message.includes('Innova'),
      'ETA_APPROACHING message includes dynamic arrival time and vehicle details'
    );

    // Test 6: ETA_APPROACHING Idempotency on repeated telemetry pings
    // Simulate next GPS ping with 7 mins (420s)
    await notificationsService.checkAndSendEtaApproaching(trip.id, 420, 2.8);
    const totalEtaNotifs = await prisma.notification.count({
      where: { userId: guestUser.id, type: 'ETA_APPROACHING' },
    });
    assert(totalEtaNotifs === 1, '10-minute ETA crossing notification triggered strictly ONCE per trip (no duplicate spam)');

    // Test 7: ARRIVED
    await tripsService.updateTripStatus(trip.id, TripStatus.ASSIGNED);
    await tripsService.updateTripStatus(trip.id, TripStatus.DRIVER_ACCEPTED);
    await tripsService.updateTripStatus(trip.id, TripStatus.EN_ROUTE_TO_PICKUP);
    await tripsService.updateTripStatus(trip.id, TripStatus.ARRIVED);
    const arrivedNotif = await prisma.notification.findFirst({
      where: { userId: guestUser.id, type: 'ARRIVED' },
    });
    assert(Boolean(arrivedNotif), 'Guest notified immediately when vehicle ARRIVED at curbside');

    // Test 8: BOARDING_VERIFIED
    const verifyResult = await tripsService.verifyBoarding(trip.id, '7821');
    assert(verifyResult.verified === true, 'Boarding passcode verified successfully');
    const boardNotif = await prisma.notification.findFirst({
      where: { userId: guestUser.id, type: 'BOARDING_VERIFIED' },
    });
    assert(Boolean(boardNotif), 'Guest received BOARDING_VERIFIED confirmation notification');

    // Test 9: RIDE_STARTED (IN_TRANSIT)
    await tripsService.updateTripStatus(trip.id, TripStatus.IN_TRANSIT);
    const inTransitNotif = await prisma.notification.findFirst({
      where: { userId: guestUser.id, type: 'RIDE_STARTED' },
    });
    assert(Boolean(inTransitNotif), 'Guest notified with live trip tracking confirmation upon ride start');

    // Simulate GPS telemetry accumulation during transit
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        actualDistanceKm: 4.8, // 4.8 km driven vs 4.5 planned
        actualStartTime: new Date(Date.now() - 25 * 60000), // Started 25 mins ago
      },
    });

    // Test 10: COMPLETED
    await tripsService.updateTripStatus(trip.id, TripStatus.COMPLETED);
    const completedNotif = await prisma.notification.findFirst({
      where: { userId: guestUser.id, type: 'COMPLETED' },
    });
    assert(Boolean(completedNotif), 'Guest notified with completion summary upon arrival at destination');

    // Test 11: CANCELLED transition notification on a secondary trip
    const cancelledTrip = await prisma.trip.create({
      data: {
        eventId: event.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        pickupLocation: hotelPlace.name,
        destination: venuePlace.name,
        scheduledPickupTime: new Date(Date.now() + 7200000),
        status: TripStatus.SCHEDULED,
      },
    });
    await prisma.booking.create({
      data: {
        eventId: event.id,
        tripId: cancelledTrip.id,
        guestId: guest.id,
        originPlaceId: hotelPlace.id,
        destinationPlaceId: venuePlace.id,
        passengerCount: 1,
        requestedPickupTime: new Date(Date.now() + 7200000),
        status: 'CONFIRMED',
        boardingCode: '1942',
      },
    });

    await tripsService.updateTripStatus(cancelledTrip.id, TripStatus.CANCELLED, hostUser.id, 'Weather adjustment');
    const cancelNotif = await prisma.notification.findFirst({
      where: { userId: guestUser.id, type: 'CANCELLED' },
    });
    assert(Boolean(cancelNotif), 'Guest received CANCELLED notification with operational reason');

    // Test 12: GPS_STALE_ALERT debounced
    await notificationsService.sendGpsStaleAlert(event.id, trip.id, driver.id, 145);
    const staleNotif = await prisma.notification.findFirst({
      where: { userId: hostUser.id, type: 'GPS_STALE_ALERT' },
    });
    assert(Boolean(staleNotif), 'Host received GPS_STALE_ALERT when telemetry delayed > 120s');

    // ------------------------------------------------------------------------
    // SECTION 4: Emergency SOS Safety Escalation
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 4: Emergency SOS Safety Escalation ---`);

    // Test 13: Emergency SOS Dispatch
    const sosResult = await notificationsService.sendSOSAlert({
      eventId: event.id,
      tripId: trip.id,
      reporterUserId: guestUser.id,
      reporterRole: 'GUEST',
      latitude: 24.5770,
      longitude: 73.6740,
      reason: 'Urgent medical assistance requested for elderly passenger',
    });

    assert(sosResult.success === true, 'Emergency SOS dispatched successfully');
    assert(sosResult.recipientsNotifiedCount >= 1, 'Event hosts and planners alerted of SOS incident');
    assert(mockGateway.emittedSOS.length > 0, 'EventsGateway emitted real-time sosAlert WebSocket broadcast');

    const sosAudit = await prisma.auditLog.findFirst({
      where: { eventId: event.id, action: 'EMERGENCY_SOS_TRIGGERED' },
    });
    assert(Boolean(sosAudit), 'Emergency SOS logged in immutable AuditLog collection');

    // ------------------------------------------------------------------------
    // SECTION 5: Recipient Acknowledgement ("Got it")
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 5: Recipient Acknowledgement (\"Got it\") ---`);

    // Test 14: Recipient acknowledges notification
    const ackResult = await notificationsService.acknowledgeNotification(notif1.notification.id, guestUser.id);
    assert(ackResult.isRead === true, 'Notification marked as isRead: true');
    assert(Boolean(ackResult.acknowledgedAt), 'Notification stamped with valid acknowledgedAt timestamp');

    // Test 15: Cross-user acknowledgement blocked
    let crossAckBlocked = false;
    try {
      await notificationsService.acknowledgeNotification(notif1.notification.id, driverUser.id);
    } catch (err: any) {
      crossAckBlocked = err?.status === 403 || err?.message?.includes('not authorized');
    }
    assert(crossAckBlocked, 'Unauthorized user blocked from acknowledging someone else’s notification');

    // ------------------------------------------------------------------------
    // SECTION 6: Vendor Reconciliation & Operations Audit Report
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 6: Vendor Reconciliation & Operations Audit Report ---`);

    const report = await reportsService.getEventReconciliation(event.id);

    // Summary KPIs
    assert(report.summary.totalTrips >= 2, 'Report reflects total event trips');
    assert(report.summary.completedTrips >= 1, 'Report records completed trips');
    assert(report.summary.totalPlannedKm >= 4.5, 'Report sums planned route kilometers');
    assert(report.summary.totalActualKm >= 4.8, 'Report sums actual GPS odometer kilometers driven');

    // Discrepancy Calculation
    const expectedDelta = Number(Math.abs(report.summary.totalActualKm - report.summary.totalPlannedKm).toFixed(1));
    assert(
      report.summary.gpsOdometerDeltaKm === expectedDelta,
      `GPS Odometer Delta computed correctly (Delta: ${report.summary.gpsOdometerDeltaKm} km, ${report.summary.discrepancyPercentage}%)`
    );

    // Seating Efficiency
    assert(
      report.summary.totalPassengersCarried >= 2,
      'Total passengers carried accounted from confirmed bookings'
    );
    assert(
      report.summary.seatingEfficiencyPct > 0,
      `Seating utilization efficiency calculated (${report.summary.seatingEfficiencyPct}%)`
    );

    // Driver & Vehicle Audits
    assert(report.driverRecords.length >= 1, 'Per-driver audit breakdown compiled');
    const driverAudit = report.driverRecords.find((d) => d.driverId === driver.id);
    assert(
      Boolean(driverAudit && driverAudit.actualKmDriven >= 4.8 && driverAudit.estimatedBillingAmount > 0),
      `Driver audit contains actual km driven (${driverAudit?.actualKmDriven} km) and estimated billing (₹${driverAudit?.estimatedBillingAmount})`
    );

    assert(report.vehicleRecords.length >= 1, 'Per-vehicle audit breakdown compiled');
    const vehicleAudit = report.vehicleRecords.find((v) => v.vehicleId === vehicle.id);
    assert(
      Boolean(vehicleAudit && vehicleAudit.plateNumber === vehicle.plateNumber && vehicleAudit.seatUtilizationPct > 0),
      `Vehicle audit contains plate number (${vehicleAudit?.plateNumber}) and seat utilization (${vehicleAudit?.seatUtilizationPct}%)`
    );

    // Operational Diagnostics
    assert(
      report.operationalHealth.sosAlertsCount >= 1,
      `Operational health tracks SOS alerts count (${report.operationalHealth.sosAlertsCount})`
    );
    assert(
      report.operationalHealth.staleGpsCount >= 1,
      `Operational health tracks stale GPS warnings (${report.operationalHealth.staleGpsCount})`
    );
    assert(
      report.operationalHealth.notificationsSentCount > 0,
      `Operational health tracks notification delivery attempts (${report.operationalHealth.notificationsSentCount} sent)`
    );

  } catch (err: any) {
    console.error('Suite error:', err);
    failed++;
  } finally {
    // Teardown test artifacts
    console.log(`\n--- TEARDOWN: Cleaning up PR 5 test resources ---`);
    for (const eid of createdEventIds) {
      await prisma.notificationDelivery.deleteMany({
        where: { notification: { eventId: eid } },
      }).catch(() => {});
      await prisma.notification.deleteMany({ where: { eventId: eid } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { eventId: eid } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { trip: { eventId: eid } } }).catch(() => {});
      await prisma.tripEvent.deleteMany({ where: { trip: { eventId: eid } } }).catch(() => {});
      await prisma.trip.deleteMany({ where: { eventId: eid } }).catch(() => {});
      await prisma.function.deleteMany({ where: { eventId: eid } }).catch(() => {});
      await prisma.eventGuest.deleteMany({ where: { eventId: eid } }).catch(() => {});
      await prisma.event.deleteMany({ where: { id: eid } }).catch(() => {});
    }
    for (const aid of createdAccountIds) {
      await prisma.place.deleteMany({ where: { event: { accountId: aid } } }).catch(() => {});
      await prisma.vehicle.deleteMany({ where: { accountId: aid } }).catch(() => {});
      await prisma.accountMember.deleteMany({ where: { accountId: aid } }).catch(() => {});
      await prisma.account.deleteMany({ where: { id: aid } }).catch(() => {});
    }
    for (const uid of createdUserIds) {
      await prisma.notificationDelivery.deleteMany({
        where: { notification: { userId: uid } },
      }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.driver.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.guest.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: uid } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log(`\n================================================================`);
  console.log(`  PR 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPR5OperationsSuite();
