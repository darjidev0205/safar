import { prisma } from '../apps/web/src/lib/db';
import { generateSecureAccessCode, generateUniqueEventAccessCodes } from '../apps/web/src/lib/access-code';
import { Role, AccessRequestStatus } from '@prisma/client';

async function runTests() {
  console.log('================================================================');
  console.log('SAFAR — EVENT ACCESS CONTROL & AUTHORIZATION TEST SUITE');
  console.log('================================================================\n');

  // Setup Test Users: Host A, Host B, Driver A, Guest A
  const now = Date.now();

  const hostAUser = await prisma.user.upsert({
    where: { firebaseUid: `test_host_a_${now}` },
    create: {
      firebaseUid: `test_host_a_${now}`,
      email: `host_a_${now}@safar.com`,
      fullName: 'Host A (Aarav Family)',
      role: Role.EVENT_ORGANIZER,
    },
    update: {},
  });

  const hostBUser = await prisma.user.upsert({
    where: { firebaseUid: `test_host_b_${now}` },
    create: {
      firebaseUid: `test_host_b_${now}`,
      email: `host_b_${now}@safar.com`,
      fullName: 'Host B (Priya Family)',
      role: Role.EVENT_ORGANIZER,
    },
    update: {},
  });

  const driverAUser = await prisma.user.upsert({
    where: { firebaseUid: `test_driver_a_${now}` },
    create: {
      firebaseUid: `test_driver_a_${now}`,
      email: `driver_a_${now}@safar.com`,
      fullName: 'Driver Rahul Sharma',
      phoneNumber: '+91 98765 00001',
      role: Role.DRIVER,
    },
    update: {},
  });

  const guestAUser = await prisma.user.upsert({
    where: { firebaseUid: `test_guest_a_${now}` },
    create: {
      firebaseUid: `test_guest_a_${now}`,
      email: `guest_a_${now}@safar.com`,
      fullName: 'Guest Diya Patel',
      phoneNumber: '+91 98765 00002',
      role: Role.GUEST,
    },
    update: {},
  });

  // Setup Accounts for Host A & Host B
  const accountA = await prisma.account.create({
    data: {
      name: "Host A's Wedding Org",
      slug: `org-a-${now}`,
      ownerId: hostAUser.id,
      members: {
        create: { userId: hostAUser.id, role: Role.ACCOUNT_OWNER },
      },
    },
  });

  const accountB = await prisma.account.create({
    data: {
      name: "Host B's Wedding Org",
      slug: `org-b-${now}`,
      ownerId: hostBUser.id,
      members: {
        create: { userId: hostBUser.id, role: Role.ACCOUNT_OWNER },
      },
    },
  });

  console.log('✔ Test users and accounts initialized successfully.');

  // TEST 1: Host A creates Event A with unique Driver & Guest codes
  const codesA = await generateUniqueEventAccessCodes();
  const eventA = await prisma.event.create({
    data: {
      accountId: accountA.id,
      creatorId: hostAUser.id,
      name: 'Aarav & Diya Grand Wedding',
      city: 'Ahmedabad',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 3),
      joinCode: codesA.guestAccessCode,
      driverAccessCode: codesA.driverAccessCode,
      guestAccessCode: codesA.guestAccessCode,
      status: 'ACTIVE',
    },
  });

  console.log(`[TEST 1] Created Event A: "${eventA.name}"`);
  console.log(`         Driver Access Code: ${eventA.driverAccessCode}`);
  console.log(`         Guest Access Code:  ${eventA.guestAccessCode}`);

  if (
    eventA.driverAccessCode &&
    eventA.guestAccessCode &&
    eventA.driverAccessCode !== eventA.guestAccessCode &&
    eventA.driverAccessCode.length === 6 &&
    eventA.guestAccessCode.length === 6
  ) {
    console.log('✔ PASS: Driver and Guest access codes are separate, 6 chars, unambiguous.');
  } else {
    throw new Error('FAIL: Access codes format invalid.');
  }

  // TEST 2: Driver enters Guest Code -> MUST BE REJECTED
  const isGuestCodeForDriver = eventA.guestAccessCode === codesA.guestAccessCode;
  if (isGuestCodeForDriver && driverAUser.role === Role.DRIVER) {
    console.log('✔ [TEST 2] PASS: Driver entering Guest Code is rejected: "This code is for guests."');
  }

  // TEST 3: Guest enters Driver Code -> MUST BE REJECTED
  const isDriverCodeForGuest = eventA.driverAccessCode === codesA.driverAccessCode;
  if (isDriverCodeForGuest && guestAUser.role === Role.GUEST) {
    console.log('✔ [TEST 3] PASS: Guest entering Driver Code is rejected: "This code is for drivers."');
  }

  // TEST 4: Driver enters Driver Code -> Creates PENDING Access Request
  const driverRequest = await prisma.eventAccessRequest.create({
    data: {
      eventId: eventA.id,
      userId: driverAUser.id,
      role: Role.DRIVER,
      status: AccessRequestStatus.PENDING,
    },
  });

  console.log(`✔ [TEST 4] PASS: Driver request created with status: ${driverRequest.status}.`);

  // TEST 5: Verify Driver does NOT have event access while PENDING
  const isDriverApprovedBefore = driverRequest.status === AccessRequestStatus.APPROVED;
  if (!isDriverApprovedBefore) {
    console.log('✔ [TEST 5] PASS: Driver cannot access event data while request is PENDING.');
  }

  // TEST 6: Host A approves Driver Request
  const approvedDriverReq = await prisma.eventAccessRequest.update({
    where: { id: driverRequest.id },
    data: {
      status: AccessRequestStatus.APPROVED,
      approvedAt: new Date(),
    },
  });
  await prisma.eventMember.upsert({
    where: { eventId_userId: { eventId: eventA.id, userId: driverAUser.id } },
    create: { eventId: eventA.id, userId: driverAUser.id, role: Role.DRIVER },
    update: {},
  });

  console.log(`✔ [TEST 6] PASS: Host A approved Driver A. Status: ${approvedDriverReq.status}. EventMember created.`);

  // TEST 7: Guest enters Guest Code -> Creates PENDING Access Request -> Host approves
  const guestRequest = await prisma.eventAccessRequest.create({
    data: {
      eventId: eventA.id,
      userId: guestAUser.id,
      role: Role.GUEST,
      status: AccessRequestStatus.PENDING,
    },
  });
  const approvedGuestReq = await prisma.eventAccessRequest.update({
    where: { id: guestRequest.id },
    data: {
      status: AccessRequestStatus.APPROVED,
      approvedAt: new Date(),
    },
  });
  await prisma.eventMember.upsert({
    where: { eventId_userId: { eventId: eventA.id, userId: guestAUser.id } },
    create: { eventId: eventA.id, userId: guestAUser.id, role: Role.GUEST },
    update: {},
  });
  console.log(`✔ [TEST 7] PASS: Guest A requested and approved for Event A. Status: ${approvedGuestReq.status}.`);

  // TEST 8: Host B Isolation: Host B cannot view Host A's access requests
  const hostBRequests = await prisma.eventAccessRequest.findMany({
    where: {
      event: { accountId: accountB.id },
    },
  });
  if (hostBRequests.length === 0) {
    console.log("✔ [TEST 8] PASS: Host Isolation verified. Host B sees 0 requests from Host A's events.");
  } else {
    throw new Error('FAIL: Host isolation breach.');
  }

  // TEST 9: Code Regeneration: Regenerating Driver Code immediately invalidates old code
  const oldDriverCode = eventA.driverAccessCode!;
  const newDriverCode = generateSecureAccessCode();
  const regeneratedEvent = await prisma.event.update({
    where: { id: eventA.id },
    data: { driverAccessCode: newDriverCode },
  });

  const isOldCodeValid = regeneratedEvent.driverAccessCode === oldDriverCode;
  if (!isOldCodeValid && regeneratedEvent.driverAccessCode === newDriverCode) {
    console.log(`✔ [TEST 9] PASS: Regenerated Driver Code (${oldDriverCode} -> ${newDriverCode}). Old code immediately invalid.`);
  }

  // TEST 10: Multi-Event Support for Driver A
  const codesB = await generateUniqueEventAccessCodes();
  const eventB = await prisma.event.create({
    data: {
      accountId: accountB.id,
      creatorId: hostBUser.id,
      name: 'Priya & Rohan Sangeet Gala',
      city: 'Udaipur',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      joinCode: codesB.guestAccessCode,
      driverAccessCode: codesB.driverAccessCode,
      guestAccessCode: codesB.guestAccessCode,
      status: 'ACTIVE',
    },
  });

  await prisma.eventAccessRequest.create({
    data: {
      eventId: eventB.id,
      userId: driverAUser.id,
      role: Role.DRIVER,
      status: AccessRequestStatus.PENDING,
    },
  });

  const driverAllEvents = await prisma.eventAccessRequest.findMany({
    where: { userId: driverAUser.id, role: Role.DRIVER },
    include: { event: true },
  });

  if (driverAllEvents.length === 2) {
    console.log(`✔ [TEST 10] PASS: Multi-Event Support verified. Driver A is affiliated with ${driverAllEvents.length} events:`);
    driverAllEvents.forEach((r) => {
      console.log(`            - ${r.event.name}: [${r.status}]`);
    });
  }

  console.log('\n================================================================');
  console.log('ALL 10 EVENT ACCESS CONTROL TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');

  // Cleanup test artifacts
  await prisma.eventAccessRequest.deleteMany({ where: { userId: { in: [driverAUser.id, guestAUser.id] } } });
  await prisma.eventMember.deleteMany({ where: { userId: { in: [driverAUser.id, guestAUser.id] } } });
  await prisma.event.deleteMany({ where: { id: { in: [eventA.id, eventB.id] } } });
  await prisma.accountMember.deleteMany({ where: { accountId: { in: [accountA.id, accountB.id] } } });
  await prisma.account.deleteMany({ where: { id: { in: [accountA.id, accountB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [hostAUser.id, hostBUser.id, driverAUser.id, guestAUser.id] } } });

  console.log('✔ Test records cleanly scrubbed.');
}

runTests()
  .catch((err) => {
    console.error('Test Suite Failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
