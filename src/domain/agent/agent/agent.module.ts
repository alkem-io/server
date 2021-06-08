import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AgentService } from './agent.service';
import { Agent } from '@domain/agent/agent';
import { SsiAgentModule } from '@src/services/ssi/agent/ssi.agent.module';
import { AgentResolverFields } from './agent.resolver.fields';
import { AuthorizationEngineModule } from '@src/services/authorization-engine/authorization-engine.module';

@Module({
  imports: [
    AuthorizationEngineModule,
    SsiAgentModule,
    CredentialModule,
    TypeOrmModule.forFeature([Agent]),
  ],
  providers: [AgentService, AgentResolverFields],
  exports: [AgentService],
})
export class AgentModule {}
