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
import { AiPersonaModule } from '@services/ai-server/ai-persona/ai.persona.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { ContributorModule } from '../contributor/contributor.module';
import { VirtualContributorResolverSubscriptions } from './virtual.contributor.resolver.subscriptions';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { KnowledgeBaseModule } from '@domain/common/knowledge-base/knowledge.base.module';
import { VirtualContributorLookupModule } from '../virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { VirtualContributorDefaultsModule } from '../virtual-contributor-defaults/virtual.contributor.defaults.module';
import { VirtualContributorSettingsModule } from '../virtual-contributor-settings/virtual.contributor.settings.module';
import { VirtualContributorModelCardModule } from '../virtual-contributor-model-card/virtual.contributor.model.card.module';
import { VirtualContributorPlatformSettingsModule } from '../virtual-contributor-platform-settings';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContributorModule,
    ProfileModule,
    AiPersonaModule,
    KnowledgeBaseModule,
    AiServerAdapterModule,
    CommunicationAdapterModule,
    VirtualContributorLookupModule,
    VirtualContributorSettingsModule,
    VirtualContributorPlatformSettingsModule,
    VirtualContributorDefaultsModule,
    AccountLookupModule,
    PlatformWellKnownVirtualContributorsModule,
    TypeOrmModule.forFeature([VirtualContributor]),
    PlatformAuthorizationPolicyModule,
    SubscriptionServiceModule,
    VirtualContributorModelCardModule,
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
