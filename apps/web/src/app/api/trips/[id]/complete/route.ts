import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { BookingStatus, TripStatus } from '@prisma/client';
import { firestore, doc, setDoc } from '../../../../../lib/firebase';
import { validateTripTransition } from '../../../../../lib/trip-state-machine';
import { calculateTripCost } from '../../../../../lib/pricing-engine';
import { defaultRealtimeStateEngine } from '../../../../../lib/safar-engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// POST /api/trips/:id/complete - Driver or Host completes the trip and finalizes pricing
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const tripId = params.id;
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        event: true,
        bookings: true,
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    // Authorization: only the assigned driver or host can complete the trip
    const isDriver = trip.driver?.userId === caller.id;
    const isHost = caller.role === 'EVENT_ORGANIZER' || caller.role === 'ACCOUNT_OWNER' || caller.role === 'SUPER_ADMIN';

    if (!isDriver && !isHost) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized: Only the assigned driver or host can complete this trip.' } },
        { status: 403 }
      );
    }

    // Validate state transition through domain state machine
    try {
      validateTripTransition(trip.status, TripStatus.COMPLETED);
    } catch (transitionErr: any) {
      return NextResponse.json(
        { success: false, error: { message: transitionErr.message } },
        { status: 400 }
      );
    }

    const now = new Date();
    const startTime = trip.actualStartTime || trip.scheduledPickupTime || now;
    const durationMinutes = Math.max(1, Math.round((now.getTime() - new Date(startTime).getTime()) / 60000));
    
    // Determine real distance
    const finalDistanceKm = Math.max(
      0.1,
      trip.actualDistanceKm && trip.actualDistanceKm > 0
        ? trip.actualDistanceKm
        : (trip.plannedDistanceKm || 5.0)
    );

    // Calculate deterministic cost using pricing engine
    const costBreakdown = calculateTripCost({
      vehicleCategory: trip.vehicle?.category || 'SEDAN',
      distanceKm: finalDistanceKm,
      durationMinutes,
      waitingMinutes: 0,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.COMPLETED,
          actualEndTime: now,
          actualDistanceKm: finalDistanceKm,
          actualCost: costBreakdown.totalCost,
        },
        include: {
          driver: { include: { user: true } },
          vehicle: true,
        },
      });

      // Update associated bookings to COMPLETED
      await tx.booking.updateMany({
        where: { tripId },
        data: { status: BookingStatus.COMPLETED },
      });

      // Log trip audit event
      await tx.tripEvent.create({
        data: {
          tripId,
          actorId: caller.id,
          fromStatus: trip.status,
          toStatus: TripStatus.COMPLETED,
          reason: `Trip completed with distance ${finalDistanceKm} km, final cost ₹${costBreakdown.totalCost}`,
        },
      });

      return updatedTrip;
    });

    // Lifecycle cleanup in realtime state engine
    defaultRealtimeStateEngine.evictTrip(tripId);

    // Sync final completion to Firestore
    try {
      await setDoc(
        doc(firestore, 'trips', tripId),
        {
          id: tripId,
          eventId: trip.eventId,
          status: 'COMPLETED',
          actualEndTime: now.toISOString(),
          actualDistanceKm: finalDistanceKm,
          actualCost: costBreakdown.totalCost,
          updatedAt: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore trip complete sync note:', fsErr);
    }

    return NextResponse.json({
      success: true,
      trip: updated,
      costBreakdown,
      message: 'Trip completed successfully. Final cost and distance calculated.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/trips/:id/complete:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to complete trip.' } },
      { status: 500 }
    );
  }
}
