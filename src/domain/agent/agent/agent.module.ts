import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AgentService } from './agent.service';
import { Agent } from '@domain/agent/agent';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentAuthorizationService } from './agent.service.authorization';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    AuthenticationAgentInfoModule,
    CredentialModule,
    TypeOrmModule.forFeature([Agent]),
  ],
  providers: [AgentService, AgentAuthorizationService],
  exports: [AgentService, AgentAuthorizationService],
})
export class AgentModule {}
