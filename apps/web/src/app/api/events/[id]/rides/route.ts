import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';
import { TripStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/events/:id/rides - List all family/guest rides for this master event
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const functionFilter = req.nextUrl.searchParams.get('functionId');
    const familyFilter = req.nextUrl.searchParams.get('familyId');

    const where: any = { eventId };
    if (functionFilter) where.functionId = functionFilter;
    if (familyFilter) where.familyId = familyFilter;

    const trips = await prisma.trip.findMany({
      where,
      include: {
        function: true,
        family: {
          include: { guests: true },
        },
        guest: true,
        driver: {
          include: { user: true },
        },
        vehicle: true,
      },
      orderBy: { scheduledPickupTime: 'asc' },
    });

    const formatted = trips.map((t) => ({
      id: t.id,
      eventId: t.eventId,
      functionId: t.functionId,
      functionName: t.function?.name || 'General Wedding Transfer',
      familyId: t.familyId,
      familyName: t.family?.name || null,
      familyMembers: t.family?.guests.map((g) => g.fullName) || [],
      guestId: t.guestId,
      guestName: t.guest?.fullName || null,
      driverId: t.driverId,
      driverName: t.driver?.user?.fullName || null,
      driverPhone: t.driver?.user?.phoneNumber || null,
      vehicleId: t.vehicleId,
      vehicleModel: t.vehicle?.model || null,
      vehiclePlate: t.vehicle?.plateNumber || null,
      pickupLocation: t.pickupLocation || 'Guest Accommodation',
      destination: t.destination || t.function?.venueName || 'Wedding Venue',
      passengerCount: t.passengerCount || (t.family ? t.family.guests.length : 1),
      scheduledPickupTime: t.scheduledPickupTime.toISOString(),
      actualStartTime: t.actualStartTime?.toISOString() || null,
      actualEndTime: t.actualEndTime?.toISOString() || null,
      status: t.status,
    }));

    return NextResponse.json({
      success: true,
      rides: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching event rides:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch rides' } },
      { status: 500 }
    );
  }
}

// POST /api/events/:id/rides - Create or assign a ride for a family/guest to a function & chauffeur
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      functionId,
      familyId,
      guestId,
      driverId,
      vehicleId,
      pickupLocation,
      destination,
      scheduledPickupTime,
      passengerCount,
      status,
    } = body;

    const parsedTime = scheduledPickupTime ? new Date(scheduledPickupTime) : new Date();
    if (isNaN(parsedTime.getTime())) {
      return NextResponse.json(
        { success: false, error: { message: 'Valid scheduled pickup time is required.' } },
        { status: 400 }
      );
    }

    // Verify function belongs to event if provided
    if (functionId) {
      const func = await prisma.function.findFirst({
        where: { id: functionId, eventId },
      });
      if (!func) {
        return NextResponse.json(
          { success: false, error: { message: 'Function not found in this master event.' } },
          { status: 404 }
        );
      }
    }

    const trip = await prisma.trip.create({
      data: {
        eventId,
        functionId: functionId || null,
        familyId: familyId || null,
        guestId: guestId || null,
        driverId: driverId || null,
        vehicleId: vehicleId || null,
        pickupLocation: pickupLocation?.trim() || 'Hotel Lobby',
        destination: destination?.trim() || 'Ceremony Venue',
        scheduledPickupTime: parsedTime,
        passengerCount: passengerCount ? parseInt(String(passengerCount), 10) : 1,
        status: (status as TripStatus) || TripStatus.SCHEDULED,
      },
      include: {
        function: true,
        family: true,
        guest: true,
        driver: { include: { user: true } },
        vehicle: true,
      },
    });

    return NextResponse.json({
      success: true,
      ride: trip,
      message: 'Ride assigned successfully.',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ride:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create ride' } },
      { status: 500 }
    );
  }
}
