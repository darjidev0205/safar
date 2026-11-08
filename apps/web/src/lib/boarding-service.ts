import crypto from 'crypto';
import { prisma } from './db';
import { BookingStatus, TripStatus } from '@prisma/client';

/**
 * Generates a secure, memorable 4-digit boarding code.
 */
export function generateBoardingCode(): string {
  let num = crypto.randomInt(1000, 10000).toString();
  while (num === '1234') {
    num = crypto.randomInt(1000, 10000).toString();
  }
  return num;
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

  // 2b. Rate-limiting check: enforce trip-level lockout if locked
  const now = new Date();
  if (trip.boardingLockedUntil && trip.boardingLockedUntil > now) {
    const remainingSeconds = Math.ceil((trip.boardingLockedUntil.getTime() - now.getTime()) / 1000);
    return {
      success: false,
      message: `Trip boarding verification is locked due to repeated invalid attempts. Please retry in ${remainingSeconds} seconds.`,
      error: 'BOARDING_LOCKED',
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
    const currentAttempts = (trip.failedBoardingAttempts || 0) + 1;
    const shouldLock = currentAttempts >= 5;
    const lockedUntil = shouldLock ? new Date(Date.now() + 5 * 60 * 1000) : null;

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        failedBoardingAttempts: shouldLock ? 0 : currentAttempts,
        boardingLockedUntil: lockedUntil,
      },
    });

    if (shouldLock) {
      return {
        success: false,
        message: 'Maximum invalid boarding code attempts exceeded (5/5). Boarding verification locked for 5 minutes.',
        error: 'MAX_ATTEMPTS_EXCEEDED',
      };
    }

    return {
      success: false,
      message: `Invalid boarding code for this trip. Attempts remaining: ${5 - currentAttempts}`,
      error: 'INVALID_BOARDING_CODE',
    };
  }

  if (matchedBooking.status === BookingStatus.BOARDED) {
    return {
      success: false,
      message: 'Replay detected: Passenger is already boarded on this trip.',
      error: 'REPLAY_DETECTED',
    };
  }

  if (matchedBooking.status !== BookingStatus.CONFIRMED) {
    return {
      success: false,
      message: `Cannot board booking in ${matchedBooking.status} status.`,
      error: 'INVALID_BOOKING_STATUS',
    };
  }

  // 5. Update booking status to BOARDED, reset trip lock, and advance trip to BOARDING if ARRIVED
  const updatedBooking = await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: tripId },
      data: {
        failedBoardingAttempts: 0,
        boardingLockedUntil: null,
      },
    });

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
