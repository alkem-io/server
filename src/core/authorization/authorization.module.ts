import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { AuthorizationEngineModule } from '@src/services/authorization-engine/authorization-engine.module';
import { SsiAgentModule } from '@src/services/ssi/agent/ssi.agent.module';
import { AuthorizationResolverMutations } from './authorization.resolver.mutations';
import { AuthorizationResolverQueries } from './authorization.resolver.queries';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [
    AuthorizationEngineModule,
    AgentModule,
    UserModule,
    ChallengeModule,
    SsiAgentModule,
    CredentialModule,
  ],
  providers: [
    AuthorizationService,
    AuthorizationResolverMutations,
    AuthorizationResolverQueries,
  ],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
