import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { KnowledgeBaseModule } from '@domain/common/knowledge-base/knowledge.base.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { PlatformWellKnownVirtualContributorsModule } from '@platform/platform.well.known.virtual.contributors';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { AiPersonaModule } from '@services/ai-server/ai-persona/ai.persona.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { ContributorModule } from '../contributor/contributor.module';
import { VirtualContributorDefaultsModule } from '../virtual-contributor-defaults/virtual.contributor.defaults.module';
import { VirtualContributorLookupModule } from '../virtual-contributor-lookup/virtual.contributor.lookup.module';
import { VirtualContributorModelCardModule } from '../virtual-contributor-model-card/virtual.contributor.model.card.module';
import { VirtualContributorPlatformSettingsModule } from '../virtual-contributor-platform-settings';
import { VirtualContributorSettingsModule } from '../virtual-contributor-settings/virtual.contributor.settings.module';
import { VirtualContributorResolverFields } from './virtual.contributor.resolver.fields';
import { VirtualContributorResolverMutations } from './virtual.contributor.resolver.mutations';
import { VirtualContributorResolverQueries } from './virtual.contributor.resolver.queries';
import { VirtualContributorResolverSubscriptions } from './virtual.contributor.resolver.subscriptions';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';

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
