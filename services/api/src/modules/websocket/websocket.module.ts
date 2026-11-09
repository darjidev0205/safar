import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class WebsocketModule {}
