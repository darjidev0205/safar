import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@safar/types';
import { AccessCodePurpose } from '@prisma/client';
import * as crypto from 'crypto';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRTUVWXYZ';
const HMAC_SECRET = process.env.ACCESS_CODE_HMAC_SECRET || 'safar-production-event-access-hmac-v1';

function normalizeCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase();
}

function computeDigest(normalized: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(normalized).digest('hex');
}

function formatDisplay(clean: string): string {
  if (clean.length === 10) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  return clean;
}

function generateSecureCode(length = 10): { code: string; displayCode: string } {
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return { code, displayCode: formatDisplay(code) };
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(userId: string) {
    return this.prisma.event.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { account: { members: { some: { userId } } } },
          { eventMembers: { some: { userId } } },
        ],
      },
      include: {
        places: true,
        functions: true,
        _count: {
          select: {
            guests: true,
            trips: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        places: true,
        functions: {
          include: { place: true },
        },
        _count: {
          select: {
            guests: true,
            trips: true,
            bookings: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  async findByCode(code: string) {
    const formattedCode = normalizeCode(code);
    const digest = computeDigest(formattedCode);

    // 1. Centralized registry lookup
    const accessCode = await this.prisma.eventAccessCode.findFirst({
      where: {
        OR: [
          { codeDigest: digest },
          { code: formattedCode },
        ],
        isActive: true,
      },
      include: {
        event: {
          include: {
            places: true,
            functions: {
              where: { status: { not: 'ARCHIVED' } },
              include: { place: true },
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    let event = accessCode?.event || null;

    // 2. Legacy fallback
    if (!event) {
      event = await this.prisma.event.findFirst({
        where: {
          OR: [
            { joinCode: formattedCode },
            { guestAccessCode: formattedCode },
            { eventCodes: { some: { code: formattedCode, isActive: true } } },
          ],
        },
        include: {
          places: true,
          functions: {
            where: { status: { not: 'ARCHIVED' } },
            include: { place: true },
            orderBy: { startTime: 'asc' },
          },
        },
      });
    }

    if (!event) {
      throw new NotFoundException(`No active event found with code ${formattedCode}`);
    }

    return {
      id: event.id,
      name: event.name,
      city: event.city,
      startDate: event.startDate,
      endDate: event.endDate,
      joinCode: event.joinCode,
      guestAccessCode: event.guestAccessCode,
      bannerUrl: event.bannerUrl,
      description: event.description,
      places: event.places,
      functions: event.functions,
      placesCount: event.places.length,
      functionsCount: event.functions.length,
    };
  }

  async createEvent(userId: string, data: any) {
    // Check or create account for the host
    let account = await this.prisma.account.findFirst({
      where: { members: { some: { userId } } },
    });

    if (!account) {
      account = await this.prisma.account.create({
        data: {
          name: `${data.name} Organization`,
          slug: `org-${Date.now()}`,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: UserRole.ACCOUNT_OWNER,
            },
          },
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.ACCOUNT_OWNER },
      });
    }

    // Generate unique 10-char code with bounded retry and atomic creation
    const maxRetries = 5;
    let createdEvent: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { code, displayCode } = generateSecureCode(10);
      const digest = computeDigest(code);

      try {
        createdEvent = await this.prisma.$transaction(async (tx) => {
          const ev = await tx.event.create({
            data: {
              accountId: account!.id,
              creatorId: userId,
              name: data.name,
              city: data.city,
              startDate: new Date(data.startDate),
              endDate: new Date(data.endDate),
              joinCode: code,
              guestAccessCode: displayCode,
              driverAccessCode: null,
              description: data.description || null,
              bannerUrl: data.bannerUrl || null,
              eventMembers: {
                create: {
                  userId,
                  role: UserRole.EVENT_ORGANIZER,
                },
              },
              eventCodes: {
                create: {
                  code,
                  isActive: true,
                },
              },
              eventAccessCodes: {
                create: {
                  accountId: account!.id,
                  purpose: AccessCodePurpose.GUEST_EVENT,
                  code,
                  codeDigest: digest,
                  displayCode,
                  isActive: true,
                  isSingleUse: false,
                  createdBy: userId,
                },
              },
            },
            include: {
              places: true,
              functions: true,
            },
          });
          return ev;
        });
        break;
      } catch (err: any) {
        if ((err.code === 'P2002' || err.message?.includes('E11000')) && attempt < maxRetries) {
          continue;
        }
        throw err;
      }
    }

    const event = createdEvent;

    // Populate initial places if supplied by wizard
    if (data.places && Array.isArray(data.places)) {
      for (const place of data.places) {
        await this.prisma.place.create({
          data: {
            eventId: event.id,
            name: place.name,
            address: place.address,
            latitude: place.latitude || 23.0225,
            longitude: place.longitude || 72.5714,
            type: place.type || 'VENUE',
          },
        });
      }
    }

    return this.getEvent(event.id);
  }

  async joinEvent(userId: string, code: string) {
    const event = await this.findByCode(code);

    const existingMember = await this.prisma.eventMember.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId,
        },
      },
    });

    if (!existingMember) {
      await this.prisma.eventMember.create({
        data: {
          eventId: event.id,
          userId,
          role: UserRole.GUEST,
        },
      });

      // Link or create Guest profile
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const existingGuest = await this.prisma.guest.findFirst({
          where: { eventId: event.id, userId },
        });

        if (!existingGuest) {
          await this.prisma.guest.create({
            data: {
              eventId: event.id,
              userId,
              fullName: user.fullName,
              phoneNumber: user.phoneNumber,
              email: user.email,
            },
          });
        }
      }
    }

    return {
      joined: true,
      event,
    };
  }

  async getStats(eventId: string) {
    const totalGuests = await this.prisma.guest.count({ where: { eventId } });
    const totalBookings = await this.prisma.booking.count({ where: { eventId } });
    const activeTrips = await this.prisma.trip.count({
      where: {
        eventId,
        status: {
          in: ['EN_ROUTE_TO_PICKUP', 'ARRIVED', 'BOARDING', 'IN_TRANSIT'],
        },
      },
    });

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { accountId: true },
    });

    const totalVehicles = event
      ? await this.prisma.vehicle.count({ where: { accountId: event.accountId } })
      : 0;

    const vehiclesOnDuty = await this.prisma.duty.count({
      where: {
        status: 'ON_DUTY',
        vehicle: { accountId: event?.accountId },
      },
    });

    return {
      totalGuests,
      totalBookings,
      activeTrips,
      vehiclesOnDuty,
      totalVehicles,
    };
  }

  // ==========================================
  // CANONICAL FUNCTION MANAGEMENT (DOMAIN-01)
  // ==========================================

  async listFunctions(eventId: string) {
    return this.prisma.function.findMany({
      where: { eventId, status: { not: 'ARCHIVED' } },
      include: {
        place: true,
        _count: {
          select: {
            trips: true,
            attendances: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getFunction(eventId: string, functionId: string) {
    const fn = await this.prisma.function.findFirst({
      where: { id: functionId, eventId },
      include: {
        place: true,
        trips: {
          include: {
            driver: { include: { user: true } },
            vehicle: true,
          },
        },
        attendances: {
          include: {
            guest: true,
          },
        },
      },
    });

    if (!fn) {
      throw new NotFoundException(`Function ${functionId} not found under event ${eventId}`);
    }

    return fn;
  }

  async createFunction(eventId: string, data: any) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Function name is required (e.g. Mehndi, Sangeet, Wedding Ceremony, Reception)');
    }

    const baseDateStr = data.date || event.startDate.toISOString().substring(0, 10);
    const startIso = data.startTime ? `${baseDateStr}T${data.startTime}:00` : `${baseDateStr}T18:00:00`;
    const endIso = data.endTime ? `${baseDateStr}T${data.endTime}:00` : `${baseDateStr}T23:00:00`;

    const parsedStart = data.startTime && data.startTime.includes('T') ? new Date(data.startTime) : new Date(startIso);
    let parsedEnd = data.endTime && data.endTime.includes('T') ? new Date(data.endTime) : new Date(endIso);

    if (isNaN(parsedStart.getTime())) {
      throw new BadRequestException('Invalid start time');
    }
    if (isNaN(parsedEnd.getTime()) || parsedEnd <= parsedStart) {
      parsedEnd = new Date(parsedStart.getTime() + 4 * 60 * 60 * 1000);
    }

    // Optionally link or create place
    let placeId = data.placeId || null;
    if (!placeId && data.venueName) {
      const place = await this.prisma.place.create({
        data: {
          eventId,
          name: data.venueName.trim(),
          address: data.venueAddress?.trim() || data.venueName.trim(),
          latitude: data.latitude ? parseFloat(data.latitude) : 23.0225,
          longitude: data.longitude ? parseFloat(data.longitude) : 72.5714,
          type: 'VENUE',
        },
      });
      placeId = place.id;
    }

    return this.prisma.function.create({
      data: {
        eventId,
        placeId,
        name: data.name.trim(),
        type: data.type || 'CUSTOM',
        date: new Date(baseDateStr),
        startTime: parsedStart,
        endTime: parsedEnd,
        venueName: data.venueName?.trim() || event.venueName || null,
        venueAddress: data.venueAddress?.trim() || event.venueAddress || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        guestRules: data.guestRules?.trim() || null,
        transportRules: data.transportRules?.trim() || null,
        description: data.description?.trim() || null,
        status: 'ACTIVE',
      },
      include: {
        place: true,
      },
    });
  }

  async updateFunction(eventId: string, functionId: string, data: any) {
    const existing = await this.prisma.function.findFirst({
      where: { id: functionId, eventId },
    });
    if (!existing) {
      throw new NotFoundException(`Function ${functionId} not found under event ${eventId}`);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.venueName !== undefined) updateData.venueName = data.venueName?.trim() || null;
    if (data.venueAddress !== undefined) updateData.venueAddress = data.venueAddress?.trim() || null;
    if (data.latitude !== undefined) updateData.latitude = data.latitude ? parseFloat(data.latitude) : null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude ? parseFloat(data.longitude) : null;
    if (data.guestRules !== undefined) updateData.guestRules = data.guestRules;
    if (data.transportRules !== undefined) updateData.transportRules = data.transportRules;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.function.update({
      where: { id: functionId },
      data: updateData,
      include: { place: true },
    });
  }

  async deleteFunction(eventId: string, functionId: string) {
    const fn = await this.prisma.function.findFirst({
      where: { id: functionId, eventId },
      include: {
        trips: true,
      },
    });

    if (!fn) {
      throw new NotFoundException(`Function ${functionId} not found under event ${eventId}`);
    }

    // Safety check: Prevent deletion if active trips are ongoing
    const activeTrips = fn.trips.filter((t) =>
      ['EN_ROUTE_TO_PICKUP', 'ARRIVED', 'BOARDING', 'IN_TRANSIT'].includes(t.status)
    );
    if (activeTrips.length > 0) {
      throw new BadRequestException(
        `Cannot delete function "${fn.name}" because it has ${activeTrips.length} active trip(s) in progress.`
      );
    }

    // Soft delete / archive
    return this.prisma.function.update({
      where: { id: functionId },
      data: { status: 'ARCHIVED' },
    });
  }

  // ==========================================
  // INVITATIONS & ACCESS CONTROL
  // ==========================================

  async createInvitation(eventId: string, data: any) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        accountId: event.accountId,
        eventId,
        guestId: data.guestId || null,
        email: data.email?.toLowerCase().trim() || null,
        phone: data.phone?.trim() || null,
        role: data.role || 'GUEST',
        token,
        expiresAt,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            city: true,
            joinCode: true,
          },
        },
      },
    });

    return invitation;
  }

  async resolveInvitation(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        event: {
          include: {
            places: true,
            functions: {
              where: { status: { not: 'ARCHIVED' } },
              orderBy: { startTime: 'asc' },
            },
          },
        },
        guest: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation token is invalid or does not exist');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  // ==========================================
  // GUEST ATTENDANCE & FUNCTION RSVP
  // ==========================================

  async recordFunctionAttendance(eventId: string, functionId: string, guestId: string, data: any) {
    const fn = await this.prisma.function.findFirst({
      where: { id: functionId, eventId },
    });
    if (!fn) {
      throw new NotFoundException(`Function ${functionId} does not belong to event ${eventId}`);
    }

    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
    });
    if (!guest) {
      throw new NotFoundException(`Guest ${guestId} not found`);
    }

    const isAttending = data.isAttending !== undefined ? Boolean(data.isAttending) : true;
    const status = data.status || (isAttending ? 'CONFIRMED' : 'DECLINED');

    return this.prisma.guestFunctionAttendance.upsert({
      where: {
        guestId_functionId: {
          guestId,
          functionId,
        },
      },
      create: {
        guestId,
        functionId,
        isAttending,
        status,
        notes: data.notes?.trim() || null,
      },
      update: {
        isAttending,
        status,
        notes: data.notes?.trim() || null,
      },
    });
  }

  async getGuestAttendance(eventId: string, guestId: string) {
    const allFunctions = await this.prisma.function.findMany({
      where: { eventId, status: { not: 'ARCHIVED' } },
      orderBy: { startTime: 'asc' },
    });

    const attendances = await this.prisma.guestFunctionAttendance.findMany({
      where: {
        guestId,
        functionId: { in: allFunctions.map((f) => f.id) },
      },
    });

    const attMap = new Map(attendances.map((a) => [a.functionId, a]));

    return allFunctions.map((fn) => {
      const att = attMap.get(fn.id);
      return {
        id: fn.id,
        name: fn.name,
        type: fn.type,
        date: fn.date,
        startTime: fn.startTime,
        endTime: fn.endTime,
        venueName: fn.venueName,
        isAttending: att ? att.isAttending : false,
        status: att ? att.status : 'UNASSIGNED',
        notes: att?.notes || null,
      };
    });
  }
}
