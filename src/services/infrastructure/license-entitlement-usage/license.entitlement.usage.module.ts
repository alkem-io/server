import { Module } from '@nestjs/common';
import { LicenseEntitlementUsageService } from './license.entitlement.usage.service';

@Module({
  imports: [],
  providers: [LicenseEntitlementUsageService],
  exports: [LicenseEntitlementUsageService],
})
export class LicenseEntitlementUsageModule {}
