import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBookingSchema } from '@safar/validation';

@Controller('api/v1/bookings')
@UseGuards(FirebaseAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  async listBookings(@Query('eventId') eventId: string) {
    if (!eventId) throw new BadRequestException('eventId query parameter is required');
    return this.bookingsService.listBookings(eventId);
  }

  @Get('my')
  async getMyBookings(@CurrentUser() user: any) {
    return this.bookingsService.getMyBookings(user.id);
  }

  @Get(':id')
  async getBooking(@Param('id') id: string) {
    return this.bookingsService.getBooking(id);
  }

  @Post()
  async createBooking(
    @Query('eventId') eventId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    if (!eventId) throw new BadRequestException('eventId query parameter is required');
    CreateBookingSchema.parse(body);
    return this.bookingsService.createBooking(eventId, user.id, body);
  }
}
