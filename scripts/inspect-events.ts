import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
      joinCode: true,
      accountId: true,
      creatorId: true,
      parentEventId: true,
      createdAt: true,
      places: { select: { id: true, name: true, type: true } },
      functions: { select: { id: true, name: true, startTime: true, endTime: true } },
      eventCodes: { select: { code: true, isActive: true } },
      _count: { select: { guests: true, trips: true, bookings: true } },
    },
  });

  console.log('ALL EVENTS IN DATABASE:');
  console.log(JSON.stringify(events, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

