import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensePlan } from './license.plan.entity';
import { LicensePlanResolverFields } from './license.plan.resolver.fields';
import { LicensePlanResolverMutations } from './license.plan.resolver.mutations';
import { LicensePlanService } from './license.plan.service';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([LicensePlan])],
  providers: [
    LicensePlanService,
    LicensePlanResolverFields,
    LicensePlanResolverMutations,
  ],
  exports: [LicensePlanService],
})
export class LicensePlanModule {}
