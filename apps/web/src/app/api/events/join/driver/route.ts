import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { Role, AccessRequestStatus, EventStatus } from '@prisma/client';
import { firestore, doc, setDoc } from '../../../../../lib/firebase';

export const dynamic = 'force-dynamic';

// POST /api/events/join/driver - Driver enters the master event's Driver Access Code
export async function POST(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const body = await req.json();
    const rawCode = (body.code || '').trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: { message: 'Driver access code is required.' } },
        { status: 400 }
      );
    }

    // 1. Locate the event matching this driverAccessCode
    const event = await prisma.event.findFirst({
      where: {
        driverAccessCode: rawCode,
      },
      include: {
        account: true,
      },
    });

    if (!event) {
      // Check if they entered a guest code by mistake to give helpful guidance
      const isGuestCode = await prisma.event.findFirst({
        where: {
          OR: [{ guestAccessCode: rawCode }, { joinCode: rawCode }],
        },
      });

      if (isGuestCode) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'This code is a Guest Access Code. Chauffeurs must enter the Driver Access Code provided by the host.',
            },
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: { message: 'Invalid driver access code. Please check with the wedding host.' } },
        { status: 404 }
      );
    }

    // 2. Verify event is active
    if (event.status === EventStatus.ARCHIVED || event.status === EventStatus.COMPLETED) {
      return NextResponse.json(
        { success: false, error: { message: `This event is currently ${event.status.toLowerCase()} and not accepting chauffeurs.` } },
        { status: 400 }
      );
    }

    // 3. Ensure Driver record exists for this user
    let driver = await prisma.driver.findFirst({
      where: { userId: caller.id },
    });

    if (!driver) {
      driver = await prisma.driver.create({
        data: {
          accountId: event.accountId,
          userId: caller.id,
          licenseNumber: `DL-${caller.phoneNumber ? caller.phoneNumber.slice(-6) : caller.id.slice(-6).toUpperCase()}`,
          isVerified: false,
          approvalStatus: 'PENDING',
        },
      });
    }

    const now = new Date();

    // 4. Create/Upsert DriverEvent and EventAccessRequest with PENDING status
    const result = await prisma.$transaction(async (tx) => {
      // Upsert DriverEvent
      const driverEvent = await tx.driverEvent.upsert({
        where: {
          driverId_eventId: {
            driverId: driver!.id,
            eventId: event.id,
          },
        },
        create: {
          driverId: driver!.id,
          eventId: event.id,
          status: 'PENDING',
          requestedAt: now,
        },
        update: {
          status: 'PENDING',
          requestedAt: now,
          rejectedAt: null,
        },
      });

      // Also upsert EventAccessRequest for host dashboard compatibility
      const accessReq = await tx.eventAccessRequest.upsert({
        where: {
          eventId_userId_role: {
            eventId: event.id,
            userId: caller.id,
            role: Role.DRIVER,
          },
        },
        create: {
          eventId: event.id,
          userId: caller.id,
          role: Role.DRIVER,
          status: AccessRequestStatus.PENDING,
          requestedAt: now,
        },
        update: {
          status: AccessRequestStatus.PENDING,
          requestedAt: now,
          rejectedAt: null,
        },
      });

      return { driverEvent, accessReq };
    });

    // 5. Sync to Firestore for real-time notification on host dashboard
    try {
      await setDoc(
        doc(firestore, 'event_access_requests', result.accessReq.id),
        {
          id: result.accessReq.id,
          eventId: event.id,
          eventName: event.name,
          hostAccountId: event.accountId,
          userId: caller.id,
          userName: caller.fullName,
          userEmail: caller.email,
          userPhone: caller.phoneNumber,
          role: 'DRIVER',
          status: 'PENDING',
          requestedAt: now.toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Firestore sync note:', fsErr);
    }

    // 6. Security: Do NOT immediately return sensitive event guest or route data until approved!
    return NextResponse.json({
      success: true,
      status: 'PENDING',
      message: `Access requested for ${event.name}. Waiting for host approval.`,
      event: {
        id: event.id,
        name: event.name,
        city: event.city,
      },
      driver: {
        id: driver.id,
        fullName: caller.fullName,
      },
    }, { status: 202 });
  } catch (error: any) {
    console.error('Error in POST /api/events/join/driver:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to submit driver join request.' } },
      { status: 500 }
    );
  }
}
