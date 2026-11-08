import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string) ||
        (client.handshake.query?.token as string);

      if (!authHeader) {
        this.logger.warn(`Rejected unauthenticated socket connection: ${client.id}`);
        client.emit('error', { message: 'Authentication token required for WebSocket connection' });
        client.disconnect(true);
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      let firebaseUid: string | null = null;

      if (admin.apps.length > 0) {
        try {
          const decoded = await admin.auth().verifyIdToken(token);
          firebaseUid = decoded.uid;
        } catch {
          this.logger.warn(`Invalid Firebase token on socket ${client.id}`);
          client.emit('error', { message: 'Invalid or expired authentication token' });
          client.disconnect(true);
          return;
        }
      } else if (process.env.NODE_ENV !== 'production') {
        if (token.startsWith('dev_')) {
          firebaseUid = token;
        } else {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              firebaseUid = payload.sub || payload.uid || payload.user_id;
            }
          } catch {
            firebaseUid = `uid_${token.substring(0, 16)}`;
          }
        }
      }

      if (!firebaseUid) {
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { firebaseUid },
        include: {
          accountMembers: true,
          eventMembers: true,
          drivers: true,
        },
      });

      if (!user) {
        this.logger.warn(`User record not found for socket ${client.id}`);
        client.emit('error', { message: 'User record not found' });
        client.disconnect(true);
        return;
      }

      client.data.user = user;
      this.logger.log(`Authenticated socket connected: ${client.id} (User: ${user.fullName}, Role: ${user.role})`);
    } catch (err: any) {
      this.logger.error(`Error during socket connection auth: ${err?.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeEvent')
  async handleSubscribeEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      return { status: 'error', message: 'Unauthorized: Authentication required' };
    }

    if (!data.eventId) {
      return { status: 'error', message: 'eventId is required' };
    }

    if (user.role === 'SUPER_ADMIN') {
      const room = `event:${data.eventId}`;
      client.join(room);
      return { status: 'subscribed', room };
    }

    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        account: { include: { members: true } },
        eventMembers: true,
        drivers: true,
      },
    });

    if (!event) {
      return { status: 'error', message: 'Event not found' };
    }

    const isAuthorized =
      event.creatorId === user.id ||
      event.account.members.some((m) => m.userId === user.id) ||
      event.eventMembers.some((m) => m.userId === user.id) ||
      event.drivers.some((d) => d.userId === user.id);

    if (!isAuthorized) {
      this.logger.warn(`Access denied to event room ${data.eventId} for user ${user.id}`);
      return { status: 'error', message: 'Forbidden: You do not have permission to subscribe to this event telemetry' };
    }

    const room = `event:${data.eventId}`;
    client.join(room);
    this.logger.log(`Authorized client ${client.id} (User: ${user.id}) joined room ${room}`);
    return { status: 'subscribed', room };
  }

  @SubscribeMessage('subscribeTrip')
  async handleSubscribeTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const user = client.data.user;
    if (!user) {
      return { status: 'error', message: 'Unauthorized: Authentication required' };
    }

    if (!data.tripId) {
      return { status: 'error', message: 'tripId is required' };
    }

    if (user.role === 'SUPER_ADMIN') {
      const room = `trip:${data.tripId}`;
      client.join(room);
      return { status: 'subscribed', room };
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: {
        driver: true,
        bookings: { include: { guest: true } },
        event: {
          include: {
            account: { include: { members: true } },
            eventMembers: true,
          },
        },
      },
    });

    if (!trip) {
      return { status: 'error', message: 'Trip not found' };
    }

    const isDriver = trip.driver?.userId === user.id;
    const isBookedPassenger = trip.bookings.some((b) => b.guest?.userId === user.id);
    const isEventHost =
      trip.event.creatorId === user.id ||
      trip.event.account.members.some((m) => m.userId === user.id) ||
      trip.event.eventMembers.some((m) => m.userId === user.id);

    if (!isDriver && !isBookedPassenger && !isEventHost) {
      this.logger.warn(`Access denied to trip room ${data.tripId} for user ${user.id}`);
      return { status: 'error', message: 'Forbidden: You do not have permission to subscribe to this trip' };
    }

    const room = `trip:${data.tripId}`;
    client.join(room);
    this.logger.log(`Authorized client ${client.id} (User: ${user.id}) joined room ${room}`);
    return { status: 'subscribed', room };
  }

  emitLocationPing(eventId: string, tripId: string | null, pingData: any) {
    if (this.server) {
      this.server.to(`event:${eventId}`).emit('locationPing', pingData);
      if (tripId) {
        this.server.to(`trip:${tripId}`).emit('tripLocation', pingData);
      }
    }
  }

  emitTripUpdate(eventId: string, tripId: string, tripData: any) {
    if (this.server) {
      this.server.to(`event:${eventId}`).emit('tripStatusChanged', tripData);
      this.server.to(`trip:${tripId}`).emit('tripStatusChanged', tripData);
    }
  }

  emitSOSAlert(eventId: string, alertData: any) {
    if (this.server) {
      this.server.to(`event:${eventId}`).emit('sosAlert', alertData);
    }
  }
}
