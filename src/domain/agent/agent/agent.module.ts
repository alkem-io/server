import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AgentService } from './agent.service';
import { Agent } from '@domain/agent/agent';
import { AgentResolverFields } from './agent.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TrustRegistryAdapterModule } from '../../../services/platform/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { AgentResolverMutations } from './agent.resolver.mutations';
import { VerifiedCredentialModule } from '../verified-credential/verified.credential.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CredentialModule,
    VerifiedCredentialModule,
    TrustRegistryAdapterModule,
    TypeOrmModule.forFeature([Agent]),
    CacheModule.register(),
    TrustRegistryAdapterModule,
  ],
  providers: [AgentService, AgentResolverMutations, AgentResolverFields],
  exports: [AgentService],
})
export class AgentModule {}
