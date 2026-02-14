import { Module } from '@nestjs/common';
import { LicenseEntitlementUsageModule } from '@services/infrastructure/license-entitlement-usage/license.entitlement.usage.module';
import { LicenseEntitlementResolverFields } from './license.entitlement.resolver.fields';
import { LicenseEntitlementService } from './license.entitlement.service';

@Module({
  imports: [
    LicenseEntitlementUsageModule,
  ],
  providers: [LicenseEntitlementService, LicenseEntitlementResolverFields],
  exports: [LicenseEntitlementService],
})
export class LicenseEntitlementModule {}
