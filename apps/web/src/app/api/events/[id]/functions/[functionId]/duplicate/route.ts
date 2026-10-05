import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string; functionId: string };
}

// POST /api/events/:id/functions/:functionId/duplicate
// Duplicates a Function under the SAME master event.
// CRITICAL RULE: NO new guest access code, NO new driver access code is generated.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, functionId } = params;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const existing = await prisma.function.findFirst({
      where: { id: functionId, eventId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: 'Function not found under this master event' } },
        { status: 404 }
      );
    }

    // Duplicate function with exact parameters under same eventId, zero new codes generated
    const duplicatedFunction = await prisma.function.create({
      data: {
        eventId: existing.eventId,
        name: `${existing.name} (Copy)`,
        date: existing.date,
        startTime: existing.startTime,
        endTime: existing.endTime,
        venueName: existing.venueName,
        venueAddress: existing.venueAddress,
        guestRules: existing.guestRules,
        transportRules: existing.transportRules,
        description: existing.description,
      },
    });

    return NextResponse.json({
      success: true,
      function: duplicatedFunction,
      message: `Duplicated "${existing.name}" as "${duplicatedFunction.name}" successfully. Master event codes remain unchanged.`,
    });
  } catch (error: any) {
    console.error('Error duplicating function:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to duplicate function' } },
      { status: 500 }
    );
  }
}
