import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { LicensePolicyResolverMutations } from './license.policy.resolver.mutations';
import { LicensePolicyService } from './license.policy.service';
import { LicensePolicyAuthorizationService } from './license.policy.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
  ],
  providers: [
    LicensePolicyService,
    LicensePolicyResolverMutations,
    LicensePolicyAuthorizationService,
  ],
  exports: [
    LicensePolicyService,
    LicensePolicyResolverMutations,
    LicensePolicyAuthorizationService,
  ],
})
export class LicensePolicyModule {}
