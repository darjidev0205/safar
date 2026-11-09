import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getCallerUser } from '../../../../../lib/caller-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return (
        errorResponse ||
        NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const notificationId = params.id;
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: `Notification with id ${notificationId} not found` },
        { status: 404 }
      );
    }

    if (notification.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot acknowledge another user’s notification' },
        { status: 403 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        acknowledgedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification acknowledged',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to acknowledge notification' },
      { status: 500 }
    );
  }
}
