import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { TripsModule } from './modules/trips/trips.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    PrismaModule,
    WebsocketModule,
    NotificationsModule,
    AuthModule,
    EventsModule,
    FleetModule,
    TripsModule,
    BookingsModule,
    TrackingModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
