import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { PlatformWellKnownVirtualContributorsResolverMutations } from './platform.well.known.virtual.contributors.resolver.mutations';
import { PlatformWellKnownVirtualContributorsService } from './platform.well.known.virtual.contributors.service';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [
    PlatformWellKnownVirtualContributorsService,
    PlatformWellKnownVirtualContributorsResolverMutations,
  ],
  exports: [PlatformWellKnownVirtualContributorsService],
})
export class PlatformWellKnownVirtualContributorsModule {}
