import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { TripStatus } from '@prisma/client';
import { firestore, doc, setDoc } from '../../../../../lib/firebase';
import { validateTripTransition } from '../../../../../lib/trip-state-machine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// POST /api/trips/:id/start - Driver starts the trip
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const tripId = params.id;
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        event: true,
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    // Authorization: only the assigned driver or event organizer can start the trip
    const isDriver = trip.driver?.userId === caller.id;
    const isHost = caller.role === 'EVENT_ORGANIZER' || caller.role === 'ACCOUNT_OWNER' || caller.role === 'SUPER_ADMIN';

    if (!isDriver && !isHost) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized: Only the assigned chauffeur can start this trip.' } },
        { status: 403 }
      );
    }

    // Validate state transition through domain state machine
    try {
      validateTripTransition(trip.status, TripStatus.IN_TRANSIT);
    } catch (transitionErr: any) {
      return NextResponse.json(
        { success: false, error: { message: transitionErr.message } },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.IN_TRANSIT,
          actualStartTime: trip.actualStartTime || now,
        },
      });

      // Log trip audit event
      await tx.tripEvent.create({
        data: {
          tripId,
          actorId: caller.id,
          fromStatus: trip.status,
          toStatus: TripStatus.IN_TRANSIT,
          reason: 'Chauffeur started trip',
        },
      });

      return updatedTrip;
    });

    // Realtime Firestore sync for zero-refresh guest tracking
    try {
      await setDoc(
        doc(firestore, 'trips', tripId),
        {
          id: tripId,
          eventId: trip.eventId,
          status: 'IN_TRANSIT',
          actualStartTime: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore trip start sync note:', fsErr);
    }

    return NextResponse.json({
      success: true,
      trip: updated,
      message: 'Trip started. Live GPS tracking and distance accumulation active.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/trips/:id/start:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to start trip.' } },
      { status: 500 }
    );
  }
}
