import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@safar/types';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        accountMembers: {
          include: { account: true },
        },
        eventMembers: {
          include: { event: true },
        },
        drivers: {
          include: { currentVehicle: true },
        },
        guests: {
          include: { event: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      accounts: user.accountMembers.map((am) => am.account),
      events: user.eventMembers.map((em) => em.event),
      driverProfile: user.drivers[0] || null,
      guestProfile: user.guests[0] || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async syncProfile(userId: string, data: { fullName: string; role?: UserRole }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        ...(data.role ? { role: data.role as any } : {}),
      },
    });
    return updated;
  }
}
