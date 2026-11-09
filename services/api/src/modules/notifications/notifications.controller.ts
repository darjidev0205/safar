import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SOSAlertSchema, AcknowledgeNotificationSchema } from '@safar/validation';

@Controller('api/v1/notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: any,
    @Query('eventId') eventId?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getUserNotifications(user.id, {
      eventId,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post(':id/acknowledge')
  async acknowledgeNotification(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    AcknowledgeNotificationSchema.parse({ notificationId: id });
    return this.notificationsService.acknowledgeNotification(id, user.id);
  }

  @Post('sos')
  async triggerSOS(
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const validated = SOSAlertSchema.parse(body);
    return this.notificationsService.sendSOSAlert({
      eventId: validated.eventId,
      tripId: validated.tripId || undefined,
      reporterUserId: user.id,
      reporterRole: user.role,
      latitude: validated.latitude || undefined,
      longitude: validated.longitude || undefined,
      reason: validated.reason || undefined,
    });
  }
}
