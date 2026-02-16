import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { AuthorizationPolicyResolverFields } from './authorization.policy.resolver.fields';

import { AuthorizationPolicyService } from './authorization.policy.service';

@Module({
  imports: [AuthorizationModule],
  providers: [AuthorizationPolicyService, AuthorizationPolicyResolverFields],
  exports: [AuthorizationPolicyService],
})
export class AuthorizationPolicyModule {}
