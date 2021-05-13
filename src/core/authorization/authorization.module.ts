import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { AuthorizationResolverMutations } from './authorization.resolver.mutations';
import { AuthorizationResolverQueries } from './authorization.resolver.queries';
import { AuthorizationService } from './authorization.service';

@Module({
  imports: [AgentModule, UserModule, CredentialModule],
  providers: [
    AuthorizationService,
    AuthorizationResolverMutations,
    AuthorizationResolverQueries,
  ],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}
