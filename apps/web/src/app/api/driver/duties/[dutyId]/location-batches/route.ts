import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getCallerUser } from '../../../../../../lib/caller-auth';
import { DutyStatus, TripStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const EARTH_RADIUS_KM = 6371.0088;
const ROAD_TORTUOSITY_FACTOR = 1.30;
const MAX_FEASIBLE_SPEED_KMH = 160;
const MIN_STATIONARY_JITTER_KM = 0.008;

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

export async function POST(
  req: NextRequest,
  { params }: { params: { dutyId: string } }
) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return (
        errorResponse ||
        NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const dutyId = params.dutyId;
    const body = await req.json();
    const { pings } = body;

    if (!Array.isArray(pings) || pings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Location batch must contain at least one ping' },
        { status: 400 }
      );
    }

    // 1. Authorize Driver & Duty
    const duty = await prisma.duty.findUnique({
      where: { id: dutyId },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
      },
    });

    if (!duty) {
      return NextResponse.json({ success: false, error: `Duty with id ${dutyId} not found` }, { status: 404 });
    }

    if (duty.driver.userId !== user.id && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not authorized to submit telemetry for this driver duty' },
        { status: 403 }
      );
    }

    if (duty.status === DutyStatus.OFF_DUTY) {
      return NextResponse.json(
        { success: false, error: 'Cannot ingest location pings for an OFF_DUTY duty record' },
        { status: 400 }
      );
    }

    const driverId = duty.driverId;
    const vehicleId = duty.vehicleId;

    // 2. Resolve Active Assigned Trip (if any)
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId,
        status: {
          in: [
            TripStatus.SCHEDULED,
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
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 3. Baseline previous valid point
    let lastValidPoint: {
      latitude: number;
      longitude: number;
      timestamp: number;
      sequence?: number;
    } | null = null;

    const previousDbPing = await prisma.locationPing.findFirst({
      where: { driverId },
      orderBy: { timestamp: 'desc' },
    });

    if (previousDbPing) {
      lastValidPoint = {
        latitude: previousDbPing.latitude,
        longitude: previousDbPing.longitude,
        timestamp: previousDbPing.timestamp.getTime(),
        sequence: previousDbPing.sequence ?? undefined,
      };
    }

    const sortedPings = [...pings].sort((a, b) => {
      if (typeof a.sequence === 'number' && typeof b.sequence === 'number') {
        return a.sequence - b.sequence;
      }
      return new Date(a.sampledAt || a.timestamp).getTime() - new Date(b.sampledAt || b.timestamp).getTime();
    });

    const validatedPingsToInsert: any[] = [];
    let duplicateCount = 0;
    let rejectedCount = 0;
    let distanceDeltaKmSum = 0;
    const nowMs = Date.now();

    for (const rawPing of sortedPings) {
      const lat = Number(rawPing.latitude);
      const lng = Number(rawPing.longitude);
      const seq = typeof rawPing.sequence === 'number' ? rawPing.sequence : undefined;
      const sampledAtDate = new Date(rawPing.sampledAt || rawPing.timestamp || nowMs);
      const sampleMs = sampledAtDate.getTime();

      // Geodetic boundary check
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        rejectedCount++;
        continue;
      }

      // Timestamp sanity: not >60s in future, not >24h old
      if (sampleMs > nowMs + 60000 || sampleMs < nowMs - 24 * 3600 * 1000) {
        rejectedCount++;
        continue;
      }

      // Accuracy thresholding
      const accuracy = rawPing.accuracy !== undefined && rawPing.accuracy !== null ? Number(rawPing.accuracy) : null;
      if (accuracy !== null && accuracy > 100) {
        rejectedCount++;
        continue;
      }

      // Idempotent deduplication by sequence
      if (seq !== undefined) {
        const existingSeq = await prisma.locationPing.findFirst({
          where: { driverId, sequence: seq },
          select: { id: true },
        });
        if (existingSeq) {
          duplicateCount++;
          continue;
        }
      }

      // Kinematic jump & stationary jitter validation
      if (lastValidPoint) {
        const timeDeltaSec = (sampleMs - lastValidPoint.timestamp) / 1000;
        if (timeDeltaSec <= 0) {
          // Out of order or timestamp already processed
          rejectedCount++;
          continue;
        }

        const stepDistKm = calculateHaversineKm(
          lastValidPoint.latitude,
          lastValidPoint.longitude,
          lat,
          lng
        );
        const impliedSpeedKmh = (stepDistKm / (timeDeltaSec / 3600));

        if (impliedSpeedKmh > MAX_FEASIBLE_SPEED_KMH) {
          rejectedCount++;
          continue;
        }

        const clientSpeedMps = rawPing.speed !== undefined && rawPing.speed !== null ? Number(rawPing.speed) : null;
        const isStationary = clientSpeedMps !== null ? clientSpeedMps < 1.5 : impliedSpeedKmh < 5;
        if (stepDistKm >= MIN_STATIONARY_JITTER_KM || !isStationary) {
          distanceDeltaKmSum += stepDistKm;
        }
      }

      lastValidPoint = {
        latitude: lat,
        longitude: lng,
        timestamp: sampleMs,
        sequence: seq,
      };

      validatedPingsToInsert.push({
        driverId,
        dutyId,
        vehicleId,
        tripId: activeTrip?.id || rawPing.tripId || null,
        sequence: seq,
        latitude: lat,
        longitude: lng,
        heading: rawPing.heading !== undefined && rawPing.heading !== null ? Number(rawPing.heading) : null,
        speed: rawPing.speed !== undefined && rawPing.speed !== null ? Number(rawPing.speed) : null,
        accuracy: accuracy,
        timestamp: sampledAtDate,
      });
    }

    if (validatedPingsToInsert.length > 0) {
      await prisma.locationPing.createMany({
        data: validatedPingsToInsert,
      });
    }

    const latestPoint = validatedPingsToInsert[validatedPingsToInsert.length - 1] || null;
    let updatedActualDistanceKm = activeTrip?.actualDistanceKm || 0;
    let authoritativeRemainingKm: number | null = null;
    let authoritativeEtaMinutes: number | null = null;

    if (latestPoint) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentLat: latestPoint.latitude,
          currentLng: latestPoint.longitude,
          lastPingAt: latestPoint.timestamp,
        },
      });

      if (activeTrip) {
        updatedActualDistanceKm = Math.round((updatedActualDistanceKm + distanceDeltaKmSum) * 1000) / 1000;

        const destLat = activeTrip.destinationPlace?.latitude ?? activeTrip.destinationLatitude;
        const destLng = activeTrip.destinationPlace?.longitude ?? activeTrip.destinationLongitude;

        if (destLat !== undefined && destLat !== null && destLng !== undefined && destLng !== null) {
          const straightLineDist = calculateHaversineKm(
            latestPoint.latitude,
            latestPoint.longitude,
            Number(destLat),
            Number(destLng)
          );
          authoritativeRemainingKm = Math.round(straightLineDist * ROAD_TORTUOSITY_FACTOR * 100) / 100;
        } else if (activeTrip.plannedDistanceKm) {
          authoritativeRemainingKm = Math.max(
            0,
            Math.round((activeTrip.plannedDistanceKm - updatedActualDistanceKm) * 100) / 100
          );
        }

        if (authoritativeRemainingKm !== null) {
          const currentSpeedKmh = latestPoint.speed ? latestPoint.speed * 3.6 : 0;
          const effectiveSpeed = currentSpeedKmh > 10 ? currentSpeedKmh : 25;
          authoritativeEtaMinutes = Math.max(1, Math.round((authoritativeRemainingKm / effectiveSpeed) * 60));
        }

        const estimatedArrivalTime = authoritativeEtaMinutes
          ? new Date(Date.now() + authoritativeEtaMinutes * 60000)
          : null;

        await prisma.trip.update({
          where: { id: activeTrip.id },
          data: {
            currentLat: latestPoint.latitude,
            currentLng: latestPoint.longitude,
            currentSpeed: latestPoint.speed || null,
            currentHeading: latestPoint.heading || null,
            actualDistanceKm: updatedActualDistanceKm,
            remainingDistanceKm: authoritativeRemainingKm,
            estimatedArrivalTime: estimatedArrivalTime || undefined,
            lastPingAt: latestPoint.timestamp,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      dutyId,
      acceptedCount: validatedPingsToInsert.length,
      duplicateCount,
      rejectedCount,
      latestPosition: latestPoint
        ? {
            latitude: latestPoint.latitude,
            longitude: latestPoint.longitude,
            timestamp: latestPoint.timestamp.toISOString(),
          }
        : null,
      actualDistanceKm: updatedActualDistanceKm,
      remainingDistanceKm: authoritativeRemainingKm,
      etaMinutes: authoritativeEtaMinutes,
    });
  } catch (error: any) {
    console.error('Error in location batches handler:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
