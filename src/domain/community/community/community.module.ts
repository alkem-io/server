import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { CommunityPolicyModule } from '../community-policy/community.policy.module';
import { Community } from './community.entity';
import { CommunityResolverFields } from './community.resolver.fields';
import { CommunityResolverMutations } from './community.resolver.mutations';
import { CommunityService } from './community.service';
import { CommunityAuthorizationService } from './community.service.authorization';
import { FormModule } from '@domain/common/form/form.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CommunityGuidelinesModule } from '../community-guidelines/community.guidelines.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';

@Module({
  imports: [
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    UserGroupModule,
    CommunicationModule,
    CommunityPolicyModule,
    CommunityGuidelinesModule,
    LicenseEngineModule,
    AgentModule,
    EntityResolverModule,
    StorageAggregatorResolverModule,
    FormModule,
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
