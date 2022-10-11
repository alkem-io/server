import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { WALLET_MANAGEMENT_SERVICE } from '@common/constants';
import { WalletManagerCommand } from '@common/enums/wallet.manager.command';
import { firstValueFrom } from 'rxjs';
import { TrustRegistryAdapter } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter';
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
import { SsiWalletManagerCommandFailed } from '@common/exceptions/ssi.wallet.manager.command.failed';
import { WalletManagerGetAgentInfo } from './dto/wallet.manager.dto.get.agent.info';
import { WalletManagerCreateIdentity } from './dto/wallet.manager.dto.create.identity';
import { WalletManagerCreateIdentityResponse } from './dto/wallet.manager.dto.create.identity.response';
import { WalletManagerVerifiedCredential } from './dto/wallet.manager.dto.verified.credential';
import { WalletManagerGetAgentInfoResponse } from './dto/wallet.manager.dto.get.agent.info.response';
import { WalletManagerRequestVcBegin } from './dto/wallet.manager.dto.request.vc.begin';
import { WalletManagerRequestVcCompleteSovrhd } from './dto/wallet.manager.dto.request.vc.complete.sovrhd';
import { TrustRegistryCredentialMetadata } from '@services/external/trust-registry/trust.registry.configuration/trust.registry.dto.credential.metadata';

@Injectable()
export class WalletManagerAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private trustRegistryAdapter: TrustRegistryAdapter,
    @Inject(WALLET_MANAGEMENT_SERVICE)
    private walletManagementClient: ClientProxy
  ) {}

  async createIdentity(password: string): Promise<string> {
    const inputPayload: WalletManagerCreateIdentity = {
      password: password,
    };
    const response = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.CREATE_IDENTITY },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<WalletManagerCreateIdentityResponse>(response);
      return responseData.did;
    } catch (err: any) {
      throw new SsiWalletManagerCommandFailed(
        `Failed to create DID on agent: ${err.message}`,
        LogContext.SSI_WALLET_MANAGER
      );
    }
  }

  async getVerifiedCredentials(
    did: string,
    password: string
  ): Promise<WalletManagerVerifiedCredential[]> {
    const credentialMetadata =
      this.trustRegistryAdapter.getSupportedCredentialMetadata();

    const inputPayload: WalletManagerGetAgentInfo = {
      did: did,
      password: password,
      credentialMetadata: credentialMetadata,
    };

    const response = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.GET_IDENTITY_INFO },
      inputPayload
    );

    try {
      const responseData =
        await firstValueFrom<WalletManagerGetAgentInfoResponse>(response);

      this.logger.verbose?.(
        `[${WalletManagerCommand.GET_IDENTITY_INFO}] - Retrieved ${responseData.verifiedCredentials.length} credentials for: ${inputPayload.did}`,
        LogContext.SSI_WALLET_MANAGER
      );

      return responseData.verifiedCredentials;
    } catch (err: any) {
      throw new SsiWalletManagerCommandFailed(
        `Failed to get identity info from wallet manager: ${err.message}`,
        LogContext.SSI_WALLET_MANAGER
      );
    }
  }

  async beginCredentialRequestInteraction(
    did: string,
    password: string,
    uniqueCallbackURL: string,
    requestedCredentialMetadata: TrustRegistryCredentialMetadata
  ): Promise<WalletManagerRequestVcBeginResponse> {
    const credentialMetadata = [requestedCredentialMetadata];

    const inputPayload: WalletManagerRequestVcBegin = {
      issuerDID: did,
      issuerPassword: password,
      credentialMetadata: credentialMetadata,
      uniqueCallbackURL: uniqueCallbackURL,
    };
    try {
      const response = this.walletManagementClient.send(
        { cmd: WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION },
        inputPayload
      );
      const responseData =
        await firstValueFrom<WalletManagerRequestVcBeginResponse>(response);
      this.logger.verbose?.(
        `[${WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION}] - Initiated for interactionId: ${responseData.interactionId}`,
        LogContext.SSI_WALLET_MANAGER
      );
      return responseData;
    } catch (err: any) {
      throw new SsiWalletManagerCommandFailed(
        `[${WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION}]: Failed to request credential: ${err.message}`,
        LogContext.SSI_WALLET_MANAGER
      );
    }
  }

  async completeCredentialRequestInteractionJolocom(
    did: string,
    password: string,
    interactionId: string,
    token: string
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    this.logger.verbose?.(
      `[${WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM}] - Completing for interactionId: ${interactionId}`,
      LogContext.SSI_WALLET_MANAGER
    );
    try {
      const payload: WalletManagerRequestVcComplete = {
        issuerDID: did,
        issuerPassword: password,
        interactionId: interactionId,
        jwt: token,
      };
      const credentialStoreRequest = this.walletManagementClient.send(
        {
          cmd: WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM,
        },
        payload
      );
      const response: boolean = await firstValueFrom<boolean>(
        credentialStoreRequest
      );
      this.logger.verbose?.(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM}] - completed with result: ${response}`,
        LogContext.SSI
      );
      return { result: response };
    } catch (err: any) {
      throw new SsiWalletManagerCommandFailed(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM}]: Failed to request credential: ${err.message}`,
        LogContext.SSI_WALLET_MANAGER
      );
    }
  }

  async completeCredentialRequestInteractionSovrhd(
    did: string,
    password: string,
    interactionId: string,
    token: string,
    credentialType: string
  ): Promise<WalletManagerRequestVcCompleteResponse> {
    this.logger.verbose?.(
      `[${WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD}] - Completing for interactionId: ${interactionId}`,
      LogContext.SSI_WALLET_MANAGER
    );
    try {
      const payload: WalletManagerRequestVcCompleteSovrhd = {
        issuerDID: did,
        issuerPassword: password,
        interactionId: interactionId,
        jwt: token,
        credentialType: credentialType,
      };
      const credentialStoreRequest = this.walletManagementClient.send(
        {
          cmd: WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD,
        },
        payload
      );
      const response: boolean = await firstValueFrom<boolean>(
        credentialStoreRequest
      );
      this.logger.verbose?.(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD}] - completed with result: ${response}`,
        LogContext.SSI
      );
      return { result: response };
    } catch (err: any) {
      throw new SsiWalletManagerCommandFailed(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_SOVRHD}]: Failed to request credential: ${err.message}`,
        LogContext.SSI_WALLET_MANAGER
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
      this.logger.verbose?.(
        `[${WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION}] - Initiated for interactionId: ${response.interactionId}`,
        LogContext.SSI_WALLET_MANAGER
      );
      return response;
    } catch (err: any) {
      throw new SsiWalletManagerCommandFailed(
        `[${WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION}]: Failed to offer credential: ${err.message}`,
        LogContext.SSI_WALLET_MANAGER
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
      const response =
        await firstValueFrom<WalletManagerOfferVcCompleteResponse>(
          credentialOfferSelection$
        );
      this.logVerifiedCredentialInteraction(
        response.token,
        WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION,
        '3-completed'
      );
      this.logger.verbose?.(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION}] - Completed for interactionId: ${interactionId}`,
        LogContext.SSI_WALLET_MANAGER
      );
      return response;
    } catch (err: any) {
      throw new SsiWalletManagerCommandFailed(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION}]: Failed to offer credential: ${err.message}`,
        LogContext.SSI_WALLET_MANAGER
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
      LogContext.SSI_WALLET_MANAGER
    );
  }

  decodeJwt(token: string): any {
    return jwt_decode(token);
  }
}
