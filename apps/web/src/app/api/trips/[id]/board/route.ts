import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { verifyPassengerBoarding } from '../../../../../lib/boarding-service';
import { firestore, doc, setDoc } from '../../../../../lib/firebase';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// POST /api/trips/:id/board - Chauffeur or Host enters guest boarding code
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const tripId = params.id;
    const body = await req.json();
    const boardingCode = body.boardingCode || body.code;

    if (!boardingCode) {
      return NextResponse.json(
        { success: false, error: { message: 'Boarding code is required.' } },
        { status: 400 }
      );
    }

    const isHost = caller.role === 'EVENT_ORGANIZER' || caller.role === 'ACCOUNT_OWNER' || caller.role === 'SUPER_ADMIN';

    const result = await verifyPassengerBoarding({
      tripId,
      driverUserId: caller.id,
      boardingCode: String(boardingCode),
      isHost,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: result.message, code: result.error } },
        { status: 400 }
      );
    }

    // Log boarding event audit trail
    try {
      await prisma.tripEvent.create({
        data: {
          tripId,
          actorId: caller.id,
          fromStatus: 'BOARDING',
          toStatus: 'BOARDING',
          reason: `Guest ${result.booking?.guest?.fullName || 'Passenger'} successfully boarded (Code verified)`,
        },
      });
    } catch (auditErr) {
      console.warn('Trip boarding audit log note:', auditErr);
    }

    // Realtime Firestore sync
    try {
      await setDoc(
        doc(firestore, 'trips', tripId),
        {
          id: tripId,
          status: 'BOARDING',
          lastBoardedGuestId: result.booking?.guestId,
          lastBoardedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore trip boarding sync note:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      booking: result.booking,
    });
  } catch (error: any) {
    console.error('Error in POST /api/trips/:id/board:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to verify boarding.' } },
      { status: 500 }
    );
  }
}
