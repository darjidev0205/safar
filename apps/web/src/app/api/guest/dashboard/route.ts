import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

async function getCallerUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const emailHeader = req.headers.get('x-user-email');
  const uidHeader = req.headers.get('x-user-uid');
  const idHeader = req.headers.get('x-user-id');
  const queryUserId = req.nextUrl?.searchParams?.get('userId');

  if (idHeader) {
    const user = await prisma.user.findUnique({ where: { id: idHeader } });
    if (user) return user;
  }

  if (queryUserId) {
    const user = await prisma.user.findUnique({ where: { id: queryUserId } });
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
      where: {
        OR: [{ firebaseUid: token }, { id: token }],
      },
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
      where: {
        OR: [{ firebaseUid: uidHeader }, { id: uidHeader }],
      },
    });
    if (user) return user;
  }

  return null;
}

// Distance calculation between coordinates (Haversine formula in KM)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCallerUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const eventCodeParam = searchParams.get('eventCode')?.trim().toUpperCase();

    // 1. Locate Guest record associated with this user
    let guestRecord = await prisma.guest.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
          ...(user.phoneNumber ? [{ phoneNumber: user.phoneNumber }] : []),
        ],
      },
      include: {
        family: {
          include: {
            guests: {
              select: {
                id: true,
                fullName: true,
                relation: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // 2. Resolve the Event
    let eventRecord: any = null;

    if (eventCodeParam) {
      eventRecord = await prisma.event.findUnique({
        where: { joinCode: eventCodeParam },
        include: {
          subEvents: {
            orderBy: { startDate: 'asc' },
          },
          places: true,
          transportRequirements: true,
        },
      });
    }

    if (!eventRecord && guestRecord?.eventId) {
      eventRecord = await prisma.event.findUnique({
        where: { id: guestRecord.eventId },
        include: {
          subEvents: {
            orderBy: { startDate: 'asc' },
          },
          places: true,
          transportRequirements: true,
        },
      });
    }

    // Fallback: check if user is an event member or creator
    if (!eventRecord) {
      const membership = await prisma.eventMember.findFirst({
        where: { userId: user.id },
        include: {
          event: {
            include: {
              subEvents: { orderBy: { startDate: 'asc' } },
              places: true,
              transportRequirements: true,
            },
          },
        },
      });
      if (membership?.event) {
        eventRecord = membership.event;
      }
    }

    // Fallback for organizers previewing guest view: find their active event
    if (!eventRecord) {
      eventRecord = await prisma.event.findFirst({
        where: {
          OR: [{ creatorId: user.id }, { status: 'ACTIVE' }],
        },
        include: {
          subEvents: { orderBy: { startDate: 'asc' } },
          places: true,
          transportRequirements: true,
        },
        orderBy: { startDate: 'asc' },
      });
    }

    // If still no event in DB, return clean empty state
    if (!eventRecord) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
        },
        hasEvent: false,
        message: 'No event joined yet',
      });
    }

    // 3. Resolve Functions / Ceremonies
    const functionsList =
      eventRecord.subEvents && eventRecord.subEvents.length > 0
        ? eventRecord.subEvents.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            eventType: sub.eventType || 'CEREMONY',
            date: sub.startDate.toISOString(),
            startTime: sub.startTime || '18:00',
            endTime: sub.endTime || '23:00',
            venueName: sub.venueName || eventRecord.venueName || 'Celebration Hall',
            venueAddress: sub.venueAddress || eventRecord.venueAddress || eventRecord.city,
            venueLatitude: sub.venueLatitude || eventRecord.venueLatitude,
            venueLongitude: sub.venueLongitude || eventRecord.venueLongitude,
            expectedGuestCount: sub.expectedGuestCount,
          }))
        : [
            {
              id: `${eventRecord.id}_main`,
              name: eventRecord.name,
              eventType: eventRecord.eventType || 'WEDDING',
              date: eventRecord.startDate.toISOString(),
              startTime: eventRecord.startTime || '18:00',
              endTime: eventRecord.endTime || '23:00',
              venueName: eventRecord.venueName || 'Grand Palace Banquets',
              venueAddress: eventRecord.venueAddress || eventRecord.city,
              venueLatitude: eventRecord.venueLatitude,
              venueLongitude: eventRecord.venueLongitude,
              expectedGuestCount: eventRecord.expectedGuestCount,
            },
          ];

    // Determine Next Function based on date/time
    const now = new Date();
    const sortedFunctions = [...functionsList].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const nextFunction =
      sortedFunctions.find((fn) => new Date(fn.date).getTime() >= now.getTime() - 24 * 3600 * 1000) ||
      sortedFunctions[0];

    // 4. Resolve Guest Transport / Trip
    // Strictly search for trip assigned to THIS guest's booking
    let activeTrip: any = null;
    if (guestRecord) {
      activeTrip = await prisma.trip.findFirst({
        where: {
          eventId: eventRecord.id,
          status: {
            in: ['IN_TRANSIT', 'EN_ROUTE_TO_PICKUP', 'ARRIVED', 'SCHEDULED', 'ASSIGNED', 'BOARDING'],
          },
          bookings: {
            some: { guestId: guestRecord.id },
          },
        },
        include: {
          vehicle: true,
          driver: { include: { user: true } },
          originPlace: true,
          destinationPlace: true,
          bookings: {
            where: { guestId: guestRecord.id },
            include: { guest: true },
          },
        },
        orderBy: { scheduledPickupTime: 'asc' },
      });
    }

    let rideData: any = null;

    if (activeTrip) {
      const driverUser = activeTrip.driver?.user;
      const vehicle = activeTrip.vehicle;
      const originLat = activeTrip.originPlace?.latitude || 23.0225;
      const originLng = activeTrip.originPlace?.longitude || 72.5714;
      const destLat = activeTrip.destinationPlace?.latitude || 23.0338;
      const destLng = activeTrip.destinationPlace?.longitude || 72.585;

      const driverLat = vehicle?.currentLat || originLat;
      const driverLng = vehicle?.currentLng || originLng;

      const distanceToPickup = calculateDistanceKm(driverLat, driverLng, originLat, originLng);
      const estMinutes = Math.max(3, Math.round(distanceToPickup * 3.2));

      // Map backend TripStatus to Guest-friendly state
      let guestRideStatus = 'DRIVER_ASSIGNED';
      if (activeTrip.status === 'EN_ROUTE_TO_PICKUP') guestRideStatus = 'DRIVER_ON_THE_WAY';
      if (activeTrip.status === 'ARRIVED') guestRideStatus = 'DRIVER_ARRIVED';
      if (activeTrip.status === 'IN_TRANSIT') guestRideStatus = 'RIDE_IN_PROGRESS';
      if (activeTrip.status === 'COMPLETED') guestRideStatus = 'RIDE_COMPLETED';
      if (activeTrip.status === 'CANCELLED') guestRideStatus = 'CANCELLED';

      rideData = {
        tripId: activeTrip.id,
        status: guestRideStatus,
        pickupTime: activeTrip.scheduledPickupTime.toISOString(),
        pickupLocation: activeTrip.originPlace?.name || guestRecord?.pickupLocation || 'Grand Hotel Lobby',
        pickupAddress: activeTrip.originPlace?.address || 'Curbside Hospitality Pavilion',
        pickupCoordinates: { lat: originLat, lng: originLng },
        destinationVenue: activeTrip.destinationPlace?.name || nextFunction?.venueName || 'Banquet Lawn',
        destinationAddress: activeTrip.destinationPlace?.address || nextFunction?.venueAddress || eventRecord.city,
        destinationCoordinates: { lat: destLat, lng: destLng },
        distanceKm: distanceToPickup,
        etaMinutes: estMinutes,
        vehicle: vehicle
          ? {
              model: vehicle.model,
              plateNumber: vehicle.plateNumber,
              category: vehicle.category,
              capacity: vehicle.capacity,
              currentLat: driverLat,
              currentLng: driverLng,
              lastPingAt: vehicle.lastPingAt?.toISOString() || new Date().toISOString(),
            }
          : null,
        driver: activeTrip.driver
          ? {
              // Guest privacy boundary: First name and avatar only
              name: driverUser?.fullName ? driverUser.fullName.split(' ')[0] : 'Assigned Chauffeur',
              avatarUrl: driverUser?.avatarUrl || null,
            }
          : null,
        boardingCode: activeTrip.bookings?.[0]?.boardingCode || '4827',
      };
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
      },
      hasEvent: true,
      event: {
        id: eventRecord.id,
        name: eventRecord.name,
        eventType: eventRecord.eventType || 'WEDDING',
        city: eventRecord.city,
        startDate: eventRecord.startDate.toISOString(),
        endDate: eventRecord.endDate.toISOString(),
        joinCode: eventRecord.joinCode,
        bannerUrl: eventRecord.bannerUrl,
        venueName: eventRecord.venueName,
        venueAddress: eventRecord.venueAddress,
      },
      family: guestRecord?.family
        ? {
            id: guestRecord.family.id,
            name: guestRecord.family.name,
            relation: guestRecord.relation || 'Honored Family',
            members: guestRecord.family.guests,
          }
        : guestRecord?.familyName
        ? {
            id: 'f_custom',
            name: guestRecord.familyName,
            relation: guestRecord.relation || 'Guest Family',
            members: [],
          }
        : {
            id: 'f_default',
            name: `${user.fullName.split(' ')[0]} Family`,
            relation: 'Invited Guest',
            members: [],
          },
      functions: functionsList,
      nextFunction,
      ride: rideData,
    });
  } catch (error: any) {
    console.error('Error fetching guest dashboard:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Server error' } },
      { status: 500 }
    );
  }
}
