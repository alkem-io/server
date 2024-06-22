import { Module } from '@nestjs/common';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorResolverMutations } from './virtual.contributor.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributorResolverFields } from './virtual.contributor.resolver.fields';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { VirtualContributorResolverQueries } from './virtual.contributor.resolver.queries';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VirtualStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/virtual.storage.aggregator.loader.creator';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { VirtualContributor } from './virtual.contributor.entity';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { VirtualPersonaModule } from '@platform/virtual-persona/virtual.persona.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ProfileModule,
    NamingModule,
    StorageAggregatorModule,
    VirtualPersonaModule,
    CommunicationAdapterModule,
    TypeOrmModule.forFeature([VirtualContributor]),
  ],
  providers: [
    VirtualContributorService,
    VirtualContributorAuthorizationService,
    VirtualContributorResolverQueries,
    VirtualContributorResolverMutations,
    VirtualContributorResolverFields,
    VirtualStorageAggregatorLoaderCreator,
  ],
  exports: [VirtualContributorService, VirtualContributorAuthorizationService],
})
export class VirtualContributorModule {}
