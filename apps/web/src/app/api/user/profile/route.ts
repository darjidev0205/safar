import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return errorResponse || NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
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
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error' } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) {
      return errorResponse || NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { targetUserId, fullName, phoneNumber, avatarUrl } = body;

    // SECURITY CHECK: A user can strictly ONLY edit their own profile!
    if (targetUserId && targetUserId !== caller.id) {
      return NextResponse.json(
        {
          success: false,
          code: 'FORBIDDEN_RESOURCE',
          error: {
            code: 'FORBIDDEN_RESOURCE',
            message: 'Security Violation: Users are strictly forbidden from editing another user’s profile.',
          },
        },
        { status: 403 }
      );
    }

    // Input Validation
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Display name is required and cannot be empty' } },
        { status: 400 }
      );
    }

    const cleanName = fullName.trim();
    if (cleanName.length < 2 || cleanName.length > 80) {
      return NextResponse.json(
        { success: false, error: { message: 'Display name must be between 2 and 80 characters' } },
        { status: 400 }
      );
    }

    // Validate phone number if provided
    let cleanPhone: string | null = caller.phoneNumber;
    if (phoneNumber !== undefined) {
      if (phoneNumber && phoneNumber.trim()) {
        const trimmedPhone = phoneNumber.trim();
        if (!/^\+?[0-9\s\-()]{7,20}$/.test(trimmedPhone)) {
          return NextResponse.json(
            { success: false, error: { message: 'Please enter a valid phone number (e.g. +91 98765 43210)' } },
            { status: 400 }
          );
        }
        cleanPhone = trimmedPhone;
      } else {
        cleanPhone = null;
      }
    }

    // Update user in PostgreSQL database (strictly omitting role, firebaseUid, permissions)
    const updated = await prisma.user.update({
      where: { id: caller.id },
      data: {
        fullName: cleanName,
        phoneNumber: cleanPhone,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : caller.avatarUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        firebaseUid: updated.firebaseUid,
        email: updated.email,
        fullName: updated.fullName,
        phoneNumber: updated.phoneNumber,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database update error' } },
      { status: 500 }
    );
  }
}
