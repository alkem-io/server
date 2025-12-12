import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationModule } from '../conversation/conversation.module';
import { Messaging } from './messaging.entity';
import { ConversationMembershipModule } from '../conversation-membership/conversation.membership.module';
import { MessagingAuthorizationService } from './messaging.service.authorization';
import { MessagingResolverMutations } from './messaging.resolver.mutations';
import { MessagingService } from './messaging.service';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AgentModule } from '@domain/agent/agent/agent.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    ConversationModule,
    UserLookupModule,
    VirtualContributorLookupModule,
    AgentModule,
    PlatformWellKnownVirtualContributorsModule,
    ConversationMembershipModule,
    TypeOrmModule.forFeature([Messaging]),
  ],
  providers: [
    MessagingService,
    MessagingAuthorizationService,
    MessagingResolverMutations,
  ],
  exports: [
    MessagingService,
    MessagingAuthorizationService,
    MessagingResolverMutations,
  ],
})
export class MessagingModule {}
