import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

async function getCallerUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const emailHeader = req.headers.get('x-user-email');
  const uidHeader = req.headers.get('x-user-uid');
  const idHeader = req.headers.get('x-user-id');

  if (idHeader) {
    const user = await prisma.user.findUnique({ where: { id: idHeader } });
    if (user) return user;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    const user = await prisma.user.findFirst({
      where: { OR: [{ firebaseUid: token }, { id: token }] },
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
      where: { OR: [{ firebaseUid: uidHeader }, { id: uidHeader }] },
    });
    if (user) return user;
  }

  return null;
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

    let guest = await prisma.guest.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    const eventIncludes = {
      functions: {
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { startTime: 'asc' as const },
        include: { place: true },
      },
      subEvents: { orderBy: { startDate: 'asc' as const } },
      places: true,
      eventCodes: true,
    };

    let event: any = null;
    if (eventCodeParam) {
      event = await prisma.event.findFirst({
        where: {
          OR: [
            { joinCode: eventCodeParam },
            { eventCodes: { some: { code: eventCodeParam, isActive: true } } },
          ],
        },
        include: eventIncludes,
      });
    }

    if (!event && guest?.eventId) {
      event = await prisma.event.findUnique({
        where: { id: guest.eventId },
        include: eventIncludes,
      });
    }

    if (!event) {
      event = await prisma.event.findFirst({
        where: { status: 'ACTIVE' },
        include: eventIncludes,
        orderBy: { startDate: 'asc' },
      });
    }

    if (!event) {
      return NextResponse.json({ success: true, events: [] });
    }

    let ceremonies: any[] = [];

    if (event.functions && event.functions.length > 0) {
      ceremonies = event.functions.map((fn: any, idx: number) => {
        const timeStr = fn.startTime instanceof Date ? fn.startTime.toISOString().substring(11, 16) : '18:00';
        const startHour = parseInt(timeStr.split(':')[0], 10);
        const pickupHour = isNaN(startHour) ? 17 : Math.max(0, startHour - 1);
        const pickupWindow = `${String(pickupHour).padStart(2, '0')}:15`;

        return {
          id: fn.id,
          sequence: `0${idx + 1}`,
          name: fn.name,
          eventType: fn.type || 'CEREMONY',
          date: (fn.date || fn.startTime).toISOString(),
          startTime: timeStr,
          endTime: fn.endTime instanceof Date ? fn.endTime.toISOString().substring(11, 16) : '23:00',
          venueName: fn.venueName || fn.place?.name || event.venueName || 'Ceremony Hall',
          venueAddress: fn.venueAddress || fn.place?.address || event.venueAddress || event.city,
          venueLatitude: fn.latitude || fn.place?.latitude || event.venueLatitude || 23.0225,
          venueLongitude: fn.longitude || fn.place?.longitude || event.venueLongitude || 72.5714,
          dressCode:
            fn.guestRules ||
            (fn.name.toLowerCase().includes('mehndi')
              ? 'Pastel / Floral Festive'
              : fn.name.toLowerCase().includes('sangeet')
              ? 'Indo-Western Glamour'
              : fn.name.toLowerCase().includes('haldi')
              ? 'Auspicious Yellows & Traditional'
              : fn.name.toLowerCase().includes('reception')
              ? 'Formal Luxury & Black Tie'
              : 'Traditional Festive Wedding Attire'),
          transportRules: fn.transportRules || null,
          transportStatus: 'SCHEDULED',
          pickupWindow,
        };
      });
    } else if (event.subEvents && event.subEvents.length > 0) {
      ceremonies = event.subEvents.map((sub: any, idx: number) => ({
        id: sub.id,
        sequence: `0${idx + 1}`,
        name: sub.name,
        eventType: sub.eventType || 'CEREMONY',
        date: sub.startDate.toISOString(),
        startTime: sub.startTime || '18:00',
        endTime: sub.endTime || '23:00',
        venueName: sub.venueName || event.venueName || 'Ceremony Hall',
        venueAddress: sub.venueAddress || event.venueAddress || event.city,
        venueLatitude: sub.venueLatitude || event.venueLatitude || 23.0225,
        venueLongitude: sub.venueLongitude || event.venueLongitude || 72.5714,
        dressCode:
          sub.name.toLowerCase().includes('mehndi')
            ? 'Pastel / Floral Festive'
            : sub.name.toLowerCase().includes('sangeet')
            ? 'Indo-Western Glamour'
            : sub.name.toLowerCase().includes('haldi')
            ? 'Auspicious Yellows & Traditional'
            : sub.name.toLowerCase().includes('reception')
            ? 'Formal Luxury & Black Tie'
            : 'Traditional Festive Wedding Attire',
        transportStatus: 'SCHEDULED',
        pickupWindow: `${sub.startTime ? sub.startTime.split(':')[0] : '17'}:15`,
      }));
    } else {
      ceremonies = [
        {
          id: event.id,
          sequence: '01',
          name: event.name,
          eventType: event.eventType || 'WEDDING',
          date: event.startDate.toISOString(),
          startTime: event.startTime || '18:00',
          endTime: event.endTime || '23:30',
          venueName: event.venueName || 'Grand Palace Banquets',
          venueAddress: event.venueAddress || event.city,
          venueLatitude: event.venueLatitude || 23.0225,
          venueLongitude: event.venueLongitude || 72.5714,
          dressCode: 'Royal Ceremonial Elegance',
          transportStatus: 'SCHEDULED',
          pickupWindow: '17:15',
        },
      ];
    }

    return NextResponse.json({
      success: true,
      eventName: event.name,
      city: event.city,
      joinCode: event.joinCode,
      ceremonies,
    });
  } catch (error: any) {
    console.error('Error in guest events API:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error' } },
      { status: 500 }
    );
  }
}
