import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string; guestId: string };
}

// GET /api/events/:id/guests/:guestId/functions - List assigned and available functions for this guest
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, guestId } = params;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    // Verify guest belongs to event/account
    const guest = await prisma.guest.findFirst({
      where: { id: guestId, accountId: context.account.id },
      include: {
        attendances: {
          include: { function: true },
        },
      },
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: { message: 'Guest not found under this account.' } },
        { status: 404 }
      );
    }

    // Get all functions for this event
    const allFunctions = await prisma.function.findMany({
      where: { eventId, status: { not: 'ARCHIVED' } },
      orderBy: { startTime: 'asc' },
    });

    const mapped = allFunctions.map((fn) => {
      const att = guest.attendances.find((a) => a.functionId === fn.id);
      return {
        id: fn.id,
        name: fn.name,
        type: fn.type,
        date: fn.date,
        startTime: fn.startTime,
        endTime: fn.endTime,
        venueName: fn.venueName,
        isAssigned: att ? att.isAttending && att.status !== 'REMOVED' : false,
        status: att ? att.status : 'UNASSIGNED',
      };
    });

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        fullName: guest.fullName,
        email: guest.email,
      },
      functions: mapped,
    });
  } catch (error: any) {
    console.error('Error fetching guest functions:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch guest functions.' } },
      { status: 500 }
    );
  }
}

// POST /api/events/:id/guests/:guestId/functions - Assign or unassign guest to/from functions
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, guestId } = params;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { functionId, isAssigned, status = 'ASSIGNED', notes } = body;

    if (!functionId) {
      return NextResponse.json(
        { success: false, error: { message: 'functionId is required.' } },
        { status: 400 }
      );
    }

    // Verify function belongs to this event
    const fn = await prisma.function.findFirst({
      where: { id: functionId, eventId },
    });

    if (!fn) {
      return NextResponse.json(
        { success: false, error: { message: 'Function not found under this master event.' } },
        { status: 404 }
      );
    }

    // Upsert attendance record
    const attendance = await prisma.guestFunctionAttendance.upsert({
      where: {
        guestId_functionId: {
          guestId,
          functionId,
        },
      },
      create: {
        guestId,
        functionId,
        isAttending: Boolean(isAssigned),
        status: isAssigned ? (status || 'ASSIGNED') : 'REMOVED',
        notes: notes || null,
        assignedAt: new Date(),
      },
      update: {
        isAttending: Boolean(isAssigned),
        status: isAssigned ? (status || 'ASSIGNED') : 'REMOVED',
        notes: notes || undefined,
      },
      include: {
        function: true,
      },
    });

    return NextResponse.json({
      success: true,
      attendance,
      message: isAssigned
        ? `Guest assigned to ${fn.name}.`
        : `Guest removed from ${fn.name}.`,
    });
  } catch (error: any) {
    console.error('Error updating guest function attendance:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update guest function assignment.' } },
      { status: 500 }
    );
  }
}
