import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { Community } from './community.entity';
import { CommunityResolverFields } from './community.resolver.fields';
import { CommunityResolverMutations } from './community.resolver.mutations';
import { CommunityService } from './community.service';
import { CommunityAuthorizationService } from './community.service.authorization';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { VirtualContributorModule } from '../virtual-contributor/virtual.contributor.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { PlatformRolesAccessModule } from '@domain/access/platform-roles-access/platform.roles.access.module';
import { UserLookupModule } from '../user-lookup/user.lookup.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    EntityResolverModule,
    UserGroupModule,
    RoleSetModule,
    CommunicationModule,
    StorageAggregatorResolverModule,
    PlatformRolesAccessModule,
    VirtualContributorModule,
    TypeOrmModule.forFeature([Community]),
    TrustRegistryAdapterModule,
    UserLookupModule,
  ],
  providers: [
    CommunityService,
    CommunityAuthorizationService,
    CommunityResolverMutations,
    CommunityResolverFields,
  ],
  exports: [CommunityService, CommunityAuthorizationService],
})
export class CommunityModule {}
