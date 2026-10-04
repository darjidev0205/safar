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
      const requestedRoleParam = req.headers.get('x-target-role') || req.nextUrl.searchParams.get('role') || req.nextUrl.searchParams.get('targetRole');

      if (emailVal) {
        const cleanEmail = String(emailVal).toLowerCase().trim();
        const displayName = cleanEmail.split('@')[0];
        const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        // Determine appropriate initial role
        let initialRole: any = 'GUEST';
        if (requestedRoleParam && ['DRIVER', 'GUEST', 'EVENT_ORGANIZER', 'ACCOUNT_OWNER'].includes(requestedRoleParam.toUpperCase())) {
          initialRole = requestedRoleParam.toUpperCase();
        } else if (cleanEmail.includes('driver')) {
          initialRole = 'DRIVER';
        } else if (cleanEmail.includes('host') || cleanEmail.includes('organizer')) {
          initialRole = 'EVENT_ORGANIZER';
        }

        user = await prisma.$transaction(async (tx) => {
          // Double check if user exists by email before any creation
          let u = await tx.user.findFirst({
            where: { email: { equals: cleanEmail, mode: 'insensitive' } },
            include: { accountMembers: { include: { account: true } }, drivers: true, guests: true },
          });

          if (u) {
            // Update firebaseUid if mismatched and not taken
            if (uidVal && u.firebaseUid !== String(uidVal)) {
              const existingWithUid = await tx.user.findUnique({ where: { firebaseUid: String(uidVal) } });
              if (!existingWithUid) {
                u = await tx.user.update({
                  where: { id: u.id },
                  data: { firebaseUid: String(uidVal) },
                  include: { accountMembers: { include: { account: true } }, drivers: true, guests: true },
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
                role: initialRole,
              },
              include: { accountMembers: { include: { account: true } }, drivers: true, guests: true },
            });
          }

          // Ensure role-specific entities exist
          if (u.role === 'EVENT_ORGANIZER' || u.role === 'ACCOUNT_OWNER') {
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
          } else if (u.role === 'DRIVER') {
            const existingDriver = await tx.driver.findFirst({ where: { userId: u.id } });
            if (!existingDriver) {
              // Find or create default account for driver link
              let defaultAcc = await tx.account.findFirst();
              if (!defaultAcc) {
                defaultAcc = await tx.account.create({
                  data: {
                    name: 'SAFAR Fleet Services',
                    slug: `fleet-${Date.now().toString(36)}`,
                    ownerId: u.id,
                  },
                });
              }
              await tx.driver.create({
                data: {
                  userId: u.id,
                  accountId: defaultAcc.id,
                  licenseNumber: `DL-${u.id.slice(0, 6).toUpperCase()}`,
                  isVerified: true,
                  approvalStatus: 'APPROVED',
                  dutyStatus: 'AVAILABLE',
                },
              });
            }
          } else if (u.role === 'GUEST') {
            const existingGuest = await tx.guest.findFirst({ where: { userId: u.id } });
            if (!existingGuest) {
              await tx.guest.create({
                data: {
                  userId: u.id,
                  fullName: u.fullName,
                  email: u.email,
                  status: 'CONFIRMED',
                },
              });
            }
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
