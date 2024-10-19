import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationVerificationLifecycleOptionsProvider } from './organization.verification.lifecycle.options.provider';
import { OrganizationVerificationResolverMutations } from './organization.verification.resolver.mutations';
import { OrganizationVerification } from './organization.verification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationVerificationService } from './organization.verification.service';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { OrganizationVerificationAuthorizationService } from './organization.verification.service.authorization';
import { OrganizationVerificationLifecycleResolverFields } from './organization.verification.resolver.fields.lifecycle';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
    TypeOrmModule.forFeature([OrganizationVerification]),
  ],
  providers: [
    OrganizationVerificationService,
    OrganizationVerificationAuthorizationService,
    OrganizationVerificationResolverMutations,
    OrganizationVerificationLifecycleOptionsProvider,
    OrganizationVerificationLifecycleResolverFields,
  ],
  exports: [
    OrganizationVerificationService,
    OrganizationVerificationAuthorizationService,
  ],
})
export class OrganizationVerificationModule {}
