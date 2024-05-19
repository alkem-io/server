import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenseManager } from './license.manager.entity';
import { LicenseManagerResolverFields } from './license.manager.resolver.fields';
import { LicenseManagerResolverMutations } from './license.manager.resolver.mutations';
import { LicenseManagerService } from './license.manager.service';
import { LicenseManagerAuthorizationService } from './license.manager.service.authorization';
import { LicensePlanModule } from '@platform/license-plan/license.plan.module';
import { LicensePolicyModule } from '@platform/license-policy/license.policy.module';

@Module({
  imports: [
    LicensePlanModule,
    LicensePolicyModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([LicenseManager]),
  ],
  providers: [
    LicenseManagerResolverMutations,
    LicenseManagerResolverFields,
    LicenseManagerService,
    LicenseManagerAuthorizationService,
  ],
  exports: [LicenseManagerService, LicenseManagerAuthorizationService],
})
export class LicenseManagerModule {}
