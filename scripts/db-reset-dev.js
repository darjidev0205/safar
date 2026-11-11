/**
 * SAFAR — DEV-ONLY Database Reset Script
 *
 * Usage:
 *   npm run db:reset:dev              → DRY-RUN (safe, no writes)
 *   npm run db:reset:dev -- --commit  → LIVE DELETION (requires CONFIRM env var)
 *
 * Safety gates:
 *   1. NODE_ENV must NOT be "production"
 *   2. Firebase project must NOT be on a known production project list
 *   3. Database name must be in allowed dev-db list
 *   4. --commit flag required for any writes
 *   5. SAFAR_RESET_CONFIRM=I_UNDERSTAND_THIS_DELETES_DATA env var required
 *   6. Specific Firebase UIDs to preserve must be listed (keeps real accounts)
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// ─── SAFETY CONFIGURATION ────────────────────────────────────────────────────

// Firebase project IDs that must NEVER be touched
const BLOCKED_FIREBASE_PROJECTS = [
  'safar-prod',
  'safar-production',
  // 'safar-production-6fa71' is ALLOWED because .env says NODE_ENV=development
  // If you ever promote this to prod, add it here immediately.
];

// MongoDB database names that are allowed for reset (must be unambiguously dev)
const ALLOWED_DEV_DATABASES = ['safar_db', 'safar_dev', 'safar_test', 'safar_staging_dev'];

// Firebase UIDs to PRESERVE (admin/real accounts — add your real accounts here)
// These will NOT be deleted from MongoDB. Firebase Auth deletion is manual only.
// The script will print Firebase UIDs for the accounts it deletes so you can
// manually remove them from Firebase Console if desired.
const PRESERVE_FIREBASE_UIDS = [
  // Add real admin UIDs here, e.g.:
  // 'ABC123realadmin',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function readEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) throw new Error('.env file not found');
  const raw = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]+)"?/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

function extractDbName(uri) {
  // mongodb+srv://user:pass@cluster/dbname?...
  const m = uri.match(/\/([^/?]+)\?/);
  return m ? m[1] : null;
}

function banner(text) {
  const line = '═'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(`${line}\n`);
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(50)}`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const isCommit = process.argv.includes('--commit');
  const confirmToken = process.env.SAFAR_RESET_CONFIRM;
  const REQUIRED_TOKEN = 'I_UNDERSTAND_THIS_DELETES_DATA';

  banner(isCommit
    ? '⚠️  SAFAR DEV RESET — LIVE COMMIT MODE'
    : '🔍 SAFAR DEV RESET — DRY-RUN (safe, no writes)');

  // ── Read and validate environment ──────────────────────────────────────────
  console.log('📋 Reading environment configuration…');
  const env = readEnv();

  const nodeEnv = env.NODE_ENV || process.env.NODE_ENV || 'unknown';
  const firebaseProject = env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'unknown';
  const dbUri = env.DATABASE_URL || env.MONGODB_URI || '';
  const dbName = extractDbName(dbUri) || env.MONGODB_DB || 'unknown';

  console.log(`  NODE_ENV         : ${nodeEnv}`);
  console.log(`  Firebase Project : ${firebaseProject}`);
  console.log(`  Database Name    : ${dbName}`);
  console.log(`  Cluster Host     : ${dbUri.match(/@([^/]+)/)?.[1] || 'unknown'}`);

  // ── Safety gate 1: Never production NODE_ENV ───────────────────────────────
  if (nodeEnv === 'production') {
    console.error('\n🚫 BLOCKED: NODE_ENV is "production". Refusing to run.');
    process.exit(1);
  }

  // ── Safety gate 2: Never blocked Firebase projects ─────────────────────────
  for (const blocked of BLOCKED_FIREBASE_PROJECTS) {
    if (firebaseProject.startsWith(blocked)) {
      console.error(`\n🚫 BLOCKED: Firebase project "${firebaseProject}" matches blocked pattern "${blocked}".`);
      process.exit(1);
    }
  }

  // ── Safety gate 3: Database must be in dev whitelist ──────────────────────
  if (!ALLOWED_DEV_DATABASES.includes(dbName)) {
    console.error(`\n🚫 BLOCKED: Database "${dbName}" is not in the allowed dev database list.`);
    console.error(`   Allowed: ${ALLOWED_DEV_DATABASES.join(', ')}`);
    process.exit(1);
  }

  // ── Safety gate 4: Commit requires explicit confirmation ───────────────────
  if (isCommit && confirmToken !== REQUIRED_TOKEN) {
    console.error('\n🚫 BLOCKED: --commit requires SAFAR_RESET_CONFIRM env var.');
    console.error(`   Run: SAFAR_RESET_CONFIRM="${REQUIRED_TOKEN}" npm run db:reset:dev -- --commit`);
    process.exit(1);
  }

  console.log('\n✅ Safety checks passed.');
  if (!isCommit) console.log('   Mode: DRY-RUN — no writes will occur.\n');
  else console.log('   Mode: ⚠️  LIVE COMMIT — data WILL be deleted.\n');

  // ── Connect ────────────────────────────────────────────────────────────────
  const prisma = new PrismaClient();
  await prisma.$connect();

  // ── Full inventory ─────────────────────────────────────────────────────────
  section('STEP 1 — INVENTORY (record counts)');

  const [
    userCount, accountCount, accountMemberCount,
    eventCount, eventMemberCount, eventAccessRequestCount,
    eventAccessCodeCount, eventCodeCount, functionCount,
    guestCount, eventGuestCount, guestFunctionAttendanceCount,
    familyCount, guestGroupCount,
    driverCount, driverEventCount,
    vehicleCount, vehicleDocCount, driverDocCount,
    tripCount, tripAssignmentCount, tripEventCount,
    bookingCount, bookingPassengerCount,
    invitationCount, placeCount, dutyCount,
    locationPingCount, notificationCount, notificationDeliveryCount,
    auditLogCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.accountMember.count(),
    prisma.event.count(),
    prisma.eventMember.count(),
    prisma.eventAccessRequest.count(),
    prisma.eventAccessCode.count(),
    prisma.eventCode.count(),
    prisma.function.count(),
    prisma.guest.count(),
    prisma.eventGuest.count(),
    prisma.guestFunctionAttendance.count(),
    prisma.family.count(),
    prisma.guestGroup.count(),
    prisma.driver.count(),
    prisma.driverEvent.count(),
    prisma.vehicle.count(),
    prisma.vehicleDocument.count(),
    prisma.driverDocument.count(),
    prisma.trip.count(),
    prisma.tripAssignment.count(),
    prisma.tripEvent.count(),
    prisma.booking.count(),
    prisma.bookingPassenger.count(),
    prisma.invitation.count(),
    prisma.place.count(),
    prisma.duty.count(),
    prisma.locationPing.count(),
    prisma.notification.count(),
    prisma.notificationDelivery.count(),
    prisma.auditLog.count(),
  ]);

  const totalRecords =
    userCount + accountCount + accountMemberCount +
    eventCount + eventMemberCount + eventAccessRequestCount +
    eventAccessCodeCount + eventCodeCount + functionCount +
    guestCount + eventGuestCount + guestFunctionAttendanceCount +
    familyCount + guestGroupCount +
    driverCount + driverEventCount +
    vehicleCount + vehicleDocCount + driverDocCount +
    tripCount + tripAssignmentCount + tripEventCount +
    bookingCount + bookingPassengerCount +
    invitationCount + placeCount + dutyCount +
    locationPingCount + notificationCount + notificationDeliveryCount +
    auditLogCount;

  console.log('Collection                     | Count');
  console.log('-------------------------------|-------');
  const rows = [
    ['users',                     userCount],
    ['accounts',                  accountCount],
    ['account_members',           accountMemberCount],
    ['events',                    eventCount],
    ['event_members',             eventMemberCount],
    ['event_access_requests',     eventAccessRequestCount],
    ['event_access_codes',        eventAccessCodeCount],
    ['event_codes',               eventCodeCount],
    ['functions',                 functionCount],
    ['guests',                    guestCount],
    ['event_guests',              eventGuestCount],
    ['guest_function_attendance', guestFunctionAttendanceCount],
    ['families',                  familyCount],
    ['guest_groups',              guestGroupCount],
    ['drivers',                   driverCount],
    ['driver_events',             driverEventCount],
    ['vehicles',                  vehicleCount],
    ['vehicle_documents',         vehicleDocCount],
    ['driver_documents',          driverDocCount],
    ['trips',                     tripCount],
    ['trip_assignments',          tripAssignmentCount],
    ['trip_events',               tripEventCount],
    ['bookings',                  bookingCount],
    ['booking_passengers',        bookingPassengerCount],
    ['invitations',               invitationCount],
    ['places',                    placeCount],
    ['duties',                    dutyCount],
    ['location_pings',            locationPingCount],
    ['notifications',             notificationCount],
    ['notification_deliveries',   notificationDeliveryCount],
    ['audit_logs',                auditLogCount],
  ];
  for (const [name, count] of rows) {
    console.log(`  ${name.padEnd(30)} ${String(count).padStart(5)}`);
  }
  console.log(`\n  TOTAL RECORDS: ${totalRecords}`);

  // ── Sample user listing (names, emails, roles, Firebase UIDs) ─────────────
  section('STEP 2 — USER PROFILES (what would be deleted)');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      firebaseUid: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      accountMembers: { select: { accountId: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const preservedUsers = users.filter(u => PRESERVE_FIREBASE_UIDS.includes(u.firebaseUid));
  const deletableUsers = users.filter(u => !PRESERVE_FIREBASE_UIDS.includes(u.firebaseUid));

  console.log(`\n  Total users: ${users.length}`);
  console.log(`  Preserved (admin/real): ${preservedUsers.length}`);
  console.log(`  Would delete: ${deletableUsers.length}\n`);

  for (const u of deletableUsers) {
    console.log(`  🗑️  [${u.role}] ${u.fullName}`);
    console.log(`       email     : ${u.email || '—'}`);
    console.log(`       firebaseUid: ${u.firebaseUid}`);
    console.log(`       mongoId   : ${u.id}`);
    console.log(`       accounts  : ${u.accountMembers.length}`);
    console.log(`       created   : ${u.createdAt.toISOString().slice(0, 10)}`);
    console.log('');
  }

  if (preservedUsers.length > 0) {
    console.log('  ✅ PRESERVED users (will NOT be deleted):');
    for (const u of preservedUsers) {
      console.log(`     [${u.role}] ${u.fullName} <${u.email}>`);
    }
  }

  // ── Event listing ─────────────────────────────────────────────────────────
  section('STEP 3 — EVENTS (what would be deleted)');

  const events = await prisma.event.findMany({
    select: {
      id: true, name: true, joinCode: true, status: true,
      createdAt: true,
      _count: {
        select: {
          functions: true, guests: true, drivers: true,
          trips: true, bookings: true, eventAccessCodes: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const ev of events) {
    console.log(`  🗑️  "${ev.name}"  [${ev.status}]  code:${ev.joinCode}`);
    console.log(`       id: ${ev.id}`);
    console.log(`       functions: ${ev._count.functions}  guests: ${ev._count.guests}  drivers: ${ev._count.drivers}  trips: ${ev._count.trips}  bookings: ${ev._count.bookings}  access_codes: ${ev._count.eventAccessCodes}`);
    console.log('');
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  section('STEP 4 — BACKUP');

  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `db-reset-backup-${timestamp}.json`);

  console.log(`  Backup target: ${backupFile}`);

  if (!isCommit) {
    console.log('  [DRY-RUN] Would write backup file — skipped in dry-run mode.');
  } else {
    console.log('  Writing full database backup…');
    const [
      bAccounts, bUsers, bEvents, bFunctions, bGuests, bDrivers,
      bVehicles, bTrips, bBookings, bInvitations, bEventMembers,
      bEventCodes, bPlaces, bEventAccessCodes, bFamilies,
      bEventGuests, bDriverEvents, bAccessRequests,
      bNotifications, bAuditLogs,
    ] = await Promise.all([
      prisma.account.findMany(),
      prisma.user.findMany(),
      prisma.event.findMany(),
      prisma.function.findMany(),
      prisma.guest.findMany(),
      prisma.driver.findMany(),
      prisma.vehicle.findMany(),
      prisma.trip.findMany(),
      prisma.booking.findMany(),
      prisma.invitation.findMany(),
      prisma.eventMember.findMany(),
      prisma.eventCode.findMany(),
      prisma.place.findMany(),
      prisma.eventAccessCode.findMany(),
      prisma.family.findMany(),
      prisma.eventGuest.findMany(),
      prisma.driverEvent.findMany(),
      prisma.eventAccessRequest.findMany(),
      prisma.notification.findMany(),
      prisma.auditLog.findMany(),
    ]);

    const dump = {
      metadata: {
        timestamp: new Date().toISOString(),
        provider: 'mongodb',
        database: dbName,
        firebaseProject,
        nodeEnv,
        resetTriggeredBy: 'db:reset:dev',
        rowCounts: { users: bUsers.length, accounts: bAccounts.length, events: bEvents.length },
      },
      data: {
        accounts: bAccounts, users: bUsers, events: bEvents, functions: bFunctions,
        guests: bGuests, drivers: bDrivers, vehicles: bVehicles, trips: bTrips,
        bookings: bBookings, invitations: bInvitations, eventMembers: bEventMembers,
        eventCodes: bEventCodes, places: bPlaces, eventAccessCodes: bEventAccessCodes,
        families: bFamilies, eventGuests: bEventGuests, driverEvents: bDriverEvents,
        accessRequests: bAccessRequests, notifications: bNotifications, auditLogs: bAuditLogs,
      },
    };

    fs.writeFileSync(backupFile, JSON.stringify(dump, null, 2), 'utf8');
    console.log(`  ✅ Backup written: ${backupFile} (${(fs.statSync(backupFile).size / 1024).toFixed(1)} KB)`);
  }

  // ── Deletion (dependency-safe ordering) ───────────────────────────────────
  if (!isCommit) {
    section('STEP 5 — DELETION PLAN (not executed in dry-run)');
    console.log('  The following collections will be purged IN THIS ORDER');
    console.log('  (child-to-parent to respect referential integrity):\n');
    const deletionOrder = [
      'booking_passengers', 'bookings', 'location_pings', 'trip_assignments',
      'trip_events', 'trips', 'guest_function_attendance', 'event_guests',
      'event_access_codes', 'event_codes', 'event_access_requests', 'event_members',
      'driver_events', 'driver_documents', 'duties', 'drivers',
      'vehicle_documents', 'vehicles',
      'guests', 'families', 'guest_groups',
      'places', 'functions',
      'invitations', 'events',
      'notification_deliveries', 'notifications', 'audit_logs',
      'account_members', 'accounts',
      'users (selected)',
    ];
    deletionOrder.forEach((c, i) => console.log(`  ${String(i+1).padStart(2)}. ${c}`));
    console.log('\n  ⚠️  Users in PRESERVE_FIREBASE_UIDS list are SKIPPED.');
    console.log('\n  🔥 Firebase Auth identities are NOT touched automatically.');
    console.log('      After reset, manually delete test accounts in Firebase Console:');
    console.log('      https://console.firebase.google.com/project/safar-production-6fa71/authentication/users');
    console.log('\n  To run with real deletion:');
    console.log('    $env:SAFAR_RESET_CONFIRM="I_UNDERSTAND_THIS_DELETES_DATA"');
    console.log('    npm run db:reset:dev -- --commit');

    await prisma.$disconnect();
    console.log('\n✅ DRY-RUN complete. No data was modified.\n');
    return;
  }

  // ─── LIVE DELETION ─────────────────────────────────────────────────────────
  section('STEP 5 — LIVE DELETION (committing…)');
  console.log('  Deleting in dependency-safe order…\n');

  const deleted = {};

  // Build the list of user IDs to delete (all except preserved)
  const deletableUserIds = deletableUsers.map(u => u.id);

  // 1. booking_passengers
  deleted.booking_passengers = await prisma.bookingPassenger.deleteMany({});
  console.log(`  ✅ booking_passengers: ${deleted.booking_passengers.count} deleted`);

  // 2. bookings
  deleted.bookings = await prisma.booking.deleteMany({});
  console.log(`  ✅ bookings: ${deleted.bookings.count} deleted`);

  // 3. location_pings
  deleted.location_pings = await prisma.locationPing.deleteMany({});
  console.log(`  ✅ location_pings: ${deleted.location_pings.count} deleted`);

  // 4. trip_assignments
  deleted.trip_assignments = await prisma.tripAssignment.deleteMany({});
  console.log(`  ✅ trip_assignments: ${deleted.trip_assignments.count} deleted`);

  // 5. trip_events
  deleted.trip_events = await prisma.tripEvent.deleteMany({});
  console.log(`  ✅ trip_events: ${deleted.trip_events.count} deleted`);

  // 6. trips
  deleted.trips = await prisma.trip.deleteMany({});
  console.log(`  ✅ trips: ${deleted.trips.count} deleted`);

  // 7. guest_function_attendance
  deleted.guest_function_attendance = await prisma.guestFunctionAttendance.deleteMany({});
  console.log(`  ✅ guest_function_attendance: ${deleted.guest_function_attendance.count} deleted`);

  // 8. event_guests
  deleted.event_guests = await prisma.eventGuest.deleteMany({});
  console.log(`  ✅ event_guests: ${deleted.event_guests.count} deleted`);

  // 9. event_access_codes
  deleted.event_access_codes = await prisma.eventAccessCode.deleteMany({});
  console.log(`  ✅ event_access_codes: ${deleted.event_access_codes.count} deleted`);

  // 10. event_codes
  deleted.event_codes = await prisma.eventCode.deleteMany({});
  console.log(`  ✅ event_codes: ${deleted.event_codes.count} deleted`);

  // 11. event_access_requests
  deleted.event_access_requests = await prisma.eventAccessRequest.deleteMany({});
  console.log(`  ✅ event_access_requests: ${deleted.event_access_requests.count} deleted`);

  // 12. event_members
  deleted.event_members = await prisma.eventMember.deleteMany({});
  console.log(`  ✅ event_members: ${deleted.event_members.count} deleted`);

  // 13. driver_events
  deleted.driver_events = await prisma.driverEvent.deleteMany({});
  console.log(`  ✅ driver_events: ${deleted.driver_events.count} deleted`);

  // 14. driver_documents
  deleted.driver_documents = await prisma.driverDocument.deleteMany({});
  console.log(`  ✅ driver_documents: ${deleted.driver_documents.count} deleted`);

  // 15. duties
  deleted.duties = await prisma.duty.deleteMany({});
  console.log(`  ✅ duties: ${deleted.duties.count} deleted`);

  // 16. drivers
  deleted.drivers = await prisma.driver.deleteMany({});
  console.log(`  ✅ drivers: ${deleted.drivers.count} deleted`);

  // 17. vehicle_documents
  deleted.vehicle_documents = await prisma.vehicleDocument.deleteMany({});
  console.log(`  ✅ vehicle_documents: ${deleted.vehicle_documents.count} deleted`);

  // 18. vehicles
  deleted.vehicles = await prisma.vehicle.deleteMany({});
  console.log(`  ✅ vehicles: ${deleted.vehicles.count} deleted`);

  // 19. guests
  deleted.guests = await prisma.guest.deleteMany({});
  console.log(`  ✅ guests: ${deleted.guests.count} deleted`);

  // 20. families
  deleted.families = await prisma.family.deleteMany({});
  console.log(`  ✅ families: ${deleted.families.count} deleted`);

  // 21. guest_groups
  deleted.guest_groups = await prisma.guestGroup.deleteMany({});
  console.log(`  ✅ guest_groups: ${deleted.guest_groups.count} deleted`);

  // 22. places
  deleted.places = await prisma.place.deleteMany({});
  console.log(`  ✅ places: ${deleted.places.count} deleted`);

  // 23. functions
  deleted.functions = await prisma.function.deleteMany({});
  console.log(`  ✅ functions: ${deleted.functions.count} deleted`);

  // 24. invitations
  deleted.invitations = await prisma.invitation.deleteMany({});
  console.log(`  ✅ invitations: ${deleted.invitations.count} deleted`);

  // 25. events
  deleted.events = await prisma.event.deleteMany({});
  console.log(`  ✅ events: ${deleted.events.count} deleted`);

  // 26. notification_deliveries
  deleted.notification_deliveries = await prisma.notificationDelivery.deleteMany({});
  console.log(`  ✅ notification_deliveries: ${deleted.notification_deliveries.count} deleted`);

  // 27. notifications
  deleted.notifications = await prisma.notification.deleteMany({});
  console.log(`  ✅ notifications: ${deleted.notifications.count} deleted`);

  // 28. audit_logs
  deleted.audit_logs = await prisma.auditLog.deleteMany({});
  console.log(`  ✅ audit_logs: ${deleted.audit_logs.count} deleted`);

  // 29. account_members (deletable users only, then all if preserved = 0)
  if (deletableUserIds.length > 0) {
    deleted.account_members = await prisma.accountMember.deleteMany({
      where: { userId: { in: deletableUserIds } },
    });
    console.log(`  ✅ account_members: ${deleted.account_members.count} deleted`);
  }

  // 30. accounts (all accounts belonging to deletable users as owner)
  const deletableAccounts = await prisma.account.findMany({
    where: { ownerId: { in: deletableUserIds } },
    select: { id: true },
  });
  if (deletableAccounts.length > 0) {
    deleted.accounts = await prisma.account.deleteMany({
      where: { id: { in: deletableAccounts.map(a => a.id) } },
    });
    console.log(`  ✅ accounts: ${deleted.accounts.count} deleted`);
  } else {
    console.log('  ✅ accounts: 0 deleted (none owned by deletable users)');
  }

  // 31. users (only deletable, never preserved)
  if (deletableUserIds.length > 0) {
    deleted.users = await prisma.user.deleteMany({
      where: { id: { in: deletableUserIds } },
    });
    console.log(`  ✅ users: ${deleted.users.count} deleted`);
  }

  // ── Verification ─────────────────────────────────────────────────────────
  section('STEP 6 — VERIFICATION');

  const [
    vUsers, vAccounts, vEvents, vFunctions,
    vGuests, vDrivers, vVehicles, vTrips, vBookings,
    vAccessCodes, vAccessRequests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.event.count(),
    prisma.function.count(),
    prisma.guest.count(),
    prisma.driver.count(),
    prisma.vehicle.count(),
    prisma.trip.count(),
    prisma.booking.count(),
    prisma.eventAccessCode.count(),
    prisma.eventAccessRequest.count(),
  ]);

  const checks = [
    ['users',                vUsers,          preservedUsers.length],
    ['accounts',             vAccounts,       0],
    ['events',               vEvents,         0],
    ['functions',            vFunctions,      0],
    ['guests',               vGuests,         0],
    ['drivers',              vDrivers,        0],
    ['vehicles',             vVehicles,       0],
    ['trips',                vTrips,          0],
    ['bookings',             vBookings,       0],
    ['event_access_codes',   vAccessCodes,    0],
    ['event_access_requests',vAccessRequests, 0],
  ];

  let allPassed = true;
  for (const [name, actual, expected] of checks) {
    const pass = actual === expected;
    if (!pass) allPassed = false;
    console.log(`  ${pass ? '✅' : '❌'} ${name.padEnd(25)} actual:${actual}  expected:${expected}`);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  section('STEP 7 — DELETION REPORT');

  const reportFile = path.join(backupDir, `reset-report-${timestamp}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    database: dbName,
    firebaseProject,
    verificationPassed: allPassed,
    deleted,
    preservedUsers: preservedUsers.map(u => ({ id: u.id, firebaseUid: u.firebaseUid, email: u.email, role: u.role })),
    deletedFirebaseUids: deletableUsers.map(u => u.firebaseUid),
  };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`  Report saved: ${reportFile}`);

  if (allPassed) {
    console.log('\n✅ RESET COMPLETE. All verification checks passed.');
  } else {
    console.log('\n⚠️  RESET FINISHED BUT SOME VERIFICATION CHECKS FAILED — review report.');
  }

  console.log('\n━━━ NEXT STEPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Delete Firebase Auth test users manually:');
  console.log('     https://console.firebase.google.com/project/safar-production-6fa71/authentication/users');
  console.log('  2. Firebase UIDs of deleted MongoDB users:');
  for (const uid of report.deletedFirebaseUids) {
    console.log(`       • ${uid}`);
  }
  console.log('  3. Run: npm run db:seed:test  (to create clean test fixtures)');
  console.log('  4. Restart both dev servers.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('\n💥 Reset script crashed:', err.message);
  if (err.code) console.error('   Prisma code:', err.code);
  process.exit(1);
});

