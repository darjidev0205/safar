import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  async syncProfile(userId: string, data: { fullName?: string; avatarUrl?: string; role?: UserRole }) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundException('User record not found');
    }

    // STRICT ROLE IMMUTABILITY: Reject any attempt to elevate or mutate role via client profile sync
    if (data.role && data.role !== existingUser.role) {
      throw new ForbiddenException(
        'Privilege escalation rejected: Roles cannot be modified via profile sync. Roles are strictly derived from verified server-side tenant memberships.'
      );
    }

    const updateData: { fullName?: string; avatarUrl?: string } = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return updated;
  }
}
