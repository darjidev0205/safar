import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateTripStatusSchema, VerifyBoardingSchema } from '@safar/validation';

@Controller('api/v1/trips')
@UseGuards(FirebaseAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  async listTrips(@Query('eventId') eventId: string) {
    if (!eventId) throw new BadRequestException('eventId query parameter is required');
    return this.tripsService.listTrips(eventId);
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

  @Patch(':id/status')
  async updateTripStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    UpdateTripStatusSchema.parse(body);
    return this.tripsService.updateTripStatus(id, body.status, user.id, body.reason);
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
