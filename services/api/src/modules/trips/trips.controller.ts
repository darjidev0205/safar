import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateTripStatusSchema, VerifyBoardingSchema, DriverTripTransitionSchema, SOSAlertSchema } from '@safar/validation';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('api/v1/trips')
@UseGuards(FirebaseAuthGuard)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async listTrips(
    @Query('eventId') eventId: string,
    @Query('functionId') functionId?: string,
  ) {
    if (!eventId) throw new BadRequestException('eventId query parameter is required');
    return this.tripsService.listTrips(eventId, { functionId });
  }

  @Get('driver/current')
  async getDriverCurrentTrip(@CurrentUser() user: any) {
    return this.tripsService.getDriverCurrentTrip(user.id);
  }

  @Get(':id')
  async getTrip(@Param('id') id: string) {
    return this.tripsService.getTrip(id);
  }

  @Post()
  async createTrip(@Query('eventId') eventId: string, @Body() body: any) {
    if (!eventId) throw new BadRequestException('eventId query parameter is required');
    return this.tripsService.createTrip(eventId, body);
  }

  @Patch(':id/assign')
  async assignTrip(
    @Param('id') id: string,
    @Body() body: { driverId?: string; vehicleId?: string },
  ) {
    return this.tripsService.assignTrip(id, body);
  }

  @Patch(':id/status')
  async updateTripStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    UpdateTripStatusSchema.parse(body);
    return this.tripsService.updateTripStatus(id, body.status, user.id, body.reason);
  }

  @Post(':id/transitions')
  async transitionTrip(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const validated = DriverTripTransitionSchema.parse(body);
    return this.tripsService.updateTripStatus(
      id,
      validated.toStatus as any,
      user.id,
      validated.reason || undefined
    );
  }

  @Post(':id/sos')
  async triggerTripSOS(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const trip = await this.tripsService.getTrip(id);
    return this.notificationsService.sendSOSAlert({
      eventId: trip.eventId,
      tripId: id,
      reporterUserId: user.id,
      reporterRole: user.role,
      latitude: body.latitude,
      longitude: body.longitude,
      reason: body.reason,
    });
  }

  @Post(':id/verify-boarding')
  async verifyBoarding(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    VerifyBoardingSchema.parse({ tripId: id, boardingCode: body.boardingCode });
    return this.tripsService.verifyBoarding(id, body.boardingCode);
  }
}
