import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const emailParam = req.nextUrl.searchParams.get('email');
    const uidParam = req.nextUrl.searchParams.get('uid');

    let whereClause: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      // Token may be firebaseUid, email, or a JWT
      if (token.includes('@')) {
        whereClause = { email: { equals: token.toLowerCase(), mode: 'insensitive' } };
      } else if (token.startsWith('uid_') || token.length >= 20) {
        whereClause = { firebaseUid: token };
      } else {
        whereClause = { id: token };
      }
    } else if (emailParam) {
      whereClause = { email: { equals: emailParam.toLowerCase(), mode: 'insensitive' } };
    } else if (uidParam) {
      whereClause = { firebaseUid: uidParam };
    }

    if (!whereClause) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing authentication credentials' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: whereClause,
      include: {
        drivers: {
          include: { currentVehicle: true },
        },
        accountMembers: {
          include: { account: true },
        },
        guests: {
          include: { event: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'User record not found in database' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
        driverProfile: user.drivers[0] || null,
        guestProfile: user.guests[0] || null,
        accounts: user.accountMembers.map((am: any) => am.account),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching /api/auth/me:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error' } },
      { status: 500 }
    );
  }
}
