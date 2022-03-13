import { Module } from '@nestjs/common';
import { MicroservicesModule } from '../../../core/microservices/microservices.module';
import { ClaimService } from './claim/claim.service';
import { TrustRegistryConfigurationModule } from './configuration/trust.registry.configuation.module';
import { TrustRegistryAdapter } from './trust.registry.adapter';

@Module({
  imports: [MicroservicesModule, TrustRegistryConfigurationModule],
  providers: [ClaimService, TrustRegistryAdapter],
  exports: [TrustRegistryAdapter],
})
export class TrustRegistryAdapterModule {}
