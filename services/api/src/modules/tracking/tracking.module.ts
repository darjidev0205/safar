import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { EventsGateway } from '../websocket/events.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrackingController],
  providers: [TrackingService, EventsGateway],
  exports: [TrackingService, EventsGateway],
})
export class TrackingModule {}
