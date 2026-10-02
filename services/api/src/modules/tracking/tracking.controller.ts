import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocationPingSchema } from '@safar/validation';

@Controller('api/v1/tracking')
@UseGuards(FirebaseAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('ping')
  async postPing(@CurrentUser() user: any, @Body() body: any) {
    LocationPingSchema.parse(body);
    return this.trackingService.processLocationPing(user.id, body);
  }

  @Get('fleet')
  async getFleetPings(@Query('eventId') eventId: string) {
    if (!eventId) throw new BadRequestException('eventId query parameter is required');
    return this.trackingService.getFleetPings(eventId);
  }

  @Post('sos')
  async triggerSOS(@CurrentUser() user: any, @Body() body: any) {
    return this.trackingService.triggerEmergencySOS(user.id, body);
  }
}
