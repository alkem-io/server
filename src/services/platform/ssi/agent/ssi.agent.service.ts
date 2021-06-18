/* eslint-disable @typescript-eslint/no-unused-vars */
import { Connection } from 'typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
// import { JolocomSDK } from '@jolocom/sdk';
// import { JolocomTypeormStorage } from '@jolocom/sdk-storage-typeorm';

import { LogContext } from '@common/enums/logging.context';
import { VerifiedCredential } from '@src/services/platform/ssi/agent';

import stateModificationMetadata from '../credentials/StateModificationCredentialMetaData';
// import { CredentialOfferRequestAttrs } from 'jolocom-lib/js/interactionTokens/types';
// import { CredentialQuery } from '@jolocom/sdk/js/storage';
// import { CredentialOfferFlowState } from '@jolocom/sdk/js/interactionManager/types';

@Injectable()
export class SsiAgentService {
  // private jolocomSDK: JolocomSDK;

  constructor(
    // @InjectConnection('jolocom')
    // private typeormConnection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    // const storage = new JolocomTypeormStorage(this.typeormConnection);
    // this.jolocomSDK = new JolocomSDK({ storage });
  }

  async createAgent(password: string): Promise<string> {
    // const agent = await this.jolocomSDK.createAgent(password, 'jun');
    // return agent.identityWallet.did;
    return password;
  }

  async loadDidDoc(did: string, password: string): Promise<string> {
    // const agent = await this.jolocomSDK.loadAgent(password, did);
    // const didDocAttrs = agent.identityWallet.didDocument.toJSON();
    // const didDocAttrsJson = JSON.stringify(didDocAttrs, null, 2);
    // return didDocAttrsJson;
    return did;
  }

  async getVerifiedCredentials(
    did: string,
    password: string
  ): Promise<VerifiedCredential[]> {
    const credentialsResult: VerifiedCredential[] = [];

    // const agent = await this.jolocomSDK.loadAgent(password, did);
    // const query: CredentialQuery = {};
    // const credentials = await agent.credentials.query(query);
    // for (const credential of credentials) {
    //   const claim = credential.claim;
    //   const verifiedCredential = new VerifiedCredential();
    //   verifiedCredential.claim = JSON.stringify(claim);
    //   verifiedCredential.issuer = credential.issuer;
    //   verifiedCredential.type = credential.type[1];
    //   verifiedCredential.issued = credential.issued;
    //   credentialsResult.push(verifiedCredential);
    //   this.logger.verbose?.(
    //     `${JSON.stringify(credential.claim)}`,
    //     LogContext.AUTH
    //   );
    // }
    return credentialsResult;
  }

  async grantStateTransitionVC(
    issuerDid: string,
    issuerPW: string,
    receiverDid: string,
    receiverPw: string,
    challengeID: string,
    userID: string
  ): Promise<boolean> {
    // const issuerAgent = await this.jolocomSDK.loadAgent(issuerPW, issuerDid);
    // const receiverAgent = await this.jolocomSDK.loadAgent(
    //   receiverPw,
    //   receiverDid
    // );

    // this.logger.verbose?.('About to issue a credential...', LogContext.SSI);

    // // Issuer creates the offer to receiver to sign a simple credential
    // const offer: CredentialOfferRequestAttrs = {
    //   callbackURL: 'https://example.com/issuance',
    //   offeredCredentials: [
    //     {
    //       type: 'StateModificationCredential',
    //     },
    //   ],
    // };
    // const issuerCredOffer = await issuerAgent.credOfferToken(offer);

    // // Receiver gets and processes the offered token, to identify the relevant Interaction
    // const receiverCredExchangeInteraction = await receiverAgent.processJWT(
    //   issuerCredOffer.encode()
    // );

    // // Receiver then creates a response token
    // const receiverCredExchangeResponse = await receiverCredExchangeInteraction.createCredentialOfferResponseToken(
    //   [{ type: 'StateModificationCredential' }]
    // );

    // // Note that all agents need to also process the tokens they generate so that their interaction manager has seen all messages
    // await receiverAgent.processJWT(receiverCredExchangeResponse.encode());

    // // Issuer receives the token response from Receiver, finds the interaction + then creates the VC to share
    // const issuerCredExchangeInteraction = await issuerAgent.processJWT(
    //   receiverCredExchangeResponse.encode()
    // );

    // // Create the VC that then will be issued by Alice to Bob, so that Bob can then prove that Alice attested to this credential about him.
    // const issuerAboutReceiverVC = await issuerAgent.signedCredential({
    //   metadata: stateModificationMetadata,
    //   subject: receiverAgent.identityWallet.did,
    //   claim: {
    //     challengeID: challengeID,
    //     userID: userID,
    //   },
    // });

    // // Create the token wrapping the VC
    // const aliceCredIssuance = await issuerCredExchangeInteraction.createCredentialReceiveToken(
    //   [issuerAboutReceiverVC]
    // );
    // // Issuer processes her own generated token also
    // await issuerAgent.processJWT(aliceCredIssuance.encode());

    // // Token with signed VC is sent and received by Bob
    // const receiverCredExchangeInteraction2 = await receiverAgent.processJWT(
    //   aliceCredIssuance.encode()
    // );
    // const state = receiverCredExchangeInteraction2.getSummary()
    //   .state as CredentialOfferFlowState;

    // if (state.credentialsAllValid) {
    //   this.logger.verbose?.('Issued credential interaction is valid!');
    //   await receiverCredExchangeInteraction2.storeSelectedCredentials();
    // }

    return true;
  }
}
