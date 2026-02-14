import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { LicensePlanResolverFields } from './license.plan.resolver.fields';
import { LicensePlanResolverMutations } from './license.plan.resolver.mutations';
import { LicensePlanService } from './license.plan.service';

@Module({
  imports: [AuthorizationModule],
  providers: [
    LicensePlanService,
    LicensePlanResolverFields,
    LicensePlanResolverMutations,
  ],
  exports: [LicensePlanService],
})
export class LicensePlanModule {}
