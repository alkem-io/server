import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseEntitlement } from './license.entitlement.entity';
import { LicenseEntitlementService } from './license.entitlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([LicenseEntitlement])],
  providers: [LicenseEntitlementService],
  exports: [LicenseEntitlementService],
})
export class LicenseEntitlementModule {}
