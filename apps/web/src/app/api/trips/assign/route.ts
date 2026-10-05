import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';
import {
  defaultDriverAssignmentEngine,
  DriverCandidate,
  TripRequirement,
} from '../../../../lib/safar-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    // Role check: Host / Organizer / Super Admin
    const isHost =
      caller.role === 'EVENT_ORGANIZER' ||
      caller.role === 'ACCOUNT_OWNER' ||
      caller.role === 'SUPER_ADMIN' ||
      caller.role === 'DISPATCHER';

    if (!isHost) {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden: Only event organizers or dispatchers can assign drivers.' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tripId, autoAssign, requestedCategory } = body;

    if (!tripId || !/^[0-9a-fA-F]{24}$/.test(tripId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Valid Trip ID is required.' } },
        { status: 400 }
      );
    }

    // 1. Fetch Trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        event: true,
        originPlace: true,
        destinationPlace: true,
        bookings: true,
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    const totalPassengers = trip.bookings.reduce((sum, b) => sum + (b.passengerCount || 1), 0) || 1;

    // 2. Fetch all drivers for the trip's account
    const drivers = await prisma.driver.findMany({
      where: { accountId: trip.event.accountId },
      include: {
        user: { select: { fullName: true, phoneNumber: true } },
        currentVehicle: true,
        trips: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          select: { id: true },
        },
      },
    });

    // 3. Transform to DriverCandidate schema
    const candidates: DriverCandidate[] = drivers.map((d) => ({
      id: d.id,
      userId: d.userId,
      fullName: d.user?.fullName || 'Driver',
      phoneNumber: d.user?.phoneNumber || undefined,
      dutyStatus: d.dutyStatus as any,
      currentLocation: d.currentVehicle?.currentLat && d.currentVehicle?.currentLng
        ? { latitude: d.currentVehicle.currentLat, longitude: d.currentVehicle.currentLng }
        : undefined,
      lastPingAt: d.currentVehicle?.lastPingAt,
      currentVehicle: d.currentVehicle
        ? {
            id: d.currentVehicle.id,
            model: d.currentVehicle.model,
            plateNumber: d.currentVehicle.plateNumber,
            category: d.currentVehicle.category as any,
            capacity: d.currentVehicle.capacity,
            isActive: d.currentVehicle.isActive,
          }
        : null,
      activeTripsCountToday: d.trips.length,
    }));

    const tripRequirement: TripRequirement = {
      id: trip.id,
      eventId: trip.eventId,
      originLat: trip.originPlace?.latitude || 23.0225,
      originLng: trip.originPlace?.longitude || 72.5714,
      destinationLat: trip.destinationPlace?.latitude || 23.0338,
      destinationLng: trip.destinationPlace?.longitude || 72.585,
      scheduledPickupTime: trip.scheduledPickupTime,
      passengerCount: totalPassengers,
      requestedCategory: requestedCategory || undefined,
    };

    // 4. Score and rank candidates using SAFAR Algorithmic Engine
    const rankedCandidates = defaultDriverAssignmentEngine.rankCandidates(
      candidates,
      tripRequirement
    );

    // If autoAssign requested, pick the top candidate
    if (autoAssign && rankedCandidates.length > 0 && rankedCandidates[0].isEligible) {
      const best = rankedCandidates[0];
      
      const updatedTrip = await prisma.$transaction(async (tx) => {
        const t = await tx.trip.update({
          where: { id: tripId },
          data: {
            driverId: best.driver.id,
            vehicleId: best.driver.currentVehicle?.id || null,
            status: 'ASSIGNED',
          },
          include: {
            driver: { include: { user: true } },
            vehicle: true,
          },
        });

        await tx.tripAssignment.upsert({
          where: {
            tripId_driverId: {
              tripId,
              driverId: best.driver.id,
            },
          },
          create: {
            tripId,
            driverId: best.driver.id,
            assignedAt: new Date(),
          },
          update: {
            assignedAt: new Date(),
          },
        });

        return t;
      });

      return NextResponse.json({
        success: true,
        assigned: true,
        bestMatch: best,
        trip: updatedTrip,
      });
    }

    return NextResponse.json({
      success: true,
      tripId,
      requiredPassengers: totalPassengers,
      rankedCandidates,
    });
  } catch (error: any) {
    console.error('Error in driver assignment handler:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Internal server error.' } },
      { status: 500 }
    );
  }
}
