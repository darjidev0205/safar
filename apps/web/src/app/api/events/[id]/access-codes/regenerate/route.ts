import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/db';
import { getAuthenticatedHost, verifyEventOwnership } from '../../../../../../lib/auth-server';
import { generateSecureAccessCode, generateUniqueEventAccessCodes } from '../../../../../../lib/access-code';

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
    const type = (body.type || 'BOTH').toUpperCase(); // 'DRIVER', 'GUEST', or 'BOTH'

    const updateData: any = {};
    let newDriverCode: string | null = null;
    let newGuestCode: string | null = null;

    if (type === 'BOTH' || type === 'ALL') {
      const generated = await generateUniqueEventAccessCodes();
      updateData.driverAccessCode = generated.driverAccessCode;
      updateData.guestAccessCode = generated.guestAccessCode;
      updateData.joinCode = generated.guestAccessCode;
      newDriverCode = generated.driverAccessCode;
      newGuestCode = generated.guestAccessCode;
    } else if (type === 'DRIVER') {
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
      updateData.driverAccessCode = newCode;
      newDriverCode = newCode;
    } else if (type === 'GUEST') {
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
      updateData.guestAccessCode = newCode;
      updateData.joinCode = newCode;
      newGuestCode = newCode;
    } else {
      return NextResponse.json(
        { success: false, error: { message: 'Code type must be DRIVER, GUEST, or BOTH.' } },
        { status: 400 }
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Event access codes regenerated successfully. Previous credentials have been invalidated.`,
      type,
      newCode: newGuestCode || newDriverCode,
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
