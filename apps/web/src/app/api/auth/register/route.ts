import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { UserRole } from '@safar/types';

export const dynamic = 'force-dynamic';

function normalizeRole(role: string): 'host' | 'guest' | 'driver' {
  const r = (role || '').toUpperCase();
  if (r === 'EVENT_ORGANIZER' || r === 'ACCOUNT_OWNER' || r === 'SUPER_ADMIN' || r === 'HOST') {
    return 'host';
  }
  if (r === 'DRIVER') {
    return 'driver';
  }
  return 'guest';
}

function roleToDbEnum(roleName: string): any {
  const normalized = normalizeRole(roleName);
  if (normalized === 'host') return 'EVENT_ORGANIZER';
  if (normalized === 'driver') return 'DRIVER';
  return 'GUEST';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firebaseUid, email, fullName, role, phoneNumber } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, error: { message: 'Email and full name are required' } },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUid = firebaseUid || `uid_${Date.now()}`;
    const targetNormRole = normalizeRole(role || 'GUEST');
    const dbRole = roleToDbEnum(targetNormRole);

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      const existingNormRole = normalizeRole(existing.role);
      // STRICT ONE EMAIL = ONE ROLE CHECK
      if (existingNormRole !== targetNormRole) {
        return NextResponse.json(
          {
            success: false,
            code: 'ONE_EMAIL_ONE_ROLE_VIOLATION',
            error: {
              code: 'ONE_EMAIL_ONE_ROLE_VIOLATION',
              message: `Security Violation: This email (${cleanEmail}) is permanently associated with the role '${existingNormRole.toUpperCase()}'. You cannot register or access it as '${targetNormRole.toUpperCase()}'.`,
              existingRole: existingNormRole,
              requestedRole: targetNormRole,
            },
          },
          { status: 403 }
        );
      }

      // If user exists with the SAME role, update UID if changed and return profile
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          firebaseUid: cleanUid,
          fullName: fullName || existing.fullName,
          phoneNumber: phoneNumber || existing.phoneNumber,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updated.id,
          firebaseUid: updated.firebaseUid,
          email: updated.email,
          fullName: updated.fullName,
          phoneNumber: updated.phoneNumber,
          role: updated.role,
        },
      });
    }

    // Create user in PostgreSQL transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firebaseUid: cleanUid,
          email: cleanEmail,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber?.trim() || null,
          role: dbRole,
        },
      });

      // Role specific resource provisioning
      if (dbRole === 'EVENT_ORGANIZER') {
        const slug = `org-${Date.now().toString(36)}`;
        const account = await tx.account.create({
          data: {
            name: `${user.fullName}'s Organization`,
            slug,
            ownerId: user.id,
          },
        });
        await tx.accountMember.create({
          data: {
            accountId: account.id,
            userId: user.id,
            role: 'ACCOUNT_OWNER',
          },
        });
      } else if (dbRole === 'DRIVER') {
        // Find or create primary account to attach driver
        let primaryAccount = await tx.account.findFirst();
        if (!primaryAccount) {
          primaryAccount = await tx.account.create({
            data: {
              name: 'SAFAR Mobility Network',
              slug: 'safar-mobility',
              ownerId: user.id,
            },
          });
        }

        await tx.driver.create({
          data: {
            accountId: primaryAccount.id,
            userId: user.id,
            licenseNumber: 'DL-PENDING',
            dutyStatus: 'AVAILABLE',
            approvalStatus: 'APPROVED',
            isVerified: true,
          },
        });
      }

      return user;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        firebaseUid: newUser.firebaseUid,
        email: newUser.email,
        fullName: newUser.fullName,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error during registration' } },
      { status: 500 }
    );
  }
}
