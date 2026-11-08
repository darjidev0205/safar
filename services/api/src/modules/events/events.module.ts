import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
  providers: [EventsService, TenantGuard],
  exports: [EventsService],
})
export class EventsModule {}
