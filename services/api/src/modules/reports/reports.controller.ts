import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/events/:eventId/reports')
@UseGuards(FirebaseAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('reconciliation')
  async getReconciliationReport(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
    @Query('functionId') functionId?: string,
  ) {
    // Tenant RBAC authorization: verify caller is event creator, organizer, or account member
    if (user.role !== 'SUPER_ADMIN') {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          account: { include: { members: true } },
          eventMembers: true,
        },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      const isHostOrOrganizer =
        event.creatorId === user.id ||
        event.account.members.some((m) => m.userId === user.id) ||
        event.eventMembers.some((m) => m.userId === user.id && ['HOST', 'ORGANIZER', 'PLANNER'].includes(m.role));

      if (!isHostOrOrganizer) {
        throw new ForbiddenException(
          'Access denied: Only event hosts, planners, and account members can access vendor reconciliation reports.'
        );
      }
    }

    return this.reportsService.getEventReconciliation(eventId, { functionId });
  }
}
