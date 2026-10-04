import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';
import { getAuthenticatedHost } from '../../../../lib/auth-server';
import { firestore, doc, setDoc } from '../../../../lib/firebase';
import { Role, AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/events/access-requests
// Hosts view all access requests for their events
// Drivers & Guests view their own access requests
export async function GET(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const searchParams = req.nextUrl.searchParams;
    const statusFilter = searchParams.get('status') as AccessRequestStatus | null;
    const roleFilter = searchParams.get('role') as Role | null;
    const eventId = searchParams.get('eventId');

    const isHost =
      caller.role === Role.EVENT_ORGANIZER ||
      caller.role === Role.ACCOUNT_OWNER ||
      caller.role === Role.SUPER_ADMIN;

    if (isHost) {
      // 1. Host view: scoped strictly to events belonging to Host's account(s)
      const hostAccountIds = caller.accountMembers?.map((am) => am.accountId) || [];

      // Find all events owned by host's accounts
      const hostEvents = await prisma.event.findMany({
        where: {
          accountId: { in: hostAccountIds },
          ...(eventId ? { id: eventId } : {}),
        },
        select: { id: true, name: true, city: true, startDate: true },
      });

      const hostEventIds = hostEvents.map((e) => e.id);

      const whereClause: any = {
        eventId: { in: hostEventIds },
      };

      if (statusFilter && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)) {
        whereClause.status = statusFilter;
      }
      if (roleFilter && ['DRIVER', 'GUEST'].includes(roleFilter)) {
        whereClause.role = roleFilter;
      }

      const requests = await prisma.eventAccessRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              avatarUrl: true,
              role: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
              city: true,
              startDate: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        requests: requests.map((r) => ({
          id: r.id,
          eventId: r.eventId,
          eventName: r.event.name,
          eventCity: r.event.city,
          eventStartDate: r.event.startDate.toISOString(),
          userId: r.userId,
          userName: r.user.fullName,
          userEmail: r.user.email,
          userPhone: r.user.phoneNumber,
          userAvatarUrl: r.user.avatarUrl,
          role: r.role,
          status: r.status,
          notes: r.notes,
          requestedAt: r.requestedAt.toISOString(),
          approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
          rejectedAt: r.rejectedAt ? r.rejectedAt.toISOString() : null,
        })),
      });
    } else {
      // 2. Driver / Guest view: scoped strictly to caller's own requests
      const whereClause: any = {
        userId: caller.id,
      };

      if (statusFilter && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)) {
        whereClause.status = statusFilter;
      }

      const requests = await prisma.eventAccessRequest.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              id: true,
              name: true,
              city: true,
              startDate: true,
              endDate: true,
              venueName: true,
              bannerUrl: true,
              status: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        requests: requests.map((r) => ({
          id: r.id,
          eventId: r.eventId,
          eventName: r.event.name,
          eventCity: r.event.city,
          eventStartDate: r.event.startDate.toISOString(),
          eventEndDate: r.event.endDate.toISOString(),
          venueName: r.event.venueName,
          bannerUrl: r.event.bannerUrl,
          eventStatus: r.event.status,
          role: r.role,
          status: r.status,
          requestedAt: r.requestedAt.toISOString(),
          approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
          rejectedAt: r.rejectedAt ? r.rejectedAt.toISOString() : null,
        })),
      });
    }
  } catch (error: any) {
    console.error('Error in GET /api/events/access-requests:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch access requests.' } },
      { status: 500 }
    );
  }
}

// POST /api/events/access-requests
// Driver or Guest submits an access code to request entry to an event
export async function POST(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const body = await req.json();
    const rawCode = (body.code || '').trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: { message: 'Access code is required.' } },
        { status: 400 }
      );
    }

    // 1. Locate the event matching this code
    const matchedEvent = await prisma.event.findFirst({
      where: {
        OR: [
          { driverAccessCode: rawCode },
          { guestAccessCode: rawCode },
          { joinCode: rawCode },
        ],
      },
      include: {
        account: true,
      },
    });

    if (!matchedEvent) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid access code. Please check and try again.' } },
        { status: 404 }
      );
    }

    // 2. Strict Role & Code Type Matching
    const isDriverCode = matchedEvent.driverAccessCode === rawCode;
    const isGuestCode =
      matchedEvent.guestAccessCode === rawCode ||
      (!matchedEvent.guestAccessCode && matchedEvent.joinCode === rawCode);

    let targetRole: Role = Role.GUEST;

    if (isDriverCode) {
      if (caller.role !== Role.DRIVER) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'This code is for drivers. Please switch to your Driver profile or enter a guest code.',
            },
          },
          { status: 400 }
        );
      }
      targetRole = Role.DRIVER;
    } else if (isGuestCode) {
      if (caller.role === Role.DRIVER) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'This code is for guests. Drivers cannot use guest access codes.',
            },
          },
          { status: 400 }
        );
      }
      targetRole = Role.GUEST;
    }

    // 3. Check for existing access request
    const existingRequest = await prisma.eventAccessRequest.findUnique({
      where: {
        eventId_userId_role: {
          eventId: matchedEvent.id,
          userId: caller.id,
          role: targetRole,
        },
      },
    });

    const now = new Date();

    if (existingRequest) {
      if (existingRequest.status === AccessRequestStatus.APPROVED) {
        return NextResponse.json({
          success: true,
          status: 'APPROVED',
          message: 'You are already approved for this event.',
          eventId: matchedEvent.id,
          eventName: matchedEvent.name,
          role: targetRole,
          requestId: existingRequest.id,
        });
      }

      if (existingRequest.status === AccessRequestStatus.PENDING) {
        return NextResponse.json({
          success: true,
          status: 'PENDING',
          message: 'Your request is already pending host approval.',
          eventId: matchedEvent.id,
          eventName: matchedEvent.name,
          role: targetRole,
          requestId: existingRequest.id,
        });
      }

      // If previously REJECTED, update back to PENDING for re-request
      const updated = await prisma.eventAccessRequest.update({
        where: { id: existingRequest.id },
        data: {
          status: AccessRequestStatus.PENDING,
          requestedAt: now,
          rejectedAt: null,
          approvedAt: null,
        },
      });

      // Sync to Firestore for realtime host notifications
      try {
        await setDoc(
          doc(firestore, 'event_access_requests', updated.id),
          {
            id: updated.id,
            eventId: matchedEvent.id,
            eventName: matchedEvent.name,
            hostAccountId: matchedEvent.accountId,
            userId: caller.id,
            userName: caller.fullName,
            userEmail: caller.email,
            userPhone: caller.phoneNumber,
            role: targetRole,
            status: 'PENDING',
            requestedAt: now.toISOString(),
          },
          { merge: true }
        );
      } catch (fsErr) {
        console.warn('Firestore sync note:', fsErr);
      }

      return NextResponse.json({
        success: true,
        status: 'PENDING',
        message: 'Request sent to host. Waiting for host approval.',
        eventId: matchedEvent.id,
        eventName: matchedEvent.name,
        role: targetRole,
        requestId: updated.id,
      });
    }

    // 4. Create new PENDING access request
    const created = await prisma.eventAccessRequest.create({
      data: {
        eventId: matchedEvent.id,
        userId: caller.id,
        role: targetRole,
        status: AccessRequestStatus.PENDING,
        requestedAt: now,
      },
    });

    // 5. Sync to Firestore for live reactive host listener
    try {
      await setDoc(
        doc(firestore, 'event_access_requests', created.id),
        {
          id: created.id,
          eventId: matchedEvent.id,
          eventName: matchedEvent.name,
          hostAccountId: matchedEvent.accountId,
          userId: caller.id,
          userName: caller.fullName,
          userEmail: caller.email,
          userPhone: caller.phoneNumber,
          role: targetRole,
          status: 'PENDING',
          requestedAt: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore sync note:', fsErr);
    }

    return NextResponse.json(
      {
        success: true,
        status: 'PENDING',
        message: 'Request sent to host. Waiting for host approval.',
        eventId: matchedEvent.id,
        eventName: matchedEvent.name,
        role: targetRole,
        requestId: created.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/events/access-requests:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to submit event access request.' } },
      { status: 500 }
    );
  }
}
