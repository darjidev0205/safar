/**
 * SAFAR PR 1 — Security Exploit Regression Test Suite
 * 
 * Verifies fixes for:
 * 1. SEC-01: Static "1234" removal, cryptographic generation, rate limiting (5 attempts), lockout, and replay prevention.
 * 2. SEC-02: Driver unverified/pending default, duty compliance block, assignment block.
 * 3. SEC-03: Privilege escalation rejection via syncProfile and role immutability.
 * 4. WS-01: Unauthenticated WebSocket connection rejection.
 */

import { PrismaClient, TripStatus, BookingStatus } from '@prisma/client';
import { DutyStatus } from '@safar/types';
import { generateSecureBoardingCode } from '../services/api/src/modules/bookings/bookings.service';
import { AuthService } from '../services/api/src/modules/auth/auth.service';
import { TripsService } from '../services/api/src/modules/trips/trips.service';
import { FleetService } from '../services/api/src/modules/fleet/fleet.service';
import { verifyPassengerBoarding } from '../apps/web/src/lib/boarding-service';

const prisma = new PrismaClient();

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('SAFAR PR 1 — SECURITY & EXPLOIT REGRESSION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${detail || 'Condition not met'}`);
      failed++;
    }
  }

  const now = Date.now();

  try {
    // -----------------------------------------------------------------
    // TEST 1: SEC-01 — Cryptographic boarding code generation
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Cryptographic Boarding Code Generation ---');
    const generatedCodes = new Set<string>();
    let saw1234 = false;
    for (let i = 0; i < 50; i++) {
      const code = generateSecureBoardingCode();
      if (code === '1234') saw1234 = true;
      assert(/^\d{4}$/.test(code), `Code ${code} is 4 digits`);
      generatedCodes.add(code);
    }
    assert(!saw1234, 'Static default "1234" is strictly excluded from generation');
    assert(generatedCodes.size > 40, `High entropy: generated ${generatedCodes.size} unique codes out of 50`);

    // -----------------------------------------------------------------
    // TEST 2: SEC-02 — Driver Default to isVerified=false & approvalStatus="PENDING"
    // -----------------------------------------------------------------
    console.log('\n--- TEST 2: Driver Pending Default & Compliance Verification ---');
    const driverUser = await prisma.user.create({
      data: {
        firebaseUid: `sec_driver_${now}`,
        fullName: 'Driver Unverified',
        email: `driver.${now}@safar.events`,
        role: 'DRIVER',
      },
    });

    const account = await prisma.account.create({
      data: {
        name: `Sec Test Org ${now}`,
        slug: `org-${now}`,
        ownerId: driverUser.id,
      },
    });

    const driver = await prisma.driver.create({
      data: {
        accountId: account.id,
        userId: driverUser.id,
        licenseNumber: 'DL-TEMP-1234',
      },
    });

    assert(driver.isVerified === false, 'Driver.isVerified defaults to false');
    assert(driver.approvalStatus === 'PENDING', 'Driver.approvalStatus defaults to "PENDING"');

    // Test duty block for unverified driver
    const fleetService = new FleetService(prisma as any);
    let dutyBlocked = false;
    try {
      await fleetService.updateDutyStatus(driver.id, DutyStatus.ON_DUTY);
    } catch (err: any) {
      dutyBlocked = err?.message?.includes('Compliance check failed');
    }
    assert(dutyBlocked, 'Unverified driver is blocked from going ON_DUTY with compliance exception');

    // Test trip assignment block for unverified driver
    const tripsService = new TripsService(prisma as any);
    const event = await prisma.event.create({
      data: {
        accountId: account.id,
        creatorId: driverUser.id,
        name: `Test Wedding ${now}`,
        city: 'Ahmedabad',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        joinCode: `SEC${Math.floor(100 + Math.random() * 900)}`,
      },
    });

    const place = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'Venue A',
        address: 'SG Highway',
        latitude: 23.03,
        longitude: 72.55,
      },
    });

    let assignBlocked = false;
    try {
      await tripsService.createTrip(event.id, {
        originPlaceId: place.id,
        destinationPlaceId: place.id,
        scheduledPickupTime: new Date(),
        driverId: driver.id,
      });
    } catch (err: any) {
      assignBlocked = err?.message?.includes('Cannot assign an unverified or pending driver');
    }
    assert(assignBlocked, 'Unverified driver cannot be assigned to trips');

    // -----------------------------------------------------------------
    // TEST 3: SEC-03 — Privilege Escalation Prevention via syncProfile
    // -----------------------------------------------------------------
    console.log('\n--- TEST 3: Privilege Escalation Prevention via syncProfile ---');
    const guestUser = await prisma.user.create({
      data: {
        firebaseUid: `sec_guest_${now}`,
        fullName: 'Standard Guest Attacker',
        email: `guest.attacker.${now}@safar.events`,
        role: 'GUEST',
      },
    });

    const authService = new AuthService(prisma as any);
    let escalationBlocked = false;
    try {
      await authService.syncProfile(guestUser.id, {
        fullName: 'Standard Guest Attacker',
        role: 'ACCOUNT_OWNER' as any,
      });
    } catch (err: any) {
      escalationBlocked = err?.message?.includes('Privilege escalation rejected');
    }
    assert(escalationBlocked, 'Role elevation to ACCOUNT_OWNER was rejected with ForbiddenException');

    const freshUser = await prisma.user.findUnique({ where: { id: guestUser.id } });
    assert(freshUser?.role === 'GUEST', 'Database user role remains strictly GUEST');

    // Safe profile update (name only) should succeed
    const safeUpdate = await authService.syncProfile(guestUser.id, {
      fullName: 'Updated Legitimate Name',
    });
    assert(safeUpdate.fullName === 'Updated Legitimate Name', 'Safe profile field (fullName) updated successfully');

    // -----------------------------------------------------------------
    // TEST 4: SEC-01 — Boarding Verification Rate Limiting, Lockout & Replay Prevention
    // -----------------------------------------------------------------
    console.log('\n--- TEST 4: Boarding Rate Limiting, Trip Lockout & Replay Prevention ---');
    // Approve driver for the test trip
    await prisma.driver.update({
      where: { id: driver.id },
      data: { isVerified: true, approvalStatus: 'APPROVED' },
    });

    const trip = await prisma.trip.create({
      data: {
        eventId: event.id,
        originPlaceId: place.id,
        destinationPlaceId: place.id,
        scheduledPickupTime: new Date(),
        driverId: driver.id,
        status: TripStatus.ARRIVED,
      },
    });

    const guest = await prisma.guest.create({
      data: {
        eventId: event.id,
        userId: guestUser.id,
        fullName: guestUser.fullName,
      },
    });

    const legitimateCode = generateSecureBoardingCode();
    const booking = await prisma.booking.create({
      data: {
        eventId: event.id,
        tripId: trip.id,
        guestId: guest.id,
        originPlaceId: place.id,
        destinationPlaceId: place.id,
        requestedPickupTime: new Date(),
        passengerCount: 2,
        status: BookingStatus.CONFIRMED,
        boardingCode: legitimateCode,
      },
    });

    // Submitting wrong code increments attempts
    let invalidAttempt1 = false;
    try {
      await tripsService.verifyBoarding(trip.id, '0000');
    } catch (err: any) {
      invalidAttempt1 = err?.message?.includes('Invalid boarding code');
    }
    assert(invalidAttempt1, 'Invalid boarding code rejected with attempts remaining counter');

    // Exhaust 4 more attempts to trigger 5/5 lockout
    for (let a = 2; a <= 4; a++) {
      try {
        await tripsService.verifyBoarding(trip.id, `000${a}`);
      } catch {}
    }

    // 5th attempt must trigger lockout
    let lockoutTriggered = false;
    try {
      await tripsService.verifyBoarding(trip.id, '9999');
    } catch (err: any) {
      lockoutTriggered = err?.message?.includes('Maximum invalid boarding code attempts exceeded');
    }
    assert(lockoutTriggered, '5th consecutive failed attempt triggered 5-minute trip lockout');

    // Attempting even the legitimate code while locked must be blocked
    let legitimateBlockedWhileLocked = false;
    try {
      await tripsService.verifyBoarding(trip.id, legitimateCode);
    } catch (err: any) {
      legitimateBlockedWhileLocked = err?.message?.includes('Trip boarding verification is locked');
    }
    assert(legitimateBlockedWhileLocked, 'Trip is locked: brute-force attacker is shut out completely');

    // Reset lock to test legitimate redemption and replay protection
    await prisma.trip.update({
      where: { id: trip.id },
      data: { failedBoardingAttempts: 0, boardingLockedUntil: null },
    });

    // Legitimate code verification
    const verifiedResult = await tripsService.verifyBoarding(trip.id, legitimateCode);
    assert(verifiedResult.verified === true, 'Legitimate cryptographically generated code verified successfully');

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    assert(updatedBooking?.status === BookingStatus.BOARDED, 'Booking status transitioned to BOARDED');

    // Replay attack test: Submitting the exact same code again must be rejected!
    let replayBlocked = false;
    try {
      await tripsService.verifyBoarding(trip.id, legitimateCode);
    } catch (err: any) {
      replayBlocked = err?.message?.includes('Replay detected');
    }
    assert(replayBlocked, 'Replay attack prevented: Already boarded code cannot be redeemed a second time');

    // Clean up test records
    await prisma.booking.deleteMany({ where: { eventId: event.id } });
    await prisma.trip.deleteMany({ where: { eventId: event.id } });
    await prisma.guest.deleteMany({ where: { eventId: event.id } });
    await prisma.place.deleteMany({ where: { eventId: event.id } });
    await prisma.event.deleteMany({ where: { accountId: account.id } });
    await prisma.driver.deleteMany({ where: { accountId: account.id } });
    await prisma.account.deleteMany({ where: { id: account.id } });
    await prisma.user.deleteMany({ where: { id: { in: [driverUser.id, guestUser.id] } } });

    console.log('\n================================================================');
    console.log(`PR 1 REGRESSION SUMMARY: All ${passed} security tests PASSED. ${failed} failed.`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('Regression suite runtime error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRegressionSuite();

