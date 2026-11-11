import { PrismaClient, AccessCodeRole, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function generateCode(role: 'GUEST' | 'DRIVER'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return role === 'DRIVER' ? `DRV-${rand}` : `GST-${rand}`;
}

async function auditAndFix() {
  const isFix = process.argv.includes('--fix') || process.argv.includes('--commit');
  console.log('=======================================================');
  console.log(`  SAFAR DATA AUDIT & CANONICALIZATION (${isFix ? 'FIX MODE' : 'AUDIT / DRY-RUN'})`);
  console.log('=======================================================\n');

  const events = await prisma.event.findMany({
    include: {
      functions: true,
      accessCodes: true,
      account: { select: { id: true, name: true } },
    },
  });

  console.log(`Found ${events.length} total event records in database.\n`);

  let orphanCount = 0;
  let missingCodesCount = 0;
  let synchedCodesCount = 0;

  for (const event of events) {
    console.log(`--- Event: "${event.name}" (${event.id}) ---`);
    console.log(`    Account: ${event.account?.name || 'N/A'} (${event.accountId})`);
    console.log(`    Status: ${event.status}, parentEventId: ${event.parentEventId || 'none'}`);
    console.log(`    Functions: ${event.functions.length}`);
    console.log(`    Guest Code: ${event.guestAccessCode || event.joinCode || 'MISSING'}`);
    console.log(`    Driver Code: ${event.driverAccessCode || 'MISSING'}`);

    if (event.parentEventId) {
      orphanCount++;
      console.log(`    ⚠️  Child event marked with parentEventId: ${event.parentEventId}`);
    }

    const effectiveGuestCode = (event.guestAccessCode || event.joinCode || generateCode('GUEST')).toUpperCase().trim();
    const effectiveDriverCode = (event.driverAccessCode || generateCode('DRIVER')).toUpperCase().trim();

    // Check if EventAccessCode has both GUEST and DRIVER entries
    const guestAccessEntry = event.accessCodes.find(
      (ac) => ac.role === AccessCodeRole.GUEST && ac.isActive
    );
    const driverAccessEntry = event.accessCodes.find(
      (ac) => ac.role === AccessCodeRole.DRIVER && ac.isActive
    );

    const needsGuestSync = !guestAccessEntry || guestAccessEntry.code !== effectiveGuestCode;
    const needsDriverSync = !driverAccessEntry || driverAccessEntry.code !== effectiveDriverCode;
    const needsEventUpdate =
      event.guestAccessCode !== effectiveGuestCode ||
      event.driverAccessCode !== effectiveDriverCode;

    if (needsGuestSync || needsDriverSync || needsEventUpdate) {
      missingCodesCount++;
      console.log(`    -> Missing or unsynced access code registry records.`);

      if (isFix) {
        // Update Event table
        await prisma.event.update({
          where: { id: event.id },
          data: {
            guestAccessCode: effectiveGuestCode,
            driverAccessCode: effectiveDriverCode,
            joinCode: effectiveGuestCode,
          },
        });

        // Ensure Guest EventAccessCode record
        if (!guestAccessEntry) {
          await prisma.eventAccessCode.create({
            data: {
              accountId: event.accountId,
              eventId: event.id,
              code: effectiveGuestCode,
              displayCode: effectiveGuestCode,
              role: AccessCodeRole.GUEST,
              isActive: true,
            },
          });
        } else if (guestAccessEntry.code !== effectiveGuestCode) {
          await prisma.eventAccessCode.update({
            where: { id: guestAccessEntry.id },
            data: {
              code: effectiveGuestCode,
              displayCode: effectiveGuestCode,
              isActive: true,
            },
          });
        }

        // Ensure Driver EventAccessCode record
        if (!driverAccessEntry) {
          await prisma.eventAccessCode.create({
            data: {
              accountId: event.accountId,
              eventId: event.id,
              code: effectiveDriverCode,
              displayCode: effectiveDriverCode,
              role: AccessCodeRole.DRIVER,
              isActive: true,
            },
          });
        } else if (driverAccessEntry.code !== effectiveDriverCode) {
          await prisma.eventAccessCode.update({
            where: { id: driverAccessEntry.id },
            data: {
              code: effectiveDriverCode,
              displayCode: effectiveDriverCode,
              isActive: true,
            },
          });
        }

        synchedCodesCount++;
        console.log(`    ✅ Synchronized GUEST (${effectiveGuestCode}) & DRIVER (${effectiveDriverCode}) codes.`);
      }
    } else {
      console.log(`    ✅ Codes verified and synced in EventAccessCode.`);
    }
    console.log('');
  }

  console.log('=======================================================');
  console.log(`  AUDIT SUMMARY`);
  console.log('=======================================================');
  console.log(`Total Events:              ${events.length}`);
  console.log(`Child/Orphan Events:       ${orphanCount}`);
  console.log(`Events Needing Sync:       ${missingCodesCount}`);
  if (isFix) {
    console.log(`Events Successfully Fixed: ${synchedCodesCount}`);
  } else {
    console.log(`(Run with --fix to apply repairs automatically)`);
  }
}

auditAndFix()
  .catch((err) => {
    console.error('Audit failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

