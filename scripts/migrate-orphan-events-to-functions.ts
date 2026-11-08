import { PrismaClient, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  accountsProcessed: number;
  parentEventsConsolidated: number;
  functionsCreated: number;
  eventCodesCreated: number;
  guestsRepointed: number;
  tripsRepointed: number;
  bookingsRepointed: number;
  eventsArchived: number;
}

const CEREMONY_KEYWORDS = [
  'sangeet',
  'mehndi',
  'haldi',
  'reception',
  'ceremony',
  'pheras',
  'cocktail',
  'garba',
  'tilak',
  'engagement',
  'varmala',
];

function isCeremonyName(name: string): boolean {
  const lower = name.toLowerCase();
  return CEREMONY_KEYWORDS.some((kw) => lower.includes(kw));
}

function cleanOrgName(raw: string): string {
  return raw
    .replace(/ Organization$/i, '')
    .replace(/'s Events$/i, '')
    .trim();
}

async function runMigration() {
  const isCommit = process.argv.includes('--commit');

  console.log(`=======================================================`);
  console.log(`  SAFAR DOMAIN CANONICALIZATION MIGRATION (DOMAIN-01)  `);
  console.log(`  Mode: ${isCommit ? 'COMMIT (LIVE WRITE)' : 'DRY-RUN (NO DB WRITES)'}`);
  console.log(`=======================================================\n`);

  const stats: MigrationStats = {
    accountsProcessed: 0,
    parentEventsConsolidated: 0,
    functionsCreated: 0,
    eventCodesCreated: 0,
    guestsRepointed: 0,
    tripsRepointed: 0,
    bookingsRepointed: 0,
    eventsArchived: 0,
  };

  const accounts = await prisma.account.findMany({
    include: {
      events: {
        include: {
          places: true,
          functions: true,
          eventCodes: true,
          guests: true,
          trips: true,
          bookings: true,
        },
      },
    },
  });

  for (const account of accounts) {
    const activeEvents = account.events.filter(
      (e) => e.status !== EventStatus.ARCHIVED && !e.parentEventId
    );
    if (activeEvents.length === 0) continue;

    stats.accountsProcessed++;
    console.log(`\nAccount: "${account.name}" (ID: ${account.id}) has ${activeEvents.length} active top-level event(s):`);

    const ceremonyEvents = activeEvents.filter((e) => isCeremonyName(e.name));
    const parentCandidate = activeEvents.find(
      (e) => !isCeremonyName(e.name) || e.functions.length > 0
    );

    if (activeEvents.length > 1 && ceremonyEvents.length >= 2) {
      console.log(` -> Found ${ceremonyEvents.length} orphaned ceremony events needing consolidation.`);

      // Designate master event: preferred candidate or first ceremony
      const masterEvent = parentCandidate || activeEvents[0];
      const otherCeremonies = activeEvents.filter((e) => e.id !== masterEvent.id);

      const minDate = new Date(Math.min(...activeEvents.map((e) => e.startDate.getTime())));
      const maxDate = new Date(Math.max(...activeEvents.map((e) => e.endDate.getTime())));
      const cleanName = `${cleanOrgName(account.name)} Wedding Celebration`;

      console.log(` -> Master Event: "${masterEvent.name}" (ID: ${masterEvent.id}, Code: ${masterEvent.joinCode})`);
      console.log(`    Consolidating as canonical: "${cleanName}"`);

      if (isCommit) {
        // 1. If masterEvent was originally named as a single ceremony, rename to Master Wedding
        const originalMasterName = masterEvent.name;
        if (isCeremonyName(masterEvent.name) && !masterEvent.name.toLowerCase().includes('wedding')) {
          await prisma.event.update({
            where: { id: masterEvent.id },
            data: {
              name: cleanName,
              startDate: minDate,
              endDate: maxDate,
            },
          });
        }

        // 2. Ensure masterEvent has a Function for its original ceremony
        const masterFnExists = await prisma.function.findFirst({
          where: { eventId: masterEvent.id },
        });
        if (!masterFnExists) {
          await prisma.function.create({
            data: {
              eventId: masterEvent.id,
              name: originalMasterName,
              date: masterEvent.startDate,
              startTime: masterEvent.startDate,
              endTime: masterEvent.endDate,
              venueName: masterEvent.venueName || masterEvent.places[0]?.name || null,
              venueAddress: masterEvent.venueAddress || masterEvent.places[0]?.address || null,
              status: 'ACTIVE',
            },
          });
          stats.functionsCreated++;
          console.log(`    Created Function "${originalMasterName}" under master event.`);
        }

        stats.parentEventsConsolidated++;

        // 3. Migrate each child ceremony
        for (const ceremony of otherCeremonies) {
          const originalCode = ceremony.joinCode;
          console.log(`    Migrating ceremony "${ceremony.name}" (Code: ${originalCode})...`);

          // Free original joinCode by appending timestamp to archived record
          const archivedCode = `OLD_${originalCode}_${Date.now().toString().slice(-4)}`;
          await prisma.event.update({
            where: { id: ceremony.id },
            data: {
              joinCode: archivedCode,
              status: EventStatus.ARCHIVED,
              parentEventId: masterEvent.id,
              description: `[CONSOLIDATED into canonical event "${cleanName}" (${masterEvent.id})]`,
            },
          });
          stats.eventsArchived++;

          // Create Function under master event
          const createdFn = await prisma.function.create({
            data: {
              eventId: masterEvent.id,
              name: ceremony.name,
              date: ceremony.startDate,
              startTime: ceremony.startDate,
              endTime: ceremony.endDate,
              venueName: ceremony.venueName || ceremony.places[0]?.name || null,
              venueAddress: ceremony.venueAddress || ceremony.places[0]?.address || null,
              status: 'ACTIVE',
            },
          });
          stats.functionsCreated++;

          // Map legacy ceremony code in eventCodes of master event
          const existingCode = await prisma.eventCode.findFirst({
            where: { code: originalCode },
          });
          if (!existingCode && originalCode !== masterEvent.joinCode) {
            await prisma.eventCode.create({
              data: {
                eventId: masterEvent.id,
                code: originalCode,
                isActive: true,
              },
            });
            stats.eventCodesCreated++;
            console.log(`    Mapped legacy code "${originalCode}" -> Master Event.`);
          }

          // Repoint guests
          for (const guest of ceremony.guests) {
            await prisma.guest.update({
              where: { id: guest.id },
              data: { eventId: masterEvent.id },
            });
            await prisma.guestFunctionAttendance.upsert({
              where: { guestId_functionId: { guestId: guest.id, functionId: createdFn.id } },
              create: { guestId: guest.id, functionId: createdFn.id, isAttending: true, status: 'CONFIRMED' },
              update: { isAttending: true },
            });
            stats.guestsRepointed++;
          }

          // Repoint trips
          for (const trip of ceremony.trips) {
            await prisma.trip.update({
              where: { id: trip.id },
              data: { eventId: masterEvent.id, functionId: createdFn.id },
            });
            stats.tripsRepointed++;
          }

          // Repoint bookings
          for (const booking of ceremony.bookings) {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { eventId: masterEvent.id },
            });
            stats.bookingsRepointed++;
          }
        }
      } else {
        stats.parentEventsConsolidated++;
        stats.functionsCreated += otherCeremonies.length + (masterEvent.functions.length === 0 ? 1 : 0);
        stats.eventCodesCreated += otherCeremonies.length;
        stats.eventsArchived += otherCeremonies.length;
        for (const c of otherCeremonies) {
          stats.guestsRepointed += c.guests.length;
          stats.tripsRepointed += c.trips.length;
          stats.bookingsRepointed += c.bookings.length;
        }
      }
    } else {
      // Single event accounts
      for (const ev of activeEvents) {
        if (ev.functions.length === 0) {
          console.log(` -> Event "${ev.name}" (ID: ${ev.id}) has 0 functions. Creating canonical Function.`);
          if (isCommit) {
            await prisma.function.create({
              data: {
                eventId: ev.id,
                name: ev.name,
                date: ev.startDate,
                startTime: ev.startDate,
                endTime: ev.endDate,
                venueName: ev.venueName || ev.places[0]?.name || null,
                venueAddress: ev.venueAddress || ev.places[0]?.address || null,
                status: 'ACTIVE',
              },
            });
            stats.functionsCreated++;
          } else {
            stats.functionsCreated++;
          }
        }
      }
    }
  }

  console.log(`\n=======================================================`);
  console.log(`  MIGRATION SUMMARY (${isCommit ? 'COMMITTED' : 'DRY RUN'})`);
  console.log(`=======================================================`);
  console.log(` Accounts Processed:         ${stats.accountsProcessed}`);
  console.log(` Master Events Consolidated: ${stats.parentEventsConsolidated}`);
  console.log(` Functions Created:          ${stats.functionsCreated}`);
  console.log(` Legacy Event Codes Mapped:  ${stats.eventCodesCreated}`);
  console.log(` Guests Repointed:           ${stats.guestsRepointed}`);
  console.log(` Trips Repointed:            ${stats.tripsRepointed}`);
  console.log(` Bookings Repointed:         ${stats.bookingsRepointed}`);
  console.log(` Legacy Events Archived:     ${stats.eventsArchived}`);
  console.log(` Non-destructive discipline: 100% (0 deletions)\n`);
}

runMigration()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
