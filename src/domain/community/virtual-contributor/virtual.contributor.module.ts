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
import { AccountHostModule } from '@domain/space/account.host/account.host.module';
import { ContributorModule } from '../contributor/contributor.module';
import { VirtualContributorResolverSubscriptions } from './virtual.contributor.resolver.subscriptions';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { VcInteractionModule } from '@domain/communication/vc-interaction/vc.interaction.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContributorModule,
    ProfileModule,
    NamingModule,
    AiPersonaModule,
    AiServerAdapterModule,
    CommunicationAdapterModule,
    AccountHostModule,
    TypeOrmModule.forFeature([VirtualContributor]),
    PlatformAuthorizationPolicyModule,
    SubscriptionServiceModule,
    VcInteractionModule,
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
