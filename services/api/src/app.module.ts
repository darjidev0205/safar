import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { TripsModule } from './modules/trips/trips.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventsModule,
    FleetModule,
    TripsModule,
    BookingsModule,
    TrackingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
