const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backup() {
  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `db-backup-${timestamp}.json`);

  console.log(`Starting non-destructive database backup to ${backupFile}...`);

  const [
    accounts,
    users,
    events,
    functions,
    guests,
    drivers,
    vehicles,
    trips,
    bookings,
    invitations,
    eventMembers,
    eventCodes,
    places,
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
  ]);

  const dump = {
    metadata: {
      timestamp: new Date().toISOString(),
      provider: 'mongodb',
      database: 'safar_db',
    },
    counts: {
      accounts: accounts.length,
      users: users.length,
      events: events.length,
      functions: functions.length,
      guests: guests.length,
      drivers: drivers.length,
      vehicles: vehicles.length,
      trips: trips.length,
      bookings: bookings.length,
    },
    data: {
      accounts,
      users,
      events,
      functions,
      guests,
      drivers,
      vehicles,
      trips,
      bookings,
      invitations,
      eventMembers,
      eventCodes,
      places,
    },
  };

  fs.writeFileSync(backupFile, JSON.stringify(dump, null, 2), 'utf8');
  console.log(`✅ Backup successfully created: ${backupFile}`);
  console.log('Record counts saved:', dump.counts);

  await prisma.$disconnect();
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});

