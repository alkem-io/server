import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LicenseEntitlementModule } from '@domain/common/license-entitlement/license.entitlement.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Organization } from '@domain/community/organization';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { OrganizationLookupModule } from '../organization-lookup/organization.lookup.module';
import { OrganizationSettingsModule } from '../organization-settings/organization.settings.module';
import { OrganizationVerificationModule } from '../organization-verification/organization.verification.module';
import { OrganizationResolverFields } from './organization.resolver.fields';
import { OrganizationResolverMutations } from './organization.resolver.mutations';
import { OrganizationResolverQueries } from './organization.resolver.queries';
import { OrganizationService } from './organization.service';
import { OrganizationAuthorizationService } from './organization.service.authorization';
import { OrganizationLicenseService } from './organization.service.license';
@Module({
  imports: [
    AccountHostModule,
    AccountLookupModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoleSetModule,
    LicenseEntitlementModule,
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
