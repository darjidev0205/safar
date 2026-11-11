import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getAuthenticatedHost } from '../../../lib/auth-server';
import {
  generateUniqueEventAccessCodes,
  createGuestAccessCodeRecord,
  createDriverInviteCodeRecord,
} from '../../../lib/access-code';
import { EventStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/events - List all events/functions for authenticated host
export async function GET(req: NextRequest) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const searchParams = req.nextUrl.searchParams;
    const parentOnly = searchParams.get('parentOnly') === 'true';
    const parentEventId = searchParams.get('parentEventId');
    const includeAll = searchParams.get('all') === 'true';

    const where: any = {
      accountId: context.account.id,
    };

    if (parentEventId) {
      where.parentEventId = parentEventId;
    } else if (!includeAll) {
      // By default, list Master Events only. Functions are embedded inside functions[]
      where.parentEventId = null;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        transportRequirements: true,
        functions: {
          where: { status: { not: 'ARCHIVED' } },
          orderBy: { startTime: 'asc' },
        },
        subEvents: {
          include: {
            transportRequirements: true,
            _count: {
              select: { eventGuests: true, trips: true },
            },
          },
          orderBy: { startDate: 'asc' },
        },
        _count: {
          select: {
            eventGuests: true,
            guests: true,
            trips: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Format for client with accurate guest count and transport status
    const formatted = events.map((ev) => {
      const guestCount = Math.max(ev._count.eventGuests, ev._count.guests);
      const transport = ev.transportRequirements[0] || null;
      return {
        id: ev.id,
        accountId: ev.accountId,
        name: ev.name,
        eventType: ev.eventType || 'CUSTOM',
        city: ev.city,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate.toISOString(),
        startTime: ev.startTime,
        endTime: ev.endTime,
        venueName: ev.venueName,
        venueAddress: ev.venueAddress,
        venueLatitude: ev.venueLatitude,
        venueLongitude: ev.venueLongitude,
        expectedGuestCount: ev.expectedGuestCount,
        guestCount,
        joinCode: ev.joinCode,
        driverAccessCode: ev.driverAccessCode || `DRV${ev.joinCode.slice(-3)}`,
        guestAccessCode: ev.guestAccessCode || ev.joinCode,
        bannerUrl: ev.bannerUrl,
        description: ev.description,
        status: ev.status,
        parentEventId: ev.parentEventId,
        transportRequirements: transport,
        functionsCount: ev.functions?.length || 0,
        functions: ev.functions || [],
        subEventsCount: ev.subEvents?.length || 0,
        tripsCount: ev._count.trips,
        createdAt: ev.createdAt.toISOString(),
        updatedAt: ev.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      events: formatted,
    });
  } catch (error: any) {
    console.error('Error fetching host events:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch events' } },
      { status: 500 }
    );
  }
}

// POST /api/events - Create new individual function or event
export async function POST(req: NextRequest) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const body = await req.json();
    const {
      name,
      eventType,
      startDate,
      endDate,
      startTime,
      endTime,
      venueName,
      venueAddress,
      city,
      venueLatitude,
      venueLongitude,
      expectedGuestCount,
      description,
      bannerUrl,
      parentEventId,
      transport,
      functions,
      guestAccessCode: customGuestCode,
      driverAccessCode: customDriverCode,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Event or Function Name is required.' } },
        { status: 400 }
      );
    }

    const eventCity = city?.trim() || 'Ahmedabad';
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    let parsedEndDate = endDate ? new Date(endDate) : new Date(parsedStartDate.getTime() + 4 * 60 * 60 * 1000);

    if (isNaN(parsedStartDate.getTime())) {
      return NextResponse.json(
        { success: false, error: { message: 'Valid start date is required.' } },
        { status: 400 }
      );
    }
    if (isNaN(parsedEndDate.getTime()) || parsedEndDate < parsedStartDate) {
      parsedEndDate = new Date(parsedStartDate.getTime() + 4 * 60 * 60 * 1000);
    }

    // Verify parent event ownership if sub-event or function
    // If parentEventId is provided, this is a Ceremony / Function under an existing master event.
    // Do NOT generate new event-level access codes or duplicate the master event!
    if (parentEventId) {
      const parent = await prisma.event.findFirst({
        where: { id: parentEventId, accountId: context.account.id },
      });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: { message: 'Parent event does not belong to your account.' } },
          { status: 403 }
        );
      }

      const createdFunction = await prisma.function.create({
        data: {
          eventId: parentEventId,
          name: name.trim(),
          type: eventType || 'CUSTOM',
          date: parsedStartDate,
          startTime: parsedStartDate,
          endTime: parsedEndDate,
          venueName: venueName?.trim() || parent.venueName || null,
          venueAddress: venueAddress?.trim() || parent.venueAddress || null,
          latitude: venueLatitude ? parseFloat(venueLatitude) : (parent.venueLatitude || null),
          longitude: venueLongitude ? parseFloat(venueLongitude) : (parent.venueLongitude || null),
          description: description?.trim() || null,
          status: 'ACTIVE',
        },
      });

      return NextResponse.json({
        success: true,
        function: createdFunction,
        event: parent,
        message: `Function "${createdFunction.name}" added to ${parent.name}.`,
      }, { status: 201 });
    }

    // ── Build authoritative codes ───────────────────────────────────────────
    // Both the Event row and the EventAccessCode registry must carry the SAME code.
    // 1. Guest code: generate one 10-char code, store both raw and display form.
    // 2. Driver code: generate one 10-char code, store it.
    // 3. event.joinCode = raw 10-char guest code (legacy compat).
    // 4. Never generate a second independent code inside the transaction.

    const { generateSecureCode, computeCodeDigest, normalizeAccessCode } = await import('../../../lib/access-code');

    // Guest code
    const guestCodeObj = generateSecureCode(10);
    const guestRawCode = guestCodeObj.code;
    const guestDisplayCode = guestCodeObj.displayCode;

    // Driver code — a fresh code that will ALSO be what's shown on the host dashboard
    const driverCodeObj = generateSecureCode(10);
    const driverRawCode = driverCodeObj.code;
    const driverDisplayCode = driverCodeObj.displayCode;

    const joinCode = guestRawCode; // event.joinCode = raw guest code

    const createdEvent = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          accountId: context.account.id,
          creatorId: context.user.id,
          name: name.trim(),
          eventType: eventType || 'CUSTOM',
          city: eventCity,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          startTime: startTime || null,
          endTime: endTime || null,
          venueName: venueName?.trim() || null,
          venueAddress: venueAddress?.trim() || null,
          venueLatitude: venueLatitude ? parseFloat(venueLatitude) : null,
          venueLongitude: venueLongitude ? parseFloat(venueLongitude) : null,
          expectedGuestCount: expectedGuestCount ? parseInt(String(expectedGuestCount), 10) : 0,
          description: description?.trim() || null,
          bannerUrl: bannerUrl?.trim() || null,
          parentEventId: parentEventId || null,
          joinCode,                        // raw 10-char guest code
          guestAccessCode: guestDisplayCode, // formatted XXXXX-XXXXX for display
          driverAccessCode: driverDisplayCode, // formatted XXXXX-XXXXX for display
          status: EventStatus.ACTIVE,
        },
      });

      // Register GUEST_EVENT access code — use the SAME code generated above
      const { createGuestAccessCodeRecord: _cg, createDriverInviteCodeRecord: _cd } = await import('../../../lib/access-code');
      await _cg(tx, {
        accountId: context.account.id,
        eventId: newEvent.id,
        creatorId: context.user.id,
        customCode: guestRawCode,
      });

      // Register DRIVER_INVITE code — use the SAME driver code generated above
      await tx.eventAccessCode.create({
        data: {
          accountId: context.account.id,
          eventId: newEvent.id,
          purpose: 'DRIVER_INVITE',
          code: driverRawCode,
          codeDigest: computeCodeDigest(driverRawCode),
          displayCode: driverDisplayCode,
          isActive: true,
          isSingleUse: true,
          maxUses: 1,
          useCount: 0,
          recipientName: 'General Chauffeur Invitation',
          createdBy: context.user.id,
        },
      });

      // Also create Venue place record if venue info provided
      if (venueName) {
        await tx.place.create({
          data: {
            eventId: newEvent.id,
            name: venueName.trim(),
            address: venueAddress?.trim() || venueName.trim(),
            latitude: venueLatitude ? parseFloat(venueLatitude) : 23.0225,
            longitude: venueLongitude ? parseFloat(venueLongitude) : 72.5714,
            type: 'VENUE',
          },
        });
      }

      // If transport requirements are configured
      if (transport) {
        await tx.eventTransportRequirement.create({
          data: {
            eventId: newEvent.id,
            pickupRequired: Boolean(transport.pickupRequired),
            dropRequired: Boolean(transport.dropRequired),
            pickupLocation: transport.pickupLocation?.trim() || null,
            dropLocation: transport.dropLocation?.trim() || null,
            pickupDate: transport.pickupDate ? new Date(transport.pickupDate) : parsedStartDate,
            pickupTime: transport.pickupTime?.trim() || startTime || null,
            vehicleType: transport.vehicleType?.trim() || 'Sedan',
            numberOfVehicles: transport.numberOfVehicles ? parseInt(String(transport.numberOfVehicles), 10) : 1,
            specialInstructions: transport.specialInstructions?.trim() || null,
          },
        });
      }

      // If multiple functions are supplied in this master event creation
      if (Array.isArray(functions) && functions.length > 0) {
        for (const fn of functions) {
          if (!fn.name?.trim()) continue;
          const fnDateStr = fn.date || (fn.startDate ? String(fn.startDate).substring(0, 10) : parsedStartDate.toISOString().substring(0, 10));
          const fnStartDate = new Date(fnDateStr);
          const startIso = fn.startTime ? `${fnDateStr}T${fn.startTime}:00` : `${fnDateStr}T18:00:00`;
          const endIso = fn.endTime ? `${fnDateStr}T${fn.endTime}:00` : `${fnDateStr}T23:00:00`;

          const fnStart = new Date(startIso);
          let fnEnd = new Date(endIso);
          if (isNaN(fnEnd.getTime()) || fnEnd <= fnStart) {
            fnEnd = new Date(fnStart.getTime() + 4 * 60 * 60 * 1000);
          }

          await tx.function.create({
            data: {
              eventId: newEvent.id,
              name: fn.name.trim(),
              type: fn.type || 'CUSTOM',
              date: isNaN(fnStartDate.getTime()) ? parsedStartDate : fnStartDate,
              startTime: isNaN(fnStart.getTime()) ? parsedStartDate : fnStart,
              endTime: fnEnd,
              venueName: fn.venueName?.trim() || venueName?.trim() || null,
              venueAddress: fn.venueAddress?.trim() || venueAddress?.trim() || null,
              latitude: fn.latitude ? parseFloat(fn.latitude) : (venueLatitude ? parseFloat(venueLatitude) : null),
              longitude: fn.longitude ? parseFloat(fn.longitude) : (venueLongitude ? parseFloat(venueLongitude) : null),
              description: fn.description?.trim() || null,
              status: 'ACTIVE',
            },
          });
        }
      }

      return newEvent;
    });

    const fullEvent = await prisma.event.findUnique({
      where: { id: createdEvent.id },
      include: {
        transportRequirements: true,
        functions: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      event: fullEvent,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event/function:', error);
    return NextResponse.json(
      { success: false, error: { message: "We couldn't create your event. Please try again." } },
      { status: 500 }
    );
  }
}
