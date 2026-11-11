import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser, isValidObjectId } from '../../../../../lib/caller-auth';
import { AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/guest/events/leave - Guest leaves an event they previously joined
export async function POST(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const body = await req.json();
    const eventId = body.eventId;

    if (!eventId || !isValidObjectId(eventId)) {
      return NextResponse.json(
        { success: false, error: { message: 'A valid event ID is required.' } },
        { status: 400 }
      );
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, accountId: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { message: 'Event not found.' } },
        { status: 404 }
      );
    }

    // Find the caller's guest record
    const guest = await prisma.guest.findFirst({
      where: {
        accountId: event.accountId,
        OR: [
          { userId: caller.id },
          ...(caller.email ? [{ email: { equals: caller.email, mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Mark EventGuest membership as LEFT
      if (guest) {
        await tx.eventGuest.updateMany({
          where: {
            eventId,
            guestId: guest.id,
          },
          data: {
            status: 'LEFT',
          },
        });

        // 2. Cancel any pending/future unassigned bookings for this guest
        await tx.booking.updateMany({
          where: {
            eventId,
            guestId: guest.id,
            status: { in: ['REQUESTED', 'CONFIRMED'] },
          },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      // 3. Mark EventAccessRequest as LEFT
      await tx.eventAccessRequest.updateMany({
        where: {
          eventId,
          userId: caller.id,
        },
        data: {
          status: AccessRequestStatus.LEFT,
        },
      });

      // 4. Remove EventMember record if present
      await tx.eventMember.deleteMany({
        where: {
          eventId,
          userId: caller.id,
        },
      });
    }, { timeout: 20000, maxWait: 10000 });

    return NextResponse.json({
      success: true,
      message: `You have successfully left "${event.name}". You will no longer receive transportation notifications or ride allocations for this event.`,
      eventId,
    });
  } catch (error: any) {
    console.error('Error leaving guest event:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to leave event. Please try again.' } },
      { status: 500 }
    );
  }
}

