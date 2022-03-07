import { Module } from '@nestjs/common';
import { CredentialConfigAdapterModule } from '@services/platform/trust-registry-adapter/credential-config-adapter/credential.config.adapter.module';
import { MicroservicesModule } from '../../../core/microservices/microservices.module';
import { ClaimService } from './claim/claim.service';
import { TrustRegistryAdapter } from './trust.registry.adapter';
import { TrustRegistryService } from './trust.registry.service';

@Module({
  imports: [MicroservicesModule, CredentialConfigAdapterModule],
  providers: [ClaimService, TrustRegistryService, TrustRegistryAdapter],
  exports: [TrustRegistryAdapter],
})
export class TrustRegistryAdapterModule {}
