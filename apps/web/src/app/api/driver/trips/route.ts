import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';
import { Role, TripStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/driver/trips - Query ONLY rides assigned to the authenticated driver
export async function GET(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    if (caller.role !== Role.DRIVER && caller.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied: Caller is not a registered Driver.' } },
        { status: 403 }
      );
    }

    // Find driver record
    const driverRecord = await prisma.driver.findFirst({
      where: { userId: caller.id },
      include: {
        currentVehicle: true,
        event: true,
      },
    });

    if (!driverRecord) {
      return NextResponse.json({
        success: true,
        driver: null,
        assignedRides: [],
        message: 'No driver profile linked to current account.',
      });
    }

    // Optional eventId query filter if driver is assigned to multiple events, otherwise driverRecord.eventId or all assigned trips
    const eventIdParam = req.nextUrl.searchParams.get('eventId') || driverRecord.eventId;

    const where: any = {
      driverId: driverRecord.id,
    };
    if (eventIdParam) {
      where.eventId = eventIdParam;
    }

    // Server-side strict query: ONLY rides assigned to this driver
    const assignedTrips = await prisma.trip.findMany({
      where,
      include: {
        event: true,
        function: true,
        family: {
          include: { guests: true },
        },
        guest: true,
        vehicle: true,
      },
      orderBy: { scheduledPickupTime: 'asc' },
    });

    const formattedRides = assignedTrips.map((trip) => {
      // Determine passenger display name (e.g. "Shah Family (4 Members)" or "Aarav Patel")
      let passengerTitle = 'Guest Transfer';
      if (trip.family) {
        passengerTitle = `${trip.family.name} (${trip.passengerCount || trip.family.guests.length} Guests)`;
      } else if (trip.guest) {
        passengerTitle = `${trip.guest.fullName}${trip.guest.memberCount > 1 ? ` + ${trip.guest.memberCount - 1} Guests` : ''}`;
      }

      const passengerContact = trip.guest?.phoneNumber || trip.family?.guests[0]?.phoneNumber || null;

      return {
        id: trip.id,
        eventId: trip.eventId,
        eventName: trip.event?.name || 'Wedding Event',
        masterEventCode: trip.event?.joinCode || null,
        functionId: trip.functionId,
        functionName: trip.function?.name || 'Ceremonial Transfer',
        functionVenue: trip.function?.venueName || trip.event?.venueName || null,
        passengerTitle,
        passengerContact,
        passengerCount: trip.passengerCount,
        pickupLocation: trip.pickupLocation || 'Pickup Point',
        destination: trip.destination || trip.function?.venueName || 'Venue Lawn',
        scheduledPickupTime: trip.scheduledPickupTime.toISOString(),
        actualStartTime: trip.actualStartTime?.toISOString() || null,
        actualEndTime: trip.actualEndTime?.toISOString() || null,
        status: trip.status,
        vehicle: {
          id: trip.vehicle?.id || driverRecord.currentVehicle?.id || null,
          model: trip.vehicle?.model || driverRecord.currentVehicle?.model || 'Assigned Cab',
          plateNumber: trip.vehicle?.plateNumber || driverRecord.currentVehicle?.plateNumber || 'GJ-01',
          category: trip.vehicle?.category || driverRecord.currentVehicle?.category || 'SUV',
          capacity: trip.vehicle?.capacity || driverRecord.currentVehicle?.capacity || 6,
        },
      };
    });

    return NextResponse.json({
      success: true,
      driver: {
        id: driverRecord.id,
        fullName: caller.fullName,
        phoneNumber: caller.phoneNumber,
        licenseNumber: driverRecord.licenseNumber,
        dutyStatus: driverRecord.dutyStatus,
        vehicle: driverRecord.currentVehicle
          ? {
              id: driverRecord.currentVehicle.id,
              model: driverRecord.currentVehicle.model,
              plateNumber: driverRecord.currentVehicle.plateNumber,
              capacity: driverRecord.currentVehicle.capacity,
            }
          : null,
      },
      assignedRides: formattedRides,
    });
  } catch (error: any) {
    console.error('Error fetching driver assigned rides:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch driver rides.' } },
      { status: 500 }
    );
  }
}

// PATCH /api/driver/trips - Update ride status by driver
export async function PATCH(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    if (caller.role !== Role.DRIVER && caller.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied: Caller is not a registered Driver.' } },
        { status: 403 }
      );
    }

    const driverRecord = await prisma.driver.findFirst({
      where: { userId: caller.id },
    });

    if (!driverRecord) {
      return NextResponse.json(
        { success: false, error: { message: 'Driver profile not found.' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { tripId, status, currentLat, currentLng } = body;

    if (!tripId || !status) {
      return NextResponse.json(
        { success: false, error: { message: 'tripId and status are required.' } },
        { status: 400 }
      );
    }

    // Server-side validation: ensure this trip is indeed assigned to this driver
    const existingTrip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId: driverRecord.id,
      },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { success: false, error: { message: 'Ride not found or not assigned to you.' } },
        { status: 404 }
      );
    }

    const updateData: any = {
      status: status as TripStatus,
    };
    if (status === TripStatus.IN_TRANSIT && !existingTrip.actualStartTime) {
      updateData.actualStartTime = new Date();
    } else if (status === TripStatus.COMPLETED && !existingTrip.actualEndTime) {
      updateData.actualEndTime = new Date();
    }
    if (currentLat !== undefined && currentLng !== undefined) {
      updateData.currentLat = parseFloat(currentLat);
      updateData.currentLng = parseFloat(currentLng);
      updateData.lastPingAt = new Date();
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      message: `Ride status updated to ${status}.`,
    });
  } catch (error: any) {
    console.error('Error updating driver trip status:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update ride status.' } },
      { status: 500 }
    );
  }
}
