import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JoinEventCodeSchema, CreateEventSchema } from '@safar/validation';

@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // Public / Semi-public endpoint for code lookup before joining
  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    JoinEventCodeSchema.parse({ code });
    return this.eventsService.findByCode(code);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async listEvents(@CurrentUser() user: any) {
    return this.eventsService.listEvents(user.id);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  async getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id);
  }

  @Get(':id/stats')
  @UseGuards(FirebaseAuthGuard)
  async getStats(@Param('id') id: string) {
    return this.eventsService.getStats(id);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async createEvent(@CurrentUser() user: any, @Body() body: any) {
    CreateEventSchema.parse({
      name: body.name,
      city: body.city,
      startDate: body.startDate,
      endDate: body.endDate,
      description: body.description,
    });
    return this.eventsService.createEvent(user.id, body);
  }

  @Post('join')
  @UseGuards(FirebaseAuthGuard)
  async joinEvent(@CurrentUser() user: any, @Body('code') code: string) {
    JoinEventCodeSchema.parse({ code });
    return this.eventsService.joinEvent(user.id, code);
  }
}
