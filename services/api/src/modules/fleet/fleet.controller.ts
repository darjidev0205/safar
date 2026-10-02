import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateVehicleSchema, InviteDriverSchema, UpdateDutyStatusSchema } from '@safar/validation';

@Controller('api/v1')
@UseGuards(FirebaseAuthGuard)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('vehicles')
  async getVehicles(@CurrentUser() user: any) {
    const accountId = user.accounts?.[0]?.id || user.accountMembers?.[0]?.accountId;
    if (!accountId) return [];
    return this.fleetService.getVehicles(accountId);
  }

  @Post('vehicles')
  async createVehicle(@CurrentUser() user: any, @Body() body: any) {
    CreateVehicleSchema.parse(body);
    const accountId = user.accounts?.[0]?.id || user.accountMembers?.[0]?.accountId;
    if (!accountId) throw new BadRequestException('User does not belong to an active account');
    return this.fleetService.createVehicle(accountId, body);
  }

  @Get('drivers')
  async getDrivers(@CurrentUser() user: any) {
    const accountId = user.accounts?.[0]?.id || user.accountMembers?.[0]?.accountId;
    if (!accountId) return [];
    return this.fleetService.getDrivers(accountId);
  }

  @Post('drivers/invite')
  async inviteDriver(@CurrentUser() user: any, @Body() body: any) {
    InviteDriverSchema.parse(body);
    const accountId = user.accounts?.[0]?.id || user.accountMembers?.[0]?.accountId;
    if (!accountId) throw new BadRequestException('User does not belong to an active account');
    return this.fleetService.inviteDriver(accountId, body);
  }

  @Patch('drivers/:id/duty')
  async updateDutyStatus(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    UpdateDutyStatusSchema.parse({ dutyStatus: body.dutyStatus });
    return this.fleetService.updateDutyStatus(id, body.dutyStatus, body.vehicleId);
  }
}
