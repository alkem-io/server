import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { CommentsModule } from '@domain/communication/comments/comments.module';
import { CalendarEvent } from './event.entity';
import { CalendarEventResolverMutations } from './event.resolver.mutations';
import { CalendarEventService } from './event.service';
import { CalendarEventResolverFields } from './event.resolver.fields';
import { CalendarEventAuthorizationService } from './event.service.authorization';
import { CalendarEventResolverSubscriptions } from './event.resolver.subscriptions';
import { UserModule } from '@domain/community/user/user.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CommentsModule,
    VisualModule,
    UserModule,
    ProfileModule,
    CommunityPolicyModule,
    TypeOrmModule.forFeature([CalendarEvent]),
  ],
  providers: [
    CalendarEventResolverMutations,
    CalendarEventService,
    CalendarEventAuthorizationService,
    CalendarEventResolverFields,
    CalendarEventResolverSubscriptions,
  ],
  exports: [CalendarEventService, CalendarEventAuthorizationService],
})
export class CalendarEventModule {}
