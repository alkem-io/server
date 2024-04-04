import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorResolverMutations } from './virtual.contributor.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualResolverFields } from './virtual.contributor.resolver.fields';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { VirtualContributorResolverQueries } from './virtual.contributor.resolver.queries';
import { UserModule } from '@domain/community/user/user.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { VirtualStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/virtual.storage.aggregator.loader.creator';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { VirtualContributor } from './virtual.contributor.entity';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    UserModule,
    UserGroupModule,
    EntityResolverModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    ProfileModule,
    PreferenceModule,
    PreferenceSetModule,
    StorageAggregatorModule,
    TypeOrmModule.forFeature([VirtualContributor]),
  ],
  providers: [
    VirtualContributorService,
    VirtualContributorAuthorizationService,
    VirtualContributorResolverQueries,
    VirtualContributorResolverMutations,
    VirtualResolverFields,
    VirtualStorageAggregatorLoaderCreator,
  ],
  exports: [VirtualContributorService, VirtualContributorAuthorizationService],
})
export class VirtualContributorModule {}
