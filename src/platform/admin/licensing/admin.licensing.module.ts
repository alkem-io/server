import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AdminLicensingResolverMutations } from './admin.licensing.resolver.mutations';
import { AdminLicensingService } from './admin.licensing.service';
import { LicensingModule } from '@platform/licensing/licensing.module';
import { LicenseIssuerModule } from '@platform/license-issuer/license.issuer.module';
import { SpaceModule } from '@domain/space/space/space.module';

@Module({
  imports: [
    SpaceModule,
    LicensingModule,
    LicenseIssuerModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
  ],
  providers: [AdminLicensingResolverMutations, AdminLicensingService],
  exports: [],
})
export class AdminLicensingModule {}
