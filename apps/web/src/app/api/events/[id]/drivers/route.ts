import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/events/:id/drivers - List drivers associated with or requesting access to this event
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    // Fetch DriverEvents for this event
    const driverEvents = await prisma.driverEvent.findMany({
      where: { eventId },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                avatarUrl: true,
              },
            },
            currentVehicle: true,
            trips: {
              where: { eventId },
              include: {
                function: true,
                vehicle: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    // Also fetch drivers with trips in this event who might not have a DriverEvent row yet
    const driversWithTrips = await prisma.driver.findMany({
      where: {
        trips: { some: { eventId } },
        driverEvents: { none: { eventId } },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
          },
        },
        currentVehicle: true,
        trips: {
          where: { eventId },
          include: {
            function: true,
            vehicle: true,
          },
        },
      },
    });

    const formattedDrivers: any[] = [];
    const seenDriverIds = new Set<string>();

    for (const de of driverEvents) {
      if (!de.driver) continue;
      seenDriverIds.add(de.driver.id);
      formattedDrivers.push({
        id: de.driver.id,
        driverEventId: de.id,
        eventId: de.eventId,
        userId: de.driver.userId,
        fullName: de.driver.user?.fullName || 'Chauffeur',
        phoneNumber: de.driver.user?.phoneNumber || null,
        email: de.driver.user?.email || null,
        avatarUrl: de.driver.user?.avatarUrl || null,
        licenseNumber: de.driver.licenseNumber,
        status: de.status,
        requestedAt: de.requestedAt.toISOString(),
        approvedAt: de.approvedAt?.toISOString() || null,
        vehicle: de.driver.currentVehicle
          ? {
              id: de.driver.currentVehicle.id,
              model: de.driver.currentVehicle.model,
              plateNumber: de.driver.currentVehicle.plateNumber,
              category: de.driver.currentVehicle.category,
              capacity: de.driver.currentVehicle.capacity,
            }
          : null,
        assignedTripsCount: de.driver.trips.length,
        assignedFunctions: Array.from(
          new Set(
            de.driver.trips
              .map((t) => t.function?.name)
              .filter(Boolean)
          )
        ),
      });
    }

    for (const drv of driversWithTrips) {
      if (seenDriverIds.has(drv.id)) continue;
      seenDriverIds.add(drv.id);
      formattedDrivers.push({
        id: drv.id,
        driverEventId: null,
        eventId,
        userId: drv.userId,
        fullName: drv.user?.fullName || 'Chauffeur',
        phoneNumber: drv.user?.phoneNumber || null,
        email: drv.user?.email || null,
        avatarUrl: drv.user?.avatarUrl || null,
        licenseNumber: drv.licenseNumber,
        status: 'APPROVED',
        requestedAt: drv.createdAt.toISOString(),
        approvedAt: drv.createdAt.toISOString(),
        vehicle: drv.currentVehicle
          ? {
              id: drv.currentVehicle.id,
              model: drv.currentVehicle.model,
              plateNumber: drv.currentVehicle.plateNumber,
              category: drv.currentVehicle.category,
              capacity: drv.currentVehicle.capacity,
            }
          : null,
        assignedTripsCount: drv.trips.length,
        assignedFunctions: Array.from(
          new Set(
            drv.trips
              .map((t) => t.function?.name)
              .filter(Boolean)
          )
        ),
      });
    }

    return NextResponse.json({
      success: true,
      drivers: formattedDrivers,
    });
  } catch (error: any) {
    console.error('Error fetching event drivers:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch event drivers.' } },
      { status: 500 }
    );
  }
}
