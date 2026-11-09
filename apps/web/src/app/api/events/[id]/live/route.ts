import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { DutyStatus, TripStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const STALE_GPS_THRESHOLD_MS = 60 * 1000; // 60 seconds

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

    const eventId = params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        account: { include: { members: true } },
        eventMembers: true,
      },
    });

    if (!event) {
      return NextResponse.json({ success: false, error: `Event with id ${eventId} not found` }, { status: 404 });
    }

    const isAuthorized =
      event.creatorId === user.id ||
      event.account.members.some((m) => m.userId === user.id) ||
      event.eventMembers.some((m) => m.userId === user.id) ||
      user.role === 'SUPER_ADMIN';

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to view live fleet telemetry' },
        { status: 403 }
      );
    }

    const vehicles = await prisma.vehicle.findMany({
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

    return NextResponse.json({
      success: true,
      eventId,
      timestamp: new Date().toISOString(),
      totalVehicles: vehicles.length,
      activeMovingCount,
      staleCount,
      vehicles: vehiclesList,
    });
  } catch (error: any) {
    console.error('Error fetching live event fleet:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
