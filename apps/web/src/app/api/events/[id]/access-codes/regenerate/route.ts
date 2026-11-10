import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';
import { regenerateGuestAccessCode, createDriverInviteCodeRecord } from '../../../../../../lib/access-code';
import { AccessCodePurpose } from '@prisma/client';

export const dynamic = 'force-dynamic';

// POST /api/events/[id]/access-codes/regenerate - Invalidate & regenerate Driver or Guest code
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { context, response } = await getAuthenticatedHost(req);
    if (!context) return response!;

    const eventId = params.id;
    const { event, errorResponse } = await verifyEventOwnership(eventId, context.account.id);
    if (!event) return errorResponse!;

    const body = await req.json().catch(() => ({}));
    const type = (body.type || 'GUEST').toUpperCase(); // 'GUEST', 'DRIVER', or 'BOTH'

    let newGuestDisplayCode: string | null = null;
    let newDriverDisplayCode: string | null = null;

    if (type === 'GUEST' || type === 'BOTH' || type === 'ALL') {
      const regenerated = await regenerateGuestAccessCode(
        event.id,
        context.user.id,
        context.account.id
      );
      newGuestDisplayCode = regenerated.displayCode;
    }

    if (type === 'DRIVER' || type === 'BOTH' || type === 'ALL') {
      const driverInvite = await prisma.$transaction(async (tx) => {
        return await createDriverInviteCodeRecord(tx, {
          accountId: context.account.id,
          eventId: event.id,
          creatorId: context.user.id,
          recipientName: 'General Chauffeur Invite',
        });
      });
      newDriverDisplayCode = driverInvite.displayCode;
    }

    return NextResponse.json({
      success: true,
      message: 'Access credentials regenerated successfully. Previous active codes have been invalidated.',
      type,
      guestAccessCode: newGuestDisplayCode,
      driverAccessCode: newDriverDisplayCode,
      newCode: newGuestDisplayCode || newDriverDisplayCode,
    });
  } catch (error: any) {
    console.error('Error regenerating access code:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to regenerate access code.' } },
      { status: 500 }
    );
  }
}
