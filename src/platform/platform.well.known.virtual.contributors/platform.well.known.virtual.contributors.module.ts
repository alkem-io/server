import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { Platform } from '@platform/platform/platform.entity';
import { PlatformConfigurationAuditModule } from '@src/platform-admin/platform-configuration-audit/platform.configuration.audit.module';
import { PlatformWellKnownVirtualContributorsResolverMutations } from './platform.well.known.virtual.contributors.resolver.mutations';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Platform]),
    AuthorizationModule,
    // sec-server-23: the resolver builds a resolver-local pinned policy via
    // `AuthorizationPolicyService.createCredentialRuleUsingTypesOnly`, so the
    // module that exports it has to be imported here. Unit specs provide the
    // service themselves, so only a real boot catches its absence.
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    PlatformConfigurationAuditModule,
  ],
  providers: [
    PlatformWellKnownVirtualContributorsService,
    PlatformWellKnownVirtualContributorsResolverMutations,
  ],
  exports: [PlatformWellKnownVirtualContributorsService],
})
export class PlatformWellKnownVirtualContributorsModule {}
