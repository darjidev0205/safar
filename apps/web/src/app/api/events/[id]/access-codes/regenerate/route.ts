import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';
import { generateSecureAccessCode } from '../../../../../../lib/access-code';

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

    const body = await req.json();
    const type = (body.type || '').toUpperCase(); // 'DRIVER' or 'GUEST'

    if (type !== 'DRIVER' && type !== 'GUEST') {
      return NextResponse.json(
        { success: false, error: { message: 'Code type must be either DRIVER or GUEST.' } },
        { status: 400 }
      );
    }

    // Generate guaranteed unique new code
    let newCode = '';
    for (let i = 0; i < 10; i++) {
      const candidate = generateSecureAccessCode();
      const existing = await prisma.event.findFirst({
        where: {
          OR: [
            { driverAccessCode: candidate },
            { guestAccessCode: candidate },
            { joinCode: candidate },
          ],
        },
      });
      if (!existing) {
        newCode = candidate;
        break;
      }
    }

    if (!newCode) newCode = generateSecureAccessCode();

    const updateData: any = {};
    if (type === 'DRIVER') {
      updateData.driverAccessCode = newCode;
    } else {
      updateData.guestAccessCode = newCode;
      updateData.joinCode = newCode; // keep sync
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `${type === 'DRIVER' ? 'Driver' : 'Guest'} access code regenerated successfully. Previous code has been invalidated.`,
      type,
      newCode,
      driverAccessCode: updatedEvent.driverAccessCode,
      guestAccessCode: updatedEvent.guestAccessCode,
    });
  } catch (error: any) {
    console.error('Error regenerating access code:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to regenerate access code.' } },
      { status: 500 }
    );
  }
}
