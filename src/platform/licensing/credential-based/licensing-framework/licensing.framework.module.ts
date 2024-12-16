import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensingFramework } from './licensing.framework.entity';
import { LicensingFrameworkResolverFields } from './licensing.framework.resolver.fields';
import { LicensingFrameworkResolverMutations } from './licensing.framework.resolver.mutations';
import { LicensingFrameworkService } from './licensing.framework.service';
import { LicensingFrameworkAuthorizationService } from './licensing.framework.service.authorization';
import { LicensePlanModule } from '@platform/licensing/credential-based/license-plan/license.plan.module';
import { LicensePolicyModule } from '@platform/licensing/credential-based/license-policy/license.policy.module';

@Module({
  imports: [
    LicensePlanModule,
    LicensePolicyModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    TypeOrmModule.forFeature([LicensingFramework]),
  ],
  providers: [
    LicensingFrameworkResolverMutations,
    LicensingFrameworkResolverFields,
    LicensingFrameworkService,
    LicensingFrameworkAuthorizationService,
  ],
  exports: [LicensingFrameworkService, LicensingFrameworkAuthorizationService],
})
export class LicensingFrameworkModule {}
