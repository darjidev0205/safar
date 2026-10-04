import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { firestore, doc, setDoc } from '../../../../lib/firebase';
import {
  defaultGpsValidator,
  accumulateDistance,
  createInitialDistanceState,
  defaultRealtimeStateEngine,
  defaultEtaEngine,
  roundToDecimals,
} from '../../../../lib/safar-engine';

export const dynamic = 'force-dynamic';

async function getCallerUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const emailHeader = req.headers.get('x-user-email');
  const uidHeader = req.headers.get('x-user-uid');
  const idHeader = req.headers.get('x-user-id');

  if (idHeader) {
    const user = await prisma.user.findUnique({ where: { id: idHeader } });
    if (user) return user;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    if (token.includes('@')) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: token.toLowerCase(), mode: 'insensitive' } },
      });
      if (user) return user;
    }
    const user = await prisma.user.findFirst({
      where: { OR: [{ firebaseUid: token }, { id: token }] },
    });
    if (user) return user;
  }

  if (emailHeader) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: emailHeader.toLowerCase(), mode: 'insensitive' } },
    });
    if (user) return user;
  }

  if (uidHeader) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ firebaseUid: uidHeader }, { id: uidHeader }] },
    });
    if (user) return user;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getCallerUser(req);
    const body = await req.json();

    const {
      updateId,
      tripId,
      driverId,
      vehicleId,
      latitude,
      longitude,
      accuracy,
      speedKmh,
      heading,
      timestamp,
      actualDistanceKm: clientReportedDistanceKm,
      remainingDistanceKm,
      plannedDistanceKm,
      status,
      bufferedPings,
    } = body;

    const rawTimestamp = timestamp || Date.now();

    // 1. Resolve Driver identity
    let resolvedDriverId = driverId;
    let resolvedVehicleId = vehicleId;

    if (!resolvedDriverId && caller) {
      const driverRecord = await prisma.driver.findFirst({
        where: { userId: caller.id },
      });
      if (driverRecord) {
        resolvedDriverId = driverRecord.id;
        if (!resolvedVehicleId && driverRecord.currentVehicleId) {
          resolvedVehicleId = driverRecord.currentVehicleId;
        }
      }
    }

    const telemetryPayload = {
      updateId,
      driverId: resolvedDriverId || 'driver_unassigned',
      tripId: tripId || undefined,
      vehicleId: resolvedVehicleId || undefined,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      speedKmh: speedKmh !== undefined ? Number(speedKmh) : undefined,
      heading: heading !== undefined ? Number(heading) : null,
      timestamp: rawTimestamp,
    };

    // 2. Fetch active in-memory state or fallback to previous baseline
    const activeState = tripId ? defaultRealtimeStateEngine.getActiveTrip(tripId) : null;
    const previousPoint = activeState
      ? {
          latitude: activeState.currentLat,
          longitude: activeState.currentLng,
          timestamp: activeState.lastUpdated,
        }
      : null;

    // 3. Multi-Stage Algorithmic Validation & Deduplication
    const validationResult = defaultGpsValidator.validateTelemetry(
      telemetryPayload,
      previousPoint
    );

    if (!validationResult.isValid) {
      // Reject invalid telemetry (out of bounds or impossible teleportation jump)
      return NextResponse.json(
        {
          success: false,
          error: validationResult.rejectionReason || 'Invalid GPS telemetry',
          flags: validationResult.flags,
        },
        { status: 400 }
      );
    }

    // If duplicate ping, acknowledge without double-accumulating distance or DB writes
    if (validationResult.flags.isDuplicate) {
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        data: {
          tripId,
          actualDistanceKm: activeState?.actualDistanceKm || clientReportedDistanceKm || 0,
        },
      });
    }

    // 4. Authoritative Incremental Distance Calculation
    let currentActualDistanceKm = activeState?.actualDistanceKm || Number(clientReportedDistanceKm) || 0;
    if (validationResult.isUsableForDistance && validationResult.distanceDeltaKm > 0) {
      currentActualDistanceKm = roundToDecimals(
        currentActualDistanceKm + validationResult.distanceDeltaKm,
        3
      );
    }

    // 5. Deterministic ETA Calculation
    let calculatedEtaMinutes = activeState?.etaMinutes;
    if (remainingDistanceKm !== undefined && remainingDistanceKm !== null) {
      const etaResult = defaultEtaEngine.calculateEta({
        remainingDistanceKm: Number(remainingDistanceKm),
        currentSpeedKmh: telemetryPayload.speedKmh,
      });
      calculatedEtaMinutes = etaResult.estimatedDurationMinutes;
    }

    // 6. Update High-Performance In-Memory Realtime State
    if (tripId) {
      defaultRealtimeStateEngine.updateTripTelemetry(
        tripId,
        body.eventId || 'event_default',
        telemetryPayload,
        {
          actualDistanceKm: currentActualDistanceKm,
          remainingDistanceKm: remainingDistanceKm !== undefined ? Number(remainingDistanceKm) : undefined,
          plannedDistanceKm: plannedDistanceKm !== undefined ? Number(plannedDistanceKm) : undefined,
          etaMinutes: calculatedEtaMinutes,
          status: status || 'IN_TRANSIT',
        }
      );
    }

    const now = new Date(rawTimestamp);

    // 7. Selective Persistence in MongoDB (Trip & Vehicle)
    if (tripId && tripId.length === 24) {
      try {
        await prisma.trip.update({
          where: { id: tripId },
          data: {
            currentLat: telemetryPayload.latitude,
            currentLng: telemetryPayload.longitude,
            currentSpeed: telemetryPayload.speedKmh || undefined,
            currentHeading: telemetryPayload.heading || undefined,
            actualDistanceKm: currentActualDistanceKm,
            remainingDistanceKm: remainingDistanceKm !== undefined ? Number(remainingDistanceKm) : undefined,
            plannedDistanceKm: plannedDistanceKm !== undefined ? Number(plannedDistanceKm) : undefined,
            lastPingAt: now,
            status: status ? (status as any) : undefined,
          },
        });
      } catch (err) {
        console.warn('Trip record update notice:', err);
      }
    }

    if (resolvedVehicleId && resolvedVehicleId.length === 24) {
      try {
        await prisma.vehicle.update({
          where: { id: resolvedVehicleId },
          data: {
            currentLat: telemetryPayload.latitude,
            currentLng: telemetryPayload.longitude,
            lastPingAt: now,
          },
        });
      } catch (err) {
        console.warn('Vehicle coordinates update notice:', err);
      }
    }

    // 8. Record LocationPing (only if usable or buffered)
    if (resolvedDriverId && resolvedDriverId.length === 24 && validationResult.isUsableForDistance) {
      try {
        await prisma.locationPing.create({
          data: {
            tripId: tripId && tripId.length === 24 ? tripId : undefined,
            driverId: resolvedDriverId,
            vehicleId: resolvedVehicleId && resolvedVehicleId.length === 24 ? resolvedVehicleId : undefined,
            latitude: telemetryPayload.latitude,
            longitude: telemetryPayload.longitude,
            accuracy: telemetryPayload.accuracy || undefined,
            speed: telemetryPayload.speedKmh ? telemetryPayload.speedKmh / 3.6 : undefined,
            heading: telemetryPayload.heading || undefined,
            timestamp: now,
          },
        });

        // Batch insert offline buffered pings if provided
        if (Array.isArray(bufferedPings) && bufferedPings.length > 0) {
          const validBuffer = bufferedPings
            .filter((p: any) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
            .map((p: any) => ({
              tripId: tripId && tripId.length === 24 ? tripId : undefined,
              driverId: resolvedDriverId,
              vehicleId: resolvedVehicleId && resolvedVehicleId.length === 24 ? resolvedVehicleId : undefined,
              latitude: Number(p.latitude),
              longitude: Number(p.longitude),
              accuracy: p.accuracy ? Number(p.accuracy) : undefined,
              speed: p.speedKmh ? Number(p.speedKmh) / 3.6 : undefined,
              heading: p.heading ? Number(p.heading) : undefined,
              timestamp: new Date(p.timestamp || Date.now()),
            }));

          if (validBuffer.length > 0) {
            await prisma.locationPing.createMany({ data: validBuffer });
          }
        }
      } catch (err) {
        console.warn('LocationPing creation notice:', err);
      }
    }

    // 9. Sync Telemetry Delta to Firebase Firestore live_trips collection
    if (tripId) {
      try {
        const tripDocRef = doc(firestore, 'live_trips', tripId);
        await setDoc(
          tripDocRef,
          {
            tripId,
            driverId: resolvedDriverId || 'driver_current',
            vehicleId: resolvedVehicleId || null,
            latitude: telemetryPayload.latitude,
            longitude: telemetryPayload.longitude,
            accuracy: telemetryPayload.accuracy || 0,
            speedKmh: telemetryPayload.speedKmh || 0,
            heading: telemetryPayload.heading || null,
            actualDistanceKm: currentActualDistanceKm,
            remainingDistanceKm: remainingDistanceKm !== undefined ? Number(remainingDistanceKm) : null,
            plannedDistanceKm: plannedDistanceKm !== undefined ? Number(plannedDistanceKm) : null,
            etaMinutes: calculatedEtaMinutes || null,
            status: status || 'IN_TRANSIT',
            lastUpdated: now.toISOString(),
            isOnline: true,
          },
          { merge: true }
        );
      } catch (firestoreErr) {
        console.warn('Firestore real-time sync notice:', firestoreErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tripId,
        receivedAt: now.toISOString(),
        actualDistanceKm: currentActualDistanceKm,
        remainingDistanceKm,
        etaMinutes: calculatedEtaMinutes,
        validation: {
          isUsableForDistance: validationResult.isUsableForDistance,
          impliedSpeedKmh: Math.round(validationResult.impliedSpeedKmh),
        },
      },
    });
  } catch (error: any) {
    console.error('Error in driver location handler:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
