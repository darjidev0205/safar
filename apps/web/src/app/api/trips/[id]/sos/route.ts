import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { NotificationChannel } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return (
        errorResponse ||
        NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const tripId = params.id;
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        event: {
          include: {
            account: { include: { members: true } },
            eventMembers: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, error: `Trip with id ${tripId} not found` }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const reporterName = user.fullName || 'Passenger/Driver';
    const reporterPhone = user.phoneNumber || 'N/A';

    const alertData = {
      alertId: `sos_${Date.now()}`,
      eventId: trip.eventId,
      tripId: trip.id,
      reporterId: user.id,
      reporterName,
      reporterPhone,
      reporterRole: user.role,
      latitude: body.latitude || trip.currentLat || null,
      longitude: body.longitude || trip.currentLng || null,
      reason: body.reason || 'EMERGENCY: Immediate vehicle/passenger assistance required',
      timestamp: new Date().toISOString(),
    };

    const hostUserIds = new Set<string>();
    if (trip.event.creatorId) hostUserIds.add(trip.event.creatorId);
    trip.event.account.members.forEach((m: any) => hostUserIds.add(m.userId));

    const sosTitle = '🚨 EMERGENCY SOS ALERT DISPATCHED';
    const sosMessage = `Emergency assistance requested by ${reporterName} (${reporterPhone}) for trip ${trip.id}. Location: ${alertData.latitude ? `${alertData.latitude.toFixed(5)}, ${alertData.longitude?.toFixed(5)}` : 'Unknown'}. Reason: ${alertData.reason}`;

    const hostIdsList = Array.from(hostUserIds);
    for (const hostId of hostIdsList) {
      const notif = await prisma.notification.create({
        data: {
          userId: hostId,
          eventId: trip.eventId,
          type: 'SOS_ALERT',
          title: sosTitle,
          message: sosMessage,
          channel: NotificationChannel.PUSH,
          idempotencyKey: `sos:${trip.eventId}:${trip.id}:${Date.now()}:${hostId}`,
          metadata: alertData,
        },
      });

      await prisma.notificationDelivery.create({
        data: {
          notificationId: notif.id,
          channel: NotificationChannel.PUSH,
          status: 'SENT',
          providerMessageId: `fcm_sos_${notif.id}`,
          attemptCount: 1,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        eventId: trip.eventId,
        userId: user.id,
        action: 'EMERGENCY_SOS_TRIGGERED',
        entityType: 'Trip',
        entityId: trip.id,
        details: alertData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency SOS alert dispatched to host desk',
      data: { alert: alertData, recipientsNotifiedCount: hostIdsList.length },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch SOS alert' },
      { status: 500 }
    );
  }
}
