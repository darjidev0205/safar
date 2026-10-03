import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

// GET /api/events/:id/guests - Get guests specifically associated with this event
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('search')?.toLowerCase().trim() || '';
    const familyFilter = searchParams.get('family');
    const categoryFilter = searchParams.get('category');
    const statusFilter = searchParams.get('status');
    const transportFilter = searchParams.get('transport');

    // Fetch event guests with full guest, family, and booking info
    const eventGuests = await prisma.eventGuest.findMany({
      where: { eventId },
      include: {
        guest: {
          include: {
            family: true,
            bookings: {
              where: { eventId },
              include: {
                trip: {
                  include: {
                    vehicle: true,
                    driver: { include: { user: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also fetch legacy direct guests if any were attached via guest.eventId
    const directGuests = await prisma.guest.findMany({
      where: {
        eventId,
        eventGuests: { none: { eventId } },
      },
      include: {
        family: true,
        bookings: {
          where: { eventId },
          include: {
            trip: {
              include: {
                vehicle: true,
                driver: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    // Merge and format records
    const allRecords: any[] = [];
    const seenGuestIds = new Set<string>();

    for (const eg of eventGuests) {
      if (!eg.guest) continue;
      seenGuestIds.add(eg.guest.id);
      const g = eg.guest;
      const primaryBooking = g.bookings[0] || null;
      const trip = primaryBooking?.trip || null;

      allRecords.push({
        id: g.id,
        eventGuestId: eg.id,
        eventId: eg.eventId,
        fullName: g.fullName,
        familyName: g.familyName || g.family?.name || 'Independent',
        familyId: g.familyId,
        relation: g.relation || 'Guest',
        phoneNumber: g.phoneNumber || '',
        email: g.email || '',
        memberCount: g.memberCount || 1,
        category: g.category || 'General',
        pickupLocation: eg.pickupLocation || g.pickupLocation || '',
        dropLocation: eg.dropLocation || g.dropLocation || '',
        hotelRoom: eg.hotelRoom || g.hotelRoom || '',
        specialRequirements: eg.specialRequirements || g.specialRequirements || '',
        notes: eg.notes || g.notes || '',
        status: eg.status || g.status || 'CONFIRMED',
        assignedVehicle: trip?.vehicle ? `${trip.vehicle.model} (${trip.vehicle.plateNumber})` : null,
        assignedDriver: trip?.driver?.user ? trip.driver.user.fullName : null,
        tripStatus: trip?.status || null,
        createdAt: eg.createdAt.toISOString(),
      });
    }

    for (const g of directGuests) {
      if (seenGuestIds.has(g.id)) continue;
      seenGuestIds.add(g.id);
      const primaryBooking = g.bookings[0] || null;
      const trip = primaryBooking?.trip || null;

      allRecords.push({
        id: g.id,
        eventGuestId: null,
        eventId: g.eventId,
        fullName: g.fullName,
        familyName: g.familyName || g.family?.name || 'Independent',
        familyId: g.familyId,
        relation: g.relation || 'Guest',
        phoneNumber: g.phoneNumber || '',
        email: g.email || '',
        memberCount: g.memberCount || 1,
        category: g.category || 'General',
        pickupLocation: g.pickupLocation || '',
        dropLocation: g.dropLocation || '',
        hotelRoom: g.hotelRoom || '',
        specialRequirements: g.specialRequirements || '',
        notes: g.notes || '',
        status: g.status || 'CONFIRMED',
        assignedVehicle: trip?.vehicle ? `${trip.vehicle.model} (${trip.vehicle.plateNumber})` : null,
        assignedDriver: trip?.driver?.user ? trip.driver.user.fullName : null,
        tripStatus: trip?.status || null,
        createdAt: g.createdAt.toISOString(),
      });
    }

    // Apply filters
    let filtered = allRecords;

    if (query) {
      filtered = filtered.filter(
        (r) =>
          r.fullName.toLowerCase().includes(query) ||
          r.phoneNumber.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.familyName.toLowerCase().includes(query) ||
          r.pickupLocation.toLowerCase().includes(query) ||
          r.dropLocation.toLowerCase().includes(query)
      );
    }

    if (familyFilter && familyFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.familyName === familyFilter);
    }

    if (categoryFilter && categoryFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.status.toUpperCase() === statusFilter.toUpperCase());
    }

    if (transportFilter && transportFilter !== 'ALL') {
      if (transportFilter === 'ASSIGNED') {
        filtered = filtered.filter((r) => Boolean(r.assignedVehicle || r.assignedDriver));
      } else if (transportFilter === 'PENDING') {
        filtered = filtered.filter((r) => !r.assignedVehicle && !r.assignedDriver);
      } else if (transportFilter === 'REQUIRED') {
        filtered = filtered.filter((r) => Boolean(r.pickupLocation || r.dropLocation));
      }
    }

    // Real-time calculated dashboard counters for this event
    const totalGuests = allRecords.reduce((sum, r) => sum + (r.memberCount || 1), 0);
    const uniqueFamilies = Array.from(new Set(allRecords.map((r) => r.familyName))).filter(Boolean);
    const assignedCount = allRecords.filter((r) => Boolean(r.assignedVehicle || r.assignedDriver)).length;
    const pendingCount = allRecords.filter((r) => !r.assignedVehicle && !r.assignedDriver).length;
    const vehiclesAssigned = new Set(allRecords.map((r) => r.assignedVehicle).filter(Boolean)).size;
    const driversAssigned = new Set(allRecords.map((r) => r.assignedDriver).filter(Boolean)).size;

    return NextResponse.json({
      success: true,
      guests: filtered,
      stats: {
        totalGuests,
        totalGuestRecords: allRecords.length,
        familyCount: uniqueFamilies.length,
        assignedCount,
        pendingCount,
        vehiclesAssigned,
        driversAssigned,
      },
      families: uniqueFamilies,
    });
  } catch (error: any) {
    console.error('Error fetching event guests:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch event guests' } },
      { status: 500 }
    );
  }
}

// POST /api/events/:id/guests - Add a guest manually to this event
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const {
      fullName,
      familyName,
      relation,
      phoneNumber,
      email,
      memberCount,
      category,
      pickupLocation,
      dropLocation,
      hotelRoom,
      specialRequirements,
      notes,
      status,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Guest Full Name is required.' } },
        { status: 400 }
      );
    }

    const cleanPhone = phoneNumber?.trim() || null;
    const cleanEmail = email?.trim().toLowerCase() || null;
    const cleanFamily = familyName?.trim() || 'Independent';
    const parsedMembers = parseInt(String(memberCount || 1), 10);

    const result = await prisma.$transaction(async (tx) => {
      // Find or create Family record scoped to host account
      let family = null;
      if (cleanFamily && cleanFamily !== 'Independent') {
        family = await tx.family.findFirst({
          where: {
            accountId: context.account.id,
            name: { equals: cleanFamily, mode: 'insensitive' },
          },
        });

        if (!family) {
          family = await tx.family.create({
            data: {
              accountId: context.account.id,
              name: cleanFamily,
              relation: relation?.trim() || null,
            },
          });
        }
      }

      // Check if guest already exists in host's account by phone or email
      let guest = null;
      if (cleanPhone || cleanEmail) {
        guest = await tx.guest.findFirst({
          where: {
            accountId: context.account.id,
            OR: [
              ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : []),
              ...(cleanEmail ? [{ email: cleanEmail }] : []),
            ],
          },
        });
      }

      if (guest) {
        // Update guest master record if needed
        guest = await tx.guest.update({
          where: { id: guest.id },
          data: {
            fullName: fullName.trim(),
            familyId: family?.id || guest.familyId,
            familyName: cleanFamily,
            relation: relation?.trim() || guest.relation,
            memberCount: isNaN(parsedMembers) ? guest.memberCount : Math.max(1, parsedMembers),
            category: category?.trim() || guest.category,
            pickupLocation: pickupLocation?.trim() || guest.pickupLocation,
            dropLocation: dropLocation?.trim() || guest.dropLocation,
            hotelRoom: hotelRoom?.trim() || guest.hotelRoom,
            specialRequirements: specialRequirements?.trim() || guest.specialRequirements,
            notes: notes?.trim() || guest.notes,
            status: status || guest.status,
          },
        });
      } else {
        // Create new guest scoped to this host
        guest = await tx.guest.create({
          data: {
            accountId: context.account.id,
            eventId: eventId,
            familyId: family?.id || null,
            familyName: cleanFamily,
            fullName: fullName.trim(),
            relation: relation?.trim() || 'Guest',
            phoneNumber: cleanPhone,
            email: cleanEmail,
            memberCount: isNaN(parsedMembers) ? 1 : Math.max(1, parsedMembers),
            category: category?.trim() || 'General',
            pickupLocation: pickupLocation?.trim() || null,
            dropLocation: dropLocation?.trim() || null,
            hotelRoom: hotelRoom?.trim() || null,
            specialRequirements: specialRequirements?.trim() || null,
            notes: notes?.trim() || null,
            status: status || 'CONFIRMED',
          },
        });
      }

      // Create or update EventGuest link for this specific event
      const eventGuest = await tx.eventGuest.upsert({
        where: {
          eventId_guestId: {
            eventId,
            guestId: guest.id,
          },
        },
        create: {
          eventId,
          guestId: guest.id,
          status: status || 'CONFIRMED',
          pickupLocation: pickupLocation?.trim() || null,
          dropLocation: dropLocation?.trim() || null,
          hotelRoom: hotelRoom?.trim() || null,
          specialRequirements: specialRequirements?.trim() || null,
          notes: notes?.trim() || null,
        },
        update: {
          status: status || undefined,
          pickupLocation: pickupLocation?.trim() || undefined,
          dropLocation: dropLocation?.trim() || undefined,
          hotelRoom: hotelRoom?.trim() || undefined,
          specialRequirements: specialRequirements?.trim() || undefined,
          notes: notes?.trim() || undefined,
        },
      });

      return { guest, eventGuest };
    });

    return NextResponse.json(
      {
        success: true,
        guest: {
          ...result.guest,
          eventGuestId: result.eventGuest.id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding guest to event:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error while adding guest' } },
      { status: 500 }
    );
  }
}
