import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string; guestId: string };
}

// PATCH /api/events/:id/guests/:guestId - Update guest information
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, guestId } = params;
    const { errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        accountId: context.account.id,
      },
    });

    if (!guest) {
      return NextResponse.json(
        { success: false, error: { message: 'Guest record not found in your account.' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      fullName,
      familyName,
      relation,
      phoneNumber,
      email,
      memberCount,
      category,
      pickupLocation,
      dropLocation,
      hotelRoom,
      specialRequirements,
      notes,
      status,
    } = body;

    const parsedMembers = memberCount !== undefined ? parseInt(String(memberCount), 10) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      // Handle family update if changed
      let familyId = guest.familyId;
      if (familyName && familyName !== guest.familyName) {
        let family = await tx.family.findFirst({
          where: {
            accountId: context.account.id,
            name: { equals: familyName.trim(), mode: 'insensitive' },
          },
        });
        if (!family) {
          family = await tx.family.create({
            data: {
              accountId: context.account.id,
              name: familyName.trim(),
              relation: relation?.trim() || null,
            },
          });
        }
        familyId = family.id;
      }

      // Update Guest table
      const g = await tx.guest.update({
        where: { id: guestId },
        data: {
          fullName: fullName !== undefined ? fullName.trim() : undefined,
          familyName: familyName !== undefined ? familyName.trim() : undefined,
          familyId,
          relation: relation !== undefined ? relation.trim() : undefined,
          phoneNumber: phoneNumber !== undefined ? (phoneNumber?.trim() || null) : undefined,
          email: email !== undefined ? (email?.trim().toLowerCase() || null) : undefined,
          memberCount: parsedMembers !== undefined && !isNaN(parsedMembers) ? Math.max(1, parsedMembers) : undefined,
          category: category !== undefined ? category.trim() : undefined,
          pickupLocation: pickupLocation !== undefined ? pickupLocation.trim() : undefined,
          dropLocation: dropLocation !== undefined ? dropLocation.trim() : undefined,
          hotelRoom: hotelRoom !== undefined ? hotelRoom.trim() : undefined,
          specialRequirements: specialRequirements !== undefined ? specialRequirements.trim() : undefined,
          notes: notes !== undefined ? notes.trim() : undefined,
          status: status !== undefined ? status : undefined,
        },
      });

      // Update EventGuest table
      await tx.eventGuest.upsert({
        where: {
          eventId_guestId: { eventId, guestId },
        },
        create: {
          eventId,
          guestId,
          status: status || 'CONFIRMED',
          pickupLocation: pickupLocation?.trim() || null,
          dropLocation: dropLocation?.trim() || null,
          hotelRoom: hotelRoom?.trim() || null,
          specialRequirements: specialRequirements?.trim() || null,
          notes: notes?.trim() || null,
        },
        update: {
          status: status !== undefined ? status : undefined,
          pickupLocation: pickupLocation !== undefined ? pickupLocation.trim() : undefined,
          dropLocation: dropLocation !== undefined ? dropLocation.trim() : undefined,
          hotelRoom: hotelRoom !== undefined ? hotelRoom.trim() : undefined,
          specialRequirements: specialRequirements !== undefined ? specialRequirements.trim() : undefined,
          notes: notes !== undefined ? notes.trim() : undefined,
        },
      });

      return g;
    });

    return NextResponse.json({
      success: true,
      guest: updated,
    });
  } catch (error: any) {
    console.error('Error updating guest:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error updating guest' } },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:id/guests/:guestId - Remove guest from this event
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const { id: eventId, guestId } = params;
    const { errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    await prisma.$transaction(async (tx) => {
      // Remove event-guest relationship
      await tx.eventGuest.deleteMany({
        where: {
          eventId,
          guestId,
        },
      });

      // If guest has legacy direct eventId pointing here, clear or delete
      const guest = await tx.guest.findUnique({
        where: { id: guestId },
        include: { eventGuests: true },
      });

      if (guest && guest.eventId === eventId && guest.eventGuests.length === 0) {
        await tx.guest.delete({ where: { id: guestId } });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Guest successfully removed from event.',
    });
  } catch (error: any) {
    console.error('Error removing guest:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error removing guest' } },
      { status: 500 }
    );
  }
}
