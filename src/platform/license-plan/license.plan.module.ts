import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensePlan } from './license.plan.entity';
import { LicensePlanService } from './license.plan.service';
import { LicensePlanResolverFields } from './license.plan.resolver.fields';
import { LicensePlanResolverMutations } from './license.plan.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';

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
