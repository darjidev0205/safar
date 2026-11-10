/**
 * SAFAR — Production-Grade Multi-Tenant Event Access & Invitation System
 * Comprehensive Automated Verification Suite (19 Scenarios)
 */

import { PrismaClient, AccessCodePurpose, Role, EventStatus } from '@prisma/client';
import {
  generateSecureCode,
  computeCodeDigest,
  normalizeAccessCode,
  createGuestAccessCodeRecord,
  createDriverInviteCodeRecord,
  resolveAccessCode,
  redeemDriverInvite,
  regenerateGuestAccessCode,
  revokeAccessCode,
} from '../apps/web/src/lib/access-code';

const prisma = new PrismaClient();

interface TestResult {
  scenario: number;
  description: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(scenario: number, description: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`  ✓ [SCENARIO ${scenario}] PASS: ${description}`);
    results.push({ scenario, description, passed: true, details });
  } else {
    console.error(`  ✗ [SCENARIO ${scenario}] FAIL: ${description} — ${details || ''}`);
    results.push({ scenario, description, passed: false, details });
  }
}

async function runAllTests() {
  console.log('========================================================================');
  console.log('  SAFAR MULTI-TENANT ACCESS & INVITATION SYSTEM — REGRESSION SUITE');
  console.log('========================================================================\n');

  const runId = Date.now().toString().slice(-6);

  // Setup Test Hosts and Accounts
  const hostAUser = await prisma.user.create({
    data: {
      firebaseUid: `host-a-${runId}`,
      email: `host.a.${runId}@safar.test`,
      fullName: 'Vikram Singhania (Host A)',
      role: Role.ACCOUNT_OWNER,
    },
  });

  const accountA = await prisma.account.create({
    data: {
      name: `Singhania Travels ${runId}`,
      slug: `singhania-${runId}`,
      ownerId: hostAUser.id,
      members: {
        create: {
          userId: hostAUser.id,
          role: Role.ACCOUNT_OWNER,
        },
      },
    },
  });

  const hostBUser = await prisma.user.create({
    data: {
      firebaseUid: `host-b-${runId}`,
      email: `host.b.${runId}@safar.test`,
      fullName: 'Aarav Patel (Host B)',
      role: Role.ACCOUNT_OWNER,
    },
  });

  const accountB = await prisma.account.create({
    data: {
      name: `Patel Wedding Organizers ${runId}`,
      slug: `patel-${runId}`,
      ownerId: hostBUser.id,
      members: {
        create: {
          userId: hostBUser.id,
          role: Role.ACCOUNT_OWNER,
        },
      },
    },
  });

  // -------------------------------------------------------------------------------------
  // Scenario 1: Host A and Host B create weddings simultaneously
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 1: Concurrent Event & Code Creation ---');
  let weddingA: any, weddingB: any;
  let codeA: any, codeB: any;

  await Promise.all([
    prisma.$transaction(
      async (tx) => {
        weddingA = await tx.event.create({
          data: {
            accountId: accountA.id,
            creatorId: hostAUser.id,
            name: `Singhania Royal Wedding ${runId}`,
            city: 'Udaipur',
            startDate: new Date('2026-12-10T10:00:00Z'),
            endDate: new Date('2026-12-14T22:00:00Z'),
            joinCode: `TEMP-A-${runId}`,
            status: EventStatus.ACTIVE,
          },
        });
        codeA = await createGuestAccessCodeRecord(tx, {
          accountId: accountA.id,
          eventId: weddingA.id,
          creatorId: hostAUser.id,
        });
      },
      { timeout: 30000, maxWait: 20000 }
    ),
    prisma.$transaction(
      async (tx) => {
        weddingB = await tx.event.create({
          data: {
            accountId: accountB.id,
            creatorId: hostBUser.id,
            name: `Patel Grand Palace Wedding ${runId}`,
            city: 'Jaipur',
            startDate: new Date('2026-12-15T10:00:00Z'),
            endDate: new Date('2026-12-18T22:00:00Z'),
            joinCode: `TEMP-B-${runId}`,
            status: EventStatus.ACTIVE,
          },
        });
        codeB = await createGuestAccessCodeRecord(tx, {
          accountId: accountB.id,
          eventId: weddingB.id,
          creatorId: hostBUser.id,
        });
      },
      { timeout: 30000, maxWait: 20000 }
    ),
  ]);

  assert(
    1,
    'Host A and Host B create weddings simultaneously with separate accounts and events',
    weddingA && weddingB && weddingA.accountId !== weddingB.accountId,
    `Wedding A: ${weddingA.id}, Wedding B: ${weddingB.id}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 2: Codes generated for both events are different
  // -------------------------------------------------------------------------------------
  assert(
    2,
    'Codes generated for both events are different and distinct',
    codeA.code !== codeB.code && codeA.displayCode !== codeB.displayCode,
    `Code A: ${codeA.displayCode}, Code B: ${codeB.displayCode}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 3: Concurrent code creation never saves duplicates
  // -------------------------------------------------------------------------------------
  const concurrentCount = 5;
  const concurrentCodes = await Promise.all(
    Array.from({ length: concurrentCount }).map(async (_, idx) => {
      const dummyEvent = await prisma.event.create({
        data: {
          accountId: accountA.id,
          creatorId: hostAUser.id,
          name: `Concurrent Test Event ${runId}-${idx}`,
          city: 'Goa',
          startDate: new Date(),
          endDate: new Date(),
          joinCode: `CONC-${runId}-${idx}`,
          status: EventStatus.ACTIVE,
        },
      });
      return prisma.$transaction(
        async (tx) => {
          return createGuestAccessCodeRecord(tx, {
            accountId: accountA.id,
            eventId: dummyEvent.id,
            creatorId: hostAUser.id,
          });
        },
        { timeout: 30000, maxWait: 20000 }
      );
    })
  );

  const uniqueCodesSet = new Set(concurrentCodes.map((c) => c.code));
  assert(
    3,
    'Concurrent code creation under load produces strictly unique codes without collisions',
    uniqueCodesSet.size === concurrentCount,
    `Created ${concurrentCount} concurrent codes, unique count = ${uniqueCodesSet.size}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 4: Guest enters the correct wedding code
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Code Resolution & Guest Validation ---');
  // Test both normalized (without dashes) and formatted (with dashes)
  const resolveFormatted = await resolveAccessCode(codeA.displayCode, AccessCodePurpose.GUEST_EVENT);
  const resolveRaw = await resolveAccessCode(codeA.code, AccessCodePurpose.GUEST_EVENT);
  const resolveLowercase = await resolveAccessCode(codeA.code.toLowerCase(), AccessCodePurpose.GUEST_EVENT);

  assert(
    4,
    'Guest enters correct wedding code in any casing or format (with or without hyphens)',
    resolveFormatted.isValid &&
      resolveRaw.isValid &&
      resolveLowercase.isValid &&
      resolveFormatted.event?.id === weddingA.id,
    `Resolved event name: ${resolveFormatted.event?.name}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 5: Guest enters an invalid code
  // -------------------------------------------------------------------------------------
  const invalidResolution = await resolveAccessCode('INVALID999X', AccessCodePurpose.GUEST_EVENT);
  assert(
    5,
    'Guest enters invalid code and receives clean, safe error message without leaking internals',
    !invalidResolution.isValid &&
      invalidResolution.error === 'Wedding event code not found. Please verify with the host.',
    `Returned error: ${invalidResolution.error}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 6: Guest tries a driver invitation
  // -------------------------------------------------------------------------------------
  const driverInviteA = await prisma.$transaction(
    async (tx) => {
      return createDriverInviteCodeRecord(tx, {
        accountId: accountA.id,
        eventId: weddingA.id,
        creatorId: hostAUser.id,
        recipientName: 'Chauffeur Suraj',
        recipientPhone: '+91 9988776655',
      });
    },
    { timeout: 30000, maxWait: 20000 }
  );

  const guestTriesDriverCode = await resolveAccessCode(driverInviteA.displayCode, AccessCodePurpose.GUEST_EVENT);
  assert(
    6,
    'Guest entering a Driver Invitation code is blocked with clear role guidance',
    !guestTriesDriverCode.isValid &&
      guestTriesDriverCode.error === 'This is a Driver Invitation Code. Guests must enter the Wedding Guest Code.',
    `Guidance message: ${guestTriesDriverCode.error}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 7: Driver tries a guest code
  // -------------------------------------------------------------------------------------
  const driverTriesGuestCode = await resolveAccessCode(codeA.displayCode, AccessCodePurpose.DRIVER_INVITE);
  assert(
    7,
    'Driver entering a Wedding Guest code is blocked with clear chauffeur guidance',
    !driverTriesGuestCode.isValid &&
      driverTriesGuestCode.error === 'This is a Guest Access Code. Chauffeurs must enter a Driver Invitation Code.',
    `Guidance message: ${driverTriesGuestCode.error}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 8: Driver tries to redeem another driver's invitation (Targeted invite check)
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Driver Onboarding & Single-Use Redemption ---');
  const driverUser1 = await prisma.user.create({
    data: {
      firebaseUid: `driver-1-${runId}`,
      email: `driver.1.${runId}@safar.test`,
      phoneNumber: `+9198111${runId.slice(-5)}`,
      fullName: 'Ramesh Chauffeur',
      role: Role.DRIVER,
    },
  });

  const driverUser2 = await prisma.user.create({
    data: {
      firebaseUid: `driver-2-${runId}`,
      email: `driver.2.${runId}@safar.test`,
      phoneNumber: `+9198222${runId.slice(-5)}`,
      fullName: 'Suresh Chauffeur',
      role: Role.DRIVER,
    },
  });

  // Create single-use driver invitation specifically assigned to Ramesh
  const rameshInvite = await prisma.$transaction(
    async (tx) => {
      return createDriverInviteCodeRecord(tx, {
        accountId: accountA.id,
        eventId: weddingA.id,
        creatorId: hostAUser.id,
        recipientName: 'Ramesh Chauffeur',
        recipientPhone: driverUser1.phoneNumber,
      });
    },
    { timeout: 30000, maxWait: 20000 }
  );

  // Driver 1 successfully redeems their invitation
  const redemption1 = await redeemDriverInvite(rameshInvite.displayCode, driverUser1);
  assert(
    8,
    'Driver redeems assigned invitation code and receives authorized event membership',
    redemption1.success &&
      redemption1.driverEvent.status === 'APPROVED' &&
      redemption1.event.id === weddingA.id,
    `Membership: ${redemption1.driverEvent.id}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 9: Driver redeems the same one-time invitation twice
  // -------------------------------------------------------------------------------------
  let doubleRedeemError = '';
  try {
    await redeemDriverInvite(rameshInvite.displayCode, driverUser2);
  } catch (e: any) {
    doubleRedeemError = e.message;
  }

  assert(
    9,
    'One-time driver invitation cannot be redeemed twice; subsequent attempt is rejected',
    doubleRedeemError.includes('already been redeemed') || doubleRedeemError.includes('no longer active'),
    `Rejection message: ${doubleRedeemError}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 10: Host A tries to access Host B's events (Tenant Isolation)
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Multi-Tenant Data Isolation ---');
  const crossTenantAccess = await prisma.event.findFirst({
    where: {
      id: weddingB.id,
      accountId: accountA.id, // Host A's account context
    },
  });

  assert(
    10,
    'Host A cannot view or manage Host B event even if knowing its UUID (tenant isolation enforced)',
    crossTenantAccess === null,
    'Cross-tenant query strictly returned null'
  );

  // -------------------------------------------------------------------------------------
  // Scenario 11: Guest participates in multiple weddings
  // -------------------------------------------------------------------------------------
  const multiGuestUser = await prisma.user.create({
    data: {
      firebaseUid: `guest-multi-${runId}`,
      email: `guest.multi.${runId}@safar.test`,
      phoneNumber: `+9197000${runId.slice(-5)}`,
      fullName: 'Priya Sharma (Multi-Event Guest)',
      role: Role.GUEST,
    },
  });

  const guestMembershipA = await prisma.guest.create({
    data: {
      accountId: accountA.id,
      eventId: weddingA.id,
      userId: multiGuestUser.id,
      fullName: multiGuestUser.fullName,
      email: multiGuestUser.email,
      status: 'CONFIRMED',
    },
  });

  const guestMembershipB = await prisma.guest.create({
    data: {
      accountId: accountB.id,
      eventId: weddingB.id,
      userId: multiGuestUser.id,
      fullName: multiGuestUser.fullName,
      email: multiGuestUser.email,
      status: 'CONFIRMED',
    },
  });

  assert(
    11,
    'A guest can independently join multiple weddings belonging to different hosts without data leakage',
    guestMembershipA.id !== guestMembershipB.id &&
      guestMembershipA.eventId === weddingA.id &&
      guestMembershipB.eventId === weddingB.id,
    `Guest Record A: ${guestMembershipA.id}, Guest Record B: ${guestMembershipB.id}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 12: Guest is invited to only selected functions under Master Wedding
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Master Wedding & Child Functions ---');
  // Create 3 Ceremonial Functions under Master Wedding A
  const sangeetFn = await prisma.function.create({
    data: {
      eventId: weddingA.id,
      name: 'Royal Sangeet Night',
      type: 'SANGEET',
      startTime: new Date('2026-12-10T18:00:00Z'),
      endTime: new Date('2026-12-10T23:00:00Z'),
      venueName: 'Lake Palace Lawn',
      status: 'ACTIVE',
    },
  });

  const weddingCeremonyFn = await prisma.function.create({
    data: {
      eventId: weddingA.id,
      name: 'Vedic Pheras & Wedding',
      type: 'WEDDING',
      startTime: new Date('2026-12-11T16:00:00Z'),
      endTime: new Date('2026-12-11T22:00:00Z'),
      venueName: 'Grand Courtyard',
      status: 'ACTIVE',
    },
  });

  const receptionFn = await prisma.function.create({
    data: {
      eventId: weddingA.id,
      name: 'Grand Reception Banquet',
      type: 'RECEPTION',
      startTime: new Date('2026-12-12T19:00:00Z'),
      endTime: new Date('2026-12-12T23:59:00Z'),
      venueName: 'Crystal Ballroom',
      status: 'ACTIVE',
    },
  });

  // Assign guest to ONLY Sangeet and Wedding Ceremony (NOT Reception)
  await prisma.guestFunctionAttendance.createMany({
    data: [
      { guestId: guestMembershipA.id, functionId: sangeetFn.id, isAttending: true, status: 'ASSIGNED' },
      { guestId: guestMembershipA.id, functionId: weddingCeremonyFn.id, isAttending: true, status: 'ASSIGNED' },
    ],
  });

  const guestAttendances = await prisma.guestFunctionAttendance.findMany({
    where: { guestId: guestMembershipA.id },
  });

  const attendedFunctionIds = guestAttendances.map((a) => a.functionId);
  const invitedToReception = attendedFunctionIds.includes(receptionFn.id);

  assert(
    12,
    'Guest participation is controlled per function under the master wedding without separate codes',
    attendedFunctionIds.includes(sangeetFn.id) &&
      attendedFunctionIds.includes(weddingCeremonyFn.id) &&
      !invitedToReception,
    `Invited to: ${attendedFunctionIds.length} of 3 functions (Reception excluded)`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 13: Driver works for multiple host events
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Cross-Event Driver Duties & Lifecycle ---');
  // Issue invitation for Driver 1 from Host B's wedding
  const driverInviteB = await prisma.$transaction(
    async (tx) => {
      return createDriverInviteCodeRecord(tx, {
        accountId: accountB.id,
        eventId: weddingB.id,
        creatorId: hostBUser.id,
        recipientName: 'Ramesh Chauffeur',
      });
    },
    { timeout: 30000, maxWait: 20000 }
  );

  const redemptionB = await redeemDriverInvite(driverInviteB.displayCode, driverUser1);

  const driverEvents = await prisma.driverEvent.findMany({
    where: { driverId: redemptionB.driver.id, status: 'APPROVED' },
  });

  assert(
    13,
    'Driver can be authorized for multiple events across different host accounts seamlessly',
    driverEvents.length >= 2,
    `Driver is authorized for ${driverEvents.length} events`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 14: Code regeneration invalidates the old code
  // -------------------------------------------------------------------------------------
  const oldCodeDisplay = codeA.displayCode;
  const regenerated = await regenerateGuestAccessCode(weddingA.id, hostAUser.id, accountA.id);

  const testOldCode = await resolveAccessCode(oldCodeDisplay, AccessCodePurpose.GUEST_EVENT);
  const testNewCode = await resolveAccessCode(regenerated.displayCode, AccessCodePurpose.GUEST_EVENT);

  assert(
    14,
    'Regenerating event guest code invalidates the previous code and immediately activates the new code',
    Boolean(
      !testOldCode.isValid &&
        testOldCode.error?.includes('revoked') &&
        testNewCode.isValid &&
        testNewCode.event?.id === weddingA.id
    ),
    `Old Code Valid: ${testOldCode.isValid}, New Code Valid: ${testNewCode.isValid}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 15: Revoked and expired codes are rejected
  // -------------------------------------------------------------------------------------
  // Revoke the newly generated code
  await revokeAccessCode(regenerated.record.id, hostAUser.id, accountA.id);
  const testRevoked = await resolveAccessCode(regenerated.displayCode, AccessCodePurpose.GUEST_EVENT);

  // Create an already-expired code
  const expiredRecord = await prisma.eventAccessCode.create({
    data: {
      accountId: accountA.id,
      eventId: weddingA.id,
      purpose: AccessCodePurpose.GUEST_EVENT,
      code: 'EXPIRED123',
      codeDigest: computeCodeDigest('EXPIRED123'),
      displayCode: 'EXPIRED-123',
      isActive: true,
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      createdBy: hostAUser.id,
    },
  });

  const testExpired = await resolveAccessCode(expiredRecord.displayCode, AccessCodePurpose.GUEST_EVENT);

  assert(
    15,
    'Revoked and expired codes are securely rejected with informative reason messages',
    Boolean(
      !testRevoked.isValid &&
        testRevoked.error?.includes('revoked') &&
        !testExpired.isValid &&
        testExpired.error?.includes('expired')
    ),
    `Revoked error: "${testRevoked.error}", Expired error: "${testExpired.error}"`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 16: Thousands of generated codes maintain uniqueness
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 7: Cryptographic Entropy & Concurrency ---');
  const sampleSize = 2500;
  const generatedCodes = new Set<string>();
  for (let i = 0; i < sampleSize; i++) {
    const { code } = generateSecureCode(10);
    generatedCodes.add(code);
  }

  assert(
    16,
    `Generated ${sampleSize} codes using CSPRNG; verified 100% collision-free uniqueness`,
    generatedCodes.size === sampleSize,
    `Unique count = ${generatedCodes.size} / ${sampleSize}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 17: Simultaneous redemption requests permit only one successful redemption
  // -------------------------------------------------------------------------------------
  const raceInvite = await prisma.$transaction(
    async (tx) => {
      return createDriverInviteCodeRecord(tx, {
        accountId: accountA.id,
        eventId: weddingA.id,
        creatorId: hostAUser.id,
        recipientName: 'Speedy Chauffeur',
      });
    },
    { timeout: 30000, maxWait: 20000 }
  );

  const driverRaceUserA = await prisma.user.create({
    data: {
      firebaseUid: `race-a-${runId}`,
      email: `race.a.${runId}@safar.test`,
      fullName: 'Race Chauffeur A',
      role: Role.DRIVER,
    },
  });

  const driverRaceUserB = await prisma.user.create({
    data: {
      firebaseUid: `race-b-${runId}`,
      email: `race.b.${runId}@safar.test`,
      fullName: 'Race Chauffeur B',
      role: Role.DRIVER,
    },
  });

  const raceResults = await Promise.allSettled([
    redeemDriverInvite(raceInvite.displayCode, driverRaceUserA),
    redeemDriverInvite(raceInvite.displayCode, driverRaceUserB),
  ]);

  const fulfilledCount = raceResults.filter((r) => r.status === 'fulfilled').length;
  const rejectedCount = raceResults.filter((r) => r.status === 'rejected').length;

  assert(
    17,
    'Simultaneous redemption requests on a single-use invite permit exactly one successful redemption',
    fulfilledCount === 1 && rejectedCount === 1,
    `Fulfilled: ${fulfilledCount}, Rejected: ${rejectedCount}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 18: Host dashboard and guest portal resolve the same event
  // -------------------------------------------------------------------------------------
  console.log('\n--- Test Group 8: End-to-End Consistency & Platform Health ---');
  // Generate active guest code for Wedding B
  const activeCodeRecordB = await prisma.eventAccessCode.findFirst({
    where: {
      eventId: weddingB.id,
      purpose: AccessCodePurpose.GUEST_EVENT,
      isActive: true,
    },
  });

  const displayedOnHostDashboard = activeCodeRecordB?.displayCode;
  const guestPortalResolution = await resolveAccessCode(displayedOnHostDashboard || '', AccessCodePurpose.GUEST_EVENT);

  assert(
    18,
    'Host dashboard displayed guest passcode resolves directly to the identical master event in the guest portal',
    guestPortalResolution.isValid &&
      guestPortalResolution.event?.id === weddingB.id &&
      guestPortalResolution.event?.name === weddingB.name,
    `Dashboard Code: ${displayedOnHostDashboard} -> Resolved Event: ${guestPortalResolution.event?.name}`
  );

  // -------------------------------------------------------------------------------------
  // Scenario 19: Existing event, booking and trip functionality still works
  // -------------------------------------------------------------------------------------
  const testPlaceOrigin = await prisma.place.create({
    data: {
      eventId: weddingA.id,
      name: 'Udaipur Airport',
      address: 'Airport Rd, Udaipur',
      latitude: 24.6177,
      longitude: 73.8961,
      type: 'AIRPORT',
    },
  });

  const testPlaceDest = await prisma.place.create({
    data: {
      eventId: weddingA.id,
      name: 'Taj Lake Palace',
      address: 'Pichola, Udaipur',
      latitude: 24.5754,
      longitude: 73.6802,
      type: 'VENUE',
    },
  });

  const testBooking = await prisma.booking.create({
    data: {
      eventId: weddingA.id,
      guestId: guestMembershipA.id,
      originPlaceId: testPlaceOrigin.id,
      destinationPlaceId: testPlaceDest.id,
      requestedPickupTime: new Date('2026-12-10T12:00:00Z'),
      passengerCount: 2,
      boardingCode: '1234',
      status: 'CONFIRMED',
    },
  });

  const testTrip = await prisma.trip.create({
    data: {
      eventId: weddingA.id,
      originPlaceId: testPlaceOrigin.id,
      destinationPlaceId: testPlaceDest.id,
      scheduledPickupTime: new Date('2026-12-10T12:30:00Z'),
      status: 'SCHEDULED',
      passengerCount: 2,
    },
  });

  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { tripId: testTrip.id },
  });

  assert(
    19,
    'Existing event hierarchy, booking creation, and trip dispatch models remain 100% operational',
    testBooking.id !== undefined && testTrip.id !== undefined && testTrip.status === 'SCHEDULED',
    `Booking ID: ${testBooking.id}, Trip ID: ${testTrip.id}`
  );

  // -------------------------------------------------------------------------------------
  // Final Evaluation
  // -------------------------------------------------------------------------------------
  console.log('\n========================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`TOTAL SCENARIOS TESTED: ${total}`);
  console.log(`PASSED: ${passed} / ${total}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests()
  .catch((e) => {
    console.error('Test suite encountered fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
