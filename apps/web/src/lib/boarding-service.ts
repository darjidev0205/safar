import crypto from 'crypto';
import { prisma } from './db';
import { BookingStatus, TripStatus } from '@prisma/client';

/**
 * Generates a secure, memorable 4-digit boarding code.
 */
export function generateBoardingCode(): string {
  const num = crypto.randomInt(1000, 9999);
  return num.toString();
}

export interface BoardingVerificationResult {
  success: boolean;
  message: string;
  booking?: any;
  error?: string;
}

/**
 * Server-authoritative boarding verification.
 * Validates driver assignment, event context, trip status, and boarding code match.
 */
export async function verifyPassengerBoarding({
  tripId,
  driverUserId,
  boardingCode,
  isHost = false,
}: {
  tripId: string;
  driverUserId: string;
  boardingCode: string;
  isHost?: boolean;
}): Promise<BoardingVerificationResult> {
  const code = boardingCode.trim();
  if (!code) {
    return { success: false, message: 'Boarding code is required.', error: 'MISSING_CODE' };
  }

  // 1. Find trip with driver relation
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      driver: { include: { user: true } },
      bookings: { include: { guest: true } },
    },
  });

  if (!trip) {
    return { success: false, message: 'Trip not found.', error: 'TRIP_NOT_FOUND' };
  }

  // 2. Verify driver authorization or host authorization
  if (!isHost && trip.driver?.userId !== driverUserId) {
    return {
      success: false,
      message: 'Unauthorized: You are not the assigned driver for this trip.',
      error: 'DRIVER_NOT_ASSIGNED',
    };
  }

  // 3. Verify trip status allows boarding
  if (
    trip.status !== TripStatus.ARRIVED &&
    trip.status !== TripStatus.BOARDING &&
    trip.status !== TripStatus.EN_ROUTE_TO_PICKUP
  ) {
    return {
      success: false,
      message: `Cannot board passengers while trip is ${trip.status}. Chauffeur must arrive at pickup location first.`,
      error: 'INVALID_TRIP_STATE',
    };
  }

  // 4. Find matching booking by boarding code
  const matchedBooking = trip.bookings.find(
    (b) => b.boardingCode.trim() === code
  );

  if (!matchedBooking) {
    return {
      success: false,
      message: 'Invalid boarding code for this trip.',
      error: 'INVALID_BOARDING_CODE',
    };
  }

  if (matchedBooking.status === BookingStatus.BOARDED) {
    return {
      success: true,
      message: `${matchedBooking.guest?.fullName || 'Passenger'} is already boarded.`,
      booking: matchedBooking,
    };
  }

  // 5. Update booking status to BOARDED and advance trip to BOARDING if currently ARRIVED
  const updatedBooking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: matchedBooking.id },
      data: { status: BookingStatus.BOARDED },
      include: { guest: true },
    });

    if (trip.status === TripStatus.ARRIVED) {
      await tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.BOARDING },
      });
    }

    return b;
  });

  return {
    success: true,
    message: `Verified! ${updatedBooking.guest?.fullName || 'Passenger'} has boarded.`,
    booking: updatedBooking,
  };
}
