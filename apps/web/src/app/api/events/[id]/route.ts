import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/events/:id - Get event details with guest, fleet, and transport breakdown
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const fullEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        transportRequirements: true,
        places: true,
        trips: {
          include: {
            driver: { include: { user: true } },
            vehicle: true,
            originPlace: true,
            destinationPlace: true,
          },
          orderBy: { scheduledPickupTime: 'asc' },
        },
        eventGuests: {
          include: {
            guest: {
              include: { family: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        subEvents: {
          include: {
            transportRequirements: true,
            _count: { select: { eventGuests: true, trips: true } },
          },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!fullEvent) {
      return NextResponse.json(
        { success: false, error: { message: 'Event not found' } },
        { status: 404 }
      );
    }

    // Calculate real metrics
    const totalGuests = fullEvent.eventGuests.reduce((sum, eg) => sum + (eg.guest?.memberCount || 1), 0);
    const assignedTrips = fullEvent.trips.filter((t) => t.driverId && t.vehicleId).length;
    const assignedVehiclesCount = new Set(fullEvent.trips.map((t) => t.vehicleId).filter(Boolean)).size;
    const assignedDriversCount = new Set(fullEvent.trips.map((t) => t.driverId).filter(Boolean)).size;

    return NextResponse.json({
      success: true,
      event: {
        ...fullEvent,
        totalGuests,
        assignedTrips,
        assignedVehiclesCount,
        assignedDriversCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching event details:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error fetching event' } },
      { status: 500 }
    );
  }
}

// PATCH /api/events/:id - Update event details and transport requirements
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

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
      status,
      transport,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (eventType !== undefined) updateData.eventType = eventType;
    if (city !== undefined) updateData.city = city.trim();
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (venueName !== undefined) updateData.venueName = venueName.trim();
    if (venueAddress !== undefined) updateData.venueAddress = venueAddress.trim();
    if (venueLatitude !== undefined) updateData.venueLatitude = venueLatitude ? parseFloat(venueLatitude) : null;
    if (venueLongitude !== undefined) updateData.venueLongitude = venueLongitude ? parseFloat(venueLongitude) : null;
    if (expectedGuestCount !== undefined) updateData.expectedGuestCount = parseInt(String(expectedGuestCount), 10);
    if (description !== undefined) updateData.description = description;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.update({
        where: { id: eventId },
        data: updateData,
      });

      // Update venue place if venue changed
      if (venueName) {
        const existingPlace = await tx.place.findFirst({
          where: { eventId, type: 'VENUE' },
        });
        if (existingPlace) {
          await tx.place.update({
            where: { id: existingPlace.id },
            data: {
              name: venueName.trim(),
              address: venueAddress?.trim() || venueName.trim(),
              latitude: venueLatitude ? parseFloat(venueLatitude) : existingPlace.latitude,
              longitude: venueLongitude ? parseFloat(venueLongitude) : existingPlace.longitude,
            },
          });
        } else {
          await tx.place.create({
            data: {
              eventId,
              name: venueName.trim(),
              address: venueAddress?.trim() || venueName.trim(),
              latitude: venueLatitude ? parseFloat(venueLatitude) : 23.0225,
              longitude: venueLongitude ? parseFloat(venueLongitude) : 72.5714,
              type: 'VENUE',
            },
          });
        }
      }

      // Update or create transport requirement if passed
      if (transport) {
        const existingReq = await tx.eventTransportRequirement.findFirst({
          where: { eventId },
        });

        const transportData = {
          pickupRequired: Boolean(transport.pickupRequired),
          dropRequired: Boolean(transport.dropRequired),
          pickupLocation: transport.pickupLocation?.trim() || null,
          dropLocation: transport.dropLocation?.trim() || null,
          pickupDate: transport.pickupDate ? new Date(transport.pickupDate) : (updateData.startDate || event.startDate),
          pickupTime: transport.pickupTime?.trim() || updateData.startTime || event.startTime || null,
          vehicleType: transport.vehicleType?.trim() || 'Sedan',
          numberOfVehicles: transport.numberOfVehicles ? parseInt(String(transport.numberOfVehicles), 10) : 1,
          specialInstructions: transport.specialInstructions?.trim() || null,
        };

        if (existingReq) {
          await tx.eventTransportRequirement.update({
            where: { id: existingReq.id },
            data: transportData,
          });
        } else {
          await tx.eventTransportRequirement.create({
            data: {
              eventId,
              ...transportData,
            },
          });
        }
      }

      return ev;
    });

    const fullUpdated = await prisma.event.findUnique({
      where: { id: eventId },
      include: { transportRequirements: true },
    });

    return NextResponse.json({
      success: true,
      event: fullUpdated,
    });
  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error while updating event' } },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:id - Delete an event/function
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({
      success: true,
      message: 'Event and associated records deleted successfully.',
    });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error while deleting event' } },
      { status: 500 }
    );
  }
}
