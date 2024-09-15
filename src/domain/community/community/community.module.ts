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
import { CommunityGuidelinesModule } from '../community-guidelines/community.guidelines.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { VirtualContributorModule } from '../virtual-contributor/virtual.contributor.module';
import { RoleManagerModule } from '@domain/access/role-manager/role.manager.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    EntityResolverModule,
    UserGroupModule,
    RoleManagerModule,
    CommunicationModule,
    CommunityGuidelinesModule,
    LicenseEngineModule,
    AgentModule,
    StorageAggregatorResolverModule,
    VirtualContributorModule,
    TypeOrmModule.forFeature([Community]),
    TrustRegistryAdapterModule,
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
