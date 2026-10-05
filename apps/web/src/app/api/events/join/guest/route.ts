import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { Role, EventStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/events/join/guest - Guest joins the master event using the single Event Guest Code
export async function POST(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    // Role check: A driver cannot join using a guest code
    if (caller.role === Role.DRIVER) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'This access code is for guests. Drivers must use the Driver Access Code.',
          },
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const rawCode = (body.code || '').trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: { message: 'Guest access code is required.' } },
        { status: 400 }
      );
    }

    // 1. Locate the master event by guestAccessCode (or legacy joinCode)
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { guestAccessCode: rawCode },
          { joinCode: rawCode },
        ],
      },
      include: {
        functions: {
          where: { status: { not: 'ARCHIVED' } },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid guest access code. Please verify the code from your host.' } },
        { status: 404 }
      );
    }

    // 2. Verify Event is active
    if (event.status === EventStatus.ARCHIVED || event.status === EventStatus.COMPLETED) {
      return NextResponse.json(
        { success: false, error: { message: `This event is currently ${event.status.toLowerCase()} and not accepting new guests.` } },
        { status: 400 }
      );
    }

    // 3. Atomically upsert Guest record and EventGuest membership
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      // Find or create Guest entity linked to this user and event's account
      let guest = await tx.guest.findFirst({
        where: {
          accountId: event.accountId,
          OR: [
            { userId: caller.id },
            ...(caller.email ? [{ email: { equals: caller.email, mode: 'insensitive' as const } }] : []),
          ],
        },
      });

      if (!guest) {
        guest = await tx.guest.create({
          data: {
            accountId: event.accountId,
            eventId: event.id,
            userId: caller.id,
            fullName: caller.fullName,
            email: caller.email,
            phoneNumber: caller.phoneNumber,
            status: 'CONFIRMED',
          },
        });
      } else if (!guest.eventId) {
        guest = await tx.guest.update({
          where: { id: guest.id },
          data: { eventId: event.id, userId: caller.id },
        });
      }

      // Upsert EventGuest membership (prevents duplicate membership)
      const eventGuest = await tx.eventGuest.upsert({
        where: {
          eventId_guestId: {
            eventId: event.id,
            guestId: guest.id,
          },
        },
        create: {
          eventId: event.id,
          guestId: guest.id,
          status: 'CONFIRMED',
        },
        update: {
          status: 'CONFIRMED',
        },
      });

      // Upsert EventMember
      await tx.eventMember.upsert({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: caller.id,
          },
        },
        create: {
          eventId: event.id,
          userId: caller.id,
          role: Role.GUEST,
        },
        update: {
          role: Role.GUEST,
        },
      });

      // Fetch guest's current function attendances
      const attendances = await tx.guestFunctionAttendance.findMany({
        where: { guestId: guest.id },
      });

      return { guest, eventGuest, attendances };
    });

    // 4. Map functions with attendance status for this guest
    const functionsWithAssignment = event.functions.map((fn) => {
      const att = result.attendances.find((a) => a.functionId === fn.id);
      return {
        id: fn.id,
        name: fn.name,
        type: fn.type,
        date: fn.date ? fn.date.toISOString() : fn.startTime.toISOString(),
        startTime: fn.startTime.toISOString(),
        endTime: fn.endTime.toISOString(),
        venueName: fn.venueName,
        venueAddress: fn.venueAddress,
        isAssigned: att ? att.isAttending && att.status !== 'REMOVED' : true,
        attendanceStatus: att ? att.status : 'ASSIGNED',
      };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${event.name}!`,
      event: {
        id: event.id,
        name: event.name,
        city: event.city,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        guestAccessCode: event.guestAccessCode,
        functions: functionsWithAssignment,
      },
      guest: {
        id: result.guest.id,
        fullName: result.guest.fullName,
        email: result.guest.email,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/events/join/guest:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to join event.' } },
      { status: 500 }
    );
  }
}
