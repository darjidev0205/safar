import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { UserRole } from '@safar/types';

export const dynamic = 'force-dynamic';

function normalizeRole(role: string): 'host' | 'guest' | 'driver' {
  const r = role.toUpperCase();
  if (r === 'EVENT_ORGANIZER' || r === 'ACCOUNT_OWNER' || r === 'SUPER_ADMIN' || r === 'HOST') {
    return 'host';
  }
  if (r === 'DRIVER') {
    return 'driver';
  }
  return 'guest';
}

function roleToEnum(roleName: string): UserRole {
  const normalized = normalizeRole(roleName);
  if (normalized === 'host') return UserRole.EVENT_ORGANIZER;
  if (normalized === 'driver') return UserRole.DRIVER;
  return UserRole.GUEST;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email;
    const requestedRole = body.requestedRole || body.role;

    if (!email) {
      return NextResponse.json(
        { success: false, allowed: false, error: { message: 'Email is required', code: 'EMAIL_REQUIRED' } },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const targetNormRole = normalizeRole(requestedRole || 'GUEST');

    // Query database for existing user
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
      include: {
        drivers: true,
        guests: true,
      },
    });

    if (existing) {
      const existingNormRole = normalizeRole(existing.role);

      // STRICT ONE EMAIL = ONE ROLE CHECK
      if (existingNormRole !== targetNormRole) {
        const roleDisplayNames = {
          host: 'Host (Event Organizer)',
          guest: 'Guest',
          driver: 'Driver (Chauffeur)',
        };

        return NextResponse.json(
          {
            success: false,
            allowed: false,
            error: {
              code: 'ONE_EMAIL_ONE_ROLE_VIOLATION',
              message: `This email address is already registered as ${roleDisplayNames[existingNormRole]}. Under SAFAR security policy, one email is associated with exactly ONE role and cannot access or register as ${roleDisplayNames[targetNormRole]}. Please sign in to your authorized ${roleDisplayNames[existingNormRole]} workspace or use another email.`,
              existingRole: existingNormRole,
              requestedRole: targetNormRole,
            },
            code: 'ONE_EMAIL_ONE_ROLE_VIOLATION',
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        allowed: true,
        isNew: false,
        user: {
          id: existing.id,
          firebaseUid: existing.firebaseUid,
          email: existing.email,
          fullName: existing.fullName,
          phoneNumber: existing.phoneNumber,
          role: existing.role,
        },
      });
    }

    // Email does not exist yet -> allowed to register with requested role
    return NextResponse.json({
      success: true,
      allowed: true,
      isNew: true,
      role: roleToEnum(targetNormRole),
    });
  } catch (error: any) {
    console.error('Role validation error:', error);
    return NextResponse.json(
      { success: false, allowed: false, error: { message: error.message || 'Internal error' } },
      { status: 500 }
    );
  }
}
