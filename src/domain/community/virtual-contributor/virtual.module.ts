import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { VirtualService } from './virtual.service';
import { VirtualResolverMutations } from './virtual.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualResolverFields } from './virtual.resolver.fields';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { VirtualResolverQueries } from './virtual.resolver.queries';
import { UserModule } from '@domain/community/user/user.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { VirtualAuthorizationService } from './virtual.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { VirtualStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/virtual.storage.aggregator.loader.creator';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { Virtual } from './virtual.entity';

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
    TypeOrmModule.forFeature([Virtual]),
  ],
  providers: [
    VirtualService,
    VirtualAuthorizationService,
    VirtualResolverQueries,
    VirtualResolverMutations,
    VirtualResolverFields,
    VirtualStorageAggregatorLoaderCreator,
  ],
  exports: [VirtualService, VirtualAuthorizationService],
})
export class VirtualModule {}
