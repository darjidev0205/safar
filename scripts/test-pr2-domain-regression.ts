import { PrismaClient, Role, TripStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

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

async function runPR2RegressionSuite() {
  console.log(`=======================================================`);
  console.log(`  SAFAR PR 2 DOMAIN & MULTI-FUNCTION REGRESSION SUITE  `);
  console.log(`=======================================================\n`);

  const testAccountSlug = `test-org-pr2-${Date.now()}`;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create Host A, Account A, and Guest A
    // ------------------------------------------------------------------------
    console.log(`--- SECTION 1: Tenant & Canonical Wedding Setup ---`);

    const hostA = await prisma.user.create({
      data: {
        firebaseUid: `uid-host-a-${Date.now()}`,
        email: `host-a-${Date.now()}@test.com`,
        fullName: 'Rajesh Kapoor (Host)',
        role: Role.ACCOUNT_OWNER,
      },
    });

    const accountA = await prisma.account.create({
      data: {
        name: 'Kapoor Family Organization',
        slug: testAccountSlug,
        ownerId: hostA.id,
        members: {
          create: {
            userId: hostA.id,
            role: Role.ACCOUNT_OWNER,
          },
        },
      },
    });

    const guestAUser = await prisma.user.create({
      data: {
        firebaseUid: `uid-guest-a-${Date.now()}`,
        email: `guest-a-${Date.now()}@test.com`,
        fullName: 'Aman Varma (Guest)',
        role: Role.GUEST,
      },
    });

    // Host B & Account B (for cross-tenant tests)
    const hostB = await prisma.user.create({
      data: {
        firebaseUid: `uid-host-b-${Date.now()}`,
        email: `host-b-${Date.now()}@test.com`,
        fullName: 'Vikram Mehta (Tenant B)',
        role: Role.ACCOUNT_OWNER,
      },
    });

    const accountB = await prisma.account.create({
      data: {
        name: 'Mehta Family Organization',
        slug: `test-org-b-${Date.now()}`,
        ownerId: hostB.id,
        members: {
          create: {
            userId: hostB.id,
            role: Role.ACCOUNT_OWNER,
          },
        },
      },
    });

    // ------------------------------------------------------------------------
    // TEST 1: Canonical Wedding Event with 5 Functions
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 2: 1 Wedding Event with 5 Functions ---`);

    const primaryJoinCode = `KPR${crypto.randomInt(100, 999)}`;
    const legacyCeremonyCode = `SNG${crypto.randomInt(100, 999)}`;

    const weddingEvent = await prisma.event.create({
      data: {
        accountId: accountA.id,
        creatorId: hostA.id,
        name: 'Kapoor & Sharma Grand Wedding',
        city: 'Udaipur',
        startDate: new Date('2026-12-10T09:00:00Z'),
        endDate: new Date('2026-12-13T23:00:00Z'),
        joinCode: primaryJoinCode,
        status: 'ACTIVE',
        eventCodes: {
          create: {
            code: legacyCeremonyCode,
            isActive: true,
          },
        },
      },
    });

    assert(Boolean(weddingEvent.id), 'Master Wedding Event created successfully');
    assert(weddingEvent.joinCode === primaryJoinCode, `Master Event has primary joinCode ${primaryJoinCode}`);

    // Create 5 ceremonies under this one wedding event
    const ceremoniesData = [
      { name: 'Mehndi & Welcome High Tea', type: 'MEHNDI', start: '2026-12-10T14:00:00Z', end: '2026-12-10T18:00:00Z', venue: 'Lake Garden' },
      { name: 'Sangeet & Musical Night', type: 'SANGEET', start: '2026-12-10T19:30:00Z', end: '2026-12-11T00:30:00Z', venue: 'Royal Ballroom' },
      { name: 'Haldi & Phoolon Ki Holi', type: 'HALDI', start: '2026-12-11T10:00:00Z', end: '2026-12-11T13:00:00Z', venue: 'Courtyard Pool' },
      { name: 'Varmala & Wedding Pheras', type: 'WEDDING', start: '2026-12-11T17:00:00Z', end: '2026-12-11T22:00:00Z', venue: 'Mandap Deck' },
      { name: 'Grand Gala Reception', type: 'RECEPTION', start: '2026-12-12T19:00:00Z', end: '2026-12-13T01:00:00Z', venue: 'Palace Lawns' },
    ];

    const createdFunctions: any[] = [];
    for (const c of ceremoniesData) {
      const fn = await prisma.function.create({
        data: {
          eventId: weddingEvent.id,
          name: c.name,
          type: c.type,
          startTime: new Date(c.start),
          endTime: new Date(c.end),
          venueName: c.venue,
          venueAddress: `${c.venue}, Udaipur Palace`,
          status: 'ACTIVE',
        },
      });
      createdFunctions.push(fn);
    }

    assert(createdFunctions.length === 5, 'Exactly 5 ceremonies created under 1 Wedding Event');

    const masterWithFunctions = await prisma.event.findUnique({
      where: { id: weddingEvent.id },
      include: { functions: { orderBy: { startTime: 'asc' } } },
    });

    assert(masterWithFunctions?.functions.length === 5, 'Master Event query returns all 5 functions');
    assert(masterWithFunctions?.functions[0].type === 'MEHNDI', 'First function ordered chronologically is Mehndi');
    assert(masterWithFunctions?.functions[4].type === 'RECEPTION', 'Last function ordered chronologically is Reception');

    // ------------------------------------------------------------------------
    // TEST 2: Join Code Resolution (Primary & Legacy Code)
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 3: Code Resolution (Primary vs Legacy EventCode) ---`);

    // Lookup via primary join code
    const primaryLookup = await prisma.event.findFirst({
      where: {
        OR: [
          { joinCode: primaryJoinCode },
          { eventCodes: { some: { code: primaryJoinCode, isActive: true } } },
        ],
      },
      include: { functions: true },
    });
    assert(primaryLookup?.id === weddingEvent.id, 'Primary joinCode resolves to master wedding event');
    assert(primaryLookup?.functions.length === 5, 'Primary lookup returns all 5 ceremonial functions');

    // Lookup via legacy ceremony code from eventCodes
    const legacyLookup = await prisma.event.findFirst({
      where: {
        OR: [
          { joinCode: legacyCeremonyCode },
          { eventCodes: { some: { code: legacyCeremonyCode, isActive: true } } },
        ],
      },
      include: { functions: true },
    });
    assert(legacyLookup?.id === weddingEvent.id, 'Legacy ceremony joinCode resolves to master wedding event');
    assert(legacyLookup?.functions.length === 5, 'Legacy lookup returns all 5 ceremonial functions');

    // ------------------------------------------------------------------------
    // TEST 3: Scoped Invitations & Public Resolution
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 4: Scoped Invitations & Token Resolution ---`);

    const guestA = await prisma.guest.create({
      data: {
        accountId: accountA.id,
        eventId: weddingEvent.id,
        userId: guestAUser.id,
        fullName: 'Aman Varma',
        email: guestAUser.email,
        phoneNumber: `+9198765${crypto.randomInt(10000, 99999)}`,
      },
    });

    const inviteToken = crypto.randomBytes(24).toString('hex');
    const invitation = await prisma.invitation.create({
      data: {
        accountId: accountA.id,
        eventId: weddingEvent.id,
        guestId: guestA.id,
        email: guestA.email,
        role: Role.GUEST,
        token: inviteToken,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    assert(Boolean(invitation.id), 'Invitation created with cryptographic token');

    // Resolve invitation
    const resolved = await prisma.invitation.findUnique({
      where: { token: inviteToken },
      include: {
        event: {
          include: { functions: true },
        },
        guest: true,
      },
    });

    assert(resolved !== null, 'Invitation resolved successfully by token');
    assert(resolved?.event?.id === weddingEvent.id, 'Resolved invitation links to master wedding event');
    assert(resolved?.event?.functions.length === 5, 'Resolved invitation exposes ceremonial itinerary');
    assert(resolved?.guest?.id === guestA.id, 'Resolved invitation links to guest record');

    // ------------------------------------------------------------------------
    // TEST 4: Per-Function Guest Attendance & RSVP
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 5: Multi-Function RSVP Attendance ---`);

    const mehndiFn = createdFunctions.find((f) => f.type === 'MEHNDI');
    const sangeetFn = createdFunctions.find((f) => f.type === 'SANGEET');
    const haldiFn = createdFunctions.find((f) => f.type === 'HALDI');

    // Guest RSVPs YES to Mehndi & Sangeet, NO to Haldi
    await prisma.guestFunctionAttendance.create({
      data: {
        guestId: guestA.id,
        functionId: mehndiFn.id,
        isAttending: true,
        status: 'CONFIRMED',
        notes: 'Vegetarian meal requested',
      },
    });

    await prisma.guestFunctionAttendance.create({
      data: {
        guestId: guestA.id,
        functionId: sangeetFn.id,
        isAttending: true,
        status: 'CONFIRMED',
      },
    });

    await prisma.guestFunctionAttendance.create({
      data: {
        guestId: guestA.id,
        functionId: haldiFn.id,
        isAttending: false,
        status: 'DECLINED',
        notes: 'Arriving later in the afternoon',
      },
    });

    // Query guest's attendance
    const attendances = await prisma.guestFunctionAttendance.findMany({
      where: { guestId: guestA.id },
      include: { function: true },
    });

    assert(attendances.length === 3, 'Guest has 3 function attendance records');
    const mehndiAtt = attendances.find((a) => a.functionId === mehndiFn.id);
    const haldiAtt = attendances.find((a) => a.functionId === haldiFn.id);

    assert(mehndiAtt?.isAttending === true, 'Guest attending Mehndi');
    assert(haldiAtt?.isAttending === false, 'Guest declined Haldi');
    assert(mehndiAtt?.notes === 'Vegetarian meal requested', 'Attendance notes preserved');

    // ------------------------------------------------------------------------
    // TEST 5: Trip Mapping & Function Filtering
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 6: Multi-Function Trip Manifests ---`);

    const sangeetTrip = await prisma.trip.create({
      data: {
        eventId: weddingEvent.id,
        functionId: sangeetFn.id,
        guestId: guestA.id,
        pickupLocation: 'Trident Udaipur',
        destination: 'Royal Ballroom, Udaipur Palace',
        scheduledPickupTime: new Date('2026-12-10T19:00:00Z'),
        passengerCount: 2,
        status: TripStatus.SCHEDULED,
      },
    });

    const mehndiTrip = await prisma.trip.create({
      data: {
        eventId: weddingEvent.id,
        functionId: mehndiFn.id,
        guestId: guestA.id,
        pickupLocation: 'Udaipur Airport',
        destination: 'Lake Garden, Udaipur Palace',
        scheduledPickupTime: new Date('2026-12-10T13:00:00Z'),
        passengerCount: 2,
        status: TripStatus.SCHEDULED,
      },
    });

    assert(Boolean(sangeetTrip.id), 'Sangeet Trip created and assigned to Sangeet Function');
    assert(Boolean(mehndiTrip.id), 'Mehndi Trip created and assigned to Mehndi Function');

    // Filter trips by functionId
    const sangeetTripsOnly = await prisma.trip.findMany({
      where: { eventId: weddingEvent.id, functionId: sangeetFn.id },
    });
    assert(sangeetTripsOnly.length === 1, 'Filtering by Sangeet function returns exactly 1 trip');
    assert(sangeetTripsOnly[0].id === sangeetTrip.id, 'Returned trip matches sangeetTrip ID');

    // Active trip deletion safety check
    await prisma.trip.update({
      where: { id: sangeetTrip.id },
      data: { status: TripStatus.IN_TRANSIT },
    });

    const activeTripsOnSangeet = await prisma.trip.count({
      where: {
        functionId: sangeetFn.id,
        status: { in: [TripStatus.EN_ROUTE_TO_PICKUP, TripStatus.ARRIVED, TripStatus.BOARDING, TripStatus.IN_TRANSIT] },
      },
    });

    assert(activeTripsOnSangeet === 1, 'Active trip correctly detected on Sangeet function');

    await prisma.trip.update({
      where: { id: sangeetTrip.id },
      data: { status: TripStatus.COMPLETED },
    });

    // ------------------------------------------------------------------------
    // TEST 6: Tenant Isolation (TenantGuard Simulation)
    // ------------------------------------------------------------------------
    console.log(`\n--- SECTION 7: Multi-Tenant Event & Stats Isolation ---`);

    // Host A querying weddingEvent: is account member
    const eventForHostA = await prisma.event.findFirst({
      where: {
        id: weddingEvent.id,
        OR: [
          { creatorId: hostA.id },
          { account: { members: { some: { userId: hostA.id } } } },
          { eventMembers: { some: { userId: hostA.id } } },
        ],
      },
    });
    assert(eventForHostA !== null, 'Host A authorized to view Kapoor Wedding');

    // Host B querying weddingEvent: NOT account member, NOT event member
    const eventForHostB = await prisma.event.findFirst({
      where: {
        id: weddingEvent.id,
        OR: [
          { creatorId: hostB.id },
          { account: { members: { some: { userId: hostB.id } } } },
          { eventMembers: { some: { userId: hostB.id } } },
        ],
      },
    });
    assert(eventForHostB === null, 'Host B rejected from accessing Host A event (TenantGuard isolation)');

    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
    console.log(`\n--- Cleanup Test Artifacts ---`);
    await prisma.trip.deleteMany({ where: { eventId: weddingEvent.id } });
    await prisma.guestFunctionAttendance.deleteMany({ where: { guestId: guestA.id } });
    await prisma.invitation.deleteMany({ where: { eventId: weddingEvent.id } });
    await prisma.guest.deleteMany({ where: { eventId: weddingEvent.id } });
    await prisma.function.deleteMany({ where: { eventId: weddingEvent.id } });
    await prisma.eventCode.deleteMany({ where: { eventId: weddingEvent.id } });
    await prisma.event.delete({ where: { id: weddingEvent.id } });
    await prisma.accountMember.deleteMany({ where: { accountId: { in: [accountA.id, accountB.id] } } });
    await prisma.account.deleteMany({ where: { id: { in: [accountA.id, accountB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [hostA.id, hostB.id, guestAUser.id] } } });

    console.log(`\n=======================================================`);
    console.log(`  PR 2 REGRESSION SUITE RESULTS`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`=======================================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during PR 2 regression suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPR2RegressionSuite();
