import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';
import {
  createGuestAccessCodeRecord,
  formatDisplayCode,
} from '../../../../../lib/access-code';
import { AccessCodePurpose } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/events/[id]/access-codes - Host views event access codes, guest codes & driver invitations
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (!event) return errorResponse!;

    // 1. Fetch active Guest Code from centralized registry
    let activeGuestCode = await prisma.eventAccessCode.findFirst({
      where: {
        eventId: event.id,
        purpose: AccessCodePurpose.GUEST_EVENT,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // If missing, auto-create authoritative registry record
    if (!activeGuestCode) {
      activeGuestCode = await prisma.$transaction(async (tx) => {
        return await createGuestAccessCodeRecord(tx, {
          accountId: context.account.id,
          eventId: event.id,
          creatorId: context.user.id,
          customCode: event.guestAccessCode || event.joinCode,
        });
      });
    }

    // 2. Fetch Driver Invitations (pending, redeemed, revoked)
    const driverInvitations = await prisma.eventAccessCode.findMany({
      where: {
        eventId: event.id,
        purpose: AccessCodePurpose.DRIVER_INVITE,
      },
      include: {
        redeemer: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch Assigned Drivers for this event
    const driverEvents = await prisma.driverEvent.findMany({
      where: {
        eventId: event.id,
        status: { not: 'REJECTED' },
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
            currentVehicle: {
              select: {
                id: true,
                model: true,
                plateNumber: true,
              },
            },
          },
        },
      },
    });

    const displayGuestCode = activeGuestCode.displayCode || formatDisplayCode(activeGuestCode.code);

    return NextResponse.json({
      success: true,
      codes: {
        driverAccessCode: event.driverAccessCode || 'INVITE-ONLY',
        guestAccessCode: displayGuestCode,
        joinCode: activeGuestCode.code,
        eventName: event.name,
      },
      guestCode: {
        id: activeGuestCode.id,
        code: activeGuestCode.code,
        displayCode: displayGuestCode,
        isActive: activeGuestCode.isActive,
        createdAt: activeGuestCode.createdAt,
        expiresAt: activeGuestCode.expiresAt,
      },
      driverInvitations: driverInvitations.map((inv) => ({
        id: inv.id,
        code: inv.code,
        displayCode: inv.displayCode,
        recipientName: inv.recipientName,
        recipientPhone: inv.recipientPhone,
        recipientEmail: inv.recipientEmail,
        isActive: inv.isActive,
        isSingleUse: inv.isSingleUse,
        redeemedAt: inv.redeemedAt,
        redeemer: inv.redeemer,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        revokedAt: inv.revokedAt,
      })),
      assignedDrivers: driverEvents.map((de) => ({
        id: de.id,
        driverId: de.driverId,
        fullName: de.driver.user.fullName,
        phoneNumber: de.driver.user.phoneNumber,
        licenseNumber: de.driver.licenseNumber,
        dutyStatus: de.driver.dutyStatus,
        status: de.status,
        assignedVehicle: de.driver.currentVehicle
          ? `${de.driver.currentVehicle.model} (${de.driver.currentVehicle.plateNumber})`
          : null,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching event access codes:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch access codes.' } },
      { status: 500 }
    );
  }
}
