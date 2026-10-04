import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id;

    if (!tripId) {
      return NextResponse.json(
        { success: false, error: 'Trip ID is required' },
        { status: 400 }
      );
    }

    // Try finding the trip in MongoDB
    let tripRecord: any = null;
    if (tripId.length === 24) {
      tripRecord = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          driver: { include: { user: true } },
          vehicle: true,
          originPlace: true,
          destinationPlace: true,
          locationPings: {
            orderBy: { timestamp: 'desc' },
            take: 40,
          },
        },
      });
    }

    if (tripRecord) {
      return NextResponse.json({
        success: true,
        trip: {
          id: tripRecord.id,
          status: tripRecord.status,
          driver: {
            id: tripRecord.driver?.id,
            name: tripRecord.driver?.user?.fullName || 'Chauffeur',
            phone: tripRecord.driver?.user?.phoneNumber || '+91 98765 43210',
          },
          vehicle: {
            id: tripRecord.vehicle?.id,
            model: tripRecord.vehicle?.model || 'Executive Transport',
            plateNumber: tripRecord.vehicle?.plateNumber || 'GJ01AB1234',
            category: tripRecord.vehicle?.category || 'SUV',
            capacity: tripRecord.vehicle?.capacity || 6,
          },
          pickup: {
            name: tripRecord.originPlace?.name || 'Pickup Point',
            address: tripRecord.originPlace?.address || 'Hotel Lobby',
            lat: tripRecord.originPlace?.latitude || 23.0395,
            lng: tripRecord.originPlace?.longitude || 72.558,
          },
          destination: {
            name: tripRecord.destinationPlace?.name || 'Celebration Venue',
            address: tripRecord.destinationPlace?.address || 'Main Lawn Banquet',
            lat: tripRecord.destinationPlace?.latitude || 23.0225,
            lng: tripRecord.destinationPlace?.longitude || 72.5714,
          },
          telemetry: {
            currentLat: tripRecord.currentLat || tripRecord.vehicle?.currentLat || 23.0338,
            currentLng: tripRecord.currentLng || tripRecord.vehicle?.currentLng || 72.5256,
            speedKmh: tripRecord.currentSpeed || 0,
            heading: tripRecord.currentHeading || null,
            actualDistanceKm: tripRecord.actualDistanceKm || 0,
            plannedDistanceKm: tripRecord.plannedDistanceKm || 23.5,
            remainingDistanceKm: tripRecord.remainingDistanceKm || 8.4,
            lastPingAt: tripRecord.lastPingAt || tripRecord.updatedAt,
          },
          breadcrumbs: tripRecord.locationPings.map((p: any) => ({
            lat: p.latitude,
            lng: p.longitude,
            timestamp: new Date(p.timestamp).getTime(),
          })),
        },
      });
    }

    // Default fallback trip response for mock / development trips
    return NextResponse.json({
      success: true,
      trip: {
        id: tripId,
        status: 'IN_TRANSIT',
        driver: {
          id: 'drv_101',
          name: 'Rahul Patel',
          phone: '+91 98765 43210',
        },
        vehicle: {
          id: 'veh_101',
          model: 'Toyota Innova Crysta',
          plateNumber: 'GJ 01 AB 1234',
          category: 'SUV',
          capacity: 6,
        },
        pickup: {
          name: 'The Grand Hotel',
          address: 'Lobby Gate 2, SG Highway, Ahmedabad',
          lat: 23.0395,
          lng: 72.558,
        },
        destination: {
          name: 'The Celebration Venue',
          address: 'North Lawn, Sindhu Bhavan Road, Ahmedabad',
          lat: 23.0225,
          lng: 72.5714,
        },
        telemetry: {
          currentLat: 23.0338,
          currentLng: 72.5256,
          speedKmh: 38,
          heading: 74,
          actualDistanceKm: 12.7,
          plannedDistanceKm: 23.5,
          remainingDistanceKm: 8.4,
          lastPingAt: new Date().toISOString(),
        },
        breadcrumbs: [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching trip tracking data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
