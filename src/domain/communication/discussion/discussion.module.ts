import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { RoomModule } from '../room/room.module';
import { Discussion } from './discussion.entity';
import { DiscussionResolverFields } from './discussion.resolver.fields';
import { DiscussionResolverMutations } from './discussion.resolver.mutations';
import { DiscussionService } from './discussion.service';
import { DiscussionAuthorizationService } from './discussion.service.authorization';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Discussion]),
    RoomModule,
    CommunicationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    NamingModule,
    NotificationAdapterModule,
  ],
  providers: [
    DiscussionService,
    DiscussionAuthorizationService,
    DiscussionResolverMutations,
    DiscussionResolverFields,
  ],
  exports: [
    DiscussionService,
    DiscussionAuthorizationService,
    DiscussionResolverMutations,
    DiscussionResolverFields,
  ],
})
export class DiscussionModule {}
