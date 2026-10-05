import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string; functionId: string };
}

// PATCH /api/events/:id/functions/:functionId - Update function details
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, functionId } = params;
    const { errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const existingFunction = await prisma.function.findFirst({
      where: { id: functionId, eventId },
    });

    if (!existingFunction) {
      return NextResponse.json(
        { success: false, error: { message: 'Function not found under this master event' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      date,
      startTime,
      endTime,
      venueName,
      venueAddress,
      guestRules,
      transportRules,
      description,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (venueName !== undefined) updateData.venueName = venueName.trim();
    if (venueAddress !== undefined) updateData.venueAddress = venueAddress.trim();
    if (guestRules !== undefined) updateData.guestRules = guestRules;
    if (transportRules !== undefined) updateData.transportRules = transportRules;
    if (description !== undefined) updateData.description = description;

    const updatedFunction = await prisma.function.update({
      where: { id: functionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      function: updatedFunction,
    });
  } catch (error: any) {
    console.error('Error updating function:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update function' } },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:id/functions/:functionId - Delete or archive a function safely
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, functionId } = params;
    const { errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const fn = await prisma.function.findFirst({
      where: { id: functionId, eventId },
      include: {
        trips: true,
        attendances: true,
      },
    });

    if (!fn) {
      return NextResponse.json(
        { success: false, error: { message: 'Function not found.' } },
        { status: 404 }
      );
    }

    // Safety check: Prevent deletion if active trips are ongoing
    const activeTrips = fn.trips.filter(
      (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    );

    if (activeTrips.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Cannot delete function "${fn.name}" because it has ${activeTrips.length} active transportation trip(s). Complete or cancel active trips first.`,
          },
        },
        { status: 400 }
      );
    }

    // If historical trips exist, soft-delete by setting status = 'CANCELLED'
    if (fn.trips.length > 0) {
      await prisma.function.update({
        where: { id: functionId },
        data: { status: 'CANCELLED' },
      });

      return NextResponse.json({
        success: true,
        archived: true,
        message: `Function "${fn.name}" has completed trips on record and was safely archived.`,
      });
    }

    // Otherwise, clean delete
    await prisma.function.delete({
      where: { id: functionId },
    });

    return NextResponse.json({
      success: true,
      archived: false,
      message: `Function "${fn.name}" removed successfully.`,
    });
  } catch (error: any) {
    console.error('Error deleting function:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to delete function' } },
      { status: 500 }
    );
  }
}
