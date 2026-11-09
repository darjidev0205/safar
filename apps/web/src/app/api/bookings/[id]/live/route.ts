import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';

export const dynamic = 'force-dynamic';

const EARTH_RADIUS_KM = 6371.0088;
const ROAD_TORTUOSITY_FACTOR = 1.30;
const STALE_GPS_THRESHOLD_MS = 60 * 1000; // 60 seconds

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(Math.max(0, 1 - a)));
  return EARTH_RADIUS_KM * c;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return (
        errorResponse ||
        NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const bookingId = params.id;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        originPlace: true,
        destinationPlace: true,
        trip: {
          include: {
            driver: { include: { user: true } },
            vehicle: true,
            originPlace: true,
            destinationPlace: true,
          },
        },
        event: {
          include: {
            account: { include: { members: true } },
            eventMembers: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: `Booking with id ${bookingId} not found` }, { status: 404 });
    }

    // Strict privacy boundary: only guest owner, event host, or super admin
    const isGuestOwner = booking.guest.userId === user.id;
    const isHost =
      booking.event.creatorId === user.id ||
      booking.event.account.members.some((m) => m.userId === user.id) ||
      booking.event.eventMembers.some((m) => m.userId === user.id) ||
      user.role === 'SUPER_ADMIN';

    if (!isGuestOwner && !isHost) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to view live telemetry for this booking' },
        { status: 403 }
      );
    }

    const trip = booking.trip;
    if (!trip) {
      return NextResponse.json({
        success: true,
        data: {
          bookingId: booking.id,
          status: booking.status,
          boardingCode: booking.boardingCode,
          message: 'No vehicle has been assigned to this booking yet',
          trip: null,
        },
      });
    }

    const lastPingTime = trip.lastPingAt ? new Date(trip.lastPingAt).getTime() : null;
    const isStale = !lastPingTime || (Date.now() - lastPingTime) > STALE_GPS_THRESHOLD_MS;
    const staleSeconds = lastPingTime ? Math.max(0, Math.floor((Date.now() - lastPingTime) / 1000)) : null;

    let remainingDistanceKm = trip.remainingDistanceKm;
    if (remainingDistanceKm === null && trip.currentLat && trip.destinationPlace?.latitude) {
      const straightLineDist = calculateHaversineKm(
        trip.currentLat,
        trip.currentLng || 0,
        trip.destinationPlace.latitude,
        trip.destinationPlace.longitude
      );
      remainingDistanceKm = Math.round(straightLineDist * ROAD_TORTUOSITY_FACTOR * 100) / 100;
    }

    const speedKmh = trip.currentSpeed ? Math.round(trip.currentSpeed * 3.6) : 0;
    const effectiveSpeed = speedKmh > 10 ? speedKmh : 25;
    const etaMinutes = remainingDistanceKm ? Math.max(1, Math.round((remainingDistanceKm / effectiveSpeed) * 60)) : null;

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        status: booking.status,
        boardingCode: booking.boardingCode,
        pickupWindow: booking.requestedPickupTime,
        trip: {
          id: trip.id,
          status: trip.status,
          driver: trip.driver
            ? {
                name: trip.driver.user.fullName,
                phone: trip.driver.user.phoneNumber,
                avatarUrl: trip.driver.user.avatarUrl,
              }
            : null,
          vehicle: trip.vehicle
            ? {
                model: trip.vehicle.model,
                plateNumber: trip.vehicle.plateNumber,
                category: trip.vehicle.category,
              }
            : null,
          telemetry: {
            currentLat: trip.currentLat,
            currentLng: trip.currentLng,
            heading: trip.currentHeading || 0,
            speedKmh,
            actualDistanceKm: trip.actualDistanceKm,
            remainingDistanceKm,
            etaMinutes,
            lastPingAt: trip.lastPingAt ? trip.lastPingAt.toISOString() : null,
            isStale,
            staleSeconds,
            signalStatus: isStale ? 'STALE' : 'LIVE',
          },
          origin: trip.originPlace || { name: trip.pickupLocation },
          destination: trip.destinationPlace || { name: trip.destination },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching booking live telemetry:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

