import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1')
@UseGuards(FirebaseAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    const profile = await this.authService.getMe(user.id);
    return profile || user;
  }

  @Post('auth/sync')
  async syncProfile(@CurrentUser() user: any, @Body() body: { fullName: string; role?: any }) {
    return this.authService.syncProfile(user.id, body);
  }
}
