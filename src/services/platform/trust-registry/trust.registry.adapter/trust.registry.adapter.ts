import { Injectable } from '@nestjs/common';
import { v4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes } from '@common/enums';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { CredentialMetadata } from '../trust.registry.configuration/credential.metadata';
import { TrustRegistryConfigurationAdapter } from '../trust.registry.configuration/trust.registry.configuration.adapter';
import { IClaim } from '../trust.registry.claim/claim.interface';
import { TrustRegistryClaimService } from '../trust.registry.claim/trust.registry.claim.service';

@Injectable()
export class TrustRegistryAdapter {
  constructor(
    private configService: ConfigService,
    private trustRegistryConfigurationProvider: TrustRegistryConfigurationAdapter,
    private trustRegistryClaimService: TrustRegistryClaimService
  ) {}

  getSupportedCredentialMetadata(types?: string[]): CredentialMetadata[] {
    const supportedCredentials =
      this.trustRegistryConfigurationProvider.getCredentials();
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
      claim: this.trustRegistryClaimService.createClaimObject(
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
      this.configService.get(ConfigurationTypes.HOSTING)?.endpoint_cluster
    }${
      this.configService.get(ConfigurationTypes.HOSTING)?.path_api_public_rest
    }`;
    return url;
  }
}
