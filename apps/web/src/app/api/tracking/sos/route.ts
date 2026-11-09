import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';
import { SOSAlertSchema } from '@safar/validation';
import { NotificationChannel } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return (
        errorResponse ||
        NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const body = await req.json();
    const validated = SOSAlertSchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: validated.eventId },
      include: {
        account: { include: { members: true } },
        eventMembers: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: `Event with id ${validated.eventId} not found` },
        { status: 404 }
      );
    }

    const reporterName = user.fullName || 'Passenger/Driver';
    const reporterPhone = user.phoneNumber || 'N/A';
    const alertData = {
      alertId: `sos_${Date.now()}`,
      eventId: validated.eventId,
      tripId: validated.tripId || null,
      reporterId: user.id,
      reporterName,
      reporterPhone,
      reporterRole: user.role,
      latitude: validated.latitude || null,
      longitude: validated.longitude || null,
      reason: validated.reason || 'EMERGENCY: Immediate assistance requested',
      timestamp: new Date().toISOString(),
    };

    // Gather host / organizer recipient user IDs
    const hostUserIds = new Set<string>();
    if (event.creatorId) hostUserIds.add(event.creatorId);
    event.account.members.forEach((m: any) => hostUserIds.add(m.userId));
    event.eventMembers
      .filter((em: any) => ['HOST', 'ORGANIZER', 'PLANNER'].includes(em.role))
      .forEach((em: any) => hostUserIds.add(em.userId));

    const sosTitle = '🚨 EMERGENCY SOS ALERT DISPATCHED';
    const sosMessage = `Emergency assistance requested by ${reporterName} (${reporterPhone}) for trip ${validated.tripId || 'N/A'}. Location: ${validated.latitude ? `${validated.latitude.toFixed(5)}, ${validated.longitude?.toFixed(5)}` : 'Unknown'}. Reason: ${alertData.reason}`;

    const hostIdsList = Array.from(hostUserIds);
    for (const hostId of hostIdsList) {
      const notif = await prisma.notification.create({
        data: {
          userId: hostId,
          eventId: validated.eventId,
          type: 'SOS_ALERT',
          title: sosTitle,
          message: sosMessage,
          channel: NotificationChannel.PUSH,
          idempotencyKey: `sos:${validated.eventId}:${validated.tripId || 'notrip'}:${Date.now()}:${hostId}`,
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

    // Record audit log
    await prisma.auditLog.create({
      data: {
        eventId: validated.eventId,
        userId: user.id,
        action: 'EMERGENCY_SOS_TRIGGERED',
        entityType: 'Trip',
        entityId: validated.tripId || validated.eventId,
        details: alertData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency SOS alert dispatched to host desk',
      data: {
        alert: alertData,
        recipientsNotifiedCount: hostIdsList.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch SOS alert' },
      { status: 500 }
    );
  }
}
