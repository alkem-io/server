import { Connection } from 'typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { JolocomSDK } from '@jolocom/sdk';
import { JolocomTypeormStorage } from '@jolocom/sdk-storage-typeorm';

import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions/validation.exception';
import { VerifiedCredential } from '@src/services/platform/ssi/agent';

import stateModificationMetadata from '../credentials/StateModificationCredentialMetaData';
import { CredentialOfferRequestAttrs } from 'jolocom-lib/js/interactionTokens/types';
import { CredentialQuery } from '@jolocom/sdk/js/storage';

@Injectable()
export class SsiAgentService {
  constructor(
    @InjectConnection('jolocom')
    private typeormConnection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAgent(password: string): Promise<string> {
    const storage = new JolocomTypeormStorage(this.typeormConnection);
    const sdk = new JolocomSDK({ storage });
    const agent = await sdk.createAgent(password, 'jun');
    return agent.identityWallet.did;
  }

  // Load did doc for agent
  async loadDidDoc(did: string, password: string): Promise<string> {
    const storage = new JolocomTypeormStorage(this.typeormConnection);
    const sdk = new JolocomSDK({ storage });
    const agent = await sdk.loadAgent(password, did);
    const didDocAttrs = agent.identityWallet.didDocument.toJSON();
    const didDocAttrsJson = JSON.stringify(didDocAttrs, null, 2);
    return didDocAttrsJson;
  }

  async getVerifiedCredentials(
    did: string,
    password: string
  ): Promise<VerifiedCredential[]> {
    const credentialsResult: VerifiedCredential[] = [];

    const storage = new JolocomTypeormStorage(this.typeormConnection);
    const sdk = new JolocomSDK({ storage });
    const agent = await sdk.loadAgent(password, did);
    const query: CredentialQuery = {};
    const credentials = await agent.storage.get.verifiableCredential(query);
    for (const credential of credentials) {
      const claim = credential.claim;
      if (claim.id === did) {
        const verifiedCredential = new VerifiedCredential();
        verifiedCredential.claim = JSON.stringify(claim);
        verifiedCredential.issuer = credential.issuer;
        verifiedCredential.type = credential.type[1];
        verifiedCredential.issued = credential.issued;
        credentialsResult.push(verifiedCredential);
        this.logger.verbose?.(`${credential.claim}`);
      }
    }
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
    const storage = new JolocomTypeormStorage(this.typeormConnection);
    const sdk = new JolocomSDK({ storage });
    const issuerAgent = await sdk.loadAgent(issuerPW, issuerDid);
    const receiverAgent = await sdk.loadAgent(receiverPw, receiverDid);

    this.logger.verbose?.('About to issue a credential...', LogContext.SSI);

    // Issuer creates the offer to receiver to sign a simple credential
    const offer: CredentialOfferRequestAttrs = {
      callbackURL: 'https://example.com/issuance',
      offeredCredentials: [
        {
          type: 'StateModificationCredential',
        },
      ],
    };
    const issuerCredOffer = await issuerAgent.credOfferToken(offer);

    // Receiver gets and processes the offered token, to identify the relevant Interaction
    const receiverCredExchangeInteraction = await receiverAgent.processJWT(
      issuerCredOffer.encode()
    );

    // Receiver then creates a response token
    const receiverCredExchangeResponse = await receiverCredExchangeInteraction.createCredentialOfferResponseToken(
      [{ type: 'StateModificationCredential' }]
    );

    // Note that all agents need to also process the tokens they generate so that their interaction manager has seen all messages
    await receiverAgent.processJWT(receiverCredExchangeResponse.encode());

    // Issuer receives the token response from Receiver, finds the interaction + then creates the VC to share
    const issuerCredExchangeInteraction = await issuerAgent.processJWT(
      receiverCredExchangeResponse.encode()
    );

    // Create the VC that then will be issued by Alice to Bob, so that Bob can then prove that Alice attested to this credential about him.
    const issuerAboutReceiverVC = await issuerAgent.signedCredential({
      metadata: stateModificationMetadata,
      subject: receiverAgent.identityWallet.did,
      claim: {
        challengeID: challengeID,
        userID: userID,
      },
    });

    // Create the token wrapping the VC
    const aliceCredIssuance = await issuerCredExchangeInteraction.createCredentialReceiveToken(
      [issuerAboutReceiverVC]
    );
    // Issuer processes her own generated token also
    await issuerAgent.processJWT(aliceCredIssuance.encode());

    // Token with signed VC is sent and received by Bob
    // Note: should be same as interaction above....check!
    const receiverCredExchangeInteraction2 = await receiverAgent.processJWT(
      aliceCredIssuance.encode()
    );

    const state = receiverCredExchangeInteraction2.getSummary().state;

    if ((state as any).credentialsAllValid) {
      this.logger.verbose?.('Issued credential interaction is valid!');
      for (const issuedCred of (state as any).issued) {
        await receiverAgent.storage.store.verifiableCredential(issuedCred);
        this.logger.verbose?.(
          `Saving verfied credential with claim: ${JSON.stringify(
            issuedCred.claim
          )}`
        );
      }
    }
    return true;
  }

  // Create an account for the specified user and update the user to store the UPN
  async signMsg(did: string, password: string, msg: string): Promise<string> {
    const storage = new JolocomTypeormStorage(this.typeormConnection);
    const sdk = new JolocomSDK({ storage });
    const agent = await sdk.loadAgent(password, did);
    if (!agent) {
      throw new ValidationException(
        `Not able to load did: ${did}`,
        LogContext.COMMUNITY
      );
    }
    const signedMsg = await agent.identityWallet.sign(
      Buffer.from(msg),
      password
    );
    return signedMsg.toString('hex');
  }

  // Create an account for the specified user and update the user to store the UPN
  async authoriseStateModification(
    userID: string,
    challengeID: string
  ): Promise<boolean> {
    const storage = new JolocomTypeormStorage(this.typeormConnection);

    this.logger.verbose?.('about to create SDK instance', LogContext.AUTH);
    const sdk = new JolocomSDK({ storage });

    const password = 'password';
    const agent = await sdk.createAgent(password, 'jun');
    const pubKeyMetaData = agent.identityWallet.publicKeyMetadata;
    this.logger.verbose?.('Agent identity:', agent.identityWallet.identity.did);
    this.logger.verbose?.('Pubkey meta data: ');
    this.logger.verbose?.(`...signing key: ${pubKeyMetaData.signingKeyId}`);
    this.logger.verbose?.(
      `...encryption key: ${pubKeyMetaData.encryptionKeyId}`
    );
    if (userID.length > 100)
      throw new ValidationException(
        `Not implemented ${userID} + ${challengeID}`,
        LogContext.COMMUNITY
      );
    return true;
  }
}
