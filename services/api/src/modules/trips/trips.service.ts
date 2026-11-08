import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TripStatus } from '@safar/types';
import { isValidTripTransition } from '@safar/config';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTrips(eventId: string, options?: { functionId?: string }) {
    const where: any = { eventId };
    if (options?.functionId) {
      where.functionId = options.functionId;
    }
    return this.prisma.trip.findMany({
      where,
      include: {
        originPlace: true,
        destinationPlace: true,
        function: true,
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
    const scheduledPickupTime = new Date(data.scheduledPickupTime);
    if (isNaN(scheduledPickupTime.getTime())) {
      throw new BadRequestException('Valid scheduledPickupTime is required');
    }

    const windowStart = new Date(scheduledPickupTime.getTime() - 30 * 60000);
    const windowEnd = new Date(scheduledPickupTime.getTime() + 30 * 60000);

    // 1. Driver verification & conflict check
    if (data.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: data.driverId },
        include: { user: true },
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID ${data.driverId} not found`);
      }
      if (!driver.isVerified || driver.approvalStatus !== 'APPROVED') {
        throw new BadRequestException('Compliance check failed: Cannot assign an unverified or pending driver to a trip.');
      }

      // Check active in-progress trip conflict
      const activeDriverTrip = await this.prisma.trip.findFirst({
        where: {
          driverId: data.driverId,
          status: {
            in: [
              TripStatus.ASSIGNED,
              TripStatus.EN_ROUTE_TO_PICKUP,
              TripStatus.ARRIVED,
              TripStatus.BOARDING,
              TripStatus.IN_TRANSIT,
            ],
          },
        },
      });
      if (activeDriverTrip) {
        throw new ConflictException(
          `Driver conflict: Driver ${driver.user?.fullName || driver.id} is already assigned to an active trip (${activeDriverTrip.id}) with status ${activeDriverTrip.status}.`
        );
      }

      // Check overlapping scheduled trip window (+/- 30 min)
      const overlappingDriverTrip = await this.prisma.trip.findFirst({
        where: {
          driverId: data.driverId,
          scheduledPickupTime: { gte: windowStart, lte: windowEnd },
          status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
        },
      });
      if (overlappingDriverTrip) {
        throw new ConflictException(
          `Driver conflict: Driver has another trip (${overlappingDriverTrip.id}) scheduled within 30 minutes of this pickup time.`
        );
      }
    }

    // 2. Vehicle conflict check
    if (data.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with ID ${data.vehicleId} not found`);
      }

      const activeVehicleTrip = await this.prisma.trip.findFirst({
        where: {
          vehicleId: data.vehicleId,
          status: {
            in: [
              TripStatus.EN_ROUTE_TO_PICKUP,
              TripStatus.ARRIVED,
              TripStatus.BOARDING,
              TripStatus.IN_TRANSIT,
            ],
          },
        },
      });
      if (activeVehicleTrip) {
        throw new ConflictException(
          `Vehicle conflict: Vehicle ${vehicle.model} (${vehicle.plateNumber}) is currently in transit on trip ${activeVehicleTrip.id}.`
        );
      }

      const overlappingVehicleTrip = await this.prisma.trip.findFirst({
        where: {
          vehicleId: data.vehicleId,
          scheduledPickupTime: { gte: windowStart, lte: windowEnd },
          status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
        },
      });
      if (overlappingVehicleTrip) {
        throw new ConflictException(
          `Vehicle conflict: Vehicle is already scheduled for another trip (${overlappingVehicleTrip.id}) within 30 minutes.`
        );
      }
    }

    return this.prisma.trip.create({
      data: {
        eventId,
        functionId: data.functionId || null,
        guestId: data.guestId || null,
        familyId: data.familyId || null,
        originPlaceId: data.originPlaceId || null,
        destinationPlaceId: data.destinationPlaceId || null,
        pickupLocation: data.pickupLocation || null,
        destination: data.destination || null,
        passengerCount: data.passengerCount ? parseInt(String(data.passengerCount), 10) : 1,
        scheduledPickupTime,
        vehicleId: data.vehicleId || null,
        driverId: data.driverId || null,
        isExclusive: Boolean(data.isExclusive),
        status: data.driverId ? TripStatus.ASSIGNED : TripStatus.SCHEDULED,
      },
      include: {
        originPlace: true,
        destinationPlace: true,
        function: true,
        driver: { include: { user: true } },
        vehicle: true,
      },
    });
  }

  async assignTrip(tripId: string, data: { driverId?: string; vehicleId?: string }) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    const windowStart = new Date(trip.scheduledPickupTime.getTime() - 30 * 60000);
    const windowEnd = new Date(trip.scheduledPickupTime.getTime() + 30 * 60000);

    if (data.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: data.driverId },
        include: { user: true },
      });
      if (!driver) {
        throw new NotFoundException(`Driver with ID ${data.driverId} not found`);
      }
      if (!driver.isVerified || driver.approvalStatus !== 'APPROVED') {
        throw new BadRequestException('Compliance check failed: Cannot assign an unverified or pending driver.');
      }

      const activeDriverTrip = await this.prisma.trip.findFirst({
        where: {
          id: { not: tripId },
          driverId: data.driverId,
          status: {
            in: [
              TripStatus.ASSIGNED,
              TripStatus.EN_ROUTE_TO_PICKUP,
              TripStatus.ARRIVED,
              TripStatus.BOARDING,
              TripStatus.IN_TRANSIT,
            ],
          },
        },
      });
      if (activeDriverTrip) {
        throw new ConflictException(
          `Driver conflict: Driver ${driver.user?.fullName || driver.id} is already assigned to an active trip (${activeDriverTrip.id}).`
        );
      }

      const overlappingDriverTrip = await this.prisma.trip.findFirst({
        where: {
          id: { not: tripId },
          driverId: data.driverId,
          scheduledPickupTime: { gte: windowStart, lte: windowEnd },
          status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
        },
      });
      if (overlappingDriverTrip) {
        throw new ConflictException(
          `Driver conflict: Driver has another trip (${overlappingDriverTrip.id}) scheduled within 30 minutes.`
        );
      }
    }

    if (data.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with ID ${data.vehicleId} not found`);
      }

      const activeVehicleTrip = await this.prisma.trip.findFirst({
        where: {
          id: { not: tripId },
          vehicleId: data.vehicleId,
          status: {
            in: [
              TripStatus.EN_ROUTE_TO_PICKUP,
              TripStatus.ARRIVED,
              TripStatus.BOARDING,
              TripStatus.IN_TRANSIT,
            ],
          },
        },
      });
      if (activeVehicleTrip) {
        throw new ConflictException(
          `Vehicle conflict: Vehicle ${vehicle.plateNumber} is currently in transit on trip ${activeVehicleTrip.id}.`
        );
      }

      const overlappingVehicleTrip = await this.prisma.trip.findFirst({
        where: {
          id: { not: tripId },
          vehicleId: data.vehicleId,
          scheduledPickupTime: { gte: windowStart, lte: windowEnd },
          status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
        },
      });
      if (overlappingVehicleTrip) {
        throw new ConflictException(
          `Vehicle conflict: Vehicle is already scheduled for another trip (${overlappingVehicleTrip.id}) within 30 minutes.`
        );
      }
    }

    return this.prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(data.driverId ? { driverId: data.driverId, status: trip.status === TripStatus.SCHEDULED ? TripStatus.ASSIGNED : trip.status } : {}),
        ...(data.vehicleId ? { vehicleId: data.vehicleId } : {}),
      },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        function: true,
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

    const updated = await this.prisma.$transaction(
      async (tx) => {
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
      },
      { timeout: 30000, maxWait: 15000 }
    );

    return updated;
  }

  async verifyBoarding(tripId: string, boardingCode: string) {
    const cleanCode = boardingCode.trim();

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    // Rate-limiting check: enforce trip-level lockout if locked
    const now = new Date();
    if (trip.boardingLockedUntil && trip.boardingLockedUntil > now) {
      const remainingSeconds = Math.ceil((trip.boardingLockedUntil.getTime() - now.getTime()) / 1000);
      throw new ForbiddenException(
        `Trip boarding verification is locked due to repeated invalid attempts. Please retry in ${remainingSeconds} seconds.`
      );
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        tripId,
        boardingCode: cleanCode,
      },
      include: { guest: true },
    });

    if (!booking) {
      const currentAttempts = (trip.failedBoardingAttempts || 0) + 1;
      const shouldLock = currentAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 5 * 60 * 1000) : null;

      await this.prisma.trip.update({
        where: { id: tripId },
        data: {
          failedBoardingAttempts: shouldLock ? 0 : currentAttempts,
          boardingLockedUntil: lockedUntil,
        },
      });

      if (shouldLock) {
        throw new ForbiddenException(
          'Maximum invalid boarding code attempts exceeded (5/5). Boarding verification locked for 5 minutes.'
        );
      }
      throw new BadRequestException(
        `Invalid boarding code for this trip. Attempts remaining: ${5 - currentAttempts}`
      );
    }

    // Replay prevention: reject already boarded or cancelled bookings
    if (booking.status === 'BOARDED') {
      throw new BadRequestException('Replay detected: Passenger is already boarded on this trip.');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException(`Cannot board booking in ${booking.status} status.`);
    }

    // Successful code verification: reset failed attempt counter and mark BOARDED
    await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id: tripId },
        data: {
          failedBoardingAttempts: 0,
          boardingLockedUntil: null,
        },
      }),
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'BOARDED' },
      }),
    ]);

    // Advance trip to BOARDING if currently ARRIVED
    if (trip.status === TripStatus.ARRIVED) {
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
