import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseEntitlementUsageModule } from '@services/infrastructure/license-entitlement-usage/license.entitlement.usage.module';
import { LicenseEntitlement } from './license.entitlement.entity';
import { LicenseEntitlementResolverFields } from './license.entitlement.resolver.fields';
import { LicenseEntitlementService } from './license.entitlement.service';

@Module({
  imports: [
    LicenseEntitlementUsageModule,
    TypeOrmModule.forFeature([LicenseEntitlement]),
  ],
  providers: [LicenseEntitlementService, LicenseEntitlementResolverFields],
  exports: [LicenseEntitlementService],
})
export class LicenseEntitlementModule {}
