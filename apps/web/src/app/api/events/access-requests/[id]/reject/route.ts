import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost } from '../../../../../../lib/auth-server';
import { firestore, doc, setDoc } from '../../../../../../lib/firebase';
import { AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/events/access-requests/[id]/reject
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const requestId = params.id;
    if (!requestId || !/^[0-9a-fA-F]{24}$/.test(requestId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request ID.' } },
        { status: 400 }
      );
    }

    const accessRequest = await prisma.eventAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        event: true,
        user: true,
      },
    });

    if (!accessRequest) {
      return NextResponse.json(
        { success: false, error: { message: 'Access request not found.' } },
        { status: 404 }
      );
    }

    // Host Isolation: verify the event belongs to this host's account
    if (accessRequest.event.accountId !== context.account.id) {
      return NextResponse.json(
        { success: false, error: { message: 'Forbidden: You cannot manage requests for another host’s event.' } },
        { status: 403 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.eventAccessRequest.update({
        where: { id: requestId },
        data: {
          status: AccessRequestStatus.REJECTED,
          rejectedAt: now,
        },
      });

      // Remove EventMember if existed
      await tx.eventMember.deleteMany({
        where: {
          eventId: accessRequest.eventId,
          userId: accessRequest.userId,
        },
      });

      // If DRIVER, mark DriverEvent as REJECTED
      if (accessRequest.role === 'DRIVER') {
        const driver = await tx.driver.findFirst({
          where: { userId: accessRequest.userId },
        });
        if (driver) {
          await tx.driverEvent.updateMany({
            where: {
              driverId: driver.id,
              eventId: accessRequest.eventId,
            },
            data: {
              status: 'REJECTED',
              rejectedAt: now,
            },
          });
        }
      }

      return reqUpdated;
    });

    // Realtime Firestore Document Sync for Instant Zero-Refresh Client Notification
    try {
      await setDoc(
        doc(firestore, 'event_access_requests', requestId),
        {
          id: requestId,
          eventId: accessRequest.eventId,
          eventName: accessRequest.event.name,
          userId: accessRequest.userId,
          role: accessRequest.role,
          status: 'REJECTED',
          rejectedAt: now.toISOString(),
          lastUpdated: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore rejection sync warning:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: `Request for ${accessRequest.user.fullName} has been rejected.`,
      request: {
        id: updated.id,
        status: updated.status,
        rejectedAt: updated.rejectedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in rejecting access request:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to reject access request.' } },
      { status: 500 }
    );
  }
}
