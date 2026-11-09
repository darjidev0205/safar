import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getCallerUser } from '../../../lib/caller-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await getCallerUser(req);
    if (!user) {
      return (
        errorResponse ||
        NextResponse.json({ success: false, error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = { userId: user.id };
    if (eventId) where.eventId = eventId;
    if (unreadOnly) where.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: { deliveries: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
