import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getAuthenticatedHost } from '../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

// GET /api/host/fleet - Fetch host's actual vehicles and drivers
export async function GET(req: NextRequest) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const vehicles = await prisma.vehicle.findMany({
      where: { accountId: context.account.id, isActive: true },
      orderBy: { model: 'asc' },
    });

    const drivers = await prisma.driver.findMany({
      where: { accountId: context.account.id },
      include: {
        user: true,
        currentVehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute availability by vehicle type
    const vehicleTypeCounts: Record<string, number> = {};
    for (const v of vehicles) {
      const type = v.category || 'SEDAN';
      vehicleTypeCounts[type] = (vehicleTypeCounts[type] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      fleet: {
        vehicles: vehicles.map((v) => ({
          id: v.id,
          model: v.model,
          plateNumber: v.plateNumber,
          category: v.category,
          capacity: v.capacity,
          isActive: v.isActive,
        })),
        drivers: drivers.map((d) => ({
          id: d.id,
          name: d.user?.fullName || 'Driver',
          phone: d.user?.phoneNumber || '',
          dutyStatus: d.dutyStatus,
          licenseNumber: d.licenseNumber,
          currentVehicle: d.currentVehicle ? `${d.currentVehicle.model} (${d.currentVehicle.plateNumber})` : null,
        })),
        totalVehicles: vehicles.length,
        totalDrivers: drivers.length,
        availableVehiclesCount: vehicles.length,
        availableDriversCount: drivers.filter((d) => d.dutyStatus === 'AVAILABLE' || d.dutyStatus === 'ON_DUTY').length,
        vehicleTypeCounts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching fleet:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error fetching fleet' } },
      { status: 500 }
    );
  }
}
