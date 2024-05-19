import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensePlan } from './license.plan.entity';
import { LicensePlanService } from './license.plan.service';
import { LicensePlanResolverFields } from './license.plan.resolver.fields';

@Module({
  imports: [TypeOrmModule.forFeature([LicensePlan])],
  providers: [LicensePlanService, LicensePlanResolverFields],
  exports: [LicensePlanService],
})
export class LicensePlanModule {}
