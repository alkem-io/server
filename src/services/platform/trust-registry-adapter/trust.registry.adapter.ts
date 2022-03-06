import { CredentialMetadata } from '@services/platform/trust-registry-adapter/credentials/credential.provider.interface';
import { Injectable } from '@nestjs/common';
import { IClaim } from './claim/claim.entity';
import { ClaimService } from './claim/claim.service';
import { TrustRegistryService } from './trust.registry.service';
import { v4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';
import { RestEndpoint } from '@common/enums/rest.endpoint';

@Injectable()
export class TrustRegistryAdapter {
  constructor(
    private configService: ConfigService,
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

  generateCredentialOfferUrl() {
    const nonce = v4();
    const publicRestApi = this.generatePublicRestApiUrl();
    const uniqueCallbackURL = `${publicRestApi}/${RestEndpoint.COMPLETE_CREDENTIAL_OFFER_INTERACTION}/${nonce}`;

    return {
      nonce,
      uniqueCallbackURL,
    };
  }

  generateCredentialRequestUrl() {
    const nonce = v4();
    const publicRestApi = this.generatePublicRestApiUrl();
    const uniqueCallbackURL = `${publicRestApi}/${RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION}/${nonce}`;

    return {
      nonce,
      uniqueCallbackURL,
    };
  }

  private generatePublicRestApiUrl() {
    const url = `${
      this.configService.get(ConfigurationTypes.HOSTING)?.endpoint
    }${
      this.configService.get(ConfigurationTypes.HOSTING)?.path_api_public_rest
    }`;
    return url;
  }
}
