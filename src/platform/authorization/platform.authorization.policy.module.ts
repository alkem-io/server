import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from './platform.authorization.policy.service';

@Module({
  imports: [AuthorizationPolicyModule],
  providers: [PlatformAuthorizationPolicyService],
  exports: [PlatformAuthorizationPolicyService],
})
export class PlatformAuthorizationPolicyModule {}
