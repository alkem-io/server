import { Module } from '@nestjs/common';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorResolverMutations } from './virtual.contributor.resolver.mutations';
import { VirtualContributorResolverQueries } from './virtual.contributor.resolver.queries';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributorResolverFields } from './virtual.contributor.resolver.fields';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VirtualContributor } from './virtual.contributor.entity';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { AiPersonaModule } from '../ai-persona/ai.persona.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { ContributorModule } from '../contributor/contributor.module';
import { VirtualContributorResolverSubscriptions } from './virtual.contributor.resolver.subscriptions';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { KnowledgeBaseModule } from '@domain/common/knowledge-base/knowledge.base.module';
import { VirtualContributorLookupModule } from '../virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContributorModule,
    ProfileModule,
    NamingModule,
    AiPersonaModule,
    KnowledgeBaseModule,
    AiServerAdapterModule,
    CommunicationAdapterModule,
    VirtualContributorLookupModule,
    AccountLookupModule,
    TypeOrmModule.forFeature([VirtualContributor]),
    PlatformAuthorizationPolicyModule,
    SubscriptionServiceModule,
  ],
  providers: [
    VirtualContributorService,
    VirtualContributorAuthorizationService,
    VirtualContributorResolverMutations,
    VirtualContributorResolverQueries,
    VirtualContributorResolverFields,
    VirtualContributorResolverSubscriptions,
  ],
  exports: [VirtualContributorService, VirtualContributorAuthorizationService],
})
export class VirtualContributorModule {}
