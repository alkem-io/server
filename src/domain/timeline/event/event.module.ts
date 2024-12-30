import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { CalendarEvent } from './event.entity';
import { CalendarEventResolverMutations } from './event.resolver.mutations';
import { CalendarEventService } from './event.service';
import { CalendarEventResolverFields } from './event.resolver.fields';
import { CalendarEventAuthorizationService } from './event.service.authorization';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    VisualModule,
    UserLookupModule,
    ProfileModule,
    TypeOrmModule.forFeature([CalendarEvent]),
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
