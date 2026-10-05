import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/events/:id/functions - List all child functions under this master event
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const functions = await prisma.function.findMany({
      where: { eventId },
      include: {
        place: true,
        trips: {
          include: {
            driver: { include: { user: true } },
            vehicle: true,
            family: true,
            guest: true,
          },
        },
        attendances: {
          include: {
            guest: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({
      success: true,
      functions: functions.map((f) => ({
        id: f.id,
        eventId: f.eventId,
        name: f.name,
        date: f.date?.toISOString() || f.startTime.toISOString().substring(0, 10),
        startTime: f.startTime.toISOString(),
        endTime: f.endTime.toISOString(),
        venueName: f.venueName || f.place?.name || null,
        venueAddress: f.venueAddress || f.place?.address || null,
        guestRules: f.guestRules,
        transportRules: f.transportRules,
        description: f.description,
        tripsCount: f.trips.length,
        attendeesCount: f.attendances.filter((a) => a.isAttending).length,
        trips: f.trips.map((t) => ({
          id: t.id,
          status: t.status,
          scheduledPickupTime: t.scheduledPickupTime.toISOString(),
          pickupLocation: t.pickupLocation,
          destination: t.destination,
          passengerCount: t.passengerCount,
          driverName: t.driver?.user?.fullName || null,
          vehicleModel: t.vehicle?.model || null,
          family: t.family?.name || null,
          guest: t.guest?.fullName || null,
        })),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching event functions:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch event functions' } },
      { status: 500 }
    );
  }
}

// POST /api/events/:id/functions - Create a child function inside this master event (no separate event code!)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      name,
      date,
      startTime,
      endTime,
      venueName,
      venueAddress,
      guestRules,
      transportRules,
      description,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Function name is required (e.g. Mehndi, Sangeet, Wedding, Reception).' } },
        { status: 400 }
      );
    }

    // Parse start and end timestamps
    const baseDateStr = date || event.startDate.toISOString().substring(0, 10);
    const startIso = startTime ? `${baseDateStr}T${startTime}:00` : `${baseDateStr}T18:00:00`;
    const endIso = endTime ? `${baseDateStr}T${endTime}:00` : `${baseDateStr}T23:00:00`;

    const parsedStart = new Date(startIso);
    let parsedEnd = new Date(endIso);
    if (isNaN(parsedStart.getTime())) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid start time.' } },
        { status: 400 }
      );
    }
    if (isNaN(parsedEnd.getTime()) || parsedEnd <= parsedStart) {
      parsedEnd = new Date(parsedStart.getTime() + 4 * 60 * 60 * 1000);
    }

    const createdFunction = await prisma.function.create({
      data: {
        eventId,
        name: name.trim(),
        date: new Date(baseDateStr),
        startTime: parsedStart,
        endTime: parsedEnd,
        venueName: venueName?.trim() || event.venueName || null,
        venueAddress: venueAddress?.trim() || event.venueAddress || null,
        guestRules: guestRules?.trim() || null,
        transportRules: transportRules?.trim() || null,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      function: createdFunction,
      message: `Function "${name.trim()}" added to ${event.name}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event function:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create function' } },
      { status: 500 }
    );
  }
}
