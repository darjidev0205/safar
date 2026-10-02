import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async processLocationPing(userId: string, data: any) {
    // 1. Verify driver identity
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: { currentVehicle: true },
    });

    if (!driver) {
      throw new ForbiddenException('User is not registered as a driver');
    }

    const vehicleId = data.vehicleId || driver.currentVehicleId;
    let eventId: string | null = null;

    // 2. Validate trip assignment if tripId is provided
    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: data.tripId },
      });

      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      if (trip.driverId !== driver.id) {
        throw new ForbiddenException('Driver is not assigned to this trip');
      }

      eventId = trip.eventId;
    }

    // 3. Persist location ping
    const ping = await this.prisma.locationPing.create({
      data: {
        driverId: driver.id,
        vehicleId,
        tripId: data.tripId || null,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading || null,
        speed: data.speed || null,
        accuracy: data.accuracy || null,
        timestamp: new Date(data.timestamp || Date.now()),
      },
    });

    // 4. Update current position of vehicle
    if (vehicleId) {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentLat: data.latitude,
          currentLng: data.longitude,
          lastPingAt: new Date(),
        },
      });
    }

    // 5. Broadcast to WebSocket subscribers
    if (eventId) {
      this.eventsGateway.emitLocationPing(eventId, data.tripId, {
        id: ping.id,
        tripId: data.tripId,
        driverId: driver.id,
        vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        timestamp: ping.timestamp.toISOString(),
      });
    }

    return ping;
  }

  async getFleetPings(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { accountId: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Return vehicles with their most recent positions
    return this.prisma.vehicle.findMany({
      where: {
        accountId: event.accountId,
        currentLat: { not: null },
      },
      select: {
        id: true,
        model: true,
        plateNumber: true,
        category: true,
        currentLat: true,
        currentLng: true,
        lastPingAt: true,
        drivers: {
          select: {
            id: true,
            user: {
              select: {
                fullName: true,
              },
            },
            dutyStatus: true,
          },
        },
      },
    });
  }

  async triggerEmergencySOS(userId: string, data: { tripId?: string; reason?: string }) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: { currentVehicle: true, user: true },
    });

    if (!driver) {
      throw new ForbiddenException('Driver not found');
    }

    let eventId: string | null = null;
    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
      eventId = trip?.eventId || null;
    }

    const alert = {
      type: 'SOS_EMERGENCY',
      driverId: driver.id,
      driverName: driver.user?.fullName,
      phone: driver.user?.phoneNumber,
      vehicle: driver.currentVehicle?.plateNumber,
      tripId: data.tripId,
      reason: data.reason || 'Driver reported an emergency',
      timestamp: new Date().toISOString(),
    };

    if (eventId) {
      this.eventsGateway.emitSOSAlert(eventId, alert);
    }

    return { status: 'SOS_DISPATCHED', alert };
  }
}
