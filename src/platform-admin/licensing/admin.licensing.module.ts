import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LicenseModule } from '@domain/common/license/license.module';
import { AccountModule } from '@domain/space/account/account.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { Module } from '@nestjs/common';
import { LicenseIssuerModule } from '@platform/licensing/credential-based/license-credential-issuer/license.issuer.module';
import { LicensingFrameworkModule } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.module';
import { AdminLicensingResolverMutations } from './admin.licensing.resolver.mutations';
import { AdminLicensingService } from './admin.licensing.service';

@Module({
  imports: [
    AccountModule,
    AccountLookupModule,
    SpaceModule,
    LicensingFrameworkModule,
    LicenseModule,
    LicenseIssuerModule,
    AuthorizationModule,
  ],
  providers: [AdminLicensingResolverMutations, AdminLicensingService],
  exports: [],
})
export class AdminLicensingModule {}
