import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { SsiAgentModule } from '@src/services/platform/ssi/agent/ssi.agent.module';
import { AuthorizationResolverMutations } from './authorization.resolver.mutations';
import { AuthorizationResolverQueries } from './authorization.resolver.queries';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [
    AuthorizationEngineModule,
    AgentModule,
    UserModule,
    SsiAgentModule,
    CredentialModule,
    TypeOrmModule.forFeature([AuthorizationPolicy]),
  ],
  providers: [
    AuthorizationService,
    AuthorizationResolverMutations,
    AuthorizationResolverQueries,
  ],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
