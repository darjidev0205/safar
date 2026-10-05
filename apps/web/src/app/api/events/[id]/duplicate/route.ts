import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';
import { generateUniqueEventAccessCodes } from '../../../../../lib/access-code';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const { driverAccessCode, guestAccessCode } = await generateUniqueEventAccessCodes();
    const joinCode = guestAccessCode;

    // Fetch child functions under this event
    const childFunctions = await prisma.function.findMany({
      where: { eventId },
    });

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
          guestAccessCode,
          driverAccessCode,
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

      // Clone child functions under the new master event (no function codes!)
      for (const fn of childFunctions) {
        await tx.function.create({
          data: {
            eventId: newEvent.id,
            name: fn.name,
            date: fn.date,
            startTime: fn.startTime,
            endTime: fn.endTime,
            venueName: fn.venueName,
            venueAddress: fn.venueAddress,
            guestRules: fn.guestRules,
            transportRules: fn.transportRules,
            description: fn.description,
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

