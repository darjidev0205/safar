import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing prisma.trip.findFirst...');
  const trip = await prisma.trip.findFirst();
  console.log('Trip:', trip?.id, 'passengerCount:', trip?.passengerCount);

  if (trip) {
    console.log('Testing prisma.trip.updateMany with lte...');
    const start = Date.now();
    const res = await prisma.trip.updateMany({
      where: {
        id: trip.id,
        passengerCount: { lte: 10 },
      },
      data: {
        passengerCount: { increment: 1 },
      },
    });
    console.log('Result:', res, 'in', Date.now() - start, 'ms');
  }
}

main()
  .catch((e) => console.error('Error:', e))
  .finally(() => prisma.$disconnect());

