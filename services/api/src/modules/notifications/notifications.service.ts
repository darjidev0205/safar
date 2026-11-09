import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { NotificationChannel } from '@prisma/client';

export interface SendNotificationOptions {
  userId: string;
  eventId?: string;
  title: string;
  message: string;
  type?: string;
  channel?: NotificationChannel;
  idempotencyKey?: string;
  metadata?: any;
  priority?: 'HIGH' | 'NORMAL';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Primary idempotent multi-channel dispatch method.
   * If an idempotencyKey is provided and has already been sent,
   * returns the existing notification without sending duplicate SMS/Push.
   */
  async sendNotification(options: SendNotificationOptions) {
    const {
      userId,
      eventId,
      title,
      message,
      type = 'GENERAL',
      channel = NotificationChannel.IN_APP,
      idempotencyKey,
      metadata,
      priority = 'NORMAL',
    } = options;

    // 1. Idempotency check: prevent duplicate notifications
    if (idempotencyKey) {
      const existing = await this.prisma.notification.findFirst({
        where: { idempotencyKey },
        include: { deliveries: true },
      });
      if (existing) {
        this.logger.debug(
          `Notification with idempotency key ${idempotencyKey} already exists. Skipping duplicate delivery.`
        );
        return { deduplicated: true, notification: existing };
      }
    }

    // 2. Persist notification in database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        eventId,
        title,
        message,
        type,
        channel,
        idempotencyKey: idempotencyKey || null,
        metadata: metadata ? metadata : undefined,
      },
    });

    // 3. Multi-channel delivery simulation & tracking
    // Every notification records an IN_APP delivery record
    await this.prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: NotificationChannel.IN_APP,
        status: 'DELIVERED',
        providerMessageId: `inapp_${notification.id}`,
      },
    });

    // If channel is PUSH, WHATSAPP, or SMS (or high priority), attempt multi-channel delivery
    if (channel !== NotificationChannel.IN_APP || priority === 'HIGH') {
      const channelsToDeliver: NotificationChannel[] = [];
      if (channel !== NotificationChannel.IN_APP) {
        channelsToDeliver.push(channel);
      }
      if (priority === 'HIGH') {
        if (!channelsToDeliver.includes(NotificationChannel.PUSH)) {
          channelsToDeliver.push(NotificationChannel.PUSH);
        }
        if (!channelsToDeliver.includes(NotificationChannel.WHATSAPP)) {
          channelsToDeliver.push(NotificationChannel.WHATSAPP);
        }
      }

      for (const ch of channelsToDeliver) {
        try {
          const providerMsgId = `${ch.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          await this.prisma.notificationDelivery.create({
            data: {
              notificationId: notification.id,
              channel: ch,
              status: 'SENT',
              providerMessageId: providerMsgId,
              attemptCount: 1,
            },
          });
          this.logger.log(`Dispatched [${ch}] notification to user ${userId} for type ${type}`);
        } catch (err: any) {
          this.logger.error(`Failed to deliver [${ch}] notification: ${err?.message}`);
          await this.prisma.notificationDelivery.create({
            data: {
              notificationId: notification.id,
              channel: ch,
              status: 'FAILED',
              error: err?.message || 'Delivery error',
              attemptCount: 1,
            },
          });
        }
      }
    }

    // 4. Real-time WebSocket emission
    this.eventsGateway.emitNotification(userId, notification);

    return { deduplicated: false, notification };
  }

  /**
   * Recipient acknowledgement ("Got it" action).
   * Verifies authorization, stamps acknowledgedAt, and marks isRead.
   */
  async acknowledgeNotification(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You are not authorized to acknowledge this notification');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        acknowledgedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Retrieve notification inbox for a user.
   */
  async getUserNotifications(
    userId: string,
    options?: { eventId?: string; unreadOnly?: boolean; limit?: number }
  ) {
    const where: any = { userId };
    if (options?.eventId) {
      where.eventId = options.eventId;
    }
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: { deliveries: true },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  // -------------------------------------------------------------------------
  // State-Driven Event Notification Triggers
  // -------------------------------------------------------------------------

  /**
   * TRIP_ASSIGNED: Driver receives actionable duty; host acknowledgement is tracked.
   */
  async sendTripAssigned(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        originPlace: true,
        destinationPlace: true,
        event: true,
      },
    });

    if (!trip || !trip.driver?.userId) return;

    const idempotencyKey = `trip:${tripId}:ASSIGNED`;
    const origin = trip.originPlace?.name || trip.pickupLocation || 'Assigned Pickup';
    const pickupTimeStr = new Date(trip.scheduledPickupTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.sendNotification({
      userId: trip.driver.userId,
      eventId: trip.eventId,
      type: 'TRIP_ASSIGNED',
      channel: NotificationChannel.PUSH,
      priority: 'HIGH',
      idempotencyKey,
      title: 'New Trip Assigned',
      message: `Pickup scheduled at ${origin} at ${pickupTimeStr} (${trip.vehicle?.model || 'Vehicle'} - ${trip.vehicle?.plateNumber || ''}).`,
      metadata: { tripId, eventId: trip.eventId, vehicleId: trip.vehicleId },
    });
  }

  /**
   * ETA_APPROACHING: Triggered strictly ONCE when dynamic ETA crosses <= 10 minutes (600s).
   */
  async checkAndSendEtaApproaching(tripId: string, etaSeconds: number, remainingKm: number) {
    if (etaSeconds <= 0 || etaSeconds > 600) return;

    const idempotencyKey = `trip:${tripId}:ETA_10MIN`;
    // Quick check before querying full relations
    const existing = await this.prisma.notification.findFirst({
      where: { idempotencyKey },
    });
    if (existing) return;

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        originPlace: true,
        bookings: {
          include: {
            guest: { include: { user: true } },
          },
        },
      },
    });

    if (!trip) return;

    const etaMins = Math.max(1, Math.ceil(etaSeconds / 60));
    const vehicleInfo = trip.vehicle ? `${trip.vehicle.model} (${trip.vehicle.plateNumber})` : 'Your assigned vehicle';
    const driverName = trip.driver?.user?.fullName || 'Your driver';

    for (const booking of trip.bookings) {
      const recipientUserId = booking.guest?.userId;
      if (!recipientUserId) continue;

      await this.sendNotification({
        userId: recipientUserId,
        eventId: trip.eventId,
        type: 'ETA_APPROACHING',
        channel: NotificationChannel.WHATSAPP,
        priority: 'HIGH',
        idempotencyKey: `${idempotencyKey}:guest:${booking.id}`,
        title: 'Driver Approaching (~10 Mins)',
        message: `${driverName} in ${vehicleInfo} is approximately ${etaMins} mins away (${remainingKm.toFixed(1)} km). Please be ready at pickup.`,
        metadata: { tripId, bookingId: booking.id, etaSeconds, remainingKm },
      });
    }
  }

  /**
   * ARRIVED: Vehicle arrived at pickup location; wait timer begins.
   */
  async sendTripArrived(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        originPlace: true,
        bookings: {
          include: { guest: { include: { user: true } } },
        },
      },
    });

    if (!trip) return;

    const idempotencyKey = `trip:${tripId}:ARRIVED`;
    const vehiclePlate = trip.vehicle?.plateNumber || '';
    const pickupName = trip.originPlace?.name || trip.pickupLocation || 'pickup point';

    for (const booking of trip.bookings) {
      const recipientUserId = booking.guest?.userId;
      if (!recipientUserId) continue;

      await this.sendNotification({
        userId: recipientUserId,
        eventId: trip.eventId,
        type: 'ARRIVED',
        channel: NotificationChannel.WHATSAPP,
        priority: 'HIGH',
        idempotencyKey: `${idempotencyKey}:guest:${booking.id}`,
        title: 'Ride Arrived at Pickup',
        message: `Your driver has arrived at ${pickupName} (${vehiclePlate}). Please proceed to vehicle with your 4-digit boarding pass.`,
        metadata: { tripId, bookingId: booking.id, vehiclePlate },
      });
    }
  }

  /**
   * BOARDING_VERIFIED: Host and guest status updated, seat counts confirmed.
   */
  async sendBoardingVerified(tripId: string, bookingId: string, guestUserId?: string) {
    const idempotencyKey = `booking:${bookingId}:BOARDED`;

    if (guestUserId) {
      await this.sendNotification({
        userId: guestUserId,
        type: 'BOARDING_VERIFIED',
        channel: NotificationChannel.IN_APP,
        idempotencyKey,
        title: 'Boarding Verified',
        message: 'Your boarding code has been verified. Welcome aboard!',
        metadata: { tripId, bookingId },
      });
    }
  }

  /**
   * RIDE_STARTED: Live trip-share link becomes available.
   */
  async sendRideStarted(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destinationPlace: true,
        bookings: {
          include: { guest: { include: { user: true } } },
        },
      },
    });

    if (!trip) return;

    const idempotencyKey = `trip:${tripId}:RIDE_STARTED`;
    const destination = trip.destinationPlace?.name || trip.destination || 'destination';

    for (const booking of trip.bookings) {
      const recipientUserId = booking.guest?.userId;
      if (!recipientUserId) continue;

      await this.sendNotification({
        userId: recipientUserId,
        eventId: trip.eventId,
        type: 'RIDE_STARTED',
        channel: NotificationChannel.IN_APP,
        idempotencyKey: `${idempotencyKey}:guest:${booking.id}`,
        title: 'Ride En Route',
        message: `Your ride to ${destination} is now in transit. Live route tracking is active.`,
        metadata: { tripId, bookingId: booking.id },
      });
    }
  }

  /**
   * COMPLETED: Drop completed, receipt and report available.
   */
  async sendTripCompleted(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destinationPlace: true,
        bookings: {
          include: { guest: { include: { user: true } } },
        },
      },
    });

    if (!trip) return;

    const idempotencyKey = `trip:${tripId}:COMPLETED`;
    const destination = trip.destinationPlace?.name || trip.destination || 'your destination';

    for (const booking of trip.bookings) {
      const recipientUserId = booking.guest?.userId;
      if (!recipientUserId) continue;

      await this.sendNotification({
        userId: recipientUserId,
        eventId: trip.eventId,
        type: 'COMPLETED',
        channel: NotificationChannel.IN_APP,
        idempotencyKey: `${idempotencyKey}:guest:${booking.id}`,
        title: 'Trip Completed',
        message: `You have arrived safely at ${destination}. Thank you for riding with SAFAR.`,
        metadata: { tripId, bookingId: booking.id },
      });
    }
  }

  /**
   * CANCELLED: Immediate deduplicated alert to affected people.
   */
  async sendTripCancelled(tripId: string, reason?: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: { include: { user: true } },
        bookings: {
          include: { guest: { include: { user: true } } },
        },
      },
    });

    if (!trip) return;

    const idempotencyKey = `trip:${tripId}:CANCELLED`;
    const reasonText = reason || 'Operational dispatch adjustment';

    // Notify driver
    if (trip.driver?.userId) {
      await this.sendNotification({
        userId: trip.driver.userId,
        eventId: trip.eventId,
        type: 'CANCELLED',
        channel: NotificationChannel.PUSH,
        priority: 'HIGH',
        idempotencyKey: `${idempotencyKey}:driver`,
        title: 'Trip Cancelled',
        message: `Trip ${tripId} has been cancelled: ${reasonText}.`,
        metadata: { tripId, reason },
      });
    }

    // Notify guests
    for (const booking of trip.bookings) {
      const recipientUserId = booking.guest?.userId;
      if (!recipientUserId) continue;

      await this.sendNotification({
        userId: recipientUserId,
        eventId: trip.eventId,
        type: 'CANCELLED',
        channel: NotificationChannel.WHATSAPP,
        priority: 'HIGH',
        idempotencyKey: `${idempotencyKey}:guest:${booking.id}`,
        title: 'Trip Update: Cancelled',
        message: `Your scheduled trip has been cancelled (${reasonText}). Please contact the event transportation desk if you need immediate reassignment.`,
        metadata: { tripId, bookingId: booking.id, reason },
      });
    }
  }

  /**
   * GPS_STALE_ALERT: Operational alert when vehicle on duty goes stale > 120s.
   * Debounced to max once every 5 minutes per trip.
   */
  async sendGpsStaleAlert(
    eventId: string,
    tripId: string,
    driverId: string,
    staleSeconds: number
  ) {
    const windowSlot = Math.floor(Date.now() / (5 * 60 * 1000));
    const idempotencyKey = `trip:${tripId}:GPS_STALE:${windowSlot}`;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: true,
        account: { include: { members: { include: { user: true } } } },
      },
    });

    if (!event) return;

    const recipients = new Set<string>();
    if (event.creatorId) recipients.add(event.creatorId);
    event.account.members.forEach((m) => recipients.add(m.userId));

    for (const hostUserId of recipients) {
      await this.sendNotification({
        userId: hostUserId,
        eventId,
        type: 'GPS_STALE_ALERT',
        channel: NotificationChannel.IN_APP,
        priority: 'NORMAL',
        idempotencyKey: `${idempotencyKey}:${hostUserId}`,
        title: 'Telemetry Warning: GPS Signal Stale',
        message: `Vehicle on trip ${tripId} has not transmitted GPS for ${Math.round(staleSeconds)}s. Telemetry marked as stale.`,
        metadata: { tripId, driverId, staleSeconds, eventId },
      });
    }
  }

  /**
   * SOS_ALERT: Emergency SOS safety escalation to host desk.
   * Dispatches emergency alert to host dashboard via WebSocket and persistent notification.
   */
  async sendSOSAlert(params: {
    eventId: string;
    tripId?: string;
    reporterUserId: string;
    reporterRole?: string;
    latitude?: number;
    longitude?: number;
    reason?: string;
  }) {
    const { eventId, tripId, reporterUserId, reporterRole, latitude, longitude, reason } = params;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        creator: true,
        account: { include: { members: { include: { user: true } } } },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterUserId },
    });

    const reporterName = reporter?.fullName || 'Passenger/Driver';
    const reporterPhone = reporter?.phoneNumber || 'N/A';
    const alertData = {
      alertId: `sos_${Date.now()}`,
      eventId,
      tripId: tripId || null,
      reporterId: reporterUserId,
      reporterName,
      reporterPhone,
      reporterRole: reporterRole || reporter?.role || 'GUEST',
      latitude: latitude || null,
      longitude: longitude || null,
      reason: reason || 'EMERGENCY: Immediate assistance requested',
      timestamp: new Date().toISOString(),
    };

    // 1. Broadcast immediate WebSocket alert to event room
    this.eventsGateway.emitSOSAlert(eventId, alertData);

    // 2. Persist high-priority notifications for all event hosts & planners
    const hostUserIds = new Set<string>();
    if (event.creatorId) hostUserIds.add(event.creatorId);
    event.account.members.forEach((m) => hostUserIds.add(m.userId));

    const sosTitle = '🚨 EMERGENCY SOS ALERT DISPATCHED';
    const sosMessage = `Emergency assistance requested by ${reporterName} (${reporterPhone}) for trip ${tripId || 'N/A'}. Location: ${latitude ? `${latitude.toFixed(5)}, ${longitude?.toFixed(5)}` : 'Unknown'}. Reason: ${alertData.reason}`;

    for (const hostId of hostUserIds) {
      await this.sendNotification({
        userId: hostId,
        eventId,
        type: 'SOS_ALERT',
        channel: NotificationChannel.PUSH,
        priority: 'HIGH',
        idempotencyKey: `sos:${eventId}:${tripId || 'notrip'}:${Date.now()}:${hostId}`,
        title: sosTitle,
        message: sosMessage,
        metadata: alertData,
      });
    }

    // 3. Record in AuditLog
    await this.prisma.auditLog.create({
      data: {
        eventId,
        userId: reporterUserId,
        action: 'EMERGENCY_SOS_TRIGGERED',
        entityType: 'Trip',
        entityId: tripId || eventId,
        details: alertData,
      },
    });

    this.logger.warn(`EMERGENCY SOS ALERT dispatched for event ${eventId} by user ${reporterUserId}`);

    return {
      success: true,
      alert: alertData,
      recipientsNotifiedCount: hostUserIds.size,
    };
  }
}
