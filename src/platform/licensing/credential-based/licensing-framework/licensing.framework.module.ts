import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InheritedCredentialRuleSetModule } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensePlanModule } from '@platform/licensing/credential-based/license-plan/license.plan.module';
import { LicensePolicyModule } from '@platform/licensing/credential-based/license-policy/license.policy.module';
import { LicensingFramework } from './licensing.framework.entity';
import { LicensingFrameworkResolverFields } from './licensing.framework.resolver.fields';
import { LicensingFrameworkResolverMutations } from './licensing.framework.resolver.mutations';
import { LicensingFrameworkService } from './licensing.framework.service';
import { LicensingFrameworkAuthorizationService } from './licensing.framework.service.authorization';

@Module({
  imports: [
    LicensePlanModule,
    LicensePolicyModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    InheritedCredentialRuleSetModule,
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
