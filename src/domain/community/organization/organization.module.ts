import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { OrganizationService } from './organization.service';
import { OrganizationResolverMutations } from './organization.resolver.mutations';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@domain/community/organization';
import { OrganizationResolverFields } from './organization.resolver.fields';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { OrganizationResolverQueries } from './organization.resolver.queries';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { OrganizationAuthorizationService } from './organization.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationVerificationModule } from '../organization-verification/organization.verification.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { ContributorModule } from '../contributor/contributor.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';
import { OrganizationSettingsModule } from '../organization-settings/organization.settings.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { OrganizationLicenseService } from './organization.service.license';
import { OrganizationLookupModule } from '../organization-lookup/organization.lookup.module';
import { LicenseEntitlementModule } from '@domain/common/license-entitlement/license.entitlement.module';
@Module({
  imports: [
    AccountHostModule,
    AccountLookupModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoleSetModule,
    LicenseEntitlementModule,
    ContributorModule,
    OrganizationVerificationModule,
    OrganizationLookupModule,
    OrganizationSettingsModule,
    UserGroupModule,
    EntityResolverModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    ProfileModule,
    AvatarCreatorModule,
    StorageAggregatorModule,
    TypeOrmModule.forFeature([Organization]),
  ],
  providers: [
    OrganizationService,
    OrganizationAuthorizationService,
    OrganizationResolverQueries,
    OrganizationResolverMutations,
    OrganizationLicenseService,
    OrganizationResolverFields,
  ],
  exports: [
    OrganizationService,
    OrganizationAuthorizationService,
    OrganizationLicenseService,
  ],
})
export class OrganizationModule {}
