import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../lib/auth-server';
import { generateSecureAccessCode, generateUniqueEventAccessCodes } from '../../../../../lib/access-code';

export const dynamic = 'force-dynamic';

// GET /api/events/[id]/access-codes - Host views event driver and guest codes
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

    // If legacy event is missing codes, generate and persist them
    let driverAccessCode = event.driverAccessCode;
    let guestAccessCode = event.guestAccessCode || event.joinCode;

    if (!driverAccessCode || !guestAccessCode) {
      const generated = await generateUniqueEventAccessCodes();
      driverAccessCode = driverAccessCode || generated.driverAccessCode;
      guestAccessCode = guestAccessCode || generated.guestAccessCode;

      await prisma.event.update({
        where: { id: event.id },
        data: {
          driverAccessCode,
          guestAccessCode,
        },
      });
    }

    return NextResponse.json({
      success: true,
      codes: {
        driverAccessCode,
        guestAccessCode,
        joinCode: event.joinCode,
        eventName: event.name,
      },
    });
  } catch (error: any) {
    console.error('Error fetching event access codes:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch access codes.' } },
      { status: 500 }
    );
  }
}
