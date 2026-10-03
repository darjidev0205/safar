import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { decodeFirebaseToken } from '../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const emailHeader = req.headers.get('x-user-email');
    const uidHeader = req.headers.get('x-user-uid');
    const userIdHeader = req.headers.get('x-user-id');
    const emailParam = req.nextUrl.searchParams.get('email');
    const uidParam = req.nextUrl.searchParams.get('uid');
    const userIdParam = req.nextUrl.searchParams.get('userId');

    let resolvedUserId: string | null = userIdHeader || userIdParam || null;
    let resolvedFirebaseUid: string | null = uidHeader || uidParam || null;
    let resolvedEmail: string | null = emailHeader || emailParam || null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      if (token && token !== 'null' && token !== 'undefined') {
        const decoded = decodeFirebaseToken(token);
        if (decoded.uid) resolvedFirebaseUid = decoded.uid;
        if (decoded.email) resolvedEmail = decoded.email;

        if (!decoded.uid && !decoded.email) {
          if (token.includes('@')) {
            resolvedEmail = token.toLowerCase().trim();
          } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token) || /^[0-9a-fA-F]{24}$/.test(token)) {
            resolvedUserId = token;
          } else {
            resolvedFirebaseUid = token;
          }
        }
      }
    }

    const orConditions: any[] = [];
    if (resolvedUserId && /^[0-9a-fA-F]{24}$/.test(resolvedUserId)) {
      orConditions.push({ id: resolvedUserId });
    }
    if (resolvedFirebaseUid) {
      orConditions.push({ firebaseUid: resolvedFirebaseUid });
    }
    if (resolvedEmail) {
      orConditions.push({ email: { equals: resolvedEmail.toLowerCase().trim(), mode: 'insensitive' } });
    }

    if (orConditions.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing authentication credentials' } },
        { status: 401 }
      );
    }

    let user = await prisma.user.findFirst({
      where: { OR: orConditions },
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

    // If user does not exist in SAFAR DB, provision once (FIRST LOGIN ONLY)
    if (!user) {
      const emailVal = resolvedEmail;
      const uidVal = resolvedFirebaseUid || `uid_${Date.now()}`;

      if (emailVal) {
        const cleanEmail = String(emailVal).toLowerCase().trim();
        const displayName = cleanEmail.split('@')[0];
        const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        user = await prisma.$transaction(async (tx) => {
          // Double check if user exists by email before any creation
          let u = await tx.user.findFirst({
            where: { email: { equals: cleanEmail, mode: 'insensitive' } },
            include: { accountMembers: { include: { account: true } } },
          });

          if (u) {
            // Update firebaseUid if mismatched and not taken
            if (uidVal && u.firebaseUid !== String(uidVal)) {
              const existingWithUid = await tx.user.findUnique({ where: { firebaseUid: String(uidVal) } });
              if (!existingWithUid) {
                u = await tx.user.update({
                  where: { id: u.id },
                  data: { firebaseUid: String(uidVal) },
                  include: { accountMembers: { include: { account: true } } },
                });
              }
            }
          } else {
            // Check if firebaseUid is already taken
            const existingWithUid = await tx.user.findUnique({ where: { firebaseUid: String(uidVal) } });
            const finalUid = existingWithUid ? `uid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : String(uidVal);

            u = await tx.user.create({
              data: {
                firebaseUid: finalUid,
                email: cleanEmail,
                fullName: formattedName,
                role: 'EVENT_ORGANIZER',
              },
              include: { accountMembers: { include: { account: true } } },
            });
          }

          // Ensure user has at least one account if host role
          if (!u.accountMembers || u.accountMembers.length === 0) {
            const slug = `org-${u.id.slice(0, 8)}-${Date.now().toString(36)}`;
            const acc = await tx.account.create({
              data: {
                name: `${formattedName}'s Events`,
                slug,
                ownerId: u.id,
              },
            });

            await tx.accountMember.create({
              data: {
                accountId: acc.id,
                userId: u.id,
                role: 'ACCOUNT_OWNER',
              },
            });
          }

          return tx.user.findUnique({
            where: { id: u.id },
            include: {
              drivers: { include: { currentVehicle: true } },
              accountMembers: { include: { account: true } },
              guests: { include: { event: true } },
            },
          });
        });
      }
    }

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
      { success: false, error: { message: "We couldn't authenticate your session. Please try again." } },
      { status: 500 }
    );
  }
}
