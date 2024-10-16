import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseEntitlement } from './license.entitlement.entity';
import { LicenseEntitlementService } from './license.entitlement.service';
import { LicenseEntitlementUsageModule } from '@services/infrastructure/license-entitlement-usage/license.entitlement.usage.module';
import { LicenseEntitlementResolverFields } from './license.entitlement.resolver.fields';

@Module({
  imports: [
    LicenseEntitlementUsageModule,
    TypeOrmModule.forFeature([LicenseEntitlement]),
  ],
  providers: [LicenseEntitlementService, LicenseEntitlementResolverFields],
  exports: [LicenseEntitlementService],
})
export class LicenseEntitlementModule {}
