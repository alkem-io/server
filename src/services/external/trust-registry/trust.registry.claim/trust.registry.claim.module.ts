import { Module } from '@nestjs/common';
import { TrustRegistryClaimService } from './trust.registry.claim.service';

@Module({
  providers: [TrustRegistryClaimService],
  exports: [TrustRegistryClaimService],
})
export class TrustRegistryClaimModule {}
