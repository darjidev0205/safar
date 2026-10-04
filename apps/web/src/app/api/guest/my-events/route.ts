import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { getCallerUser } from '../../../../lib/caller-auth';
import { Role, AccessRequestStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/guest/my-events - List approved & pending events for authenticated guest
export async function GET(req: NextRequest) {
  try {
    const { user: caller, errorResponse } = await getCallerUser(req);
    if (!caller) return errorResponse!;

    // Find all access requests by this guest
    const accessRequests = await prisma.eventAccessRequest.findMany({
      where: {
        userId: caller.id,
        role: Role.GUEST,
      },
      include: {
        event: {
          include: {
            functions: { orderBy: { startTime: 'asc' } },
            places: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const events = accessRequests.map((req) => {
      const isApproved = req.status === AccessRequestStatus.APPROVED;
      return {
        id: req.event.id,
        requestId: req.id,
        name: req.event.name,
        city: req.event.city,
        startDate: req.event.startDate.toISOString(),
        endDate: req.event.endDate.toISOString(),
        venueName: req.event.venueName,
        venueAddress: req.event.venueAddress,
        bannerUrl: req.event.bannerUrl,
        status: req.status, // 'APPROVED' | 'PENDING' | 'REJECTED'
        requestedAt: req.requestedAt.toISOString(),
        approvedAt: req.approvedAt ? req.approvedAt.toISOString() : null,
        details: isApproved
          ? {
              functions: req.event.functions.map((f) => ({
                id: f.id,
                name: f.name,
                startTime: f.startTime.toISOString(),
                endTime: f.endTime.toISOString(),
              })),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    console.error('Error fetching guest events:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch guest events.' } },
      { status: 500 }
    );
  }
}
