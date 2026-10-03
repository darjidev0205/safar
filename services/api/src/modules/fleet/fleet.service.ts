import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DutyStatus, UserRole } from '@safar/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  async getVehicles(accountId: string) {
    return this.prisma.vehicle.findMany({
      where: { accountId },
      include: {
        drivers: true,
        duties: {
          where: { status: 'ON_DUTY' },
          include: { driver: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVehicle(accountId: string, data: any) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { plateNumber: data.plateNumber.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Vehicle with plate number ${data.plateNumber} already exists`);
    }

    return this.prisma.vehicle.create({
      data: {
        accountId,
        model: data.model,
        plateNumber: data.plateNumber.toUpperCase(),
        category: data.category || 'SEDAN',
        capacity: data.capacity || 4,
        isActive: true,
      },
    });
  }

  async getDrivers(accountId: string) {
    return this.prisma.driver.findMany({
      where: { accountId },
      include: {
        user: true,
        currentVehicle: true,
        duties: {
          where: { status: 'ON_DUTY' },
          include: { vehicle: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async inviteDriver(accountId: string, data: any) {
    // Check if user exists with phone or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(data.phoneNumber ? [{ phoneNumber: data.phoneNumber }] : []),
          ...(data.email ? [{ email: { equals: data.email.toLowerCase().trim(), mode: 'insensitive' } }] : []),
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          firebaseUid: `driver_${uuidv4()}`,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber || null,
          email: data.email ? data.email.toLowerCase().trim() : null,
          role: UserRole.DRIVER,
        },
      });
    }

    // Check if driver profile exists
    let driver = await this.prisma.driver.findUnique({
      where: { userId: user.id },
    });

    if (!driver) {
      driver = await this.prisma.driver.create({
        data: {
          accountId,
          userId: user.id,
          licenseNumber: data.licenseNumber || 'DL-PENDING',
          currentVehicleId: data.assignedVehicleId || null,
          dutyStatus: DutyStatus.OFF_DUTY,
        },
        include: {
          user: true,
          currentVehicle: true,
        },
      });
    }

    // Create invitation record
    const token = uuidv4();
    await this.prisma.invitation.create({
      data: {
        accountId,
        phone: data.phoneNumber,
        role: UserRole.DRIVER,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return driver;
  }

  async updateDutyStatus(driverId: string, dutyStatus: DutyStatus, vehicleId?: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    const updated = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        dutyStatus,
        ...(vehicleId ? { currentVehicleId: vehicleId } : {}),
      },
      include: {
        currentVehicle: true,
      },
    });

    // Create or update Duty log
    if (dutyStatus === DutyStatus.ON_DUTY && (vehicleId || driver.currentVehicleId)) {
      await this.prisma.duty.create({
        data: {
          driverId,
          vehicleId: vehicleId || driver.currentVehicleId!,
          status: DutyStatus.ON_DUTY,
        },
      });
    } else if (dutyStatus === DutyStatus.OFF_DUTY) {
      await this.prisma.duty.updateMany({
        where: { driverId, status: DutyStatus.ON_DUTY },
        data: { status: DutyStatus.OFF_DUTY, endedAt: new Date() },
      });
    }

    return updated;
  }
}
