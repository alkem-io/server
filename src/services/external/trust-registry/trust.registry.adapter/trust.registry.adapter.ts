import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { TrustRegistryCredentialMetadata } from '../trust.registry.configuration/trust.registry.dto.credential.metadata';
import { TrustRegistryConfigurationAdapter } from '../trust.registry.configuration/trust.registry.configuration.adapter';
import { IClaim } from '../trust.registry.claim/claim.interface';
import { TrustRegistryClaimService } from '../trust.registry.claim/trust.registry.claim.service';
import { SsiVcNotVerifiable } from '@common/exceptions/ssi.vc.not.verifiable';
import { WalletManagerCredentialOfferMetadata } from '@services/adapters/wallet-manager-adapter/dto/wallet.manager.dto.credential.offer.metadata';
import { SsiCredentialTypeNotSupported } from '@common/exceptions/ssi.credential.type.not.supported';
import { SsiIssuerType } from '@common/enums/ssi.issuer.type';

@Injectable()
export class TrustRegistryAdapter {
  constructor(
    private configService: ConfigService,
    private trustRegistryConfigurationProvider: TrustRegistryConfigurationAdapter,
    private trustRegistryClaimService: TrustRegistryClaimService
  ) {}

  getVerifiedCredentialMetadata(type: string): TrustRegistryCredentialMetadata {
    const supportedCredentials =
      this.trustRegistryConfigurationProvider.getCredentials();
    const credentialMetadata = supportedCredentials.find(
      vc => vc.uniqueType === type
    );
    if (!credentialMetadata) {
      throw new SsiCredentialTypeNotSupported(
        `The requested verified credential type is not supported: ${type}`,
        LogContext.SSI
      );
    }
    return credentialMetadata;
  }

  getVcIssuerTypeOrFail(type: string): SsiIssuerType {
    if (type === SsiIssuerType.JOLOCOM) {
      return SsiIssuerType.JOLOCOM;
    } else if (type === SsiIssuerType.SOVRHD) {
      return SsiIssuerType.SOVRHD;
    }

    throw new SsiCredentialTypeNotSupported(
      `The requested verified credential has an issuer type that is not supported: ${type}`,
      LogContext.SSI
    );
  }

  getSupportedCredentialMetadata(
    types?: string[]
  ): TrustRegistryCredentialMetadata[] {
    const supportedCredentials =
      this.trustRegistryConfigurationProvider.getCredentials();
    if (types)
      return supportedCredentials.filter(
        c => types?.indexOf(c.uniqueType) !== -1
      );

    return supportedCredentials;
  }

  getCredentialOffers(
    proposedOffers: { type: string; claims: IClaim[] }[]
  ): WalletManagerCredentialOfferMetadata[] {
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
    const nonce = randomUUID();
    const publicRestApi = this.generatePublicRestApiUrl();
    const uniqueCallbackURL = `${publicRestApi}/${RestEndpoint.COMPLETE_CREDENTIAL_OFFER_INTERACTION}/${nonce}`;

    return {
      nonce,
      uniqueCallbackURL,
    };
  }

  generateCredentialRequestUrlJolocom(nonce: string) {
    const publicRestApi = this.generatePublicRestApiUrl();
    const uniqueCallbackURL = `${publicRestApi}/${RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM}/${nonce}`;

    return uniqueCallbackURL;
  }

  generateNonceForInteraction() {
    const nonce = randomUUID();
    return nonce;
  }

  generateCredentialRequestUrlSovrhd(nonce: string) {
    const publicRestApi = this.generatePublicRestApiUrl();
    const uniqueCallbackURL = `${publicRestApi}/${RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD}/${nonce}`;

    return uniqueCallbackURL;
  }

  getTrustedIssuersForCredentialNameOrFail(name: string): string[] {
    const credentials =
      this.trustRegistryConfigurationProvider.getCredentials();
    const credentialMetadata = credentials.find(
      credDef => credDef.name === name
    );
    if (!credentialMetadata) {
      throw new SsiVcNotVerifiable(
        `Unable to identify trusted issuers for credential type: ${name}`,
        LogContext.SSI
      );
    }
    const trustedIssuers = credentialMetadata.trusted_issuers;
    return trustedIssuers || [];
  }

  validateIssuerOrFail(vcName: string, issuer: string) {
    const trustedIssuers =
      this.getTrustedIssuersForCredentialNameOrFail(vcName);

    if (!trustedIssuers.includes(issuer)) {
      throw new SsiVcNotVerifiable(
        `Issuer '${issuer}' for credential '${vcName}' is not in list of trusted issuers: ${trustedIssuers}`,
        LogContext.SSI
      );
    }
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
