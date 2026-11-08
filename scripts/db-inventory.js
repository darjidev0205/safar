const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inventory() {
  try {
    await prisma.$connect();
    console.log('Connected to MongoDB via Prisma Client.');

    const [
      accountCount,
      userCount,
      eventCount,
      functionCount,
      guestCount,
      driverCount,
      vehicleCount,
      tripCount,
      bookingCount,
    ] = await Promise.all([
      prisma.account.count(),
      prisma.user.count(),
      prisma.event.count(),
      prisma.function.count(),
      prisma.guest.count(),
      prisma.driver.count(),
      prisma.vehicle.count(),
      prisma.trip.count(),
      prisma.booking.count(),
    ]);

    console.log('Database Inventory Counts:');
    console.log(` - accounts: ${accountCount}`);
    console.log(` - users: ${userCount}`);
    console.log(` - events: ${eventCount}`);
    console.log(` - functions: ${functionCount}`);
    console.log(` - guests: ${guestCount}`);
    console.log(` - drivers: ${driverCount}`);
    console.log(` - vehicles: ${vehicleCount}`);
    console.log(` - trips: ${tripCount}`);
    console.log(` - bookings: ${bookingCount}`);

    // Sample events
    if (eventCount > 0) {
      const events = await prisma.event.findMany({
        take: 5,
        select: { id: true, name: true, joinCode: true, status: true, accountId: true, parentEventId: true, createdAt: true },
      });
      console.log('\nSample Events:', JSON.stringify(events, null, 2));
    }

    // Inspect user roles
    if (userCount > 0) {
      const roles = await prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      });
      console.log('\nUser Roles distribution:', JSON.stringify(roles, null, 2));
    }

    // Inspect drivers
    if (driverCount > 0) {
      const drivers = await prisma.driver.findMany({
        take: 5,
        select: { id: true, isVerified: true, approvalStatus: true, licenseNumber: true },
      });
      console.log('\nSample Drivers:', JSON.stringify(drivers, null, 2));
    }

    // Inspect bookings with default "1234" code
    if (bookingCount > 0) {
      const default1234Bookings = await prisma.booking.count({
        where: { boardingCode: '1234' },
      });
      console.log(`\nBookings with boardingCode === "1234": ${default1234Bookings} / ${bookingCount}`);
    }

  } catch (err) {
    console.error('Error during inventory:', err);
  } finally {
    await prisma.$disconnect();
  }
}

inventory();
