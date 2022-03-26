import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { WALLET_MANAGEMENT_SERVICE } from '@common/constants';
import { WalletManagerCommand } from '@common/enums/wallet.manager.command';
import { firstValueFrom } from 'rxjs';
import { SsiException } from '@common/exceptions/ssi.exception';
import { TrustRegistryAdapter } from '../trust-registry/trust.registry.adapter/trust.registry.adapter';
import { IVerifiedCredential } from '@domain/agent/verified-credential/verified.credential.interface';
import { LogContext } from '@common/enums';
import { WalletManagerRequestVcCompleteResponse } from './dto/wallet.manager.dto.request.vc.complete.response';
import { WalletManagerOfferVcBeginResponse } from './dto/wallet.manager.dto.offer.vc.begin.response';
import { WalletManagerCredentialOfferMetadata } from './dto/wallet.manager.dto.credential.offer.metadata';
import { WalletManagerOfferVcCompleteResponse } from './dto/wallet.manager.dto.offer.vc.complete.response';
import jwt_decode from 'jwt-decode';
import { WalletManagerOfferVcBegin } from './dto/wallet.manager.dto.offer.vc.begin';
import { WalletManagerOfferVcComplete } from './dto/wallet.manager.dto.offer.vc.complete';
import { WalletManagerRequestVcBeginResponse } from './dto/wallet.manager.dto.request.vc.begin.response';
import { WalletManagerRequestVcComplete } from './dto/wallet.manager.dto.request.vc.complete';

@Injectable()
export class WalletManagerAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private trustRegistryAdapter: TrustRegistryAdapter,
    @Inject(WALLET_MANAGEMENT_SERVICE)
    private walletManagementClient: ClientProxy
  ) {}

  async createSsiIdentity(password: string): Promise<string> {
    const did$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.CREATE_IDENTITY },
      {
        password: password,
      }
    );

    try {
      return await firstValueFrom(did$);
    } catch (err: any) {
      throw new SsiException(`Failed to create DID on agent: ${err.message}`);
    }
  }

  async getVerifiedCredentials(
    did: string,
    password: string
  ): Promise<IVerifiedCredential[]> {
    const credentialMetadata =
      this.trustRegistryAdapter.getSupportedCredentialMetadata();

    const identityInfo$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.GET_IDENTITY_INFO },
      {
        did: did,
        password: password,
        credentialMetadata: credentialMetadata,
      }
    );

    try {
      const verifiedCredentials: IVerifiedCredential[] = await firstValueFrom(
        identityInfo$
      );

      return verifiedCredentials;
    } catch (err: any) {
      throw new SsiException(
        `Failed to get identity info from wallet manager: ${err.message}`
      );
    }
  }

  async beginCredentialRequestInteraction(
    did: string,
    password: string,
    uniqueCallbackURL: string
  ): Promise<WalletManagerRequestVcBeginResponse> {
    const credentialMetadata =
      this.trustRegistryAdapter.getSupportedCredentialMetadata();
    const credentialRequest$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION },
      {
        issuerDId: did,
        issuerPassword: password,
        credentialMetadata: credentialMetadata,
        uniqueCallbackURL: uniqueCallbackURL,
      }
    );

    try {
      return await firstValueFrom<WalletManagerRequestVcBeginResponse>(
        credentialRequest$
      );
    } catch (err: any) {
      throw new SsiException(
        `[beginCredentialRequestInteraction]: Failed to request credential: ${err.message}`
      );
    }
  }

  async completeCredentialRequestInteraction(
    did: string,
    password: string,
    interactionId: string,
    token: string
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    try {
      const payload: WalletManagerRequestVcComplete = {
        issuerDID: did,
        issuerPassword: password,
        interactionId: interactionId,
        jwt: token,
      };
      const credentialStoreRequest = this.walletManagementClient.send(
        { cmd: WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION },
        payload
      );
      const response: boolean = await firstValueFrom<boolean>(
        credentialStoreRequest
      );
      this.logger.verbose?.(
        `[RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION] - completed with result: ${response}`,
        LogContext.SSI
      );
      return { result: response };
    } catch (err: any) {
      throw new SsiException(
        `[completeCredentialRequestInteraction]: Failed to request credential: ${err.message}`
      );
    }
  }

  async beingCredentialOfferInteraction(
    did: string,
    password: string,
    uniqueCallbackURL: string,
    offeredCredentials: WalletManagerCredentialOfferMetadata[]
  ): Promise<WalletManagerOfferVcBeginResponse> {
    const credentialOfferInput: WalletManagerOfferVcBegin = {
      issuerDID: did,
      issuerPassword: password,
      offeredCredentials: offeredCredentials,
      uniqueCallbackURL: uniqueCallbackURL,
    };

    try {
      const credentialOffer = this.walletManagementClient.send(
        { cmd: WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION },
        credentialOfferInput
      );
      const response = await firstValueFrom<WalletManagerOfferVcBeginResponse>(
        credentialOffer
      );
      return response;
    } catch (err: any) {
      throw new SsiException(
        `[${WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION}]: Failed to offer credential: ${err.message}`
      );
    }
  }

  async completeCredentialOfferInteraction(
    did: string,
    password: string,
    interactionId: string,
    token: string,
    offeredCredentials: WalletManagerCredentialOfferMetadata[]
  ): Promise<WalletManagerOfferVcCompleteResponse> {
    const completeFlowInput: WalletManagerOfferVcComplete = {
      issuerDID: did,
      issuerPassword: password,
      interactionId: interactionId,
      credentialMetadata: offeredCredentials.map(c => c.metadata),
      jwt: token,
    };
    const credentialOfferSelection$ = this.walletManagementClient.send(
      {
        cmd: WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION,
      },
      completeFlowInput
    );

    try {
      const response: WalletManagerOfferVcCompleteResponse =
        await firstValueFrom(credentialOfferSelection$);
      this.logVerifiedCredentialInteraction(
        response.token,
        WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION,
        '3-completed'
      );
      return response;
    } catch (err: any) {
      throw new SsiException(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION}]:Failed to offer credential: ${err.message}`
      );
    }
  }

  logVerifiedCredentialInteraction(
    jwt: string,
    interaction: string,
    stage: string
  ) {
    const tokenJson = jwt_decode(jwt);
    this.logger.verbose?.(
      `[${interaction}] - [${stage}] - Token converted to JSON: ${JSON.stringify(
        tokenJson
      )}`,
      LogContext.AGENT
    );
  }

  decodeJwt(token: string): any {
    return jwt_decode(token);
  }
}
