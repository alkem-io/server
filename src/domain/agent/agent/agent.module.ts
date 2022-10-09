import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AgentService } from './agent.service';
import { Agent } from '@domain/agent/agent';
import { AgentResolverFields } from './agent.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TrustRegistryAdapterModule } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter.module';
import { AgentResolverMutations } from './agent.resolver.mutations';
import { VerifiedCredentialModule } from '../verified-credential/verified.credential.module';
import { AgentResolverSubscriptions } from '@domain/agent/agent/agent.resolver.subscriptions';
import { SsiSovrhdAdapterModule } from '@services/platform/ssi-sovrhd/ssi.sovrhd.adapter.module';
import { WalletManagerAdapterModule } from '@services/platform/wallet-manager-adapter/wallet.manager.adapter.module';
import { AgentCacheService } from './agent.cache.service';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CredentialModule,
    VerifiedCredentialModule,
    TrustRegistryAdapterModule,
    TypeOrmModule.forFeature([Agent]),
    TrustRegistryAdapterModule,
    SsiSovrhdAdapterModule,
    WalletManagerAdapterModule,
  ],
  providers: [
    AgentService,
    AgentCacheService,
    AgentResolverMutations,
    AgentResolverFields,
    AgentResolverSubscriptions,
  ],
  exports: [AgentService, AgentCacheService],
})
export class AgentModule {}
