import { PrismaClient, AccessCodePurpose } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const HMAC_SECRET = process.env.ACCESS_CODE_HMAC_SECRET || 'safar-production-event-access-hmac-v1';

function normalize(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase();
}

function computeDigest(normalized: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(normalized).digest('hex');
}

function formatDisplay(clean: string): string {
  if (clean.length === 10) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  return clean;
}

async function migrate() {
  console.log('--- SAFAR: Migrating Existing Event Codes to Global Registry ---');
  const events = await prisma.event.findMany({
    include: {
      account: true,
      creator: true,
    },
  });

  console.log(`Found ${events.length} existing events.`);
  let guestCodesCreated = 0;
  let driverCodesCreated = 0;
  let skipped = 0;

  for (const event of events) {
    const rawGuest = event.guestAccessCode || event.joinCode;
    const cleanGuest = normalize(rawGuest);

    if (cleanGuest) {
      const digest = computeDigest(cleanGuest);
      const existing = await prisma.eventAccessCode.findUnique({
        where: { codeDigest: digest },
      });

      if (!existing) {
        try {
          await prisma.eventAccessCode.create({
            data: {
              accountId: event.accountId,
              eventId: event.id,
              purpose: AccessCodePurpose.GUEST_EVENT,
              code: cleanGuest,
              codeDigest: digest,
              displayCode: formatDisplay(cleanGuest),
              isActive: true,
              isSingleUse: false,
              createdBy: event.creatorId,
            },
          });
          guestCodesCreated++;
          console.log(`  [GUEST] Event "${event.name}" (${event.id}) -> Code: ${formatDisplay(cleanGuest)}`);
        } catch (e: any) {
          console.warn(`  [GUEST CONFLICT] Event "${event.name}" code "${cleanGuest}" collision:`, e.message);
        }
      } else {
        skipped++;
      }
    }

    if (event.driverAccessCode) {
      const cleanDriver = normalize(event.driverAccessCode);
      if (cleanDriver) {
        const digest = computeDigest(cleanDriver);
        const existing = await prisma.eventAccessCode.findUnique({
          where: { codeDigest: digest },
        });

        if (!existing) {
          try {
            await prisma.eventAccessCode.create({
              data: {
                accountId: event.accountId,
                eventId: event.id,
                purpose: AccessCodePurpose.DRIVER_INVITE,
                code: cleanDriver,
                codeDigest: digest,
                displayCode: formatDisplay(cleanDriver),
                isActive: true,
                isSingleUse: false, // legacy shared driver codes allow multiple
                createdBy: event.creatorId,
              },
            });
            driverCodesCreated++;
            console.log(`  [DRIVER] Event "${event.name}" (${event.id}) -> Code: ${formatDisplay(cleanDriver)}`);
          } catch (e: any) {
            console.warn(`  [DRIVER CONFLICT] Event "${event.name}" driver code "${cleanDriver}":`, e.message);
          }
        }
      }
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`Created: ${guestCodesCreated} guest codes, ${driverCodesCreated} driver codes. Skipped ${skipped} already present.`);
}

migrate()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

