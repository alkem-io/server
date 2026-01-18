import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { GuidanceReporterModule } from '@services/external/elasticsearch/guidance-reporter/guidance.reporter.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { ConversationMembershipModule } from '../conversation-membership/conversation.membership.module';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';
import { Conversation } from './conversation.entity';
import { ConversationResolverFields } from './conversation.resolver.fields';
import { ConversationResolverMutations } from './conversation.resolver.mutations';
import { ConversationEventResolverSubscription } from './conversation.resolver.subscription';
import { ConversationService } from './conversation.service';
import { ConversationAuthorizationService } from './conversation.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    RoomLookupModule,
    UserLookupModule,
    VirtualContributorLookupModule,
    AiServerAdapterModule,
    GuidanceReporterModule,
    PlatformWellKnownVirtualContributorsModule,
    ConversationMembershipModule,
    SubscriptionServiceModule,
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
