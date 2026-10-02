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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeEvent')
  handleSubscribeEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    if (data.eventId) {
      const room = `event:${data.eventId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room}`);
      return { status: 'subscribed', room };
    }
  }

  @SubscribeMessage('subscribeTrip')
  handleSubscribeTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    if (data.tripId) {
      const room = `trip:${data.tripId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room}`);
      return { status: 'subscribed', room };
    }
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
