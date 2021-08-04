import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AuthorizationEngineService } from './authorization-engine.service';

@Module({
  imports: [AuthorizationPolicyModule],
  providers: [AuthorizationEngineService],
  exports: [AuthorizationEngineService],
})
export class AuthorizationEngineModule {}
