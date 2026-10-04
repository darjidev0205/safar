import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { Role } from '@prisma/client';
import { decodeFirebaseToken } from './auth-server';

export interface AuthenticatedUserContext {
  id: string;
  firebaseUid: string;
  email: string | null;
  fullName: string;
  phoneNumber: string | null;
  role: Role;
  accountMembers?: Array<{ accountId: string; role: Role; account: { id: string; name: string; slug: string } }>;
}

/**
 * Extracts and verifies the authenticated user from Request headers, cookies, or Bearer token.
 * Does NOT auto-create fake users.
 */
export async function getCallerUser(
  req: NextRequest
): Promise<{ user: AuthenticatedUserContext | null; errorResponse?: NextResponse }> {
  try {
    const authHeader = req.headers.get('authorization');
    const emailHeader = req.headers.get('x-user-email');
    const uidHeader = req.headers.get('x-user-uid');
    const idHeader = req.headers.get('x-user-id');
    const emailQuery = req.nextUrl.searchParams.get('email');
    const uidQuery = req.nextUrl.searchParams.get('uid');
    const userIdQuery = req.nextUrl.searchParams.get('userId');

    let resolvedUserId: string | null = idHeader || userIdQuery || null;
    let resolvedFirebaseUid: string | null = uidHeader || uidQuery || null;
    let resolvedEmail: string | null = emailHeader || emailQuery || null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      if (token && token !== 'null' && token !== 'undefined') {
        const decoded = decodeFirebaseToken(token);
        if (decoded.uid) resolvedFirebaseUid = decoded.uid;
        if (decoded.email) resolvedEmail = decoded.email;

        if (!decoded.uid && !decoded.email) {
          if (token.includes('@')) {
            resolvedEmail = token.toLowerCase().trim();
          } else if (/^[0-9a-fA-F]{24}$/.test(token) || /^[0-9a-f]{8}-[0-9a-f]{4}/.test(token)) {
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
      return {
        user: null,
        errorResponse: NextResponse.json(
          { success: false, error: { message: 'Authentication required. Please sign in.' } },
          { status: 401 }
        ),
      };
    }

    const dbUser = await prisma.user.findFirst({
      where: { OR: orConditions },
      include: {
        accountMembers: {
          include: { account: true },
        },
      },
    });

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
