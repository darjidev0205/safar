import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';
import { revokeAccessCode } from '../../../../../../lib/access-code';

export const dynamic = 'force-dynamic';

// POST /api/events/[id]/access-codes/revoke - Host revokes an active access code or driver invitation
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
    const codeId = body.codeId;

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: { message: 'Code ID is required.' } },
        { status: 400 }
      );
    }

    const revoked = await revokeAccessCode(codeId, context.user.id, context.account.id);

    return NextResponse.json({
      success: true,
      message: 'Access code revoked successfully. It can no longer be used to access the event.',
      revokedCode: {
        id: revoked.id,
        displayCode: revoked.displayCode,
        isActive: revoked.isActive,
        revokedAt: revoked.revokedAt,
      },
    });
  } catch (error: any) {
    console.error('Error revoking access code:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to revoke access code.' } },
      { status: 500 }
    );
  }
}

