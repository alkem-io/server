import { Module } from '@nestjs/common';
import { MicroservicesModule } from '../../../../core/microservices/microservices.module';
import { TrustRegistryClaimModule } from '../trust.registry.claim/trust.registry.claim.module';
import { TrustRegistryConfigurationModule } from '../trust.registry.configuration/trust.registry.configuation.module';
import { TrustRegistryAdapter } from './trust.registry.adapter';

@Module({
  imports: [
    MicroservicesModule,
    TrustRegistryClaimModule,
    TrustRegistryConfigurationModule,
  ],
  providers: [TrustRegistryAdapter],
  exports: [TrustRegistryAdapter],
})
export class TrustRegistryAdapterModule {}
