import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { RoleSet } from './role.set.entity';
import { RoleSetResolverFields } from './role.set.resolver.fields';
import { RoleSetResolverMutations } from './role.set.resolver.mutations';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { FormModule } from '@domain/common/form/form.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { RoleModule } from '../role/role.module';

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
    RoleModule,
    InvitationModule,
    ApplicationModule,
    PlatformInvitationModule,
    VirtualContributorModule,
    TypeOrmModule.forFeature([RoleSet]),
    TrustRegistryAdapterModule,
  ],
  providers: [
    RoleSetService,
    RoleSetAuthorizationService,
    RoleSetResolverMutations,
    RoleSetResolverFields,
  ],
  exports: [RoleSetService, RoleSetAuthorizationService],
})
export class RoleSetModule {}
