import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthenticatedHost } from '../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const accountId = context.account.id;
    const selectedEventId = req.nextUrl.searchParams.get('eventId');

    // Fetch all events for this host
    const events = await prisma.event.findMany({
      where: { accountId },
      include: {
        transportRequirements: true,
        _count: {
          select: {
            eventGuests: true,
            guests: true,
            trips: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // If an event is selected, compute metrics for that event; otherwise across all events
    const eventFilter = selectedEventId ? { eventId: selectedEventId } : { event: { accountId } };

    // Get event guests
    const eventGuests = await prisma.eventGuest.findMany({
      where: eventFilter,
      include: {
        guest: {
          include: {
            family: true,
            bookings: {
              include: {
                trip: {
                  include: {
                    vehicle: true,
                    driver: { include: { user: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Also get direct guests if any
    const directGuests = await prisma.guest.findMany({
      where: selectedEventId
        ? { eventId: selectedEventId, eventGuests: { none: { eventId: selectedEventId } } }
        : { accountId, eventGuests: { none: {} } },
      include: {
        family: true,
        bookings: {
          include: {
            trip: {
              include: {
                vehicle: true,
                driver: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    // Calculate real numbers
    let totalGuests = 0;
    const familyNames = new Set<string>();
    let guestsAssigned = 0;
    let guestsPending = 0;
    const assignedVehicles = new Set<string>();
    const assignedDrivers = new Set<string>();

    for (const eg of eventGuests) {
      if (!eg.guest) continue;
      const count = eg.guest.memberCount || 1;
      totalGuests += count;
      if (eg.guest.familyName) familyNames.add(eg.guest.familyName);
      else if (eg.guest.family?.name) familyNames.add(eg.guest.family.name);

      const hasAssignment = eg.guest.bookings.some((b) => b.trip?.vehicleId || b.trip?.driverId);
      if (hasAssignment) {
        guestsAssigned += count;
        eg.guest.bookings.forEach((b) => {
          if (b.trip?.vehicleId) assignedVehicles.add(b.trip.vehicleId);
          if (b.trip?.driverId) assignedDrivers.add(b.trip.driverId);
        });
      } else {
        guestsPending += count;
      }
    }

    for (const dg of directGuests) {
      const count = dg.memberCount || 1;
      totalGuests += count;
      if (dg.familyName) familyNames.add(dg.familyName);
      else if (dg.family?.name) familyNames.add(dg.family.name);

      const hasAssignment = dg.bookings.some((b) => b.trip?.vehicleId || b.trip?.driverId);
      if (hasAssignment) {
        guestsAssigned += count;
        dg.bookings.forEach((b) => {
          if (b.trip?.vehicleId) assignedVehicles.add(b.trip.vehicleId);
          if (b.trip?.driverId) assignedDrivers.add(b.trip.driverId);
        });
      } else {
        guestsPending += count;
      }
    }

    // Calculate vehicles required from transport requirements
    let vehiclesRequired = 0;
    if (selectedEventId) {
      const targetEvent = events.find((e) => e.id === selectedEventId);
      vehiclesRequired = targetEvent?.transportRequirements?.reduce((sum, tr) => sum + (tr.numberOfVehicles || 0), 0) || 0;
    } else {
      vehiclesRequired = events.reduce((sum, e) => {
        const trSum = e.transportRequirements?.reduce((tsum, tr) => tsum + (tr.numberOfVehicles || 0), 0) || 0;
        return sum + trSum;
      }, 0);
    }

    // If vehicles required was not explicitly set on transport, estimate based on 4 guests/vehicle
    if (vehiclesRequired === 0 && totalGuests > 0) {
      vehiclesRequired = Math.ceil(totalGuests / 4);
    }

    // Fetch real fleet counts
    const totalFleetVehicles = await prisma.vehicle.count({ where: { accountId, isActive: true } });
    const totalFleetDrivers = await prisma.driver.count({ where: { accountId } });

    // Fetch upcoming trips for this event or host
    const trips = await prisma.trip.findMany({
      where: selectedEventId ? { eventId: selectedEventId } : { event: { accountId } },
      include: {
        originPlace: true,
        destinationPlace: true,
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { scheduledPickupTime: 'asc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalGuests,
        families: familyNames.size,
        vehiclesRequired,
        guestsAssigned,
        guestsPending,
        driversAssigned: assignedDrivers.size,
        totalFleetVehicles,
        totalFleetDrivers,
        activeTrips: trips.filter((t) => t.status === 'IN_TRANSIT' || t.status === 'EN_ROUTE_TO_PICKUP').length,
        totalTrips: trips.length,
      },
      events: events.map((ev) => ({
        id: ev.id,
        name: ev.name,
        eventType: ev.eventType || 'CUSTOM',
        city: ev.city,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate.toISOString(),
        startTime: ev.startTime,
        endTime: ev.endTime,
        venueName: ev.venueName,
        expectedGuestCount: ev.expectedGuestCount,
        guestCount: Math.max(ev._count.eventGuests, ev._count.guests),
        joinCode: ev.joinCode,
        status: ev.status,
      })),
      trips: trips.map((t) => ({
        id: t.id,
        eventId: t.eventId,
        scheduledPickupTime: t.scheduledPickupTime.toISOString(),
        status: t.status,
        originName: t.originPlace?.name || 'Pickup',
        destinationName: t.destinationPlace?.name || 'Venue',
        vehicleModel: t.vehicle?.model || null,
        vehiclePlate: t.vehicle?.plateNumber || null,
        driverName: t.driver?.user?.fullName || null,
        driverPhone: t.driver?.user?.phoneNumber || null,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching host dashboard metrics:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error fetching dashboard stats' } },
      { status: 500 }
    );
  }
}
