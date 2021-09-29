import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { SsiAgentModule } from '@src/services/platform/ssi/agent/ssi.agent.module';
import { AdminAuthorizationResolverMutations } from './admin.authorization.resolver.mutations';
import { AdminAuthorizationResolverQueries } from './admin.authorization.resolver.queries';
import { AdminAuthorizationService } from './admin.authorization.service';

@Module({
  imports: [
    AuthorizationEngineModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    UserModule,
    SsiAgentModule,
    CredentialModule,
  ],
  providers: [
    AdminAuthorizationService,
    AdminAuthorizationResolverMutations,
    AdminAuthorizationResolverQueries,
  ],
  exports: [AdminAuthorizationService],
})
export class AdminAuthorizationModule {}
