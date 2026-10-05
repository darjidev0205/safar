import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';
import { TripStatus } from '@prisma/client';
import { firestore, doc, setDoc } from '../../../../lib/firebase';
import {
  defaultTripStateMachine,
  defaultRealtimeStateEngine,
  defaultAccessEngine,
} from '../../../../lib/safar-engine';
import { calculateTripPricing } from '../../../../lib/location-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const tripId = params.id;
    if (!tripId || !/^[0-9a-fA-F]{24}$/.test(tripId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid Trip ID.' } },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        event: { select: { id: true, name: true, city: true, accountId: true } },
        driver: { include: { user: { select: { fullName: true, phoneNumber: true, avatarUrl: true } } } },
        vehicle: true,
        originPlace: true,
        destinationPlace: true,
        bookings: {
          include: {
            guest: { select: { id: true, fullName: true, phoneNumber: true, userId: true } },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    // Role-based authorization & data minimization
    const isHost = caller.role === 'EVENT_ORGANIZER' || caller.role === 'ACCOUNT_OWNER' || caller.role === 'SUPER_ADMIN';
    const isAssignedDriver = trip.driver?.userId === caller.id;
    const isAuthorizedGuest = trip.bookings.some((b) => b.guest.userId === caller.id);

    if (!isHost && !isAssignedDriver && !isAuthorizedGuest) {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden: You are not authorized to view this trip.' } },
        { status: 403 }
      );
    }

    // If caller is Guest, enforce Guest privacy boundaries via Access Engine
    if (isAuthorizedGuest && !isHost && !isAssignedDriver) {
      const sanitized = defaultAccessEngine.sanitizeTripForGuest(trip);
      const guestBooking = trip.bookings.find((b) => b.guest.userId === caller.id);
      
      return NextResponse.json({
        success: true,
        trip: {
          ...sanitized,
          boardingCode: guestBooking?.boardingCode || '4827',
        },
      });
    }

    // Full Host / Driver response
    return NextResponse.json({
      success: true,
      trip: {
        id: trip.id,
        eventId: trip.eventId,
        eventName: trip.event.name,
        status: trip.status,
        scheduledPickupTime: trip.scheduledPickupTime.toISOString(),
        estimatedArrivalTime: trip.estimatedArrivalTime?.toISOString(),
        actualStartTime: trip.actualStartTime?.toISOString(),
        actualEndTime: trip.actualEndTime?.toISOString(),
        plannedDistanceKm: trip.plannedDistanceKm,
        actualDistanceKm: trip.actualDistanceKm,
        remainingDistanceKm: trip.remainingDistanceKm,
        currentLat: trip.currentLat,
        currentLng: trip.currentLng,
        currentSpeed: trip.currentSpeed,
        currentHeading: trip.currentHeading,
        origin: trip.originPlace,
        destination: trip.destinationPlace,
        vehicle: trip.vehicle,
        driver: trip.driver
          ? {
              id: trip.driver.id,
              userId: trip.driver.userId,
              fullName: trip.driver.user.fullName,
              phoneNumber: trip.driver.user.phoneNumber,
              licenseNumber: trip.driver.licenseNumber,
              avatarUrl: trip.driver.user.avatarUrl,
            }
          : null,
        passengers: trip.bookings.map((b) => ({
          bookingId: b.id,
          guestId: b.guestId,
          guestName: b.guest.fullName,
          guestPhone: b.guest.phoneNumber,
          passengerCount: b.passengerCount,
          boardingCode: b.boardingCode,
          status: b.status,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Internal server error.' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const tripId = params.id;
    if (!tripId || !/^[0-9a-fA-F]{24}$/.test(tripId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid Trip ID.' } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const newStatus = body.status as TripStatus;

    if (!newStatus || !Object.values(TripStatus).includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: { message: `Invalid status: ${newStatus}` } },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true, vehicle: true },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    // Role check: Only assigned Driver or Host can update trip state
    const isHost = caller.role === 'EVENT_ORGANIZER' || caller.role === 'ACCOUNT_OWNER' || caller.role === 'SUPER_ADMIN';
    const isAssignedDriver = trip.driver?.userId === caller.id;

    if (!isHost && !isAssignedDriver) {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden: Only the assigned driver or host can change trip status.' } },
        { status: 403 }
      );
    }

    // Authoritative State Machine Validation
    const currentStatus = trip.status;
    const transitionValidation = defaultTripStateMachine.validateTransition(
      currentStatus as any,
      newStatus as any,
      caller.role
    );

    if (!transitionValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: transitionValidation.error || `Invalid state transition from ${currentStatus} to ${newStatus}.`,
          },
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: any = {
      status: newStatus,
    };

    if (newStatus === TripStatus.IN_TRANSIT && !trip.actualStartTime) {
      updateData.actualStartTime = now;
    } else if (newStatus === TripStatus.COMPLETED) {
      updateData.actualEndTime = now;
      // Requirement 14: Final transportation cost must be based on actual distance
      const pricing = calculateTripPricing({
        actualDistanceKm: trip.actualDistanceKm || 0,
        vehicleCategory: trip.vehicle?.category || 'SUV',
      });
      updateData.actualCost = pricing.totalCost;
    }

    const updatedTrip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.update({
        where: { id: tripId },
        data: updateData,
      });

      await tx.tripEvent.create({
        data: {
          tripId,
          actorId: caller.id,
          fromStatus: currentStatus,
          toStatus: newStatus,
          reason: body.reason || `Status updated to ${newStatus}`,
        },
      });

      // Update associated bookings if completed or cancelled
      if (newStatus === TripStatus.COMPLETED) {
        await tx.booking.updateMany({
          where: { tripId },
          data: { status: 'COMPLETED' },
        });
      } else if (newStatus === TripStatus.CANCELLED) {
        await tx.booking.updateMany({
          where: { tripId },
          data: { status: 'CANCELLED' },
        });
      }

      return t;
    });

    // Lifecycle Eviction on Terminal States (prevent memory buildup)
    if (transitionValidation.isTerminal) {
      defaultRealtimeStateEngine.evictTrip(tripId);
    }

    // Realtime update to Firestore
    try {
      await setDoc(
        doc(firestore, 'live_trips', tripId),
        {
          tripId,
          status: newStatus,
          actualDistanceKm: trip.actualDistanceKm || 0,
          actualCost: updateData.actualCost || trip.actualCost || undefined,
          lastUpdated: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore trip status sync note:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: `Trip status updated to ${newStatus}.`,
      trip: updatedTrip,
    });
  } catch (error: any) {
    console.error('Error updating trip status:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Internal server error.' } },
      { status: 500 }
    );
  }
}
