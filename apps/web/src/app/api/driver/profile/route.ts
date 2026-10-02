import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

async function getCallerUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const emailHeader = req.headers.get('x-user-email');
  const uidHeader = req.headers.get('x-user-uid');
  const idHeader = req.headers.get('x-user-id');
  const queryUserId = req.nextUrl?.searchParams?.get('userId');

  if (idHeader) {
    const user = await prisma.user.findUnique({ where: { id: idHeader } });
    if (user) return user;
  }

  if (queryUserId) {
    const user = await prisma.user.findUnique({ where: { id: queryUserId } });
    if (user) return user;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    if (token.includes('@')) {
      const user = await prisma.user.findFirst({ where: { email: { equals: token.toLowerCase(), mode: 'insensitive' } } });
      if (user) return user;
    }
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ firebaseUid: token }, { id: token }],
      },
    });
    if (user) return user;
  }

  if (emailHeader) {
    const user = await prisma.user.findFirst({ where: { email: { equals: emailHeader.toLowerCase(), mode: 'insensitive' } } });
    if (user) return user;
  }

  if (uidHeader) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ firebaseUid: uidHeader }, { id: uidHeader }],
      },
    });
    if (user) return user;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCallerUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (user.role !== 'DRIVER') {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied: User is not registered as a driver' } },
        { status: 403 }
      );
    }

    // Find driver record
    let driver = await prisma.driver.findUnique({
      where: { userId: user.id },
      include: {
        currentVehicle: true,
      },
    });

    if (!driver) {
      // Auto-provision driver record for this verified driver user
      let account = await prisma.account.findFirst();
      if (!account) {
        account = await prisma.account.create({
          data: {
            name: 'SAFAR Mobility Fleet',
            slug: 'safar-fleet',
            ownerId: user.id,
          },
        });
      }

      driver = await prisma.driver.create({
        data: {
          accountId: account.id,
          userId: user.id,
          licenseNumber: 'DL-PENDING',
          dutyStatus: 'AVAILABLE',
          isVerified: true,
          approvalStatus: 'APPROVED',
        },
        include: {
          currentVehicle: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        userId: user.id,
        driverId: driver.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        avatarUrl: user.avatarUrl || null,
        address: driver.address || '',
        emergencyContact: driver.emergencyContact || '',
        licenseNumber: driver.licenseNumber || '',
        licenseExpiry: driver.licenseExpiry || '',
        vehicleInfo: driver.vehicleInfo || (driver.currentVehicle ? `${driver.currentVehicle.model} (${driver.currentVehicle.plateNumber})` : ''),
        dutyStatus: driver.dutyStatus,
        isVerified: driver.isVerified,
        approvalStatus: driver.approvalStatus,
        createdAt: driver.createdAt.toISOString(),
        updatedAt: driver.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/driver/profile:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database error' } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const caller = await getCallerUser(req);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (caller.role !== 'DRIVER') {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied: Only drivers can edit driver profile' } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      targetUserId,
      fullName,
      phoneNumber,
      avatarUrl,
      address,
      emergencyContact,
      licenseNumber,
      licenseExpiry,
      vehicleInfo,
    } = body;

    // SECURITY CHECK: A driver must ONLY be able to edit their own profile!
    if (targetUserId && targetUserId !== caller.id) {
      return NextResponse.json(
        {
          success: false,
          code: 'FORBIDDEN_RESOURCE',
          error: {
            code: 'FORBIDDEN_RESOURCE',
            message: 'Security Violation: Drivers are strictly prohibited from modifying another driver’s profile.',
          },
        },
        { status: 403 }
      );
    }

    // Input Validation
    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'Full name is required' } },
        { status: 400 }
      );
    }

    if (phoneNumber && !/^\+?[0-9\s\-()]{7,20}$/.test(phoneNumber.trim())) {
      return NextResponse.json(
        { success: false, error: { message: 'Please enter a valid phone number with country code' } },
        { status: 400 }
      );
    }

    // Update user and driver in PostgreSQL transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: caller.id },
        data: {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber ? phoneNumber.trim() : caller.phoneNumber,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : caller.avatarUrl,
        },
      });

      const updatedDriver = await tx.driver.upsert({
        where: { userId: caller.id },
        update: {
          address: address !== undefined ? address.trim() : undefined,
          emergencyContact: emergencyContact !== undefined ? emergencyContact.trim() : undefined,
          licenseNumber: licenseNumber !== undefined ? licenseNumber.trim() : undefined,
          licenseExpiry: licenseExpiry !== undefined ? licenseExpiry.trim() : undefined,
          vehicleInfo: vehicleInfo !== undefined ? vehicleInfo.trim() : undefined,
          // CRITICAL SECURITY: Sensitive admin fields (approvalStatus, isVerified) are explicitly NOT updated here!
        },
        create: {
          accountId: (await tx.account.findFirst())?.id || 'acc_default',
          userId: caller.id,
          licenseNumber: licenseNumber || 'DL-PENDING',
          address,
          emergencyContact,
          licenseExpiry,
          vehicleInfo,
          dutyStatus: 'AVAILABLE',
          isVerified: true,
          approvalStatus: 'APPROVED',
        },
        include: {
          currentVehicle: true,
        },
      });

      return { user: updatedUser, driver: updatedDriver };
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully in PostgreSQL database',
      profile: {
        userId: result.user.id,
        driverId: result.driver.id,
        fullName: result.user.fullName,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
        avatarUrl: result.user.avatarUrl,
        address: result.driver.address,
        emergencyContact: result.driver.emergencyContact,
        licenseNumber: result.driver.licenseNumber,
        licenseExpiry: result.driver.licenseExpiry,
        vehicleInfo: result.driver.vehicleInfo || (result.driver.currentVehicle ? `${result.driver.currentVehicle.model} (${result.driver.currentVehicle.plateNumber})` : ''),
        dutyStatus: result.driver.dutyStatus,
        isVerified: result.driver.isVerified,
        approvalStatus: result.driver.approvalStatus,
        updatedAt: result.driver.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in PUT /api/driver/profile:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Database update error' } },
      { status: 500 }
    );
  }
}
