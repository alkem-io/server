import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AgentService } from './agent.service';
import { Agent } from '@domain/agent/agent';
import { SsiAgentModule } from '@src/services/platform/ssi/agent/ssi.agent.module';
import { AgentResolverFields } from './agent.resolver.fields';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    SsiAgentModule,
    CredentialModule,
    TypeOrmModule.forFeature([Agent]),
  ],
  providers: [AgentService, AgentResolverFields],
  exports: [AgentService],
})
export class AgentModule {}
