import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentAuthorizationService } from './agent.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    AuthenticationAgentInfoModule,
    CredentialModule,
  ],
  providers: [AgentService, AgentAuthorizationService],
  exports: [AgentService, AgentAuthorizationService],
})
export class AgentModule {}
