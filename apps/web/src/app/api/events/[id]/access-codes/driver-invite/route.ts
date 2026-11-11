import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';
import { createDriverInviteCodeRecord } from '../../../../../../lib/access-code';

export const dynamic = 'force-dynamic';

// POST /api/events/[id]/access-codes/driver-invite - Host issues a one-time driver invitation
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
    const recipientName = body.recipientName?.trim() || null;
    const recipientPhone = body.recipientPhone?.trim() || null;
    const recipientEmail = body.recipientEmail?.trim() || null;

    const inviteRecord = await prisma.$transaction(async (tx) => {
      return await createDriverInviteCodeRecord(tx, {
        accountId: context.account.id,
        eventId: event.id,
        creatorId: context.user.id,
        recipientName,
        recipientPhone,
        recipientEmail,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Driver invitation created successfully.',
      invitation: {
        id: inviteRecord.id,
        code: inviteRecord.code,
        displayCode: inviteRecord.displayCode,
        recipientName: inviteRecord.recipientName,
        recipientPhone: inviteRecord.recipientPhone,
        recipientEmail: inviteRecord.recipientEmail,
        createdAt: inviteRecord.createdAt,
        isSingleUse: inviteRecord.isSingleUse,
      },
    });
  } catch (error: any) {
    console.error('Error creating driver invitation:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create driver invitation.' } },
      { status: 500 }
    );
  }
}

