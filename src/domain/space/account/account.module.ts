import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InheritedCredentialRuleSetModule } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { Account } from '@domain/space/account/account.entity';
import { AccountResolverFields } from '@domain/space/account/account.resolver.fields';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { LicensingCredentialBasedModule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { LicensingWingbackSubscriptionModule } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.module';
import { PlatformTemplatesModule } from '@platform/platform-templates/platform.templates.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { TemporaryStorageModule } from '@services/infrastructure/temporary-storage/temporary.storage.module';
import { AccountHostModule } from '../account.host/account.host.module';
import { AccountLicensePlanModule } from '../account.license.plan/account.license.plan.module';
import { AccountLookupModule } from '../account.lookup/account.lookup.module';
import { SpaceModule } from '../space/space.module';
import { AccountResolverMutations } from './account.resolver.mutations';
import { AccountResolverQueries } from './account.resolver.queries';
import { AccountLicenseService } from './account.service.license';

@Module({
  imports: [
    AccountHostModule,
    AccountLookupModule,
    AgentModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    InheritedCredentialRuleSetModule,
    ContributorModule,
    StorageAggregatorModule,
    TemporaryStorageModule,
    PlatformAuthorizationPolicyModule,
    PlatformTemplatesModule,
    LicensingFrameworkModule,
    LicenseIssuerModule,
    LicensingCredentialBasedModule,
    LicensingWingbackSubscriptionModule,
    LicenseModule,
    SpaceModule,
    InnovationHubModule,
    InnovationPackModule,
    VirtualContributorModule,
    VirtualContributorLookupModule,
    NamingModule,
    TypeOrmModule.forFeature([Account]),
    NotificationAdapterModule,
    AccountLicensePlanModule,
  ],
  providers: [
    AccountService,
    AccountAuthorizationService,
    AccountResolverFields,
    AccountResolverMutations,
    AccountResolverQueries,
    AccountLicenseService,
  ],
  exports: [AccountService, AccountAuthorizationService, AccountLicenseService],
})
export class AccountModule {}
