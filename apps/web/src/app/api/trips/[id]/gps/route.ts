import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { processGpsPingAndAccumulateDistance } from '../../../../../lib/tracking-engine';
import { firestore, doc, setDoc } from '../../../../../lib/firebase';
import { TripStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// POST /api/trips/:id/gps - Ingest driver telemetry, filter jitter/teleport, accumulate distance
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const tripId = params.id;
    const body = await req.json();

    const {
      latitude,
      longitude,
      accuracyMeters,
      speedKmh,
      heading,
      timestamp = new Date().toISOString(),
    } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: { message: 'Valid latitude and longitude numbers are required.' } },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: true,
        vehicle: true,
        locationPings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, error: { message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    // Authorization: only the assigned driver or host
    const isDriver = trip.driver?.userId === caller.id;
    const isHost = caller.role === 'EVENT_ORGANIZER' || caller.role === 'ACCOUNT_OWNER' || caller.role === 'SUPER_ADMIN';

    if (!isDriver && !isHost) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized: Only the assigned driver can send GPS updates.' } },
        { status: 403 }
      );
    }

    // Only accumulate distance when trip is IN_TRANSIT or ARRIVED
    const isAccumulating = trip.status === TripStatus.IN_TRANSIT || trip.status === TripStatus.ARRIVED;

    const previousPing = trip.locationPings[0]
      ? {
          latitude: trip.locationPings[0].latitude,
          longitude: trip.locationPings[0].longitude,
          timestamp: trip.locationPings[0].timestamp,
        }
      : trip.currentLat && trip.currentLng
      ? {
          latitude: trip.currentLat,
          longitude: trip.currentLng,
          timestamp: trip.lastPingAt || new Date(),
        }
      : null;

    const accumulation = processGpsPingAndAccumulateDistance({
      previousPing,
      newPing: {
        latitude,
        longitude,
        timestamp,
        accuracyMeters: typeof accuracyMeters === 'number' ? accuracyMeters : undefined,
        speedKmh: typeof speedKmh === 'number' ? speedKmh : undefined,
        heading: typeof heading === 'number' ? heading : undefined,
      },
      currentTotalDistanceKm: trip.actualDistanceKm || 0,
    });

    const now = new Date(timestamp);

    // If accepted or first ping, update vehicle & trip current position
    const updatedDistance = isAccumulating ? accumulation.newTotalDistanceKm : (trip.actualDistanceKm || 0);

    // Save location ping to MongoDB
    if (accumulation.isAccepted) {
      await prisma.$transaction([
        prisma.trip.update({
          where: { id: tripId },
          data: {
            currentLat: latitude,
            currentLng: longitude,
            currentSpeed: typeof speedKmh === 'number' ? speedKmh : undefined,
            currentHeading: typeof heading === 'number' ? heading : undefined,
            lastPingAt: now,
            actualDistanceKm: updatedDistance,
          },
        }),
        ...(trip.vehicleId
          ? [
              prisma.vehicle.update({
                where: { id: trip.vehicleId },
                data: {
                  currentLat: latitude,
                  currentLng: longitude,
                  lastPingAt: now,
                },
              }),
            ]
          : []),
        ...(trip.driverId
          ? [
              prisma.locationPing.create({
                data: {
                  tripId,
                  driverId: trip.driverId,
                  vehicleId: trip.vehicleId,
                  latitude,
                  longitude,
                  speed: typeof speedKmh === 'number' ? speedKmh : undefined,
                  heading: typeof heading === 'number' ? heading : undefined,
                  accuracy: typeof accuracyMeters === 'number' ? accuracyMeters : undefined,
                  timestamp: now,
                },
              }),
            ]
          : []),
      ]);
    }

    // Realtime broadcast to Firestore for zero-latency passenger & host tracking
    try {
      await setDoc(
        doc(firestore, 'live_trips', tripId),
        {
          tripId,
          eventId: trip.eventId,
          driverId: trip.driverId,
          vehicleId: trip.vehicleId,
          status: trip.status,
          currentLat: latitude,
          currentLng: longitude,
          speedKmh: speedKmh || 0,
          heading: heading || 0,
          actualDistanceKm: updatedDistance,
          lastUpdated: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore live GPS broadcast note:', fsErr);
    }

    return NextResponse.json({
      success: true,
      accepted: accumulation.isAccepted,
      rejectionReason: accumulation.rejectionReason,
      deltaDistanceKm: accumulation.deltaDistanceKm,
      actualDistanceKm: updatedDistance,
    });
  } catch (error: any) {
    console.error('Error in POST /api/trips/:id/gps:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to ingest GPS.' } },
      { status: 500 }
    );
  }
}
