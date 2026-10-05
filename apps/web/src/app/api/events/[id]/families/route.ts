import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/events/:id/families - List all families under this master event with guests & rides
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    // Fetch families associated with this event or account
    const families = await prisma.family.findMany({
      where: {
        OR: [
          { eventId },
          { accountId: context.account.id },
        ],
      },
      include: {
        guests: {
          where: {
            OR: [
              { eventId },
              { eventGuests: { some: { eventId } } },
            ],
          },
          include: {
            attendances: {
              include: { function: true },
            },
          },
        },
        trips: {
          where: { eventId },
          include: {
            driver: { include: { user: true } },
            vehicle: true,
            function: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = families.map((f) => {
      const totalMembers = f.guests.reduce((sum, g) => sum + (g.memberCount || 1), 0);
      return {
        id: f.id,
        name: f.name,
        relation: f.relation,
        notes: f.notes,
        totalMembers,
        guestsCount: f.guests.length,
        guests: f.guests.map((g) => ({
          id: g.id,
          fullName: g.fullName,
          phoneNumber: g.phoneNumber,
          memberCount: g.memberCount,
          hotelName: g.hotelName,
          hotelRoom: g.hotelRoom,
          pickupLocation: g.pickupLocation,
          dropLocation: g.dropLocation,
          status: g.status,
          attendance: g.attendances.map((a) => ({
            functionId: a.functionId,
            functionName: a.function.name,
            isAttending: a.isAttending,
          })),
        })),
        assignedRides: f.trips.map((t) => ({
          id: t.id,
          functionName: t.function?.name || 'General Transfer',
          scheduledPickupTime: t.scheduledPickupTime.toISOString(),
          pickupLocation: t.pickupLocation,
          destination: t.destination,
          passengerCount: t.passengerCount,
          status: t.status,
          driverName: t.driver?.user?.fullName || null,
          vehicleModel: t.vehicle?.model || null,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      families: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching families:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch families' } },
      { status: 500 }
    );
  }
}

// POST /api/events/:id/families - Create a family under this master event
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { name, relation, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Family name is required (e.g. Shah Family, Patel Family).' } },
        { status: 400 }
      );
    }

    const family = await prisma.family.create({
      data: {
        accountId: context.account.id,
        eventId,
        name: name.trim(),
        relation: relation?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      family,
      message: `Family "${name.trim()}" created successfully.`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating family:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create family' } },
      { status: 500 }
    );
  }
}
