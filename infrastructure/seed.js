/**
 * SAFAR Database Seeder
 * Populates initial reference places, vehicle categories, and demo event if invoked.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SAFAR database seeding...');

  try {
    // 1. Create or upsert Host Organizer User
    const hostUser = await prisma.user.upsert({
      where: { email: 'priya@safar.events' },
      update: {},
      create: {
        firebaseUid: 'firebase_host_priya',
        email: 'priya@safar.events',
        phoneNumber: '+91 98765 43210',
        fullName: 'Priya Sharma',
        role: 'EVENT_ORGANIZER',
      },
    });
    console.log(`✅ Host User ready: ${hostUser.fullName}`);

    // 2. Create Account
    const account = await prisma.account.upsert({
      where: { slug: 'royal-weddings-india' },
      update: {},
      create: {
        name: 'Royal Weddings & Events India',
        slug: 'royal-weddings-india',
        ownerId: hostUser.id,
        members: {
          create: {
            userId: hostUser.id,
            role: 'ACCOUNT_OWNER',
          },
        },
      },
    });
    console.log(`✅ Account created: ${account.name}`);

    // 3. Create Event
    const event = await prisma.event.upsert({
      where: { joinCode: 'ADW26X' },
      update: {},
      create: {
        accountId: account.id,
        creatorId: hostUser.id,
        name: 'Aarav & Diya Wedding',
        city: 'Ahmedabad',
        startDate: new Date('2026-11-14T09:00:00Z'),
        endDate: new Date('2026-11-17T23:00:00Z'),
        joinCode: 'ADW26X',
        description: 'Grand Royal Wedding transportation ecosystem',
        status: 'ACTIVE',
        eventMembers: {
          create: {
            userId: hostUser.id,
            role: 'EVENT_ORGANIZER',
          },
        },
        eventCodes: {
          create: {
            code: 'ADW26X',
            isActive: true,
          },
        },
      },
    });
    console.log(`✅ Event ready with Join Code: ${event.joinCode}`);

    // 4. Create Places
    const hotel = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'The Grand Hotel',
        address: 'SG Highway, Bodakdev, Ahmedabad',
        latitude: 23.0338,
        longitude: 72.5204,
        type: 'HOTEL',
      },
    });

    const venue = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'The Celebration Venue',
        address: 'Sindhu Bhavan Road, Ahmedabad',
        latitude: 23.0452,
        longitude: 72.5115,
        type: 'VENUE',
      },
    });

    const airport = await prisma.place.create({
      data: {
        eventId: event.id,
        name: 'Ahmedabad Airport (AMD)',
        address: 'Hansol, Ahmedabad',
        latitude: 23.0772,
        longitude: 72.6347,
        type: 'AIRPORT',
      },
    });
    console.log('✅ Places created (Hotel, Venue, Airport)');

    // 5. Create Vehicles
    const v1 = await prisma.vehicle.create({
      data: {
        accountId: account.id,
        model: 'Force Urbania Traveller',
        plateNumber: 'KA 01 AB 1234',
        category: 'TEMPO_TRAVELLER',
        capacity: 16,
        isActive: true,
      },
    });

    const v2 = await prisma.vehicle.create({
      data: {
        accountId: account.id,
        model: 'Toyota Innova Crysta',
        plateNumber: 'KA 02 CD 5678',
        category: 'SUV',
        capacity: 6,
        isActive: true,
      },
    });

    const v3 = await prisma.vehicle.create({
      data: {
        accountId: account.id,
        model: 'Honda City',
        plateNumber: 'KA 03 EF 9012',
        category: 'SEDAN',
        capacity: 4,
        isActive: true,
      },
    });
    console.log('✅ Fleet seeded (3 Vehicles)');

    // 6. Create Driver User & Driver Profile
    const driverUser = await prisma.user.upsert({
      where: { email: 'rajesh.driver@safar.events' },
      update: {},
      create: {
        firebaseUid: 'firebase_driver_rajesh',
        email: 'rajesh.driver@safar.events',
        phoneNumber: '+91 98765 00001',
        fullName: 'Rajesh Kumar',
        role: 'DRIVER',
      },
    });

    const driver = await prisma.driver.upsert({
      where: { userId: driverUser.id },
      update: {},
      create: {
        accountId: account.id,
        userId: driverUser.id,
        licenseNumber: 'GJ-01-2021001234',
        dutyStatus: 'ON_DUTY',
        currentVehicleId: v2.id,
      },
    });
    console.log(`✅ Driver profile created for ${driverUser.fullName}`);

    console.log('🎉 Seeding successfully completed!');
  } catch (err) {
    console.error('Seeding error (Check if PostgreSQL is online):', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
