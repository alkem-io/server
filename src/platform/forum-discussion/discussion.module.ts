import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { RoomModule } from '../../domain/communication/room/room.module';
import { DiscussionResolverFields } from './discussion.resolver.fields';
import { DiscussionResolverMutations } from './discussion.resolver.mutations';
import { DiscussionService } from './discussion.service';
import { DiscussionAuthorizationService } from './discussion.service.authorization';

@Module({
  imports: [
    RoomModule,
    CommunicationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
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
