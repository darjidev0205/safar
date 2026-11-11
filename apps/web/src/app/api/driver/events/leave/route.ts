import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser, isValidObjectId } from '../../../../../lib/caller-auth';
import { Role, AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/driver/events/leave - Driver leaves an event fleet safely
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

    // Verify driver record exists for this user
    const driver = await prisma.driver.findFirst({
      where: { userId: caller.id },
    });

    if (!driver) {
      return NextResponse.json(
        { success: false, error: { message: 'Driver profile not found.' } },
        { status: 404 }
      );
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { message: 'Event not found.' } },
        { status: 404 }
      );
    }

    // ── SAFETY RULE CHECK ─────────────────────────────────────────────────────
    // A driver currently transporting passengers or en route to pickup CANNOT leave.
    const activeTrips = await prisma.trip.findMany({
      where: {
        eventId,
        driverId: driver.id,
        status: { in: ['IN_TRANSIT', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'] },
      },
      select: {
        id: true,
        pickupLocation: true,
        destination: true,
        passengerCount: true,
        status: true,
      },
    });

    if (activeTrips.length > 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'ACTIVE_TRIP_IN_PROGRESS',
          error: {
            code: 'ACTIVE_TRIP_IN_PROGRESS',
            message: `Safety Restriction: You cannot leave "${event.name}" while you have an active trip in progress (${activeTrips[0].pickupLocation || 'Pickup'} → ${activeTrips[0].destination || 'Destination'}). Please complete or reassign your active ride first.`,
          },
          activeTrips,
        },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Mark DriverEvent as LEFT
      await tx.driverEvent.updateMany({
        where: {
          driverId: driver.id,
          eventId,
        },
        data: {
          status: 'LEFT',
        },
      });

      // 2. Release future scheduled trips for this driver back to the host reassignment pool
      await tx.trip.updateMany({
        where: {
          eventId,
          driverId: driver.id,
          status: 'SCHEDULED',
        },
        data: {
          driverId: null,
          vehicleId: null,
        },
      });

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

      // 4. Update Driver's current event pointer if pointing to this event
      if (driver.eventId === eventId) {
        await tx.driver.update({
          where: { id: driver.id },
          data: {
            eventId: null,
            dutyStatus: 'AVAILABLE',
          },
        });
      }
    }, { timeout: 25000, maxWait: 10000 });

    return NextResponse.json({
      success: true,
      message: `You have safely left the fleet for "${event.name}". Any future scheduled duties have been returned to the host dispatch pool.`,
      eventId,
    });
  } catch (error: any) {
    console.error('Error in driver leaving event:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to leave event. Please try again.' } },
      { status: 500 }
    );
  }
}

