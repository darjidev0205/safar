import { PrismaClient, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  accountsProcessed: number;
  parentEventsCreated: number;
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

async function runMigration() {
  const isCommit = process.argv.includes('--commit');
  const isDryRun = !isCommit;

  console.log(`=======================================================`);
  console.log(`  SAFAR DOMAIN CANONICALIZATION MIGRATION (DOMAIN-01)  `);
  console.log(`  Mode: ${isCommit ? 'COMMIT (LIVE WRITE)' : 'DRY-RUN (NO DB WRITES)'}`);
  console.log(`=======================================================\n`);

  const stats: MigrationStats = {
    accountsProcessed: 0,
    parentEventsCreated: 0,
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
    const activeEvents = account.events.filter((e) => e.status !== EventStatus.ARCHIVED && !e.parentEventId);
    if (activeEvents.length === 0) continue;

    stats.accountsProcessed++;
    console.log(`\nAccount: "${account.name}" (ID: ${account.id}) has ${activeEvents.length} active top-level event(s):`);

    // Check if this account has multiple ceremony-level events that should be consolidated
    const ceremonyEvents = activeEvents.filter((e) => isCeremonyName(e.name));
    const parentCandidate = activeEvents.find((e) => !isCeremonyName(e.name) || e.functions.length > 0);

    if (activeEvents.length > 1 && ceremonyEvents.length >= 2) {
      console.log(` -> Found ${ceremonyEvents.length} orphaned ceremony events needing consolidation into 1 Master Wedding Event.`);

      let masterEvent = parentCandidate;
      let createdMasterInPlan = false;

      if (!masterEvent) {
        // Create canonical master wedding event
        const primaryCeremony = activeEvents[0];
        const minDate = new Date(Math.min(...activeEvents.map((e) => e.startDate.getTime())));
        const maxDate = new Date(Math.max(...activeEvents.map((e) => e.endDate.getTime())));

        console.log(` -> [Plan] Create Canonical Parent Wedding Event for account "${account.name}"`);
        console.log(`    Dates: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
        console.log(`    City: ${primaryCeremony.city}`);

        if (isCommit) {
          masterEvent = await prisma.event.create({
            data: {
              accountId: account.id,
              creatorId: primaryCeremony.creatorId,
              name: `${account.name.replace(/ Organization$/i, '')} Wedding Celebration`,
              city: primaryCeremony.city,
              startDate: minDate,
              endDate: maxDate,
              joinCode: primaryCeremony.joinCode,
              description: 'Canonical master wedding celebration consolidating all ceremonies.',
              status: EventStatus.ACTIVE,
            },
            include: {
              places: true,
              functions: true,
              eventCodes: true,
              guests: true,
              trips: true,
              bookings: true,
            },
          });
          createdMasterInPlan = true;
          stats.parentEventsCreated++;
          console.log(`    Created Master Event ID: ${masterEvent.id} with primary code: ${masterEvent.joinCode}`);
        } else {
          stats.parentEventsCreated++;
        }
      } else {
        console.log(` -> Using existing master wedding event "${masterEvent.name}" (ID: ${masterEvent.id})`);
      }

      // Now migrate each ceremony event
      for (const ceremony of activeEvents) {
        // If this ceremony is the newly created or selected masterEvent, don't archive itself unless it's a pure ceremony
        if (masterEvent && ceremony.id === masterEvent.id) {
          // If master event has no functions yet, ensure it has a Function representing its main ceremony
          if (ceremony.functions.length === 0) {
            console.log(` -> [Plan] Create canonical Function for master event: "${ceremony.name}"`);
            if (isCommit) {
              await prisma.function.create({
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
            } else {
              stats.functionsCreated++;
            }
          }
          continue;
        }

        console.log(`   -> [Plan] Migrate ceremony "${ceremony.name}" (Code: ${ceremony.joinCode}, ID: ${ceremony.id})`);

        if (isCommit && masterEvent) {
          // 1. Create Function under master event
          const fn = await prisma.function.create({
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

          // 2. Create EventCode so old ceremony joinCode resolves to masterEvent
          const existingCode = await prisma.eventCode.findFirst({
            where: { eventId: masterEvent.id, code: ceremony.joinCode },
          });
          if (!existingCode && ceremony.joinCode !== masterEvent.joinCode) {
            await prisma.eventCode.create({
              data: {
                eventId: masterEvent.id,
                code: ceremony.joinCode,
                isActive: true,
              },
            });
            stats.eventCodesCreated++;
          }

          // 3. Repoint Guests non-destructively
          for (const guest of ceremony.guests) {
            await prisma.guest.update({
              where: { id: guest.id },
              data: { eventId: masterEvent.id },
            });
            // Also link attendance to the function
            await prisma.guestFunctionAttendance.upsert({
              where: { guestId_functionId: { guestId: guest.id, functionId: fn.id } },
              create: { guestId: guest.id, functionId: fn.id, isAttending: true, status: 'CONFIRMED' },
              update: { isAttending: true },
            });
            stats.guestsRepointed++;
          }

          // 4. Repoint Trips non-destructively
          for (const trip of ceremony.trips) {
            await prisma.trip.update({
              where: { id: trip.id },
              data: { eventId: masterEvent.id, functionId: fn.id },
            });
            stats.tripsRepointed++;
          }

          // 5. Repoint Bookings non-destructively
          for (const booking of ceremony.bookings) {
            await prisma.booking.update({
              where: { id: booking.id },
              data: { eventId: masterEvent.id },
            });
            stats.bookingsRepointed++;
          }

          // 6. Non-destructive archival with parent pointer
          await prisma.event.update({
            where: { id: ceremony.id },
            data: {
              status: EventStatus.ARCHIVED,
              parentEventId: masterEvent.id,
              description: `[CONSOLIDATED into canonical event "${masterEvent.name}" (${masterEvent.id})]`,
            },
          });
          stats.eventsArchived++;
        } else {
          stats.functionsCreated++;
          stats.eventCodesCreated++;
          stats.guestsRepointed += ceremony.guests.length;
          stats.tripsRepointed += ceremony.trips.length;
          stats.bookingsRepointed += ceremony.bookings.length;
          stats.eventsArchived++;
        }
      }
    } else {
      // Single event in account. Ensure it has at least one Function record so domain is canonical
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
  console.log(` Parent Events Created:      ${stats.parentEventsCreated}`);
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
