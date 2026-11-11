/**
 * SAFAR — DEV Test Fixture Seeder
 *
 * Usage:  npm run db:seed:test
 *
 * Creates a minimal, clearly-identified test dataset:
 *   - 1 Host account   (TEST_HOST)
 *   - 1 Driver account (TEST_DRIVER)
 *   - 2 Guest accounts (TEST_GUEST_1, TEST_GUEST_2)
 *   - 1 Event          "TEST — Sharma Wedding [DO NOT USE IN PROD]"
 *   - 2 Functions      (Mehndi, Pheras)
 *   - 1 Vehicle        (plate: TEST-0001)
 *   - Guest access code for the event
 *   - Driver invite code for the event
 *
 * All test records carry the prefix "TEST_" or "[TEST]" for easy identification.
 * They use fixed, predictable Firebase UIDs (test-uid-host-001 etc.) that you
 * register in Firebase Emulator or as test users in Firebase Auth.
 *
 * Re-running is idempotent — skips if TEST_ records already exist.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CODE_HMAC_KEY = process.env.ACCESS_CODE_HMAC_KEY || 'dev-test-hmac-key-change-in-prod';
const TEST_MARKER = '[TEST]';

const TEST_USERS = [
  {
    firebaseUid: 'test-uid-host-001',
    email: 'test.host@safar.dev',
    fullName: `${TEST_MARKER} Host — Ramesh Sharma`,
    role: 'ACCOUNT_OWNER',
    tag: 'HOST',
  },
  {
    firebaseUid: 'test-uid-driver-001',
    email: 'test.driver@safar.dev',
    fullName: `${TEST_MARKER} Driver — Suresh Patel`,
    role: 'DRIVER',
    tag: 'DRIVER',
  },
  {
    firebaseUid: 'test-uid-guest-001',
    email: 'test.guest1@safar.dev',
    fullName: `${TEST_MARKER} Guest — Meena Shah`,
    role: 'GUEST',
    tag: 'GUEST_1',
  },
  {
    firebaseUid: 'test-uid-guest-002',
    email: 'test.guest2@safar.dev',
    fullName: `${TEST_MARKER} Guest — Priya Joshi`,
    role: 'GUEST',
    tag: 'GUEST_2',
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateCode(length = 10) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRTUVWXYZ';
  let result = '';
  const bytes = crypto.randomBytes(length * 2);
  for (let i = 0; i < bytes.length && result.length < length; i++) {
    const idx = bytes[i] % alphabet.length;
    if (bytes[i] < Math.floor(256 / alphabet.length) * alphabet.length) {
      result += alphabet[idx];
    }
  }
  return result.padEnd(length, alphabet[0]);
}

function computeCodeDigest(code) {
  return crypto.createHmac('sha256', CODE_HMAC_KEY).update(code.toUpperCase()).digest('hex');
}

function formatDisplayCode(code) {
  return code.slice(0, 5) + '-' + code.slice(5);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  SAFAR — DEV TEST FIXTURE SEEDER (idempotent)');
  console.log('══════════════════════════════════════════════════════\n');

  await prisma.$connect();

  // ── Check for existing test data ─────────────────────────────────────────
  const existingHost = await prisma.user.findUnique({
    where: { firebaseUid: 'test-uid-host-001' },
  });

  if (existingHost) {
    console.log('⚠️  Test fixtures already exist (test-uid-host-001 found). Skipping seed.');
    console.log('   Run npm run db:reset:dev -- --commit first to start fresh.\n');
    await prisma.$disconnect();
    return;
  }

  const created = { users: [], account: null, event: null, functions: [], vehicle: null, guests: [] };

  // ── Create test users ─────────────────────────────────────────────────────
  console.log('Creating test users…');
  const userMap = {};
  for (const u of TEST_USERS) {
    const user = await prisma.user.create({
      data: {
        firebaseUid: u.firebaseUid,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
      },
    });
    userMap[u.tag] = user;
    created.users.push(user);
    console.log(`  ✅ ${u.role.padEnd(15)} ${u.fullName}  (${u.firebaseUid})`);
  }

  // ── Create host account ───────────────────────────────────────────────────
  console.log('\nCreating host account…');
  const account = await prisma.account.create({
    data: {
      name: `${TEST_MARKER} Sharma Family Account`,
      slug: `test-sharma-${Date.now()}`,
      ownerId: userMap['HOST'].id,
      members: {
        create: { userId: userMap['HOST'].id, role: 'ACCOUNT_OWNER' },
      },
    },
  });
  created.account = account;
  console.log(`  ✅ Account: "${account.name}"  (id: ${account.id})`);

  // ── Create event ──────────────────────────────────────────────────────────
  console.log('\nCreating test event…');
  const eventJoinCode = generateCode(6).slice(0, 6);
  const event = await prisma.event.create({
    data: {
      accountId: account.id,
      creatorId: userMap['HOST'].id,
      name: `${TEST_MARKER} Sharma Wedding — Dev Test`,
      city: 'Ahmedabad',
      startDate: new Date('2027-02-14T10:00:00Z'),
      endDate: new Date('2027-02-16T22:00:00Z'),
      venueName: 'TEST Venue Hall',
      venueAddress: '123 Test Lane, Ahmedabad',
      expectedGuestCount: 50,
      joinCode: eventJoinCode,
      status: 'UPCOMING',
      description: `${TEST_MARKER} This is a dev-only test event. Safe to delete.`,
    },
  });
  created.event = event;
  console.log(`  ✅ Event: "${event.name}"  joinCode: ${eventJoinCode}  (id: ${event.id})`);

  // ── Create event member (host) ────────────────────────────────────────────
  await prisma.eventMember.create({
    data: { eventId: event.id, userId: userMap['HOST'].id, role: 'ACCOUNT_OWNER' },
  });

  // ── Create functions ──────────────────────────────────────────────────────
  console.log('\nCreating functions (ceremony sessions)…');
  const fnMehndi = await prisma.function.create({
    data: {
      eventId: event.id,
      name: `${TEST_MARKER} Mehndi`,
      type: 'MEHNDI',
      startTime: new Date('2027-02-14T14:00:00Z'),
      endTime: new Date('2027-02-14T22:00:00Z'),
      venueName: 'TEST Venue Hall — Garden',
      status: 'ACTIVE',
    },
  });
  const fnPheras = await prisma.function.create({
    data: {
      eventId: event.id,
      name: `${TEST_MARKER} Pheras (Wedding Ceremony)`,
      type: 'WEDDING',
      startTime: new Date('2027-02-15T08:00:00Z'),
      endTime: new Date('2027-02-15T14:00:00Z'),
      venueName: 'TEST Venue Hall — Mandap',
      status: 'ACTIVE',
    },
  });
  created.functions = [fnMehndi, fnPheras];
  console.log(`  ✅ Function: "${fnMehndi.name}"`);
  console.log(`  ✅ Function: "${fnPheras.name}"`);

  // ── Create vehicle ────────────────────────────────────────────────────────
  console.log('\nCreating test vehicle…');
  const vehicle = await prisma.vehicle.create({
    data: {
      accountId: account.id,
      model: `${TEST_MARKER} Toyota Innova`,
      plateNumber: 'TEST-0001',
      category: 'SUV',
      capacity: 7,
      isActive: true,
    },
  });
  created.vehicle = vehicle;
  console.log(`  ✅ Vehicle: ${vehicle.model}  plate: ${vehicle.plateNumber}`);

  // ── Create guest access code ──────────────────────────────────────────────
  console.log('\nCreating access codes…');
  const guestCode = generateCode(10);
  const guestCodeDigest = computeCodeDigest(guestCode);
  const guestAccessCode = await prisma.eventAccessCode.create({
    data: {
      accountId: account.id,
      eventId: event.id,
      purpose: 'GUEST_EVENT',
      code: guestCode,
      codeDigest: guestCodeDigest,
      displayCode: formatDisplayCode(guestCode),
      isActive: true,
      isSingleUse: false,
      createdBy: userMap['HOST'].id,
    },
  });
  console.log(`  ✅ Guest Event Code : ${guestAccessCode.displayCode}`);
  console.log(`     (raw: ${guestCode})`);

  // ── Create driver invite code ─────────────────────────────────────────────
  const driverCode = generateCode(10);
  const driverCodeDigest = computeCodeDigest(driverCode);
  const driverAccessCode = await prisma.eventAccessCode.create({
    data: {
      accountId: account.id,
      eventId: event.id,
      purpose: 'DRIVER_INVITE',
      code: driverCode,
      codeDigest: driverCodeDigest,
      displayCode: formatDisplayCode(driverCode),
      isActive: true,
      isSingleUse: true,
      recipientName: `${TEST_MARKER} Suresh Patel`,
      recipientEmail: 'test.driver@safar.dev',
      createdBy: userMap['HOST'].id,
    },
  });
  console.log(`  ✅ Driver Invite Code: ${driverAccessCode.displayCode}`);
  console.log(`     (raw: ${driverCode})`);

  // ── Create guest profiles ─────────────────────────────────────────────────
  console.log('\nCreating guest profiles…');
  for (const tag of ['GUEST_1', 'GUEST_2']) {
    const u = userMap[tag];
    const guest = await prisma.guest.create({
      data: {
        eventId: event.id,
        accountId: account.id,
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        memberCount: 2,
        status: 'CONFIRMED',
        notes: `${TEST_MARKER} Auto-seeded test guest`,
      },
    });
    created.guests.push(guest);
    console.log(`  ✅ Guest: "${guest.fullName}"`);

    // Link as event member
    await prisma.eventMember.create({
      data: { eventId: event.id, userId: u.id, role: 'GUEST' },
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  TEST FIXTURE SUMMARY');
  console.log('══════════════════════════════════════════════════════');
  console.log('');
  console.log('  ACCOUNTS');
  console.log(`    Host    : test.host@safar.dev  (uid: test-uid-host-001)`);
  console.log(`    Driver  : test.driver@safar.dev  (uid: test-uid-driver-001)`);
  console.log(`    Guest 1 : test.guest1@safar.dev  (uid: test-uid-guest-001)`);
  console.log(`    Guest 2 : test.guest2@safar.dev  (uid: test-uid-guest-002)`);
  console.log('');
  console.log('  EVENT');
  console.log(`    Name    : ${event.name}`);
  console.log(`    joinCode: ${eventJoinCode}`);
  console.log(`    ID      : ${event.id}`);
  console.log('');
  console.log('  ACCESS CODES');
  console.log(`    Guest  : ${guestAccessCode.displayCode}  (multi-use, permanent)`);
  console.log(`    Driver : ${driverAccessCode.displayCode}  (single-use invite)`);
  console.log('');
  console.log('  ⚠️  Firebase Auth: Register these test users in Firebase Console or Emulator:');
  for (const u of TEST_USERS) {
    console.log(`    uid: ${u.firebaseUid}  email: ${u.email}`);
  }
  console.log('');
  console.log('  TESTING PLAN:');
  console.log('    1. Login as host (test.host@safar.dev) → Host Dashboard → verify event visible');
  console.log('    2. Login as guest1 → enter guest code → verify event access');
  console.log('    3. Login as guest2 → enter same guest code → verify access (multi-use)');
  console.log('    4. Login as driver → enter driver code → verify single-use redemption');
  console.log('    5. Try driver code again → verify "already redeemed" rejection');
  console.log('    6. Try wrong code → verify error message, no data leak');
  console.log('    7. Try guest code on driver portal → verify "wrong purpose" rejection');
  console.log('══════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('\n💥 Seed script crashed:', err.message);
  process.exit(1);
});

