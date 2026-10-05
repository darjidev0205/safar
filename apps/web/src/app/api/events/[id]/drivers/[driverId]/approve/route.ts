import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../../lib/auth-server';
import { firestore, doc, setDoc } from '../../../../../../../lib/firebase';
import { AccessRequestStatus, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string; driverId: string };
}

// POST /api/events/:id/drivers/:driverId/approve - Host approves driver for this event
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
      // 1. Upsert DriverEvent as APPROVED
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
          status: 'APPROVED',
          requestedAt: now,
          approvedAt: now,
          approvedBy: context.user.id,
        },
        update: {
          status: 'APPROVED',
          approvedAt: now,
          approvedBy: context.user.id,
          rejectedAt: null,
        },
      });

      // 2. Upsert EventMember
      if (driver.userId) {
        await tx.eventMember.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId: driver.userId,
            },
          },
          create: {
            eventId,
            userId: driver.userId,
            role: Role.DRIVER,
          },
          update: {
            role: Role.DRIVER,
          },
        });

        // 3. Update EventAccessRequest if present
        await tx.eventAccessRequest.updateMany({
          where: {
            eventId,
            userId: driver.userId,
            role: Role.DRIVER,
          },
          data: {
            status: AccessRequestStatus.APPROVED,
            approvedAt: now,
            rejectedAt: null,
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
            status: 'APPROVED',
            approvedAt: now.toISOString(),
            lastUpdated: now.toISOString(),
          },
          { merge: true }
        );
      }
    } catch (fsErr) {
      console.warn('Firestore driver approve sync note:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: `Driver ${driver.user?.fullName || 'Chauffeur'} approved for ${event.name}.`,
      driverEvent: updated,
    });
  } catch (error: any) {
    console.error('Error approving driver:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to approve driver.' } },
      { status: 500 }
    );
  }
}
