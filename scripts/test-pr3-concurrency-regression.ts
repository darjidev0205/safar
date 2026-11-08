import { PrismaClient, Role, TripStatus, BookingStatus, PlaceType } from '@prisma/client';
import { BookingsService } from '../services/api/src/modules/bookings/bookings.service';
import { TripsService } from '../services/api/src/modules/trips/trips.service';
import { FleetService } from '../services/api/src/modules/fleet/fleet.service';
import { DutyStatus } from '@safar/types';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const bookingsService = new BookingsService(prisma as any);
const tripsService = new TripsService(prisma as any);
const fleetService = new FleetService(prisma as any);

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

async function runPR3ConcurrencySuite() {
  console.log(`================================================================`);
  console.log(`  SAFAR PR 3: BOOKING & DISPATCH CONCURRENCY REGRESSION SUITE  `);
  console.log(`================================================================\n`);

  const tag = Date.now();
  const createdUserIds: string[] = [];
  const createdAccountIds: string[] = [];
  const createdEventIds: string[] = [];

  try {
    // ------------------------------------------------------------------------
    // SETUP: Test Host, Account, Event & Origin/Destination Places
    // ------------------------------------------------------------------------
    console.log(`--- SECTION 1: Environment & Resource Setup ---`);

    const hostUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-host-pr3-${tag}`,
        email: `host-pr3-${tag}@test.com`,
        fullName: 'Vikramaditya Singhania (Host)',
        role: Role.ACCOUNT_OWNER,
      },
    });
    createdUserIds.push(hostUser.id);

    const account = await prisma.account.create({
      data: {
        name: `Singhania Royal Wedding Org ${tag}`,
        slug: `singhania-org-${tag}`,
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
        name: `Singhania Grand Palace Wedding ${tag}`,
        city: 'Jaipur',
        startDate: new Date('2026-12-15T09:00:00Z'),
        endDate: new Date('2026-12-18T23:00:00Z'),
        joinCode: `SNG${crypto.randomInt(100, 999)}`,
        status: 'ACTIVE',
      },
    });
    createdEventIds.push(event.id);

    const pickupPlace = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'Rambagh Palace Hotel',
        address: 'Bhawani Singh Road, Jaipur',
        latitude: 26.8973,
        longitude: 75.8087,
        type: PlaceType.HOTEL,
      },
    });

    const dropPlace = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'Jai Mahal Palace Banquet',
        address: 'Jacob Road, Civil Lines, Jaipur',
        latitude: 26.9069,
        longitude: 75.7865,
        type: PlaceType.VENUE,
      },
    });

    // 4-seater Sedan vehicle for concurrency stress test
    const sedanVehicle = await prisma.vehicle.create({
      data: {
        accountId: account.id,
        model: 'Toyota Camry Hybrid (4-Seater)',
        plateNumber: `RJ14-CC-${crypto.randomInt(1000, 9999)}`,
        category: 'SEDAN',
        capacity: 4,
        isActive: true,
      },
    });

    // 7-seater SUV vehicle for exclusivity tests
    const suvVehicle = await prisma.vehicle.create({
      data: {
        accountId: account.id,
        model: 'Toyota Innova Crysta (7-Seater)',
        plateNumber: `RJ14-SUV-${crypto.randomInt(1000, 9999)}`,
        category: 'SUV',
        capacity: 7,
        isActive: true,
      },
    });

    assert(Boolean(sedanVehicle.id && suvVehicle.id), 'Vehicles created with exact capacities (4 & 7 seats)');

    // ------------------------------------------------------------------------
    // TEST 1: 50-CONCURRENCY OVERBOOKING RACE CONDITION TEST
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 2: 50 Concurrent Booking Requests on 4-Seater Vehicle ---`);

    const stressTrip = await prisma.trip.create({
      data: {
        eventId: event.id,
        vehicleId: sedanVehicle.id,
        originPlaceId: pickupPlace.id,
        destinationPlaceId: dropPlace.id,
        scheduledPickupTime: new Date('2026-12-15T18:00:00Z'),
        passengerCount: 0,
        status: TripStatus.SCHEDULED,
      },
    });

    console.log(`  -> Firing 50 simultaneous booking requests at trip ${stressTrip.id} (Capacity = 4)...`);

    // Create 50 distinct guest accounts and profiles in parallel batches
    const concurrentGuests: any[] = [];
    const guestBatch = Array.from({ length: 50 }, (_, idx) => idx + 1);
    const batchSize = 10;
    for (let i = 0; i < guestBatch.length; i += batchSize) {
      const chunk = guestBatch.slice(i, i + batchSize);
      const createdChunk = await Promise.all(
        chunk.map(async (num) => {
          const gUser = await prisma.user.create({
            data: {
              firebaseUid: `uid-guest-${tag}-${num}`,
              email: `guest-${tag}-${num}@test.com`,
              fullName: `Concurrent Guest ${num}`,
              role: Role.GUEST,
            },
          });
          createdUserIds.push(gUser.id);

          const guestRec = await prisma.guest.create({
            data: {
              eventId: event.id,
              userId: gUser.id,
              fullName: `Concurrent Guest ${num}`,
              email: gUser.email,
            },
          });
          return { user: gUser, guest: guestRec };
        })
      );
      concurrentGuests.push(...createdChunk);
    }

    // Fire 50 concurrent requests simultaneously using Promise.all
    const bookingPromises = concurrentGuests.map((g) =>
      bookingsService
        .createBooking(event.id, g.user.id, {
          tripId: stressTrip.id,
          pickupPlaceId: pickupPlace.id,
          destinationPlaceId: dropPlace.id,
          requestedPickupTime: '2026-12-15T18:00:00Z',
          passengerCount: 1,
        })
        .then((res) => ({ success: true, booking: res }))
        .catch((err) => ({ success: false, error: err.message || err.toString() }))
    );

    const results = await Promise.all(bookingPromises);

    const successfulBookings = results.filter((r) => r.success);
    const rejectedBookings = results.filter((r) => !r.success);

    console.log(`  -> Results: ${successfulBookings.length} succeeded, ${rejectedBookings.length} rejected.`);
    if (rejectedBookings.length > 0) {
      console.log(`  -> Sample rejection error:`, (rejectedBookings[0] as any).error);
    }

    assert(successfulBookings.length === 4, 'Exactly 4 bookings succeeded on 4-seater vehicle');
    assert(rejectedBookings.length === 46, 'Exactly 46 excess requests rejected under concurrency');

    // Verify rejection reasons
    const capacityExceededErrors = rejectedBookings.filter((r: any) =>
      r.error.includes('Capacity exceeded')
    );
    assert(
      capacityExceededErrors.length === 46,
      'All 46 rejected requests received clean "Capacity exceeded" error'
    );

    // Verify trip document state in database
    const verifiedTrip = await prisma.trip.findUnique({
      where: { id: stressTrip.id },
      include: {
        bookings: {
          where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.BOARDED] } },
        },
      },
    });

    assert(verifiedTrip?.bookings.length === 4, 'Database has exactly 4 confirmed bookings on this trip');
    const totalBookedSeats = verifiedTrip?.bookings.reduce((sum, b) => sum + b.passengerCount, 0);
    assert(totalBookedSeats === 4, 'Total booked seats strictly equals capacity (4 seats, 0 overbooked)');
    assert(verifiedTrip?.passengerCount === 4, 'Trip.passengerCount atomically incremented to 4');

    // ------------------------------------------------------------------------
    // TEST 2: ATOMIC SEAT CANCELLATION & RESTORATION
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 3: Atomic Cancellation & Seat Restoration ---`);

    const bookingToCancel = (successfulBookings[0] as any).booking;
    assert(Boolean(bookingToCancel?.id), 'Selected 1 of the 4 bookings for cancellation');

    const cancelled = await bookingsService.cancelBooking(bookingToCancel.id, bookingToCancel.guest.userId);
    assert(cancelled.status === BookingStatus.CANCELLED, 'Booking status updated to CANCELLED');

    const tripAfterCancel = await prisma.trip.findUnique({ where: { id: stressTrip.id } });
    assert(tripAfterCancel?.passengerCount === 3, 'Trip passengerCount atomically decremented to 3');

    // New 51st guest attempts to book the freed seat
    const newGuestUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-guest-${tag}-51`,
        email: `guest-${tag}-51@test.com`,
        fullName: 'Late Guest 51',
        role: Role.GUEST,
      },
    });
    createdUserIds.push(newGuestUser.id);

    const replacementBooking = await bookingsService.createBooking(event.id, newGuestUser.id, {
      tripId: stressTrip.id,
      pickupPlaceId: pickupPlace.id,
      destinationPlaceId: dropPlace.id,
      requestedPickupTime: '2026-12-15T18:00:00Z',
      passengerCount: 1,
    });

    assert(Boolean(replacementBooking.id), 'Replacement booking succeeded, filling restored 4th seat');

    // Attempting 1 more should fail immediately
    let overbookFailed = false;
    try {
      await bookingsService.createBooking(event.id, newGuestUser.id, {
        tripId: stressTrip.id,
        pickupPlaceId: pickupPlace.id,
        destinationPlaceId: dropPlace.id,
        requestedPickupTime: '2026-12-15T18:00:00Z',
        passengerCount: 1,
      });
    } catch (err: any) {
      overbookFailed = err.message.includes('Capacity exceeded');
    }
    assert(overbookFailed, 'Subsequent booking rejected: vehicle capacity is fully locked again (4/4)');

    // ------------------------------------------------------------------------
    // TEST 3: WHOLE-VEHICLE EXCLUSIVE RESERVATIONS
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 4: Whole-Vehicle Exclusivity & Locking ---`);

    const exclusiveTrip = await prisma.trip.create({
      data: {
        eventId: event.id,
        vehicleId: suvVehicle.id,
        originPlaceId: pickupPlace.id,
        destinationPlaceId: dropPlace.id,
        scheduledPickupTime: new Date('2026-12-16T14:00:00Z'),
        passengerCount: 0,
        status: TripStatus.SCHEDULED,
      },
    });

    const vipGuest = await prisma.user.create({
      data: {
        firebaseUid: `uid-vip-${tag}`,
        email: `vip-${tag}@test.com`,
        fullName: 'Royal Family VIP',
        role: Role.GUEST,
      },
    });
    createdUserIds.push(vipGuest.id);

    // Book WHOLE_VEHICLE for 3 passengers
    const wholeVehicleBooking = await bookingsService.createBooking(event.id, vipGuest.id, {
      tripId: exclusiveTrip.id,
      pickupPlaceId: pickupPlace.id,
      destinationPlaceId: dropPlace.id,
      requestedPickupTime: '2026-12-16T14:00:00Z',
      passengerCount: 3,
      bookingType: 'WHOLE_VEHICLE',
      isExclusive: true,
    });

    assert(wholeVehicleBooking.isExclusive === true, 'Booking created with isExclusive = true');

    const updatedExclusiveTrip = await prisma.trip.findUnique({ where: { id: exclusiveTrip.id } });
    assert(updatedExclusiveTrip?.isExclusive === true, 'Trip marked isExclusive = true in database');

    // Another guest tries to book a seat on this exclusive trip
    let exclusiveConflictCaught = false;
    try {
      await bookingsService.createBooking(event.id, newGuestUser.id, {
        tripId: exclusiveTrip.id,
        pickupPlaceId: pickupPlace.id,
        destinationPlaceId: dropPlace.id,
        requestedPickupTime: '2026-12-16T14:00:00Z',
        passengerCount: 1,
        bookingType: 'SEAT',
      });
    } catch (err: any) {
      exclusiveConflictCaught = err.message.includes('Trip is booked exclusively');
    }
    assert(exclusiveConflictCaught, 'Seat booking rejected: Trip is booked exclusively for VIP family');

    // ------------------------------------------------------------------------
    // TEST 4: DRIVER OVERLAPPING ACTIVE TRIP CONFLICT PREVENTION
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 5: Driver Overlap & Conflict Detection ---`);

    const driverUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-drv-pr3-${tag}`,
        email: `drv-pr3-${tag}@test.com`,
        fullName: 'Balwant Singh (Chauffeur)',
        role: Role.DRIVER,
      },
    });
    createdUserIds.push(driverUser.id);

    const verifiedDriver = await prisma.driver.create({
      data: {
        accountId: account.id,
        userId: driverUser.id,
        licenseNumber: `RJ-DL-${crypto.randomInt(10000, 99999)}`,
        isVerified: true,
        approvalStatus: 'APPROVED',
      },
    });

    // Create Trip 1 and assign driver (status: ASSIGNED)
    const trip1 = await tripsService.createTrip(event.id, {
      originPlaceId: pickupPlace.id,
      destinationPlaceId: dropPlace.id,
      scheduledPickupTime: '2026-12-17T10:00:00Z',
      driverId: verifiedDriver.id,
    });

    assert(trip1.status === TripStatus.ASSIGNED, 'Trip 1 created and assigned to verified driver');

    // Attempt to assign the same driver to Trip 2 with overlapping window (10:15 AM)
    let driverConflictCaught = false;
    try {
      await tripsService.createTrip(event.id, {
        originPlaceId: pickupPlace.id,
        destinationPlaceId: dropPlace.id,
        scheduledPickupTime: '2026-12-17T10:15:00Z', // 15 min later (within 30-min buffer)
        driverId: verifiedDriver.id,
      });
    } catch (err: any) {
      driverConflictCaught = err.message.includes('Driver conflict');
    }

    assert(driverConflictCaught, 'Driver conflict detected: Driver cannot be scheduled for overlapping trip');

    // ------------------------------------------------------------------------
    // TEST 5: VEHICLE OVERLAPPING ACTIVE TRIP CONFLICT PREVENTION
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 6: Vehicle Overlap & Conflict Detection ---`);

    // Assign sedanVehicle to trip1
    await tripsService.assignTrip(trip1.id, { vehicleId: sedanVehicle.id });

    // Try to create another trip with sedanVehicle at overlapping time
    let vehicleConflictCaught = false;
    try {
      await tripsService.createTrip(event.id, {
        originPlaceId: pickupPlace.id,
        destinationPlaceId: dropPlace.id,
        scheduledPickupTime: '2026-12-17T10:20:00Z', // Overlaps trip1
        vehicleId: sedanVehicle.id,
      });
    } catch (err: any) {
      vehicleConflictCaught = err.message.includes('Vehicle conflict');
    }

    assert(vehicleConflictCaught, 'Vehicle conflict detected: Vehicle cannot be assigned to overlapping trip');

    // ------------------------------------------------------------------------
    // TEST 6: FLEET DUTY SIMULTANEOUS DRIVER CONFLICT PREVENTION
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 7: Fleet Duty Multi-Driver Conflict Prevention ---`);

    const driverUser2 = await prisma.user.create({
      data: {
        firebaseUid: `uid-drv2-pr3-${tag}`,
        email: `drv2-pr3-${tag}@test.com`,
        fullName: 'Manish Rawat (Driver 2)',
        role: Role.DRIVER,
      },
    });
    createdUserIds.push(driverUser2.id);

    const verifiedDriver2 = await prisma.driver.create({
      data: {
        accountId: account.id,
        userId: driverUser2.id,
        licenseNumber: `RJ-DL-${crypto.randomInt(10000, 99999)}`,
        isVerified: true,
        approvalStatus: 'APPROVED',
      },
    });

    // Driver 1 goes ON_DUTY with sedanVehicle
    await fleetService.updateDutyStatus(verifiedDriver.id, DutyStatus.ON_DUTY, sedanVehicle.id);
    const d1Duty = await prisma.duty.findFirst({
      where: { driverId: verifiedDriver.id, status: DutyStatus.ON_DUTY },
    });
    assert(Boolean(d1Duty), 'Driver 1 is ON_DUTY with Sedan vehicle');

    // Driver 2 attempts to go ON_DUTY with the same sedanVehicle
    let dutyConflictCaught = false;
    try {
      await fleetService.updateDutyStatus(verifiedDriver2.id, DutyStatus.ON_DUTY, sedanVehicle.id);
    } catch (err: any) {
      dutyConflictCaught = err.message.includes('Vehicle conflict');
    }

    assert(dutyConflictCaught, 'Duty conflict detected: Second driver blocked from going ON_DUTY on active vehicle');

    // Driver 1 goes OFF_DUTY
    await fleetService.updateDutyStatus(verifiedDriver.id, DutyStatus.OFF_DUTY);

    // Driver 2 can now go ON_DUTY
    const d2Updated = await fleetService.updateDutyStatus(verifiedDriver2.id, DutyStatus.ON_DUTY, sedanVehicle.id);
    assert(d2Updated.dutyStatus === DutyStatus.ON_DUTY, 'Driver 2 successfully takes over vehicle after Driver 1 off-duty');

    // Cleanup Driver 2 duty
    await fleetService.updateDutyStatus(verifiedDriver2.id, DutyStatus.OFF_DUTY);

    // ------------------------------------------------------------------------
    // CLEANUP TEST DATA
    // ------------------------------------------------------------------------
    console.log(`\n--- Cleanup Test Artifacts ---`);
    const testTrips = await prisma.trip.findMany({ where: { eventId: event.id }, select: { id: true } });
    const tripIds = testTrips.map((t) => t.id);
    await prisma.duty.deleteMany({ where: { vehicleId: { in: [sedanVehicle.id, suvVehicle.id] } } });
    await prisma.booking.deleteMany({ where: { eventId: event.id } });
    if (tripIds.length > 0) {
      await prisma.tripAssignment.deleteMany({ where: { tripId: { in: tripIds } } });
      await prisma.tripEvent.deleteMany({ where: { tripId: { in: tripIds } } });
    }
    await prisma.trip.deleteMany({ where: { eventId: event.id } });
    await prisma.place.deleteMany({ where: { eventId: event.id } });
    await prisma.guest.deleteMany({ where: { eventId: event.id } });
    await prisma.driver.deleteMany({ where: { accountId: account.id } });
    await prisma.vehicle.deleteMany({ where: { accountId: account.id } });
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    await prisma.accountMember.deleteMany({ where: { accountId: { in: createdAccountIds } } });
    await prisma.account.deleteMany({ where: { id: { in: createdAccountIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });

    console.log(`\n================================================================`);
    console.log(`  PR 3 REGRESSION SUITE RESULTS`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`================================================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during PR 3 regression suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPR3ConcurrencySuite();
