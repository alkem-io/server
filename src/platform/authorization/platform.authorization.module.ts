import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationResolverQueries } from './platform.authorization.resolver.queries';
import { PlatformAuthorizationService } from './platform.authorization.service';

@Module({
  imports: [AuthorizationPolicyModule],
  providers: [
    PlatformAuthorizationService,
    PlatformAuthorizationResolverQueries,
  ],
  exports: [PlatformAuthorizationService, PlatformAuthorizationResolverQueries],
})
export class PlatformAuthorizationModule {}
