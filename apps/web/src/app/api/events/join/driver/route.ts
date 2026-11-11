import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';
import { Role, AccessRequestStatus, EventStatus, AccessCodePurpose } from '@prisma/client';
import { redeemDriverInvite, resolveAccessCode, normalizeAccessCode } from '../../../../../lib/access-code';
import { firestore, doc, setDoc } from '../../../../../lib/firebase';

export const dynamic = 'force-dynamic';

// POST /api/events/join/driver - Driver enters the master event's Driver Invitation Code
export async function POST(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    const body = await req.json();
    const rawCode = (body.code || '').trim();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: { message: 'Driver invitation code is required.' } },
        { status: 400 }
      );
    }

    const normalized = normalizeAccessCode(rawCode);

    // 1. Resolve code against centralized registry
    const resolution = await resolveAccessCode(normalized, AccessCodePurpose.DRIVER_INVITE);
    if (!resolution.isValid || !resolution.event) {
      return NextResponse.json(
        { success: false, error: { message: resolution.error || 'Invalid driver invitation code. Please check with the wedding host.' } },
        { status: 404 }
      );
    }

    const event = resolution.event;

    // 2. Execute atomic redemption
    const result = await redeemDriverInvite(normalized, caller);

    // 3. Realtime sync to Firestore if configured (fire-and-forget, never hangs the join response)
    try {
      if (firestore) {
        Promise.race([
          setDoc(
            doc(firestore, 'driver_events', `${caller.id}_${event.id}`),
            {
              driverId: result.driver.id,
              eventId: event.id,
              eventName: event.name,
              status: 'APPROVED',
              redeemedAt: new Date().toISOString(),
            },
            { merge: true }
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore sync skipped')), 1000)),
        ]).catch(() => {});
      }
    } catch (fsErr) {
      console.warn('Realtime sync optional notice:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      event: {
        id: event.id,
        name: event.name,
        city: event.city,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      driver: {
        id: result.driver.id,
        licenseNumber: result.driver.licenseNumber,
        dutyStatus: result.driver.dutyStatus,
      },
    });
  } catch (error: any) {
    console.error('Error in driver join:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to redeem driver invitation code.' } },
      { status: 400 }
    );
  }
}
