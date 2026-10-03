import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    let joinCode = generateJoinCode();
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.event.findUnique({ where: { joinCode } });
      if (!existing) break;
      joinCode = generateJoinCode();
    }

    const duplicated = await prisma.$transaction(async (tx: any) => {
      const newEvent = await tx.event.create({
        data: {
          accountId: context.account.id,
          creatorId: context.user.id,
          name: `${event.name} (Copy)`,
          eventType: event.eventType,
          city: event.city,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          venueLatitude: event.venueLatitude,
          venueLongitude: event.venueLongitude,
          expectedGuestCount: event.expectedGuestCount,
          description: event.description,
          bannerUrl: event.bannerUrl,
          parentEventId: event.parentEventId,
          joinCode,
        },
      });

      // Duplicate transport requirement if exists
      if (event.transportRequirements && event.transportRequirements.length > 0) {
        const tr = event.transportRequirements[0];
        await tx.eventTransportRequirement.create({
          data: {
            eventId: newEvent.id,
            pickupRequired: tr.pickupRequired,
            dropRequired: tr.dropRequired,
            pickupLocation: tr.pickupLocation,
            dropLocation: tr.dropLocation,
            pickupDate: tr.pickupDate,
            pickupTime: tr.pickupTime,
            vehicleType: tr.vehicleType,
            numberOfVehicles: tr.numberOfVehicles,
            specialInstructions: tr.specialInstructions,
          },
        });
      }

      return newEvent;
    });

    return NextResponse.json({
      success: true,
      event: duplicated,
    });
  } catch (error: any) {
    console.error('Error duplicating event:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to duplicate event' } },
      { status: 500 }
    );
  }
}
