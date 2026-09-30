import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorModule as ActorCoreModule } from '@domain/actor/actor/actor.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualActorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { ConversationMembershipModule } from '../conversation-membership/conversation.membership.module';
import { Conversation } from './conversation.entity';
import { ConversationResolverFields } from './conversation.resolver.fields';
import { ConversationResolverMutations } from './conversation.resolver.mutations';
import { ConversationEventResolverSubscription } from './conversation.resolver.subscription';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';

@Module({
  imports: [
    ActorCoreModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    CommunicationAdapterModule,
    RoomModule,
    UserLookupModule,
    VirtualActorLookupModule,
    PlatformWellKnownVirtualContributorsModule,
    ConversationMembershipModule,
    SubscriptionServiceModule,
    StorageAggregatorModule,
    StorageBucketModule,
    StorageAggregatorResolverModule,
    TypeOrmModule.forFeature([Conversation]),
  ],
  providers: [
    ConversationService,
    ConversationAuthorizationService,
    ConversationResolverFields,
    ConversationResolverMutations,
    ConversationEventResolverSubscription,
  ],
  exports: [ConversationService, ConversationAuthorizationService],
})
export class ConversationModule {}
