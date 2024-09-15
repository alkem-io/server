import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { RoleManager } from './role.manager.entity';
import { RoleManagerResolverFields } from './role.manager.resolver.fields';
import { RoleManagerResolverMutations } from './role.manager.resolver.mutations';
import { RoleManagerService } from './role.manager.service';
import { RoleManagerAuthorizationService } from './role.manager.service.authorization';
import { FormModule } from '@domain/common/form/form.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    CommunicationModule,
    LicenseEngineModule,
    AgentModule,
    StorageAggregatorResolverModule,
    FormModule,
    InvitationModule,
    ApplicationModule,
    PlatformInvitationModule,
    VirtualContributorModule,
    TypeOrmModule.forFeature([RoleManager]),
    TrustRegistryAdapterModule,
  ],
  providers: [
    RoleManagerService,
    RoleManagerAuthorizationService,
    RoleManagerResolverMutations,
    RoleManagerResolverFields,
  ],
  exports: [RoleManagerService, RoleManagerAuthorizationService],
})
export class RoleManagerModule {}
