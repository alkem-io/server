import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { OrganizationService } from './organization.service';
import { OrganizationResolverMutations } from './organization.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@domain/community/organization';
import { OrganizationResolverFields } from './organization.resolver.fields';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { OrganizationResolverQueries } from './organization.resolver.queries';
import { UserModule } from '@domain/community/user/user.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { OrganizationAuthorizationService } from './organization.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationVerificationModule } from '../organization-verification/organization.verification.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { OrganizationStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/organization.storage.aggregator.loader.creator';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { ContributorModule } from '../contributor/contributor.module';
import { OrganizationRoleModule } from '../organization-role/organization.role.module';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContributorModule,
    OrganizationVerificationModule,
    OrganizationRoleModule,
    UserModule,
    UserGroupModule,
    EntityResolverModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    ProfileModule,
    PreferenceModule,
    PreferenceSetModule,
    AvatarCreatorModule,
    StorageAggregatorModule,
    TypeOrmModule.forFeature([Organization]),
  ],
  providers: [
    OrganizationService,
    OrganizationAuthorizationService,
    OrganizationResolverQueries,
    OrganizationResolverMutations,
    OrganizationResolverFields,
    OrganizationStorageAggregatorLoaderCreator,
  ],
  exports: [OrganizationService, OrganizationAuthorizationService],
})
export class OrganizationModule {}
