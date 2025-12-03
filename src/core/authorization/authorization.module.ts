import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AuthRemoteEvaluationModule } from '@services/external/auth-remote-evaluation';

@Module({
  imports: [AuthRemoteEvaluationModule],
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
