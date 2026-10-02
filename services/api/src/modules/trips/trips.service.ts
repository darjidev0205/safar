import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@safar/types';
import { isValidTripTransition } from '@safar/config';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTrips(eventId: string) {
    return this.prisma.trip.findMany({
      where: { eventId },
      include: {
        originPlace: true,
        destinationPlace: true,
        driver: {
          include: { user: true },
        },
        vehicle: true,
        bookings: {
          include: {
            guest: true,
            passengers: true,
          },
        },
      },
      orderBy: { scheduledPickupTime: 'asc' },
    });
  }

  async getTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        originPlace: true,
        destinationPlace: true,
        driver: {
          include: { user: true, currentVehicle: true },
        },
        vehicle: true,
        bookings: {
          include: {
            guest: true,
            passengers: true,
          },
        },
        tripEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    return trip;
  }

  async createTrip(eventId: string, data: any) {
    return this.prisma.trip.create({
      data: {
        eventId,
        originPlaceId: data.originPlaceId,
        destinationPlaceId: data.destinationPlaceId,
        scheduledPickupTime: new Date(data.scheduledPickupTime),
        vehicleId: data.vehicleId || null,
        driverId: data.driverId || null,
        status: data.driverId ? TripStatus.ASSIGNED : TripStatus.SCHEDULED,
      },
      include: {
        originPlace: true,
        destinationPlace: true,
        driver: { include: { user: true } },
        vehicle: true,
      },
    });
  }

  async updateTripStatus(tripId: string, targetStatus: TripStatus, actorId?: string, reason?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    const currentStatus = trip.status as TripStatus;
    if (!isValidTripTransition(currentStatus, targetStatus)) {
      throw new BadRequestException(
        `Invalid trip state transition from ${currentStatus} to ${targetStatus}`
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.trip.update({
        where: { id: tripId },
        data: updatePayload,
        include: {
          originPlace: true,
          destinationPlace: true,
          driver: { include: { user: true } },
          vehicle: true,
        },
      });

      await tx.tripEvent.create({
        data: {
          tripId,
          actorId: actorId || null,
          fromStatus: currentStatus,
          toStatus: targetStatus,
          reason: reason || null,
        },
      });

      // Update associated bookings status if completed or cancelled
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

      return result;
    });

    return updated;
  }

  async verifyBoarding(tripId: string, boardingCode: string) {
    const cleanCode = boardingCode.trim();

    const booking = await this.prisma.booking.findFirst({
      where: {
        tripId,
        boardingCode: cleanCode,
      },
      include: { guest: true },
    });

    if (!booking) {
      throw new BadRequestException('Invalid boarding code for this trip');
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'BOARDED' },
    });

    // Advance trip to BOARDING if currently ARRIVED
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (trip && trip.status === TripStatus.ARRIVED) {
      await this.updateTripStatus(tripId, TripStatus.BOARDING, undefined, 'Guest boarded with valid code');
    }

    return {
      verified: true,
      bookingId: booking.id,
      guestName: booking.guest?.fullName,
      passengerCount: booking.passengerCount,
    };
  }

  async getDriverCurrentTrip(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      return null;
    }

    const currentTrip = await this.prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: [
            TripStatus.ASSIGNED,
            TripStatus.DRIVER_ACCEPTED,
            TripStatus.EN_ROUTE_TO_PICKUP,
            TripStatus.ARRIVED,
            TripStatus.BOARDING,
            TripStatus.IN_TRANSIT,
          ],
        },
      },
      include: {
        originPlace: true,
        destinationPlace: true,
        vehicle: true,
        driver: { include: { user: true } },
        bookings: {
          include: {
            guest: true,
            passengers: true,
          },
        },
      },
      orderBy: { scheduledPickupTime: 'asc' },
    });

    return currentTrip;
  }
}
