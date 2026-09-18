import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformConfigurationAuditModule } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.module';
import { LicensePlan } from './license.plan.entity';
import { LicensePlanResolverFields } from './license.plan.resolver.fields';
import { LicensePlanResolverMutations } from './license.plan.resolver.mutations';
import { LicensePlanService } from './license.plan.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformConfigurationAuditModule,
    TypeOrmModule.forFeature([LicensePlan]),
  ],
  providers: [
    LicensePlanService,
    LicensePlanResolverFields,
    LicensePlanResolverMutations,
  ],
  exports: [LicensePlanService],
})
export class LicensePlanModule {}
