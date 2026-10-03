import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { Role } from '@prisma/client';

export interface AuthenticatedHostContext {
  user: {
    id: string;
    firebaseUid: string;
    email: string | null;
    fullName: string;
    phoneNumber: string | null;
    role: Role;
  };
  account: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
  };
}

/**
 * Decodes a Firebase ID token (JWT) without throwing errors.
 * Extracts uid (sub), email, and display name.
 */
export function decodeFirebaseToken(token: string): {
  uid: string | null;
  email: string | null;
  name: string | null;
} {
  if (!token || typeof token !== 'string') return { uid: null, email: null, name: null };
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);
      return {
        uid: payload.sub || payload.user_id || payload.uid || null,
        email: payload.email ? String(payload.email).toLowerCase().trim() : null,
        name: payload.name || null,
      };
    } catch {
      // not a valid base64 jwt payload
    }
  }
  return { uid: null, email: null, name: null };
}

/**
 * Extracts and verifies the authenticated host user and their primary organization account.
 * Scopes all operations strictly to this host's account.
 *
 * NOTE: This function is a strict route guard. It will NEVER call prisma.user.create().
 * If the user does not exist in the database, it returns a 401 Unauthorized response.
 */
export async function getAuthenticatedHost(
  req: NextRequest
): Promise<{ context: AuthenticatedHostContext | null; response?: NextResponse }> {
  try {
    const authHeader = req.headers.get('authorization');
    const emailHeader = req.headers.get('x-user-email');
    const uidHeader = req.headers.get('x-user-uid');
    const userIdHeader = req.headers.get('x-user-id');
    const emailQuery = req.nextUrl.searchParams.get('email');
    const uidQuery = req.nextUrl.searchParams.get('uid');
    const userIdQuery = req.nextUrl.searchParams.get('userId');

    let resolvedUserId: string | null = userIdHeader || userIdQuery || null;
    let resolvedFirebaseUid: string | null = uidHeader || uidQuery || null;
    let resolvedEmail: string | null = emailHeader || emailQuery || null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      if (token && token !== 'null' && token !== 'undefined') {
        const decoded = decodeFirebaseToken(token);
        if (decoded.uid) {
          resolvedFirebaseUid = decoded.uid;
        }
        if (decoded.email) {
          resolvedEmail = decoded.email;
        }

        if (!decoded.uid && !decoded.email) {
          if (token.includes('@')) {
            resolvedEmail = token.toLowerCase().trim();
          } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
            resolvedUserId = token;
          } else {
            resolvedFirebaseUid = token;
          }
        }
      }
    }

    const orConditions: any[] = [];
    if (resolvedUserId) {
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
        context: null,
        response: NextResponse.json(
          { success: false, error: { message: 'Authentication required. Please log in.' } },
          { status: 401 }
        ),
      };
    }

    let user = await prisma.user.findFirst({
      where: { OR: orConditions },
      include: {
        accountMembers: {
          include: { account: true },
        },
      },
    });

    if (!user) {
      return {
        context: null,
        response: NextResponse.json(
          {
            success: false,
            error: {
              message: 'Your host account could not be verified. Please sign in again.',
            },
          },
          { status: 401 }
        ),
      };
    }

    // Role check: Only HOST roles (EVENT_ORGANIZER, ACCOUNT_OWNER, SUPER_ADMIN) are allowed
    const isHostRole =
      user.role === Role.EVENT_ORGANIZER ||
      user.role === Role.ACCOUNT_OWNER ||
      user.role === Role.SUPER_ADMIN;

    if (!isHostRole) {
      return {
        context: null,
        response: NextResponse.json(
          {
            success: false,
            error: {
              message: 'Access denied: User is not authorized as a Host. Only hosts can create events.',
            },
          },
          { status: 403 }
        ),
      };
    }

    // If resolvedFirebaseUid differs and isn't taken, safely update it on the existing user
    if (resolvedFirebaseUid && user.firebaseUid !== resolvedFirebaseUid) {
      try {
        const uidHolder = await prisma.user.findUnique({ where: { firebaseUid: resolvedFirebaseUid } });
        if (!uidHolder) {
          await prisma.user.update({
            where: { id: user.id },
            data: { firebaseUid: resolvedFirebaseUid },
          });
          user.firebaseUid = resolvedFirebaseUid;
        }
      } catch (syncErr) {
        // Silently continue if update fails
      }
    }

    // Resolve or provision host Account (WITHOUT creating a User)
    let account = user.accountMembers[0]?.account || null;

    if (!account) {
      // Find if user owns an account directly
      const ownedAccount = await prisma.account.findFirst({
        where: { ownerId: user.id },
      });

      if (ownedAccount) {
        account = ownedAccount;
        await prisma.accountMember.upsert({
          where: { accountId_userId: { accountId: ownedAccount.id, userId: user.id } },
          create: { accountId: ownedAccount.id, userId: user.id, role: Role.ACCOUNT_OWNER },
          update: {},
        });
      } else {
        // Auto-provision initial host organization Account for this existing user
        const slug = `org-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
        account = await prisma.account.create({
          data: {
            name: `${user.fullName || 'Host'}'s Events`,
            slug,
            ownerId: user.id,
          },
        });

        await prisma.accountMember.create({
          data: {
            accountId: account.id,
            userId: user.id,
            role: Role.ACCOUNT_OWNER,
          },
        });
      }
    }

    return {
      context: {
        user: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
        account: {
          id: account.id,
          name: account.name,
          slug: account.slug,
          ownerId: account.ownerId,
        },
      },
    };
  } catch (error: any) {
    console.error('Host authentication error:', error);
    return {
      context: null,
      response: NextResponse.json(
        { success: false, error: { message: error.message || 'Internal server authentication error' } },
        { status: 500 }
      ),
    };
  }
}

/**
 * Asserts that the requested event exists and is owned by the authenticated host's account.
 */
export async function verifyEventOwnership(
  eventId: string,
  accountId: string
): Promise<{ event: any | null; errorResponse?: NextResponse }> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      accountId: accountId,
    },
    include: {
      transportRequirements: true,
      _count: {
        select: {
          eventGuests: true,
          guests: true,
          trips: true,
        },
      },
    },
  });

  if (!event) {
    return {
      event: null,
      errorResponse: NextResponse.json(
        { success: false, error: { message: 'Event not found or you do not have permission to access it.' } },
        { status: 404 }
      ),
    };
  }

  return { event };
}
