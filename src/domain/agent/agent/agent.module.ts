import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AgentService } from './agent.service';
import { Agent } from '@domain/agent/agent';
import { AgentResolverFields } from './agent.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ClaimModule } from '../claim/claim.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CredentialModule,
    ClaimModule,
    TypeOrmModule.forFeature([Agent]),
    CacheModule.register(),
  ],
  providers: [AgentService, AgentResolverFields],
  exports: [AgentService],
})
export class AgentModule {}
