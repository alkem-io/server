import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { LicenseEntitlementModule } from '../license-entitlement/license.entitlement.module';
import { LicenseResolverFields } from './license.resolver.fields';
import { LicenseService } from './license.service';
import { LicenseAuthorizationService } from './license.service.authorization';

@Module({
  imports: [
    LicenseEntitlementModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
  ],
  providers: [
    LicenseService,
    LicenseResolverFields,
    LicenseAuthorizationService,
  ],
  exports: [LicenseService, LicenseAuthorizationService],
})
export class LicenseModule {}
