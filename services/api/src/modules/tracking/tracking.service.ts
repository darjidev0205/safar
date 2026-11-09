import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../websocket/events.gateway';
import { DutyStatus, TripStatus } from '@prisma/client';

export const EARTH_RADIUS_KM = 6371.0088;
export const ROAD_TORTUOSITY_FACTOR = 1.3; // Urban road grid multiplier vs. Euclidean distance
export const STALE_GPS_THRESHOLD_MS = 60 * 1000; // 60 seconds
export const MAX_FEASIBLE_SPEED_KMH = 160;
export const MIN_STATIONARY_JITTER_KM = 0.008; // 8 meters

export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * PR 4: High-Performance Resilient Ingestion for Driver Location Batches
   * - Validates active duty & driver authorization
   - Deduplicates using (driverId, sequence)
   - Rejects impossible timestamps (>60s future, >24h stale) & geodetic anomalies
   - Rejects teleportation velocity jumps (>160 km/h) & suppresses stationary jitter (<8m)
   - Computes authoritative distance driven & remaining road distance
   - Emits versioned trip.position.v1 WebSocket events
   */
  async ingestLocationBatch(
    userId: string,
    dutyId: string,
    data: { deviceId?: string; pings: any[] }
  ) {
    if (!data.pings || !Array.isArray(data.pings) || data.pings.length === 0) {
      throw new BadRequestException('Location batch must contain at least one ping');
    }

    // 1. Authorize Driver & Duty
    const duty = await this.prisma.duty.findUnique({
      where: { id: dutyId },
      include: {
        driver: { include: { user: true } },
        vehicle: true,
      },
    });

    if (!duty) {
      throw new NotFoundException(`Duty with id ${dutyId} not found`);
    }

    if (duty.driver.userId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('You are not authorized to submit telemetry for this driver duty');
      }
    }

    if (duty.status === DutyStatus.OFF_DUTY) {
      throw new BadRequestException('Cannot ingest location pings for an OFF_DUTY duty record');
    }

    const driverId = duty.driverId;
    const vehicleId = duty.vehicleId;

    // 2. Resolve Active Assigned Trip (if any)
    const activeTrip = await this.prisma.trip.findFirst({
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

    // 3. Retrieve baseline latest ping for velocity & distance delta calculation
    let lastValidPoint: {
      latitude: number;
      longitude: number;
      timestamp: number;
      sequence?: number;
    } | null = null;

    const previousDbPing = await this.prisma.locationPing.findFirst({
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

    // Sort incoming batch by sequence or timestamp ascending
    const sortedPings = [...data.pings].sort((a, b) => {
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

      // Geodetic boundary validation
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        rejectedCount++;
        continue;
      }

      // Timestamp sanity: not more than 60s in the future, not older than 24h
      if (sampleMs > nowMs + 60000 || sampleMs < nowMs - 24 * 3600 * 1000) {
        rejectedCount++;
        continue;
      }

      // Horizontal accuracy gating: reject coarse fixes > 100 meters
      const accuracy = rawPing.accuracy !== undefined && rawPing.accuracy !== null ? Number(rawPing.accuracy) : null;
      if (accuracy !== null && accuracy > 100) {
        rejectedCount++;
        continue;
      }

      // Idempotency: Check if sequence was already ingested
      if (seq !== undefined) {
        const existingSeq = await this.prisma.locationPing.findFirst({
          where: { driverId, sequence: seq },
          select: { id: true },
        });
        if (existingSeq) {
          duplicateCount++;
          continue;
        }
      }

      // Physical kinematic validation against previous valid point
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

        // Teleportation velocity jump rejection
        if (impliedSpeedKmh > MAX_FEASIBLE_SPEED_KMH) {
          rejectedCount++;
          continue;
        }

        // Stationary jitter suppression
        const clientSpeedMps = rawPing.speed !== undefined && rawPing.speed !== null ? Number(rawPing.speed) : null;
        const isStationary = clientSpeedMps !== null ? clientSpeedMps < 1.5 : impliedSpeedKmh < 5;
        if (stepDistKm < MIN_STATIONARY_JITTER_KM && isStationary) {
          // Valid position update, but don't accumulate false odometer distance
        } else {
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

    // 4. Batch Persist LocationPings in Database
    if (validatedPingsToInsert.length > 0) {
      await this.prisma.locationPing.createMany({
        data: validatedPingsToInsert,
      });
    }

    const latestPoint = validatedPingsToInsert[validatedPingsToInsert.length - 1] || null;
    let updatedActualDistanceKm = activeTrip?.actualDistanceKm || 0;
    let authoritativeRemainingKm: number | null = null;
    let authoritativeEtaMinutes: number | null = null;

    if (latestPoint) {
      // 5. Update Vehicle position
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentLat: latestPoint.latitude,
          currentLng: latestPoint.longitude,
          lastPingAt: latestPoint.timestamp,
        },
      });

      // 6. Update Trip telemetry and calculate authoritative road-distance to destination
      if (activeTrip) {
        updatedActualDistanceKm = Math.round((updatedActualDistanceKm + distanceDeltaKmSum) * 1000) / 1000;

        // Authoritative road-remaining calculation (never pure straight-line Haversine)
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

        // ETA calculation based on remaining road distance and current / traffic speed
        if (authoritativeRemainingKm !== null) {
          const currentSpeedKmh = latestPoint.speed ? latestPoint.speed * 3.6 : 0;
          const effectiveSpeed = currentSpeedKmh > 10 ? currentSpeedKmh : 25; // 25 km/h urban default
          authoritativeEtaMinutes = Math.max(1, Math.round((authoritativeRemainingKm / effectiveSpeed) * 60));
        }

        const estimatedArrivalTime = authoritativeEtaMinutes
          ? new Date(Date.now() + authoritativeEtaMinutes * 60000)
          : null;

        await this.prisma.trip.update({
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

        // 7. Emit Versioned trip.position.v1 WebSocket Event
        const versionedTelemetryPayload = {
          type: 'trip.position.v1',
          eventId: activeTrip.eventId,
          tripId: activeTrip.id,
          vehicleId: vehicleId,
          seq: latestPoint.sequence ?? null,
          position: {
            lat: latestPoint.latitude,
            lng: latestPoint.longitude,
            accuracyM: latestPoint.accuracy || 10,
            headingDeg: latestPoint.heading || 0,
            speedMps: latestPoint.speed || 0,
          },
          sampledAt: latestPoint.timestamp.toISOString(),
          serverReceivedAt: new Date().toISOString(),
          actualDistanceKm: updatedActualDistanceKm,
          remainingDistanceKm: authoritativeRemainingKm,
          etaMinutes: authoritativeEtaMinutes,
          status: activeTrip.status,
          isStale: false,
        };

        this.eventsGateway.emitTripPosition(
          activeTrip.eventId,
          activeTrip.id,
          versionedTelemetryPayload
        );
      }
    }

    return {
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
    };
  }

  /**
   * PR 4: Live Fleet Snapshot for Host Dashboard
   * GET /api/v1/events/:eventId/live
   * Exposes active vehicles, trips, last coordinates, and exact staleness flag (>60s).
   */
  async getEventLiveSnapshot(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        account: { include: { members: true } },
        eventMembers: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    // Verify tenant authorization
    const isAuthorized =
      event.creatorId === userId ||
      event.account.members.some((m) => m.userId === userId) ||
      event.eventMembers.some((m) => m.userId === userId);

    if (!isAuthorized) {
      const caller = await this.prisma.user.findUnique({ where: { id: userId } });
      if (caller?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('You do not have permission to access live fleet telemetry for this event');
      }
    }

    // Fetch vehicles belonging to the event's account
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        accountId: event.accountId,
        isActive: true,
      },
      include: {
        duties: {
          where: { status: { in: [DutyStatus.ON_DUTY, DutyStatus.ON_TRIP] } },
          include: { driver: { include: { user: true } } },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
        trips: {
          where: {
            eventId,
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
            driver: { include: { user: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    const now = Date.now();
    let staleCount = 0;
    let activeMovingCount = 0;

    const vehiclesList = vehicles.map((v) => {
      const activeDuty = v.duties[0] || null;
      const activeTrip = v.trips[0] || null;
      const lastPingTime = v.lastPingAt ? new Date(v.lastPingAt).getTime() : null;
      const isStale = !lastPingTime || (now - lastPingTime) > STALE_GPS_THRESHOLD_MS;
      const staleSeconds = lastPingTime ? Math.max(0, Math.floor((now - lastPingTime) / 1000)) : null;

      if (isStale) staleCount++;
      if (activeTrip?.status === TripStatus.IN_TRANSIT && !isStale) activeMovingCount++;

      return {
        vehicleId: v.id,
        model: v.model,
        plateNumber: v.plateNumber,
        category: v.category,
        capacity: v.capacity,
        currentLat: v.currentLat,
        currentLng: v.currentLng,
        lastPingAt: v.lastPingAt ? v.lastPingAt.toISOString() : null,
        isStale,
        staleSeconds,
        signalStatus: isStale ? 'STALE' : 'LIVE',
        driver: activeDuty
          ? {
              id: activeDuty.driver.id,
              name: activeDuty.driver.user.fullName,
              phone: activeDuty.driver.user.phoneNumber,
              dutyStatus: activeDuty.status,
            }
          : activeTrip?.driver
          ? {
              id: activeTrip.driver.id,
              name: activeTrip.driver.user.fullName,
              phone: activeTrip.driver.user.phoneNumber,
              dutyStatus: DutyStatus.ON_TRIP,
            }
          : null,
        trip: activeTrip
          ? {
              id: activeTrip.id,
              status: activeTrip.status,
              passengerCount: activeTrip.passengerCount,
              origin: activeTrip.originPlace?.name || activeTrip.pickupLocation,
              destination: activeTrip.destinationPlace?.name || activeTrip.destination,
              remainingDistanceKm: activeTrip.remainingDistanceKm,
              actualDistanceKm: activeTrip.actualDistanceKm,
              estimatedArrivalTime: activeTrip.estimatedArrivalTime,
            }
          : null,
      };
    });

    return {
      eventId,
      timestamp: new Date().toISOString(),
      totalVehicles: vehicles.length,
      activeMovingCount,
      staleCount,
      vehicles: vehiclesList,
    };
  }

  /**
   * PR 4: Scoped Live Tracking Snapshot for Guest Boarding Pass
   * GET /api/v1/bookings/:bookingId/live
   * Returns ONLY the assigned trip & vehicle for this guest, never leaking other trips.
   */
  async getBookingLiveSnapshot(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
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
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }

    // Ensure strict privacy: guest who owns booking, event host, or super admin
    const isGuestOwner = booking.guest.userId === userId;
    const isHost =
      booking.event.creatorId === userId ||
      booking.event.account.members.some((m) => m.userId === userId) ||
      booking.event.eventMembers.some((m) => m.userId === userId);

    if (!isGuestOwner && !isHost) {
      const caller = await this.prisma.user.findUnique({ where: { id: userId } });
      if (caller?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Access denied: You do not have permission to view live telemetry for this booking');
      }
    }

    const trip = booking.trip;
    if (!trip) {
      return {
        bookingId: booking.id,
        status: booking.status,
        boardingCode: booking.boardingCode,
        message: 'No vehicle has been assigned to this booking yet',
        trip: null,
      };
    }

    const lastPingTime = trip.lastPingAt ? new Date(trip.lastPingAt).getTime() : null;
    const isStale = !lastPingTime || (Date.now() - lastPingTime) > STALE_GPS_THRESHOLD_MS;
    const staleSeconds = lastPingTime ? Math.max(0, Math.floor((Date.now() - lastPingTime) / 1000)) : null;

    // Remaining distance & ETA
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

    return {
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
    };
  }

  // --- Legacy Compatibility Methods ---

  async processLocationPing(userId: string, data: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: { currentVehicle: true },
    });

    if (!driver) {
      throw new ForbiddenException('User is not registered as a driver');
    }

    const vehicleId = data.vehicleId || driver.currentVehicleId;
    let eventId: string | null = null;

    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: data.tripId },
      });

      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      if (trip.driverId !== driver.id) {
        throw new ForbiddenException('Driver is not assigned to this trip');
      }

      eventId = trip.eventId;
    }

    const ping = await this.prisma.locationPing.create({
      data: {
        driverId: driver.id,
        vehicleId,
        tripId: data.tripId || null,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading || null,
        speed: data.speed || null,
        accuracy: data.accuracy || null,
        timestamp: new Date(data.timestamp || Date.now()),
      },
    });

    if (vehicleId) {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentLat: data.latitude,
          currentLng: data.longitude,
          lastPingAt: new Date(),
        },
      });
    }

    if (eventId) {
      this.eventsGateway.emitLocationPing(eventId, data.tripId, {
        id: ping.id,
        tripId: data.tripId,
        driverId: driver.id,
        vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        timestamp: ping.timestamp.toISOString(),
      });
    }

    return ping;
  }

  async getFleetPings(eventId: string) {
    return this.getEventLiveSnapshot(eventId, 'system_internal');
  }

  async triggerEmergencySOS(userId: string, data: { tripId?: string; reason?: string }) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: { currentVehicle: true, user: true },
    });

    if (!driver) {
      throw new ForbiddenException('Driver not found');
    }

    let eventId: string | null = null;
    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
      eventId = trip?.eventId || null;
    }

    const alert = {
      type: 'SOS_EMERGENCY',
      driverId: driver.id,
      driverName: driver.user?.fullName,
      phone: driver.user?.phoneNumber,
      vehicle: driver.currentVehicle?.plateNumber,
      tripId: data.tripId,
      reason: data.reason || 'Driver reported an emergency',
      timestamp: new Date().toISOString(),
    };

    if (eventId) {
      this.eventsGateway.emitSOSAlert(eventId, alert);
    }

    return { status: 'SOS_DISPATCHED', alert };
  }
}
