import { CredentialMetadata } from '@core/credentials/credential.provider.interface';
import { Injectable } from '@nestjs/common';
import { IClaim } from './claim/claim.entity';
import { ClaimService } from './claim/claim.service';
import { TrustRegistryService } from './trust.registry.service';

@Injectable()
export class TrustRegistryAdapter {
  constructor(
    private readonly trustRegistryService: TrustRegistryService,
    private readonly claimsService: ClaimService
  ) {}

  getSupportedCredentialMetadata(types?: string[]): CredentialMetadata[] {
    const supportedCredentials =
      this.trustRegistryService.getSupportedCredentialMetadata();
    if (types)
      return supportedCredentials.filter(
        c => types?.indexOf(c.uniqueType) !== -1
      );

    return supportedCredentials;
  }

  getCredentialOffers(proposedOffers: { type: string; claims: IClaim[] }[]) {
    const offeredTypes = proposedOffers.map(x => x.type);
    const targetMetadata = this.getSupportedCredentialMetadata(offeredTypes);

    return targetMetadata.map(metadata => ({
      metadata,
      claim: this.claimsService.createClaimObject(
        proposedOffers.find(o => o.type === metadata.uniqueType)?.claims || []
      ),
    }));
  }
}
