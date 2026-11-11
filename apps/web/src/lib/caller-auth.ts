import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { Role } from '@prisma/client';
import { decodeFirebaseToken } from './auth-server';

export interface AuthenticatedUserContext {
  updatedAt: any;
  createdAt: any;
  avatarUrl: null;
  id: string;
  firebaseUid: string;
  email: string | null;
  fullName: string;
  phoneNumber: string | null;
  role: Role;
  accountMembers?: Array<{ accountId: string; role: Role; account: { id: string; name: string; slug: string } }>;
}

export function isValidObjectId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Extracts and verifies the authenticated user from Request headers, cookies, or Bearer token.
 * Prevents Prisma P2023 "Malformed ObjectID" errors by strictly validating 24-char hex strings.
 * Safely provisions missing user records when a valid Firebase token is verified.
 */
export async function getCallerUser(
  req: NextRequest
): Promise<{ user: AuthenticatedUserContext | null; errorResponse?: NextResponse }> {
  try {
    const authHeader = req.headers.get('authorization');
    const isProduction = process.env.NODE_ENV === 'production';

    // Disallow arbitrary impersonation headers in production
    const emailHeader = isProduction ? null : req.headers.get('x-user-email');
    const uidHeader = isProduction ? null : req.headers.get('x-user-uid');
    const idHeader = isProduction ? null : req.headers.get('x-user-id');
    const targetRoleHeader = isProduction ? null : req.headers.get('x-target-role');
    const emailQuery = isProduction ? null : req.nextUrl.searchParams.get('email');
    const uidQuery = isProduction ? null : req.nextUrl.searchParams.get('uid');
    const userIdQuery = isProduction ? null : req.nextUrl.searchParams.get('userId');

    let resolvedUserId: string | null = (idHeader && isValidObjectId(idHeader)) ? idHeader : ((userIdQuery && isValidObjectId(userIdQuery)) ? userIdQuery : null);
    let resolvedFirebaseUid: string | null = uidHeader || uidQuery || null;
    let resolvedEmail: string | null = emailHeader || emailQuery || null;
    let isTokenVerified = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      if (token && token !== 'null' && token !== 'undefined') {
        const decoded = decodeFirebaseToken(token);
        if (decoded.uid) {
          resolvedFirebaseUid = decoded.uid;
          isTokenVerified = true;
        }
        if (decoded.email) {
          resolvedEmail = decoded.email;
          isTokenVerified = true;
        }

        if (!decoded.uid && !decoded.email && !isProduction) {
          if (token.includes('@')) {
            resolvedEmail = token.toLowerCase().trim();
          } else if (isValidObjectId(token)) {
            resolvedUserId = token;
          } else {
            resolvedFirebaseUid = token;
          }
        }
      }
    }

    const orConditions: any[] = [];
    if (resolvedUserId && isValidObjectId(resolvedUserId)) {
      orConditions.push({ id: resolvedUserId });
    }
    if (resolvedFirebaseUid) {
      orConditions.push({ firebaseUid: resolvedFirebaseUid });
    }
    if (resolvedEmail) {
      orConditions.push({ email: { equals: resolvedEmail.toLowerCase().trim(), mode: 'insensitive' as const } });
    }

    if (orConditions.length === 0) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { success: false, error: { message: 'Authentication required. Please sign in.' } },
          { status: 401 }
        ),
      };
    }

    let dbUser = await prisma.user.findFirst({
      where: { OR: orConditions },
      include: {
        accountMembers: {
          include: { account: true },
        },
      },
    });

    // Auto-provision verified user safely if authenticated but record doesn't exist yet
    if (!dbUser && (resolvedFirebaseUid || resolvedEmail)) {
      const cleanEmail = resolvedEmail ? resolvedEmail.toLowerCase().trim() : null;
      const uidVal = resolvedFirebaseUid || `uid_${Date.now()}`;
      const nameFromEmail = cleanEmail ? cleanEmail.split('@')[0] : 'Guest';
      const formattedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

      let initialRole: Role = Role.GUEST;
      if (targetRoleHeader && ['DRIVER', 'GUEST', 'EVENT_ORGANIZER', 'ACCOUNT_OWNER'].includes(targetRoleHeader.toUpperCase())) {
        initialRole = targetRoleHeader.toUpperCase() as Role;
      }

      try {
        dbUser = await prisma.user.create({
          data: {
            firebaseUid: uidVal,
            email: cleanEmail,
            fullName: formattedName,
            role: initialRole,
          },
          include: {
            accountMembers: {
              include: { account: true },
            },
          },
        });
      } catch (createErr: any) {
        // If concurrent creation or unique collision occurred, retry finding
        dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              ...(resolvedFirebaseUid ? [{ firebaseUid: resolvedFirebaseUid }] : []),
              ...(cleanEmail ? [{ email: { equals: cleanEmail, mode: 'insensitive' as const } }] : []),
            ],
          },
          include: {
            accountMembers: {
              include: { account: true },
            },
          },
        });
      }
    }

    if (!dbUser) {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { success: false, error: { message: 'User record not found. Please register or sign in.' } },
          { status: 401 }
        ),
      };
    }

    return {
      user: {
        id: dbUser.id,
        firebaseUid: dbUser.firebaseUid,
        email: dbUser.email,
        fullName: dbUser.fullName,
        phoneNumber: dbUser.phoneNumber,
        role: dbUser.role,
        accountMembers: dbUser.accountMembers.map((am) => ({
          accountId: am.accountId,
          role: am.role,
          account: {
            id: am.account.id,
            name: am.account.name,
            slug: am.account.slug,
          },
        })),
        updatedAt: undefined,
        createdAt: undefined,
        avatarUrl: null
      },
    };
  } catch (err: any) {
    console.error('Error verifying caller user:', err);
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: { message: 'Internal authentication error.' } },
        { status: 500 }
      ),
    };
  }
}
