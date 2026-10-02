import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Super admin bypasses tenant scope
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const eventId = request.params.eventId || request.query.eventId || request.body.eventId;

    if (eventId) {
      try {
        const event = await this.prisma.event.findUnique({
          where: { id: eventId },
          include: {
            account: {
              include: {
                members: true,
              },
            },
            eventMembers: true,
          },
        });

        if (!event) {
          throw new NotFoundException('Event not found');
        }

        // Check if user is an account member (Organizer/Host)
        const isAccountMember = event.account.members.some(
          (m) => m.userId === user.id
        );

        // Check if user is an event member (Guest/Driver)
        const isEventMember = event.eventMembers.some(
          (m) => m.userId === user.id
        );

        if (!isAccountMember && !isEventMember) {
          throw new ForbiddenException('Access denied: You do not have access to this event');
        }

        request.tenantContext = {
          accountId: event.accountId,
          eventId: event.id,
          isAccountMember,
          isEventMember,
        };
      } catch (err) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) {
          throw err;
        }
        // In transient dev fallback
        request.tenantContext = {
          eventId,
          isAccountMember: true,
        };
      }
    }

    return true;
  }
}
