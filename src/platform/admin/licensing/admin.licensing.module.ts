import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AdminLicensingResolverMutations } from './admin.licensing.resolver.mutations';
import { AdminLicensingService } from './admin.licensing.service';
import { AccountModule } from '@domain/space/account/account.module';
import { LicensingModule } from '@platform/licensing/licensing.module';
import { LicenseIssuerModule } from '@platform/license-issuer/license.issuer.module';

@Module({
  imports: [
    AccountModule,
    LicensingModule,
    LicenseIssuerModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
  ],
  providers: [AdminLicensingResolverMutations, AdminLicensingService],
  exports: [],
})
export class AdminLicensingModule {}
