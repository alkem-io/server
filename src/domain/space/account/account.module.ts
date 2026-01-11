import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '@domain/space/account/account.entity';
import { AccountService } from '@domain/space/account/account.service';
import { AccountResolverFields } from '@domain/space/account/account.resolver.fields';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AccountResolverMutations } from './account.resolver.mutations';
import { SpaceModule } from '../space/space.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AccountResolverQueries } from './account.resolver.queries';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { AccountHostModule } from '../account.host/account.host.module';
import { LicensingCredentialBasedModule } from '@platform/licensing/credential-based/licensing-credential-based-entitlements-engine/licensing.credential.based.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { TemporaryStorageModule } from '@services/infrastructure/temporary-storage/temporary.storage.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { AccountLicenseService } from './account.service.license';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { LicensingWingbackSubscriptionModule } from '@platform/licensing/wingback-subscription/licensing.wingback.subscription.module';
import { AccountLookupModule } from '../account.lookup/account.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { PlatformTemplatesModule } from '@platform/platform-templates/platform.templates.module';
import { AccountLicensePlanModule } from '@domain/space/account.license.plan';

@Module({
  imports: [
    AccountHostModule,
    AccountLookupModule,
    ActorModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
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
