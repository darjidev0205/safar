import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
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

  // Public endpoint to resolve an invitation token
  @Get('invitations/:token')
  async resolveInvitation(@Param('token') token: string) {
    return this.eventsService.resolveInvitation(token);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async listEvents(@CurrentUser() user: any) {
    return this.eventsService.listEvents(user.id);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id);
  }

  @Get(':id/stats')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
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

  // ==========================================
  // CANONICAL FUNCTION ROUTES (DOMAIN-01)
  // ==========================================

  @Get(':id/functions')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async listFunctions(@Param('id') id: string) {
    return this.eventsService.listFunctions(id);
  }

  @Get(':id/functions/:functionId')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async getFunction(
    @Param('id') id: string,
    @Param('functionId') functionId: string,
  ) {
    return this.eventsService.getFunction(id, functionId);
  }

  @Post(':id/functions')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async createFunction(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.eventsService.createFunction(id, body);
  }

  @Patch(':id/functions/:functionId')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async updateFunction(
    @Param('id') id: string,
    @Param('functionId') functionId: string,
    @Body() body: any,
  ) {
    return this.eventsService.updateFunction(id, functionId, body);
  }

  @Delete(':id/functions/:functionId')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async deleteFunction(
    @Param('id') id: string,
    @Param('functionId') functionId: string,
  ) {
    return this.eventsService.deleteFunction(id, functionId);
  }

  // ==========================================
  // INVITATIONS & ATTENDANCE ROUTES
  // ==========================================

  @Post(':id/invitations')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async createInvitation(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.eventsService.createInvitation(id, body);
  }

  @Post(':id/functions/:functionId/attendance')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async recordFunctionAttendance(
    @Param('id') id: string,
    @Param('functionId') functionId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const guestId = body.guestId || user.id;
    return this.eventsService.recordFunctionAttendance(id, functionId, guestId, body);
  }

  @Get(':id/guests/:guestId/attendance')
  @UseGuards(FirebaseAuthGuard, TenantGuard)
  async getGuestAttendance(
    @Param('id') id: string,
    @Param('guestId') guestId: string,
  ) {
    return this.eventsService.getGuestAttendance(id, guestId);
  }
}
