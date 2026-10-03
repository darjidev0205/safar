import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getAuthenticatedHost } from '../../../lib/auth-server';
import { EventStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/events - List all events/functions for authenticated host
export async function GET(req: NextRequest) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const searchParams = req.nextUrl.searchParams;
    const parentOnly = searchParams.get('parentOnly') === 'true';
    const parentEventId = searchParams.get('parentEventId');

    const where: any = {
      accountId: context.account.id,
    };

    if (parentOnly) {
      where.parentEventId = null;
    } else if (parentEventId) {
      where.parentEventId = parentEventId;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        transportRequirements: true,
        subEvents: {
          include: {
            transportRequirements: true,
            _count: {
              select: { eventGuests: true, trips: true },
            },
          },
          orderBy: { startDate: 'asc' },
        },
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

    // Format for client with accurate guest count and transport status
    const formatted = events.map((ev) => {
      const guestCount = Math.max(ev._count.eventGuests, ev._count.guests);
      const transport = ev.transportRequirements[0] || null;
      return {
        id: ev.id,
        accountId: ev.accountId,
        name: ev.name,
        eventType: ev.eventType || 'CUSTOM',
        city: ev.city,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate.toISOString(),
        startTime: ev.startTime,
        endTime: ev.endTime,
        venueName: ev.venueName,
        venueAddress: ev.venueAddress,
        venueLatitude: ev.venueLatitude,
        venueLongitude: ev.venueLongitude,
        expectedGuestCount: ev.expectedGuestCount,
        guestCount,
        joinCode: ev.joinCode,
        bannerUrl: ev.bannerUrl,
        description: ev.description,
        status: ev.status,
        parentEventId: ev.parentEventId,
        transportRequirements: transport,
        subEventsCount: ev.subEvents?.length || 0,
        tripsCount: ev._count.trips,
        createdAt: ev.createdAt.toISOString(),
        updatedAt: ev.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      events: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching host events:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch events' } },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new individual function or event
export async function POST(req: NextRequest) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const body = await req.json();
    const {
      name,
      eventType,
      startDate,
      endDate,
      startTime,
      endTime,
      venueName,
      venueAddress,
      city,
      venueLatitude,
      venueLongitude,
      expectedGuestCount,
      description,
      bannerUrl,
      parentEventId,
      transport,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Event or Function Name is required.' } },
        { status: 400 }
      );
    }

    const eventCity = city?.trim() || 'Ahmedabad';
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    let parsedEndDate = endDate ? new Date(endDate) : new Date(parsedStartDate.getTime() + 4 * 60 * 60 * 1000);

    if (isNaN(parsedStartDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { message: 'Valid start date is required.' } },
        { status: 400 }
      );
    }
    if (isNaN(parsedEndDate.getTime()) || parsedEndDate < parsedStartDate) {
      parsedEndDate = new Date(parsedStartDate.getTime() + 4 * 60 * 60 * 1000);
    }

    // Verify parent event ownership if sub-event
    if (parentEventId) {
      const parent = await prisma.event.findFirst({
        where: { id: parentEventId, accountId: context.account.id },
      });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: { message: 'Parent event does not belong to your account.' } },
          { status: 403 }
        );
      }
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = await prisma.event.findUnique({ where: { joinCode } });
      if (!existing) break;
      joinCode = generateJoinCode();
    }

    const createdEvent = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          accountId: context.account.id,
          creatorId: context.user.id,
          name: name.trim(),
          eventType: eventType || 'CUSTOM',
          city: eventCity,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          startTime: startTime || null,
          endTime: endTime || null,
          venueName: venueName?.trim() || null,
          venueAddress: venueAddress?.trim() || null,
          venueLatitude: venueLatitude ? parseFloat(venueLatitude) : null,
          venueLongitude: venueLongitude ? parseFloat(venueLongitude) : null,
          expectedGuestCount: expectedGuestCount ? parseInt(String(expectedGuestCount), 10) : 0,
          description: description?.trim() || null,
          bannerUrl: bannerUrl?.trim() || null,
          parentEventId: parentEventId || null,
          joinCode,
          status: EventStatus.ACTIVE,
        },
      });

      // Also create Venue place record if venue info provided
      if (venueName) {
        await tx.place.create({
          data: {
            eventId: newEvent.id,
            name: venueName.trim(),
            address: venueAddress?.trim() || venueName.trim(),
            latitude: venueLatitude ? parseFloat(venueLatitude) : 23.0225,
            longitude: venueLongitude ? parseFloat(venueLongitude) : 72.5714,
            type: 'VENUE',
          },
        });
      }

      // If transport requirements are configured
      if (transport) {
        await tx.eventTransportRequirement.create({
          data: {
            eventId: newEvent.id,
            pickupRequired: Boolean(transport.pickupRequired),
            dropRequired: Boolean(transport.dropRequired),
            pickupLocation: transport.pickupLocation?.trim() || null,
            dropLocation: transport.dropLocation?.trim() || null,
            pickupDate: transport.pickupDate ? new Date(transport.pickupDate) : parsedStartDate,
            pickupTime: transport.pickupTime?.trim() || startTime || null,
            vehicleType: transport.vehicleType?.trim() || 'Sedan',
            numberOfVehicles: transport.numberOfVehicles ? parseInt(String(transport.numberOfVehicles), 10) : 1,
            specialInstructions: transport.specialInstructions?.trim() || null,
          },
        });
      }

      return newEvent;
    });

    const fullEvent = await prisma.event.findUnique({
      where: { id: createdEvent.id },
      include: {
        transportRequirements: true,
      },
    });

    return NextResponse.json({
      success: true,
      event: fullEvent,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event/function:', error);
    const isPrisma = error?.code?.startsWith?.('P') || error?.name?.includes?.('Prisma');
    const userMessage = isPrisma
      ? 'Unable to create event due to a database constraint. Please check details and try again.'
      : (error?.message || 'Failed to create event');
    return NextResponse.json(
      { success: false, error: { message: userMessage } },
      { status: 500 }
    );
  }
}
