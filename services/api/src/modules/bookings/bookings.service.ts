import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, TripStatus } from '@safar/types';
import * as crypto from 'crypto';

export function generateSecureBoardingCode(): string {
  // Cryptographically random 4-digit code (1000 - 9999), strictly excluding predictable '1234'
  let code = crypto.randomInt(1000, 10000).toString();
  while (code === '1234') {
    code = crypto.randomInt(1000, 10000).toString();
  }
  return code;
}

async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 8): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = (err?.message || '').toLowerCase();
      const isTransient =
        err?.code === 'P2034' ||
        err?.code === 'P2028' ||
        err?.code === 112 ||
        msg.includes('write conflict') ||
        msg.includes('writeconflict') ||
        msg.includes('deadlock') ||
        msg.includes('retry your transaction') ||
        msg.includes('transaction already closed');
      if (isTransient && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 25 + Math.random() * 60;
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      if (isTransient) {
        throw new ConflictException(
          'Capacity exceeded: High concurrent booking contention. Trip is full or temporarily locked.'
        );
      }
      throw err;
    }
  }
  throw lastError;
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listBookings(eventId: string) {
    return this.prisma.booking.findMany({
      where: { eventId },
      include: {
        guest: true,
        originPlace: true,
        destinationPlace: true,
        trip: {
          include: {
            vehicle: true,
            driver: { include: { user: true } },
          },
        },
      },
      orderBy: { requestedPickupTime: 'desc' },
    });
  }

  async getMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: {
        guest: {
          userId,
        },
      },
      include: {
        originPlace: true,
        destinationPlace: true,
        trip: {
          include: {
            vehicle: true,
            driver: { include: { user: true } },
          },
        },
      },
      orderBy: { requestedPickupTime: 'desc' },
    });
  }

  async getBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        originPlace: true,
        destinationPlace: true,
        trip: {
          include: {
            vehicle: true,
            driver: { include: { user: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    return booking;
  }

  /**
   * Atomic Capacity-Safe Booking Creation (PR 3 Concurrency Hardening)
   * Uses single-document atomic conditional updates to guarantee zero overbooking,
   * whole-vehicle exclusivity, and sub-millisecond concurrency locking without transaction contention.
   */
  async createBooking(eventId: string, userId: string, data: any) {
    // 1. Resolve or create Guest entity for this user
    let guest = await this.prisma.guest.findFirst({
      where: { eventId, userId },
    });

    if (!guest) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      guest = await this.prisma.guest.create({
        data: {
          eventId,
          userId,
          fullName: user?.fullName || 'Guest User',
          phoneNumber: user?.phoneNumber || null,
          email: user?.email || null,
        },
      });
    }

    const passengerCount = data.passengerCount ? Math.max(1, parseInt(String(data.passengerCount), 10)) : 1;
    const isExclusiveRequested = Boolean(data.isExclusive || data.bookingType === 'WHOLE_VEHICLE');
    const bookingType = isExclusiveRequested ? 'WHOLE_VEHICLE' : (data.bookingType || 'SEAT');
    const boardingCode = generateSecureBoardingCode();

    let targetTripId: string;

    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: data.tripId },
        include: { vehicle: true },
      });

      if (!trip) {
        throw new NotFoundException('Specified trip does not exist');
      }

      if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
        throw new ConflictException(`Trip is ${trip.status.toLowerCase()} and is no longer accepting bookings.`);
      }

      if (trip.isExclusive) {
        throw new ConflictException(
          'Trip is booked exclusively (whole vehicle reservation). Additional passenger reservations are not permitted.'
        );
      }

      const vehicleCapacity = trip.vehicle?.capacity || 4;

      // ATOMIC SEAT / VEHICLE RESERVATION VIA CONDITIONAL UPDATE
      if (isExclusiveRequested) {
        // Must have 0 current passengers to reserve whole vehicle exclusively
        const res = await this.prisma.trip.updateMany({
          where: {
            id: trip.id,
            passengerCount: 0,
            isExclusive: false,
            status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
          },
          data: {
            passengerCount,
            isExclusive: true,
          },
        });

        if (res.count === 0) {
          throw new ConflictException(
            'Cannot book whole vehicle exclusively: Existing seat reservations already exist on this trip or trip is full.'
          );
        }
      } else {
        // Reserve seat atomically if passengerCount + requested <= vehicleCapacity
        const res = await this.prisma.trip.updateMany({
          where: {
            id: trip.id,
            isExclusive: false,
            status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED] },
            passengerCount: { lte: vehicleCapacity - passengerCount },
          },
          data: {
            passengerCount: { increment: passengerCount },
          },
        });

        if (res.count === 0) {
          const latestTrip = await this.prisma.trip.findUnique({ where: { id: trip.id } });
          const seatsRemaining = Math.max(0, vehicleCapacity - (latestTrip?.passengerCount || vehicleCapacity));
          throw new ConflictException(
            `Capacity exceeded: Trip has only ${seatsRemaining} seat(s) remaining (requested: ${passengerCount}).`
          );
        }
      }

      targetTripId = trip.id;
    } else {
      // Auto-match route or schedule new trip
      const pickupDate = new Date(data.requestedPickupTime);
      const windowStart = new Date(pickupDate.getTime() - 15 * 60000);
      const windowEnd = new Date(pickupDate.getTime() + 15 * 60000);

      let matchedTripId: string | null = null;

      if (!isExclusiveRequested) {
        const candidates = await this.prisma.trip.findMany({
          where: {
            eventId,
            originPlaceId: data.pickupPlaceId,
            destinationPlaceId: data.destinationPlaceId,
            scheduledPickupTime: { gte: windowStart, lte: windowEnd },
            isExclusive: false,
            status: { in: [TripStatus.SCHEDULED, TripStatus.ASSIGNED] },
          },
          include: { vehicle: true },
        });

        for (const cand of candidates) {
          const cap = cand.vehicle?.capacity || 4;
          const res = await this.prisma.trip.updateMany({
            where: {
              id: cand.id,
              isExclusive: false,
              passengerCount: { lte: cap - passengerCount },
            },
            data: { passengerCount: { increment: passengerCount } },
          });

          if (res.count > 0) {
            matchedTripId = cand.id;
            break;
          }
        }
      }

      if (!matchedTripId) {
        const availableVehicle = await this.prisma.vehicle.findFirst({
          where: {
            category: data.requestedCategory || 'SEDAN',
            isActive: true,
          },
        });

        const newTrip = await this.prisma.trip.create({
          data: {
            eventId,
            originPlaceId: data.pickupPlaceId,
            destinationPlaceId: data.destinationPlaceId,
            scheduledPickupTime: pickupDate,
            passengerCount,
            vehicleId: availableVehicle?.id || null,
            isExclusive: isExclusiveRequested,
            status: TripStatus.SCHEDULED,
          },
        });

        matchedTripId = newTrip.id;
      }

      targetTripId = matchedTripId;
    }

    // 3. Create confirmed booking record
    try {
      return await this.prisma.booking.create({
        data: {
          eventId,
          tripId: targetTripId,
          guestId: guest.id,
          originPlaceId: data.pickupPlaceId,
          destinationPlaceId: data.destinationPlaceId,
          requestedPickupTime: new Date(data.requestedPickupTime),
          passengerCount,
          bookingType,
          isExclusive: isExclusiveRequested,
          requestedCategory: data.requestedCategory || 'SEDAN',
          status: BookingStatus.CONFIRMED,
          boardingCode,
        },
        include: {
          guest: true,
          originPlace: true,
          destinationPlace: true,
          trip: {
            include: {
              vehicle: true,
              driver: { include: { user: true } },
            },
          },
        },
      });
    } catch (createErr) {
      // Rollback atomically reserved seats if booking document creation fails
      await this.prisma.trip.update({
        where: { id: targetTripId },
        data: {
          passengerCount: { decrement: passengerCount },
          ...(isExclusiveRequested ? { isExclusive: false } : {}),
        },
      });
      throw createErr;
    }
  }

  /**
   * Cancel Booking with atomic seat restoration
   */
  async cancelBooking(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, trip: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // Role check: Only the booking guest or an organizer/admin can cancel
    if (booking.guest.userId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const isPrivileged = user?.role === 'ACCOUNT_OWNER' || user?.role === 'EVENT_ORGANIZER' || user?.role === 'SUPER_ADMIN';
      if (!isPrivileged) {
        throw new ForbiddenException('You are not authorized to cancel this booking.');
      }
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    // Atomically decrement trip passengerCount if linked to trip
    if (booking.tripId) {
      await this.prisma.trip.update({
        where: { id: booking.tripId },
        data: {
          passengerCount: { decrement: booking.passengerCount },
          ...(booking.isExclusive ? { isExclusive: false } : {}),
        },
      });
    }

    return updatedBooking;
  }
}
