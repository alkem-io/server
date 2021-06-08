import { Connection } from 'typeorm';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { JolocomSDK } from '@jolocom/sdk';
import { JolocomTypeormStorage } from '@jolocom/sdk-storage-typeorm';

import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions/validation.exception';
import { VerifiedCredential } from '@src/services/ssi/agent';

@Injectable()
export class SsiAgentService {
  constructor(
    @InjectConnection('jolocom')
    private typeormConnection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  // Create an account for the specified user and update the user to store the UPN
  async createIdentity(password: string): Promise<string> {
    const storage = new JolocomTypeormStorage(this.typeormConnection);
    const sdk = new JolocomSDK({ storage });
    const agent = await sdk.createAgent(password, 'jun');
    return agent.identityWallet.did;
  }

  // Create an account for the specified user and update the user to store the UPN
  async loadDidDoc(did: string, password: string): Promise<string> {
    const storage = new JolocomTypeormStorage(this.typeormConnection);
    const sdk = new JolocomSDK({ storage });
    const agent = await sdk.loadAgent(password, did);
    const didDocAttrs = agent.identityWallet.didDocument.toJSON();
    const didDocAttrsJson = JSON.stringify(didDocAttrs, null, 2);
    return didDocAttrsJson;
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

  async getVerifiedCredentials(
    did: string,
    password: string
  ): Promise<VerifiedCredential[]> {
    const credentials: VerifiedCredential[] = [];
    const ssiDidDoc = await this.loadDidDoc(did, password);
    const verifiedCredential = new VerifiedCredential();
    verifiedCredential.info = ssiDidDoc;
    credentials.push(verifiedCredential);
    return credentials;
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
