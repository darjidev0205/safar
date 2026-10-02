import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, TripStatus } from '@safar/types';

function generateBoardingCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
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
   * Atomic Capacity-Safe Booking Creation
   * Uses Prisma interactive transaction to prevent race conditions and overbooking.
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

    const passengerCount = data.passengerCount || 1;
    const boardingCode = generateBoardingCode();

    // 2. Perform capacity check and atomic booking creation in a transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      // Find candidate trip or schedule a new one if matching shuttle exists
      let targetTrip = null;

      if (data.tripId) {
        targetTrip = await tx.trip.findUnique({
          where: { id: data.tripId },
          include: {
            vehicle: true,
            bookings: {
              where: { status: { in: ['CONFIRMED', 'BOARDED'] } },
            },
          },
        });

        if (!targetTrip) {
          throw new NotFoundException('Specified trip does not exist');
        }

        // Capacity Enforcement: calculate occupied seats
        const capacity = targetTrip.vehicle?.capacity || 4;
        const currentPassengers = targetTrip.bookings.reduce(
          (sum, b) => sum + b.passengerCount,
          0
        );

        if (currentPassengers + passengerCount > capacity) {
          throw new BadRequestException(
            `Capacity exceeded: Trip has only ${capacity - currentPassengers} seats remaining`
          );
        }
      } else {
        // Find existing scheduled trip for this route and time window or create one
        const pickupDate = new Date(data.requestedPickupTime);
        const windowStart = new Date(pickupDate.getTime() - 15 * 60000);
        const windowEnd = new Date(pickupDate.getTime() + 15 * 60000);

        const availableTrip = await tx.trip.findFirst({
          where: {
            eventId,
            originPlaceId: data.pickupPlaceId,
            destinationPlaceId: data.destinationPlaceId,
            scheduledPickupTime: {
              gte: windowStart,
              lte: windowEnd,
            },
            status: { in: [TripStatus.SCHEDULED, TripStatus.ASSIGNED] },
          },
          include: {
            vehicle: true,
            bookings: {
              where: { status: { in: ['CONFIRMED', 'BOARDED'] } },
            },
          },
        });

        if (availableTrip) {
          const cap = availableTrip.vehicle?.capacity || 4;
          const curr = availableTrip.bookings.reduce((sum, b) => sum + b.passengerCount, 0);
          if (curr + passengerCount <= cap) {
            targetTrip = availableTrip;
          }
        }

        // If no existing trip with free capacity, auto-schedule new trip for the event
        if (!targetTrip) {
          // Find an available vehicle matching requested category if any
          const availableVehicle = await tx.vehicle.findFirst({
            where: {
              category: data.requestedCategory || 'SEDAN',
              isActive: true,
            },
          });

          targetTrip = await tx.trip.create({
            data: {
              eventId,
              originPlaceId: data.pickupPlaceId,
              destinationPlaceId: data.destinationPlaceId,
              scheduledPickupTime: pickupDate,
              vehicleId: availableVehicle?.id || null,
              status: TripStatus.SCHEDULED,
            },
          });
        }
      }

      // Create confirmed booking
      const newBooking = await tx.booking.create({
        data: {
          eventId,
          tripId: targetTrip.id,
          guestId: guest.id,
          originPlaceId: data.pickupPlaceId,
          destinationPlaceId: data.destinationPlaceId,
          requestedPickupTime: new Date(data.requestedPickupTime),
          passengerCount,
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

      return newBooking;
    });

    return booking;
  }
}
