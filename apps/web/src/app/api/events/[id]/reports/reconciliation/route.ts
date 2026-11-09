import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getCallerUser } from '../../../../../../lib/caller-auth';
import { TripStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

    const isHostOrOrganizer =
      event.creatorId === user.id ||
      event.account.members.some((m) => m.userId === user.id) ||
      event.eventMembers.some((m) => m.userId === user.id && ['HOST', 'ORGANIZER', 'PLANNER'].includes(m.role)) ||
      user.role === 'SUPER_ADMIN';

    if (!isHostOrOrganizer) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access denied to reconciliation report' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const functionId = searchParams.get('functionId') || undefined;

    const where: any = { eventId };
    if (functionId) where.functionId = functionId;

    const trips = await prisma.trip.findMany({
      where,
      include: {
        driver: { include: { user: true } },
        vehicle: true,
        originPlace: true,
        destinationPlace: true,
        function: true,
        bookings: {
          include: {
            passengers: true,
            guest: true,
          },
        },
      },
      orderBy: { scheduledPickupTime: 'asc' },
    });

    let totalTrips = trips.length;
    let completedTrips = 0;
    let cancelledTrips = 0;
    let inProgressTrips = 0;
    let scheduledTrips = 0;
    let totalPlannedKm = 0;
    let totalActualKm = 0;
    let totalPassengersCarried = 0;
    let totalSeatCapacityProvided = 0;
    let onTimeDepartures = 0;
    let lateDepartures = 0;
    let totalDelayMinutes = 0;

    const inProgressStatuses: string[] = [
      TripStatus.EN_ROUTE_TO_PICKUP,
      TripStatus.ARRIVED,
      TripStatus.BOARDING,
      TripStatus.IN_TRANSIT,
    ];

    for (const trip of trips) {
      if (trip.status === TripStatus.COMPLETED) {
        completedTrips++;
      } else if (trip.status === TripStatus.CANCELLED) {
        cancelledTrips++;
      } else if (inProgressStatuses.includes(trip.status)) {
        inProgressTrips++;
      } else {
        scheduledTrips++;
      }

      const planned = trip.plannedDistanceKm || trip.estimatedDistanceKm || 0;
      const actual = trip.actualDistanceKm || 0;
      totalPlannedKm += planned;
      totalActualKm += actual;

      const tripPassengers = trip.bookings.reduce((sum, b) => sum + (b.passengerCount || 1), 0);
      if (trip.status === TripStatus.COMPLETED || inProgressStatuses.includes(trip.status)) {
        totalPassengersCarried += tripPassengers;
        if (trip.vehicle?.capacity) {
          totalSeatCapacityProvided += trip.vehicle.capacity;
        }
      }

      if (trip.actualStartTime && trip.scheduledPickupTime) {
        const scheduledTime = new Date(trip.scheduledPickupTime).getTime();
        const actualTime = new Date(trip.actualStartTime).getTime();
        const delayMins = Math.round((actualTime - scheduledTime) / 60000);

        if (delayMins <= 10) {
          onTimeDepartures++;
        } else {
          lateDepartures++;
          totalDelayMinutes += delayMins;
        }
      }
    }

    const gpsOdometerDeltaKm = Math.abs(totalActualKm - totalPlannedKm);
    const discrepancyPercentage =
      totalPlannedKm > 0 ? (gpsOdometerDeltaKm / totalPlannedKm) * 100 : 0;
    const seatingEfficiencyPct =
      totalSeatCapacityProvided > 0
        ? (totalPassengersCarried / totalSeatCapacityProvided) * 100
        : 0;
    const evaluatedDepartures = onTimeDepartures + lateDepartures;
    const onTimeRatePct =
      evaluatedDepartures > 0 ? (onTimeDepartures / evaluatedDepartures) * 100 : 100;
    const averageDepartureDelayMinutes =
      lateDepartures > 0 ? Math.round(totalDelayMinutes / lateDepartures) : 0;

    // Driver Breakdown
    const driverMap = new Map<string, any>();
    for (const trip of trips) {
      if (!trip.driverId || !trip.driver) continue;

      const dId = trip.driverId;
      if (!driverMap.has(dId)) {
        driverMap.set(dId, {
          driverId: dId,
          driverName: trip.driver.user?.fullName || 'Assigned Chauffeur',
          phoneNumber: trip.driver.user?.phoneNumber || 'N/A',
          licenseNumber: trip.driver.licenseNumber,
          totalAssignedTrips: 0,
          tripsCompleted: 0,
          actualKmDriven: 0,
          plannedKm: 0,
          onTimeCount: 0,
          lateCount: 0,
          activeDurationMinutes: 0,
        });
      }

      const rec = driverMap.get(dId);
      rec.totalAssignedTrips++;
      if (trip.status === TripStatus.COMPLETED) {
        rec.tripsCompleted++;
      }
      rec.actualKmDriven += trip.actualDistanceKm || 0;
      rec.plannedKm += trip.plannedDistanceKm || trip.estimatedDistanceKm || 0;

      if (trip.actualStartTime && trip.scheduledPickupTime) {
        const delayMins = Math.round(
          (new Date(trip.actualStartTime).getTime() - new Date(trip.scheduledPickupTime).getTime()) / 60000
        );
        if (delayMins <= 10) rec.onTimeCount++;
        else rec.lateCount++;
      }

      if (trip.actualStartTime && trip.actualEndTime) {
        const durationMins = Math.round(
          (new Date(trip.actualEndTime).getTime() - new Date(trip.actualStartTime).getTime()) / 60000
        );
        rec.activeDurationMinutes += Math.max(0, durationMins);
      }
    }

    const driverRecords = Array.from(driverMap.values()).map((d) => {
      const dutyHours = Number((d.activeDurationMinutes / 60).toFixed(1));
      const estimatedBillingAmount = Math.round(d.actualKmDriven * 25 + dutyHours * 200);
      return {
        ...d,
        actualKmDriven: Number(d.actualKmDriven.toFixed(1)),
        plannedKm: Number(d.plannedKm.toFixed(1)),
        dutyHours,
        estimatedBillingAmount,
      };
    });

    // Vehicle Breakdown
    const vehicleMap = new Map<string, any>();
    for (const trip of trips) {
      if (!trip.vehicleId || !trip.vehicle) continue;

      const vId = trip.vehicleId;
      if (!vehicleMap.has(vId)) {
        vehicleMap.set(vId, {
          vehicleId: vId,
          plateNumber: trip.vehicle.plateNumber,
          model: trip.vehicle.model,
          capacity: trip.vehicle.capacity,
          category: trip.vehicle.category,
          totalTrips: 0,
          tripsCompleted: 0,
          actualKmDriven: 0,
          passengersCarried: 0,
          availableSeatMiles: 0,
        });
      }

      const rec = vehicleMap.get(vId);
      rec.totalTrips++;
      if (trip.status === TripStatus.COMPLETED) {
        rec.tripsCompleted++;
      }
      rec.actualKmDriven += trip.actualDistanceKm || 0;

      const pax = trip.bookings.reduce((sum, b) => sum + (b.passengerCount || 1), 0);
      rec.passengersCarried += pax;
      rec.availableSeatMiles += trip.vehicle.capacity;
    }

    const vehicleRecords = Array.from(vehicleMap.values()).map((v) => {
      const seatUtilizationPct =
        v.availableSeatMiles > 0
          ? Number(((v.passengersCarried / v.availableSeatMiles) * 100).toFixed(1))
          : 0;
      return {
        ...v,
        actualKmDriven: Number(v.actualKmDriven.toFixed(1)),
        seatUtilizationPct,
      };
    });

    // Operational Health Diagnostics
    const [sosCount, staleCount, notificationStats, totalNotifications, acknowledgedNotifications] =
      await Promise.all([
        prisma.notification.count({ where: { eventId, type: 'SOS_ALERT' } }),
        prisma.notification.count({ where: { eventId, type: 'GPS_STALE_ALERT' } }),
        prisma.notificationDelivery.groupBy({
          by: ['status'],
          where: { notification: { eventId } },
          _count: { status: true },
        }),
        prisma.notification.count({ where: { eventId } }),
        prisma.notification.count({ where: { eventId, isRead: true } }),
      ]);

    const sentDeliveries =
      notificationStats.find((s) => s.status === 'SENT' || s.status === 'DELIVERED')?._count.status || 0;
    const failedDeliveries =
      notificationStats.find((s) => s.status === 'FAILED')?._count.status || 0;
    const acknowledgementRatePct =
      totalNotifications > 0
        ? Number(((acknowledgedNotifications / totalNotifications) * 100).toFixed(1))
        : 100;

    return NextResponse.json({
      success: true,
      data: {
        eventId,
        eventName: event.name,
        generatedAt: new Date().toISOString(),
        summary: {
          totalTrips,
          completedTrips,
          cancelledTrips,
          inProgressTrips,
          scheduledTrips,
          totalPlannedKm: Number(totalPlannedKm.toFixed(1)),
          totalActualKm: Number(totalActualKm.toFixed(1)),
          gpsOdometerDeltaKm: Number(gpsOdometerDeltaKm.toFixed(1)),
          discrepancyPercentage: Number(discrepancyPercentage.toFixed(1)),
          totalPassengersCarried,
          totalSeatCapacityProvided,
          seatingEfficiencyPct: Number(seatingEfficiencyPct.toFixed(1)),
          onTimeDepartures,
          lateDepartures,
          onTimeRatePct: Number(onTimeRatePct.toFixed(1)),
          averageDepartureDelayMinutes,
        },
        driverRecords,
        vehicleRecords,
        operationalHealth: {
          sosAlertsCount: sosCount,
          staleGpsCount: staleCount,
          notificationsSentCount: sentDeliveries,
          notificationsFailedCount: failedDeliveries,
          acknowledgementRatePct,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to generate reconciliation report' },
      { status: 500 }
    );
  }
}
