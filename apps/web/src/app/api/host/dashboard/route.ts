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

    // Fetch master wedding events for this host
    const events = await prisma.event.findMany({
      where: {
        accountId,
        parentEventId: null, // Master Events
      },
      include: {
        functions: {
          orderBy: { startTime: 'asc' },
        },
        transportRequirements: true,
        _count: {
          select: {
            eventGuests: true,
            guests: true,
            trips: true,
            functions: true,
            families: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Determine target master event
    const targetEvent = selectedEventId
      ? events.find((e) => e.id === selectedEventId) || events[0] || null
      : events[0] || null;

    const eventFilter = targetEvent ? { eventId: targetEvent.id } : { event: { accountId } };

    // Get event guests under master event
    const eventGuests = await prisma.eventGuest.findMany({
      where: eventFilter,
      include: {
        guest: {
          include: {
            family: true,
            attendances: { include: { function: true } },
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
            trips: true,
          },
        },
      },
    });

    // Also get direct guests under this master event
    const directGuests = await prisma.guest.findMany({
      where: targetEvent
        ? { eventId: targetEvent.id, eventGuests: { none: { eventId: targetEvent.id } } }
        : { accountId, eventGuests: { none: {} } },
      include: {
        family: true,
        attendances: { include: { function: true } },
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
        trips: true,
      },
    });

    // Get families under master event
    const families = await prisma.family.findMany({
      where: (targetEvent ? { OR: [{ eventId: targetEvent.id }, { accountId }] } : { accountId }) as any,
    });


    // Calculate real numbers across master event
    let totalGuests = 0;
    const familyNames = new Set<string>();
    let guestsAssigned = 0;
    let guestsPending = 0;
    const assignedVehicles = new Set<string>();
    const assignedDrivers = new Set<string>();

    for (const eg of (eventGuests as any[])) {
      const guest = eg.guest;
      if (!guest) continue;
      const count = guest.memberCount || 1;
      totalGuests += count;
      if (guest.familyName) familyNames.add(guest.familyName);
      else if (guest.family?.name) familyNames.add(guest.family.name);

      const tripsList = guest.trips || [];
      const bookingsList = guest.bookings || [];
      const hasAssignment =
        tripsList.length > 0 ||
        bookingsList.some((b: any) => b.trip?.vehicleId || b.trip?.driverId);

      if (hasAssignment) {
        guestsAssigned += count;
        bookingsList.forEach((b: any) => {
          if (b.trip?.vehicleId) assignedVehicles.add(b.trip.vehicleId);
          if (b.trip?.driverId) assignedDrivers.add(b.trip.driverId);
        });
        tripsList.forEach((t: any) => {
          if (t.vehicleId) assignedVehicles.add(t.vehicleId);
          if (t.driverId) assignedDrivers.add(t.driverId);
        });
      } else {
        guestsPending += count;
      }
    }

    for (const dg of (directGuests as any[])) {
      const count = dg.memberCount || 1;
      totalGuests += count;
      if (dg.familyName) familyNames.add(dg.familyName);
      else if (dg.family?.name) familyNames.add(dg.family.name);

      const tripsList = dg.trips || [];
      const bookingsList = dg.bookings || [];
      const hasAssignment =
        tripsList.length > 0 ||
        bookingsList.some((b: any) => b.trip?.vehicleId || b.trip?.driverId);

      if (hasAssignment) {
        guestsAssigned += count;
        bookingsList.forEach((b: any) => {
          if (b.trip?.vehicleId) assignedVehicles.add(b.trip.vehicleId);
          if (b.trip?.driverId) assignedDrivers.add(b.trip.driverId);
        });
        tripsList.forEach((t: any) => {
          if (t.vehicleId) assignedVehicles.add(t.vehicleId);
          if (t.driverId) assignedDrivers.add(t.driverId);
        });
      } else {
        guestsPending += count;
      }
    }

    // Add family names from family table if not already tracked
    (families as any[]).forEach((f: any) => familyNames.add(f.name));

    // Calculate vehicles required
    let vehiclesRequired = 0;
    if (targetEvent) {
      const trList = (targetEvent as any).transportRequirements || [];
      vehiclesRequired = trList.reduce(
        (sum: number, tr: any) => sum + (tr.numberOfVehicles || 0),
        0
      ) || 0;
    }
    if (vehiclesRequired === 0 && totalGuests > 0) {
      vehiclesRequired = Math.ceil(totalGuests / 4);
    }

    // Fetch real fleet counts
    const totalFleetVehicles = await prisma.vehicle.count({ where: { accountId, isActive: true } });
    const totalFleetDrivers = await prisma.driver.count({ where: { accountId } });

    // Fetch upcoming trips for this master event
    const trips = await prisma.trip.findMany({
      where: targetEvent ? { eventId: targetEvent.id } : { event: { accountId } },
      include: {
        function: true,
        family: true,
        guest: true,
        originPlace: true,
        destinationPlace: true,
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { scheduledPickupTime: 'asc' },
      take: 15,
    });

    const activeFunctionsCount = (targetEvent as any)?.functions?.length || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalGuests,
        families: familyNames.size,
        functionsCount: activeFunctionsCount,
        vehiclesRequired,
        guestsAssigned,
        guestsPending,
        driversAssigned: assignedDrivers.size,
        activeChauffeurs: assignedDrivers.size || totalFleetDrivers,
        totalFleetVehicles,
        totalFleetDrivers,
        activeTrips: (trips as any[]).filter((t) => t.status === 'IN_TRANSIT' || t.status === 'EN_ROUTE_TO_PICKUP').length,
        totalTrips: trips.length,
      },
      events: (events as any[]).map((ev: any) => ({
        id: ev.id,
        name: ev.name,
        eventType: ev.eventType || 'WEDDING',
        city: ev.city,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate.toISOString(),
        startTime: ev.startTime,
        endTime: ev.endTime,
        venueName: ev.venueName,
        expectedGuestCount: ev.expectedGuestCount,
        guestCount: Math.max(ev._count?.eventGuests || 0, ev._count?.guests || 0),
        functionsCount: ev.functions?.length || 0,
        joinCode: ev.joinCode, // Master Event Code e.g. JPR26A
        driverAccessCode: ev.driverAccessCode || `DRV${ev.joinCode.slice(-3)}`,
        guestAccessCode: ev.guestAccessCode || ev.joinCode,
        status: ev.status,
        functions: (ev.functions || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          startTime: f.startTime.toISOString(),
          endTime: f.endTime.toISOString(),
          venueName: f.venueName,
        })),
      })),
      activeEvent: targetEvent
        ? {
            id: (targetEvent as any).id,
            name: (targetEvent as any).name,
            masterEventCode: (targetEvent as any).joinCode,
            city: (targetEvent as any).city,
            startDate: (targetEvent as any).startDate.toISOString(),
            endDate: (targetEvent as any).endDate.toISOString(),
            venueName: (targetEvent as any).venueName,
            functions: ((targetEvent as any).functions || []).map((f: any) => ({
              id: f.id,
              name: f.name,
              startTime: f.startTime.toISOString(),
              endTime: f.endTime.toISOString(),
              venueName: f.venueName,
            })),
          }
        : null,
      trips: (trips as any[]).map((t: any) => ({
        id: t.id,
        eventId: t.eventId,
        functionName: t.function?.name || 'General Transfer',
        family: t.family?.name || null,
        guest: t.guest?.fullName || null,
        scheduledPickupTime: t.scheduledPickupTime.toISOString(),
        status: t.status,
        originName: t.pickupLocation || t.originPlace?.name || 'Pickup Point',
        destinationName: t.destination || t.destinationPlace?.name || 'Venue Lawn',
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

