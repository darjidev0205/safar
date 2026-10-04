import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';
import { Role, AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/driver/my-events - List approved & pending events for authenticated driver
export async function GET(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    if (caller.role !== Role.DRIVER && caller.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied: Caller is not a registered Driver.' } },
        { status: 403 }
      );
    }

    // Find driver record
    const driverRecord = await prisma.driver.findFirst({
      where: { userId: caller.id },
      include: { currentVehicle: true },
    });

    // Find all access requests by this driver
    const accessRequests = await prisma.eventAccessRequest.findMany({
      where: {
        userId: caller.id,
        role: Role.DRIVER,
      },
      include: {
        event: {
          include: {
            functions: { orderBy: { startTime: 'asc' } },
            places: true,
            trips: {
              where: driverRecord ? { driverId: driverRecord.id } : undefined,
              include: {
                originPlace: true,
                destinationPlace: true,
                vehicle: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const events = accessRequests.map((req) => {
      const isApproved = req.status === AccessRequestStatus.APPROVED;
      return {
        id: req.event.id,
        requestId: req.id,
        name: req.event.name,
        city: req.event.city,
        startDate: req.event.startDate.toISOString(),
        endDate: req.event.endDate.toISOString(),
        venueName: req.event.venueName,
        venueAddress: req.event.venueAddress,
        bannerUrl: req.event.bannerUrl,
        status: req.status, // 'APPROVED' | 'PENDING' | 'REJECTED'
        requestedAt: req.requestedAt.toISOString(),
        approvedAt: req.approvedAt ? req.approvedAt.toISOString() : null,
        // Only expose detailed logistics if APPROVED
        logistics: isApproved
          ? {
              functionsCount: req.event.functions?.length || 0,
              functions: req.event.functions.map((f) => ({
                id: f.id,
                name: f.name,
                startTime: f.startTime.toISOString(),
                endTime: f.endTime.toISOString(),
              })),
              assignedTrips: (req.event.trips || []).map((t) => ({
                id: t.id,
                origin: t.originPlace?.name,
                destination: t.destinationPlace?.name,
                scheduledPickupTime: t.scheduledPickupTime.toISOString(),
                status: t.status,
                vehicleModel: t.vehicle?.model || driverRecord?.currentVehicle?.model || 'Assigned Cab',
                plateNumber: t.vehicle?.plateNumber || driverRecord?.currentVehicle?.plateNumber || 'GJ-01',
              })),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    console.error('Error fetching driver events:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch driver events.' } },
      { status: 500 }
    );
  }
}
