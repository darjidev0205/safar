import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@safar/types';

function generateJoinCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
    const formattedCode = code.trim().toUpperCase();
    const event = await this.prisma.event.findFirst({
      where: {
        OR: [
          { joinCode: formattedCode },
          { eventCodes: { some: { code: formattedCode, isActive: true } } },
        ],
      },
      include: {
        places: true,
        functions: true,
      },
    });

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
      bannerUrl: event.bannerUrl,
      description: event.description,
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

    // Generate unique code
    let joinCode = generateJoinCode(6);
    let codeExists = await this.prisma.event.findUnique({ where: { joinCode } });
    while (codeExists) {
      joinCode = generateJoinCode(6);
      codeExists = await this.prisma.event.findUnique({ where: { joinCode } });
    }

    const event = await this.prisma.event.create({
      data: {
        accountId: account.id,
        creatorId: userId,
        name: data.name,
        city: data.city,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        joinCode,
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
            code: joinCode,
            isActive: true,
          },
        },
      },
      include: {
        places: true,
        functions: true,
      },
    });

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
}
