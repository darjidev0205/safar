import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ACCESS_CODE_CHARS.charAt(Math.floor(Math.random() * ACCESS_CODE_CHARS.length));
  }
  return code;
}

async function runMigration() {
  console.log('--- SAFAR ARCHITECTURAL DATA MIGRATION ---');
  console.log('Ensuring all Master Events have guestAccessCode and driverAccessCode...');

  const events = await prisma.event.findMany({
    include: {
      functions: true,
      guests: true,
      drivers: true,
      families: true,
      trips: true,
    },
  });

  console.log(`Found ${events.length} events in database.`);

  let updatedCount = 0;

  for (const event of events) {
    let needUpdate = false;
    let guestCode = event.guestAccessCode || event.joinCode;
    let driverCode = event.driverAccessCode;

    if (!guestCode) {
      guestCode = generateCode();
      needUpdate = true;
    }

    if (!driverCode) {
      driverCode = generateCode();
      needUpdate = true;
    }

    if (needUpdate || !event.guestAccessCode || !event.driverAccessCode) {
      await prisma.event.update({
        where: { id: event.id },
        data: {
          guestAccessCode: guestCode,
          driverAccessCode: driverCode,
          joinCode: guestCode,
        },
      });
      updatedCount++;
      console.log(`Updated Event "${event.name}" (${event.id}): GuestCode = ${guestCode}, DriverCode = ${driverCode}`);
    } else {
      console.log(`Event "${event.name}" (${event.id}) already compliant: GuestCode = ${event.guestAccessCode}, DriverCode = ${event.driverAccessCode}`);
    }

    console.log(`  └─ Functions: ${event.functions.length}, Guests: ${event.guests.length}, Drivers: ${event.drivers.length}, Trips: ${event.trips.length}`);
  }

  console.log(`\nMigration completed successfully. ${updatedCount} events updated.`);
}

runMigration()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
