import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LocationPingSchema, LocationBatchIngestSchema, SOSAlertSchema } from '@safar/validation';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('api/v1')
@UseGuards(FirebaseAuthGuard)
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * PR 4: Resilient Driver Location Batch Ingestion
   * POST /api/v1/driver/duties/:dutyId/location-batches
   */
  @Post('driver/duties/:dutyId/location-batches')
  async ingestLocationBatch(
    @CurrentUser() user: any,
    @Param('dutyId') dutyId: string,
    @Body() body: any
  ) {
    LocationBatchIngestSchema.parse(body);
    return this.trackingService.ingestLocationBatch(user.id, dutyId, body);
  }

  /**
   * PR 4: Live Fleet Snapshot for Host Console
   * GET /api/v1/events/:eventId/live
   */
  @Get('events/:eventId/live')
  async getEventLiveSnapshot(
    @CurrentUser() user: any,
    @Param('eventId') eventId: string
  ) {
    if (!eventId) throw new BadRequestException('eventId parameter is required');
    return this.trackingService.getEventLiveSnapshot(eventId, user.id);
  }

  /**
   * PR 4: Scoped Live Ride Telemetry for Guest Boarding Pass
   * GET /api/v1/bookings/:bookingId/live
   */
  @Get('bookings/:bookingId/live')
  async getBookingLiveSnapshot(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string
  ) {
    if (!bookingId) throw new BadRequestException('bookingId parameter is required');
    return this.trackingService.getBookingLiveSnapshot(bookingId, user.id);
  }

  /**
   * PR 5: Emergency SOS Safety Escalation
   * POST /api/v1/tracking/sos
   */
  @Post('tracking/sos')
  async triggerSOS(
    @CurrentUser() user: any,
    @Body() body: any
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

  // --- Backward Compatibility Endpoints ---

  @Post('tracking/ping')
  async postPing(@CurrentUser() user: any, @Body() body: any) {
    LocationPingSchema.parse(body);
    return this.trackingService.processLocationPing(user.id, body);
  }

  @Get('tracking/fleet')
  async getFleetPings(@Query('eventId') eventId: string) {
    if (!eventId) throw new BadRequestException('eventId query parameter is required');
    return this.trackingService.getFleetPings(eventId);
  }
}
