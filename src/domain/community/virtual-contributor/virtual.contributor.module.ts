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
import { VirtualStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/virtual.storage.aggregator.loader.creator';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { VirtualContributor } from './virtual.contributor.entity';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { AiPersonaModule } from '../ai-persona/ai.persona.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ProfileModule,
    NamingModule,
    StorageAggregatorModule,
    AiPersonaModule,
    AiServerAdapterModule,
    CommunicationAdapterModule,
    TypeOrmModule.forFeature([VirtualContributor]),
  ],
  providers: [
    VirtualContributorService,
    VirtualContributorAuthorizationService,
    VirtualContributorResolverMutations,
    VirtualContributorResolverQueries,
    VirtualContributorResolverFields,
    VirtualStorageAggregatorLoaderCreator,
  ],
  exports: [VirtualContributorService, VirtualContributorAuthorizationService],
})
export class VirtualContributorModule {}
