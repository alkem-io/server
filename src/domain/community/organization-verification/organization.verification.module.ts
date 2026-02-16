import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { Module } from '@nestjs/common';
import { OrganizationVerificationLifecycleResolverFields } from './organization.verification.resolver.fields.lifecycle';
import { OrganizationVerificationResolverMutations } from './organization.verification.resolver.mutations';
import { OrganizationVerificationService } from './organization.verification.service';
import { OrganizationVerificationAuthorizationService } from './organization.verification.service.authorization';
import { OrganizationVerificationLifecycleService } from './organization.verification.service.lifecycle';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
  ],
  providers: [
    OrganizationVerificationService,
    OrganizationVerificationAuthorizationService,
    OrganizationVerificationResolverMutations,
    OrganizationVerificationLifecycleResolverFields,
    OrganizationVerificationLifecycleService,
  ],
  exports: [
    OrganizationVerificationService,
    OrganizationVerificationAuthorizationService,
  ],
})
export class OrganizationVerificationModule {}
