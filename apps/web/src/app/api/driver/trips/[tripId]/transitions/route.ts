import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getCallerUser } from '../../../../../../lib/caller-auth';
import { DriverTripTransitionSchema } from '@safar/validation';
import { isValidTripTransition } from '@safar/config';
import { TripStatus, NotificationChannel } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return (
        errorResponse ||
        NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const tripId = params.tripId;
    const body = await req.json();
    const validated = DriverTripTransitionSchema.parse(body);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        originPlace: true,
        destinationPlace: true,
        bookings: { include: { guest: true } },
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, error: `Trip with id ${tripId} not found` }, { status: 404 });
    }

    // Authorization: caller must be assigned driver or host/admin
    const isAssignedDriver = trip.driver?.userId === user.id;
    const isPrivileged = user.role === 'SUPER_ADMIN' || user.role === 'ACCOUNT_OWNER' || user.role === 'EVENT_ORGANIZER';

    if (!isAssignedDriver && !isPrivileged) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not authorized to transition this trip' },
        { status: 403 }
      );
    }

    const currentStatus = trip.status as any;
    const targetStatus = validated.toStatus as any;

    if (!isValidTripTransition(currentStatus, targetStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid state transition from ${currentStatus} to ${targetStatus}`,
        },
        { status: 400 }
      );
    }

    const updatePayload: any = {
      status: targetStatus,
    };

    if (targetStatus === TripStatus.IN_TRANSIT && !trip.actualStartTime) {
      updatePayload.actualStartTime = new Date();
    } else if (targetStatus === TripStatus.COMPLETED) {
      updatePayload.actualEndTime = new Date();
    }

    if (validated.latitude && validated.longitude) {
      updatePayload.currentLat = validated.latitude;
      updatePayload.currentLng = validated.longitude;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.trip.update({
        where: { id: tripId },
        data: updatePayload,
        include: {
          driver: { include: { user: true } },
          vehicle: true,
          originPlace: true,
          destinationPlace: true,
        },
      });

      await tx.tripEvent.create({
        data: {
          tripId,
          actorId: user.id,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: validated.reason || null,
        },
      });

      if (targetStatus === TripStatus.COMPLETED) {
        await tx.booking.updateMany({
          where: { tripId },
          data: { status: 'COMPLETED' },
        });
      } else if (targetStatus === TripStatus.CANCELLED) {
        await tx.booking.updateMany({
          where: { tripId },
          data: { status: 'CANCELLED' },
        });
      }

      return res;
    });

    // Multi-channel notifications for affected guests
    const notifTypeMap: Record<string, { title: string; message: string; channel: NotificationChannel }> = {
      ARRIVED: {
        title: 'Ride Arrived at Pickup',
        message: `Your driver has arrived at ${trip.originPlace?.name || 'pickup point'} (${trip.vehicle?.plateNumber || ''}). Please board promptly.`,
        channel: NotificationChannel.WHATSAPP,
      },
      IN_TRANSIT: {
        title: 'Ride En Route',
        message: `Your ride to ${trip.destinationPlace?.name || 'destination'} is now in transit.`,
        channel: NotificationChannel.IN_APP,
      },
      COMPLETED: {
        title: 'Trip Completed',
        message: `You have arrived safely at ${trip.destinationPlace?.name || 'your destination'}. Thank you for riding with SAFAR.`,
        channel: NotificationChannel.IN_APP,
      },
      CANCELLED: {
        title: 'Trip Cancelled',
        message: `Your scheduled trip has been cancelled (${validated.reason || 'Operational adjustment'}). Please contact the desk.`,
        channel: NotificationChannel.WHATSAPP,
      },
    };

    const notifConfig = notifTypeMap[targetStatus];
    if (notifConfig) {
      for (const booking of trip.bookings) {
        const guestUserId = booking.guest?.userId;
        if (!guestUserId) continue;

        const idempotencyKey = `trip:${tripId}:${targetStatus}:guest:${booking.id}`;
        const existing = await prisma.notification.findFirst({ where: { idempotencyKey } });
        if (!existing) {
          const notif = await prisma.notification.create({
            data: {
              userId: guestUserId,
              eventId: trip.eventId,
              type: targetStatus,
              title: notifConfig.title,
              message: notifConfig.message,
              channel: notifConfig.channel,
              idempotencyKey,
              metadata: { tripId, bookingId: booking.id, toStatus: targetStatus },
            },
          });
          await prisma.notificationDelivery.create({
            data: {
              notificationId: notif.id,
              channel: notifConfig.channel,
              status: 'SENT',
              providerMessageId: `msg_${notif.id}`,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Trip transitioned to ${targetStatus}`,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to transition trip' },
      { status: 500 }
    );
  }
}
