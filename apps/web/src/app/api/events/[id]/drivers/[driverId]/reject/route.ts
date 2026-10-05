import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../../lib/auth-server';
import { firestore, doc, setDoc } from '../../../../../../../lib/firebase';
import { AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string; driverId: string };
}

// POST /api/events/:id/drivers/:driverId/reject - Host rejects or revokes driver for this event
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, driverId } = params;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) {
      return NextResponse.json(
        { success: false, error: { message: 'Driver not found.' } },
        { status: 404 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update DriverEvent to REJECTED
      const de = await tx.driverEvent.upsert({
        where: {
          driverId_eventId: {
            driverId,
            eventId,
          },
        },
        create: {
          driverId,
          eventId,
          status: 'REJECTED',
          requestedAt: now,
          rejectedAt: now,
        },
        update: {
          status: 'REJECTED',
          rejectedAt: now,
        },
      });

      // 2. Remove EventMember membership if existed
      if (driver.userId) {
        await tx.eventMember.deleteMany({
          where: {
            eventId,
            userId: driver.userId,
          },
        });

        // 3. Update EventAccessRequest to REJECTED
        await tx.eventAccessRequest.updateMany({
          where: {
            eventId,
            userId: driver.userId,
            role: 'DRIVER',
          },
          data: {
            status: AccessRequestStatus.REJECTED,
            rejectedAt: now,
          },
        });
      }

      return de;
    });

    // Realtime broadcast to Firestore
    try {
      if (driver.userId) {
        await setDoc(
          doc(firestore, 'event_access_requests', `${eventId}_${driver.userId}`),
          {
            eventId,
            eventName: event.name,
            userId: driver.userId,
            role: 'DRIVER',
            status: 'REJECTED',
            rejectedAt: now.toISOString(),
            lastUpdated: now.toISOString(),
          },
          { merge: true }
        );
      }
    } catch (fsErr) {
      console.warn('Firestore driver reject sync note:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: `Driver ${driver.user?.fullName || 'Chauffeur'} rejected for ${event.name}.`,
      driverEvent: updated,
    });
  } catch (error: any) {
    console.error('Error rejecting driver:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to reject driver.' } },
      { status: 500 }
    );
  }
}
