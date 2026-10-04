import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost } from '../../../../../../lib/auth-server';
import { firestore, doc, setDoc } from '../../../../../../lib/firebase';
import { Role, AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/events/access-requests/[id]/approve
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

    // 1. Fetch request with event to enforce Host Isolation
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

    // 2. Perform transaction: update status, upsert EventMember, link Driver/Guest
    const updated = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.eventAccessRequest.update({
        where: { id: requestId },
        data: {
          status: AccessRequestStatus.APPROVED,
          approvedAt: now,
          rejectedAt: null,
        },
      });

      // Upsert EventMember
      await tx.eventMember.upsert({
        where: {
          eventId_userId: {
            eventId: accessRequest.eventId,
            userId: accessRequest.userId,
          },
        },
        create: {
          eventId: accessRequest.eventId,
          userId: accessRequest.userId,
          role: accessRequest.role,
        },
        update: {
          role: accessRequest.role,
        },
      });

      // If GUEST, create or ensure Guest and EventGuest records
      if (accessRequest.role === Role.GUEST) {
        let guestRecord = await tx.guest.findFirst({
          where: {
            accountId: context.account.id,
            OR: [
              { userId: accessRequest.userId },
              { email: accessRequest.user.email || undefined },
            ],
          },
        });

        if (!guestRecord) {
          guestRecord = await tx.guest.create({
            data: {
              accountId: context.account.id,
              eventId: accessRequest.eventId,
              userId: accessRequest.userId,
              fullName: accessRequest.user.fullName,
              email: accessRequest.user.email,
              phoneNumber: accessRequest.user.phoneNumber,
              status: 'CONFIRMED',
            },
          });
        }

        await tx.eventGuest.upsert({
          where: {
            eventId_guestId: {
              eventId: accessRequest.eventId,
              guestId: guestRecord.id,
            },
          },
          create: {
            eventId: accessRequest.eventId,
            guestId: guestRecord.id,
            status: 'CONFIRMED',
          },
          update: {
            status: 'CONFIRMED',
          },
        });
      }

      // If DRIVER, ensure Driver record is affiliated with account
      if (accessRequest.role === Role.DRIVER) {
        const driverRecord = await tx.driver.findFirst({
          where: { userId: accessRequest.userId },
        });

        if (!driverRecord) {
          await tx.driver.create({
            data: {
              accountId: context.account.id,
              userId: accessRequest.userId,
              licenseNumber: `DL-${accessRequest.userId.slice(-6).toUpperCase()}`,
              isVerified: true,
              approvalStatus: 'APPROVED',
            },
          });
        }
      }

      return reqUpdated;
    });

    // 3. Realtime Firestore Document Sync for Instant Zero-Refresh Client Notification
    try {
      await setDoc(
        doc(firestore, 'event_access_requests', requestId),
        {
          id: requestId,
          eventId: accessRequest.eventId,
          eventName: accessRequest.event.name,
          userId: accessRequest.userId,
          role: accessRequest.role,
          status: 'APPROVED',
          approvedAt: now.toISOString(),
          lastUpdated: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore approval sync warning:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: `${accessRequest.user.fullName} has been approved for ${accessRequest.event.name}.`,
      request: {
        id: updated.id,
        status: updated.status,
        approvedAt: updated.approvedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in approving access request:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to approve access request.' } },
      { status: 500 }
    );
  }
}
