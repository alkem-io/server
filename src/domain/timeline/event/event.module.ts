import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Space } from '@domain/space/space/space.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent } from './event.entity';
import { CalendarEventResolverFields } from './event.resolver.fields';
import { CalendarEventResolverMutations } from './event.resolver.mutations';
import { CalendarEventService } from './event.service';
import { CalendarEventAuthorizationService } from './event.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    VisualModule,
    UserLookupModule,
    ProfileModule,
    TypeOrmModule.forFeature([CalendarEvent, Space]),
  ],
  providers: [
    CalendarEventResolverMutations,
    CalendarEventService,
    CalendarEventAuthorizationService,
    CalendarEventResolverFields,
  ],
  exports: [CalendarEventService, CalendarEventAuthorizationService],
})
export class CalendarEventModule {}
