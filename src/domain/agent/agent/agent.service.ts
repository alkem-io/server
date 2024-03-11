import { PubSubEngine } from 'graphql-subscriptions';
import { SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL } from '@common/constants';
import { Profiling } from '@common/decorators/profiling.decorator';
import { ConfigurationTypes, LogContext } from '@common/enums';
import {
  AuthenticationException,
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { SsiException } from '@common/exceptions/ssi.exception';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ProfileCredentialVerified } from '@domain/agent/agent/dto/agent.dto.profile.credential.verified';
import { Agent, CreateAgentInput, IAgent } from '@domain/agent/agent';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CredentialService } from '../credential/credential.service';
import { WalletManagerCommand } from '@common/enums/wallet.manager.command';
import { CredentialMetadataOutput } from '../verified-credential/dto/verified.credential.dto.metadata';
import { IClaim } from '@services/external/trust-registry/trust.registry.claim/claim.interface';
import { TrustRegistryAdapter } from '@services/external/trust-registry/trust.registry.adapter/trust.registry.adapter';
import { GrantCredentialInput } from './dto/agent.dto.credential.grant';
import { RevokeCredentialInput } from './dto/agent.dto.credential.revoke';
import { AgentBeginVerifiedCredentialRequestOutput } from './dto/agent.dto.verified.credential.request.begin.output';
import { AgentBeginVerifiedCredentialOfferOutput } from './dto/agent.dto.verified.credential.offer.begin.output';
import { VerifiedCredentialService } from '../verified-credential/verified.credential.service';
import { IVerifiedCredential } from '../verified-credential/verified.credential.interface';
import { AgentInteractionVerifiedCredentialRequestJolocom } from './dto/agent.dto.interaction.verified.credential.request.jolocom';
import { SsiIssuerType } from '@common/enums/ssi.issuer.type';
import { SsiInteractionNotFound } from '@common/exceptions/ssi.interaction.not.found';
import { AgentInteractionVerifiedCredentialOffer } from './dto/agent.dto.interaction.verified.credential.offer';
import { SsiSovrhdAdapter } from '@services/adapters/ssi-sovrhd/ssi.sovrhd.adapter';
import { WalletManagerAdapter } from '@services/adapters/wallet-manager-adapter/wallet.manager.adapter';
import { VerifiedCredential } from '../verified-credential/dto/verified.credential.dto.result';
import { SsiSovrhdRegisterCallbackSession } from '@services/adapters/ssi-sovrhd/dto/ssi.sovrhd.dto.register.callback.session';
import { AgentInteractionVerifiedCredentialRequestSovrhd } from './dto/agent.dto.interaction.verified.credential.request.sovrhd';
import { SsiSovrhdRegisterCallbackCredential } from '@services/adapters/ssi-sovrhd/dto/ssi.sovrhd.dto.register.callback.credential';
import { getRandomId } from '@src/common/utils';
import { AgentCacheService } from './agent.cache.service';

@Injectable()
export class AgentService {
  constructor(
    private agentCacheService: AgentCacheService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private configService: ConfigService,
    private credentialService: CredentialService,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    private trustRegistryAdapter: TrustRegistryAdapter,
    private ssiSovrhdAdapter: SsiSovrhdAdapter,
    private walletManagerAdapter: WalletManagerAdapter,
    private verifiedCredentialService: VerifiedCredentialService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL)
    private subscriptionVerifiedCredentials: PubSubEngine
  ) {}

  async createAgent(inputData: CreateAgentInput): Promise<IAgent> {
    const agent: IAgent = Agent.create(inputData);
    agent.credentials = [];
    agent.authorization = new AuthorizationPolicy();

    const ssiEnabled = this.configService.get(ConfigurationTypes.SSI).enabled;

    if (ssiEnabled) {
      return await this.createDidOnAgent(agent);
    }

    return await this.saveAgent(agent);
  }

  async getAgentOrFail(
    agentID: string,
    options?: FindOneOptions<Agent>
  ): Promise<IAgent | never> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentID },
      ...options,
    });
    if (!agent)
      throw new EntityNotFoundException(
        `No Agent found with the given id: ${agentID}`,
        LogContext.AGENT
      );
    return agent;
  }

  async deleteAgent(agentID: string): Promise<IAgent> {
    // Note need to load it in with all contained entities so can remove fully
    const agent = await this.getAgentOrFail(agentID);
    // Remove all credentials
    if (agent.credentials) {
      for (const credential of agent.credentials) {
        await this.credentialService.deleteCredential(credential.id);
      }
    }
    if (agent.authorization)
      await this.authorizationPolicyService.delete(agent.authorization);

    return await this.agentRepository.remove(agent as Agent);
  }

  async saveAgent(agent: IAgent): Promise<IAgent> {
    return await this.agentRepository.save(agent);
  }

  async findAgentsWithMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<IAgent[]> {
    const matchingCredentials =
      await this.credentialService.findMatchingCredentials(credentialCriteria);

    const agents: IAgent[] = [];
    for (const match of matchingCredentials) {
      const agent = match.agent;
      if (agent) {
        agents.push(agent);
      }
    }
    return agents;
  }

  private getAgentCacheKey(agentId: string): string {
    return `@agent:id:${agentId}`;
  }

  private async getAgentFromCache(id: string): Promise<IAgent | undefined> {
    return await this.cacheManager.get<IAgent>(this.getAgentCacheKey(id));
  }

  private async setAgentCache(agent: IAgent): Promise<IAgent> {
    const cacheKey = this.getAgentCacheKey(agent.id);
    return await this.cacheManager.set<IAgent>(cacheKey, agent, {
      ttl: 60,
    });
  }

  async getAgentCredentials(
    agentID: string
  ): Promise<{ agent: IAgent; credentials: ICredential[] }> {
    let agent: IAgent | undefined = await this.getAgentFromCache(agentID);
    if (!agent || !agent.credentials) {
      agent = await this.getAgentOrFail(agentID, {
        relations: { credentials: true },
      });

      if (agent) {
        await this.setAgentCache(agent);
      }
      if (!agent.credentials) {
        throw new EntityNotInitializedException(
          `Agent not initialized: ${agentID}`,
          LogContext.AGENT
        );
      }
    }
    return { agent: agent, credentials: agent.credentials };
  }

  async grantCredential(
    grantCredentialData: GrantCredentialInput
  ): Promise<IAgent> {
    const { agent, credentials } = await this.getAgentCredentials(
      grantCredentialData.agentID
    );

    if (!grantCredentialData.resourceID) grantCredentialData.resourceID = '';

    // Check if the agent already has this credential type + Value
    for (const credential of credentials) {
      if (
        credential.type === grantCredentialData.type &&
        credential.resourceID === grantCredentialData.resourceID
      ) {
        throw new ValidationException(
          `Agent (${agent.parentDisplayID}) already has assigned credential: ${grantCredentialData.type}`,
          LogContext.AUTH
        );
      }
    }

    const credential = await this.credentialService.createCredential({
      type: grantCredentialData.type,
      resourceID: grantCredentialData.resourceID,
    });

    agent.credentials?.push(credential);
    await this.agentCacheService.updateAgentInfoCache(agent);
    await this.setAgentCache(agent);

    return await this.saveAgent(agent);
  }

  async revokeCredential(
    revokeCredentialData: RevokeCredentialInput
  ): Promise<IAgent> {
    const { agent, credentials } = await this.getAgentCredentials(
      revokeCredentialData.agentID
    );

    if (!revokeCredentialData.resourceID) revokeCredentialData.resourceID = '';

    const newCredentials: ICredential[] = [];
    for (const credential of credentials) {
      if (
        credential.type === revokeCredentialData.type &&
        credential.resourceID === revokeCredentialData.resourceID
      ) {
        await this.credentialService.deleteCredential(credential.id);
      } else {
        newCredentials.push(credential);
      }
    }
    agent.credentials = newCredentials;
    await this.agentCacheService.updateAgentInfoCache(agent);
    await this.setAgentCache(agent);

    return agent;
  }

  async hasValidCredential(
    agentID: string,
    credentialCriteria: CredentialsSearchInput
  ): Promise<boolean> {
    const { credentials } = await this.getAgentCredentials(agentID);

    for (const credential of credentials) {
      if (credential.type === credentialCriteria.type) {
        if (!credentialCriteria.resourceID) return true;
        if (credentialCriteria.resourceID === credential.resourceID)
          return true;
      }
    }

    return false;
  }

  @Profiling.api
  async createDidOnAgent(agent: IAgent): Promise<IAgent> {
    agent.password = Math.random().toString(36).substr(2, 10);

    agent.did = await this.walletManagerAdapter.createIdentity(agent.password);
    return await this.saveAgent(agent);
  }

  @Profiling.api
  async getVerifiedCredentials(agent: IAgent): Promise<IVerifiedCredential[]> {
    const verifiedCredentialsWalletMgr =
      await this.walletManagerAdapter.getVerifiedCredentials(
        agent.did,
        agent.password
      );
    const verifiedCredentials: IVerifiedCredential[] = [];
    for (const vcWalletMgr of verifiedCredentialsWalletMgr) {
      const verifiedCredential = new VerifiedCredential();
      verifiedCredential.name = vcWalletMgr.name;
      verifiedCredential.type = vcWalletMgr.type;
      verifiedCredential.issued = vcWalletMgr.issued;
      verifiedCredential.issuer = vcWalletMgr.issuer;
      verifiedCredential.expires = vcWalletMgr.expires;
      verifiedCredential.context = vcWalletMgr.context || '';
      verifiedCredential.claims =
        await this.verifiedCredentialService.getClaims(vcWalletMgr.claim);
      verifiedCredentials.push(verifiedCredential);
    }

    return verifiedCredentials;
  }

  @Profiling.api
  async beginCredentialRequestInteraction(
    issuerAgentID: string,
    credentialTypes: string[]
  ): Promise<AgentBeginVerifiedCredentialRequestOutput> {
    const issuerAgent = await this.getAgentOrFail(issuerAgentID);
    // todo: for now only support a single type per request; may want to enforce this.
    if (credentialTypes.length !== 1) {
      throw new SsiException(
        `[beginCredentialRequestInteraction]: Only a single credential must be requested: ${credentialTypes.length}`
      );
    }

    const requestedCredentialMetadata =
      this.trustRegistryAdapter.getVerifiedCredentialMetadata(
        credentialTypes[0]
      );
    const vcIssuer = requestedCredentialMetadata.issuer;
    const vcIssuerType =
      this.trustRegistryAdapter.getVcIssuerTypeOrFail(vcIssuer);

    const nonce = this.trustRegistryAdapter.generateNonceForInteraction();
    let uniqueCallbackURL =
      this.trustRegistryAdapter.generateCredentialRequestUrlJolocom(nonce);
    if (vcIssuerType === SsiIssuerType.SOVRHD) {
      uniqueCallbackURL =
        this.trustRegistryAdapter.generateCredentialRequestUrlSovrhd(nonce);
    }

    const agentWalletResponse =
      await this.walletManagerAdapter.beginCredentialRequestInteraction(
        issuerAgent.did,
        issuerAgent.password,
        uniqueCallbackURL,
        requestedCredentialMetadata
      );
    const clientResponse: AgentBeginVerifiedCredentialRequestOutput = {
      qrCodeImg: '',
      jwt: '',
    };

    // Adapt behaviour based on IssuerType
    const requestExpirationTtl =
      agentWalletResponse.expiresOn - new Date().getTime();
    if (vcIssuerType === SsiIssuerType.SOVRHD) {
      const sovrhdRegisterResponse =
        await this.ssiSovrhdAdapter.establishSession(uniqueCallbackURL);
      const interactionInfo: AgentInteractionVerifiedCredentialRequestSovrhd = {
        nonce: nonce,
        interactionId: agentWalletResponse.interactionId,
        agent: issuerAgent,
        sovrhdSessionId: sovrhdRegisterResponse.session,
        credentialType: requestedCredentialMetadata.uniqueType,
      };
      this.cacheManager.set<AgentInteractionVerifiedCredentialRequestSovrhd>(
        nonce,
        interactionInfo,
        {
          ttl: requestExpirationTtl,
        }
      );
      clientResponse.qrCodeImg = sovrhdRegisterResponse.qr;
    } else if (vcIssuerType === SsiIssuerType.JOLOCOM) {
      clientResponse.jwt = agentWalletResponse.jwt;
      const interactionInfo: AgentInteractionVerifiedCredentialRequestJolocom =
        {
          nonce: nonce,
          interactionId: agentWalletResponse.interactionId,
          agent: issuerAgent,
        };
      this.cacheManager.set<AgentInteractionVerifiedCredentialRequestJolocom>(
        nonce,
        interactionInfo,
        {
          ttl: requestExpirationTtl,
        }
      );
    }

    this.walletManagerAdapter.logVerifiedCredentialInteraction(
      agentWalletResponse.jwt,
      WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION,
      'begin'
    );

    return clientResponse;
  }

  private async getRequestInteractionJolocomInfoFromCache(
    nonce: string
  ): Promise<AgentInteractionVerifiedCredentialRequestJolocom> {
    const interactionInfo =
      await this.cacheManager.get<AgentInteractionVerifiedCredentialRequestJolocom>(
        nonce
      );
    if (!interactionInfo) {
      throw new SsiInteractionNotFound(
        `Unable to find interaction for nonce: ${nonce}`,
        LogContext.SSI
      );
    }
    const agent = interactionInfo.agent;
    if (!agent) {
      throw new Error('An agent could not be found for the interactionId');
    }

    this.logger.verbose?.(
      `Interaction with agent ${agent.did} retrieved`,
      LogContext.SSI
    );
    return interactionInfo;
  }

  private async getRequestInteractionSovrhdInfoFromCache(
    nonce: string
  ): Promise<AgentInteractionVerifiedCredentialRequestSovrhd> {
    const interactionInfo =
      await this.cacheManager.get<AgentInteractionVerifiedCredentialRequestSovrhd>(
        nonce
      );
    if (!interactionInfo) {
      throw new SsiInteractionNotFound(
        `Unable to find interaction for nonce: ${nonce}`,
        LogContext.SSI
      );
    }
    const agent = interactionInfo.agent;
    if (!agent) {
      throw new Error('An agent could not be found for the interactionId');
    }

    this.logger.verbose?.(
      `InteractionId with agent ${agent.did} retrieved`,
      LogContext.SSI
    );
    return interactionInfo;
  }

  async completeCredentialRequestInteractionJolocom(
    nonce: string,
    token: string
  ): Promise<void> {
    const interactionInfo =
      await this.getRequestInteractionJolocomInfoFromCache(nonce);

    this.walletManagerAdapter.logVerifiedCredentialInteraction(
      token,
      WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION_JOLOCOM,
      'response'
    );

    // Retrieve the credential to store
    const tokenDecoded: any = this.walletManagerAdapter.decodeJwt(token);
    const vcToBeStored = tokenDecoded.interactionToken.suppliedCredentials[0];
    const vcName = vcToBeStored.name;
    this.logger.verbose?.(
      `[completeCredentialRequestInteraction]: received VC with name '${vcName}' to be stored`,
      LogContext.SSI
    );

    this.validateTrustedIssuerOrFail(vcName, vcToBeStored);

    const agent = interactionInfo.agent;
    await this.walletManagerAdapter.completeCredentialRequestInteractionJolocom(
      agent.did,
      agent.password,
      interactionInfo?.interactionId,
      token
    );

    const eventID = `credentials-${getRandomId()}`;
    const payload: ProfileCredentialVerified = {
      eventID,
      vc: 'something something vc',
      userEmail: agent.parentDisplayID ?? '',
    };

    await this.subscriptionVerifiedCredentials.publish(
      SubscriptionType.PROFILE_VERIFIED_CREDENTIAL,
      payload
    );
  }

  async completeCredentialRequestInteractionSovrhd(
    nonce: string,
    data: any
  ): Promise<void> {
    const interactionInfo = await this.getRequestInteractionSovrhdInfoFromCache(
      nonce
    );

    this.logger.verbose?.(
      `sovhrd callback data: ${JSON.stringify(data)}`,
      LogContext.SSI_SOVRHD
    );
    if (data.id) {
      // assume the callback to establish the session
      await this.callbackCredentialRequestSovrhdSession(data, interactionInfo);
      return;
    } else {
      await this.callbackCredentialRequestSovrhdCredential(
        data,
        interactionInfo
      );
      return;
    }
  }

  async callbackCredentialRequestSovrhdSession(
    data: SsiSovrhdRegisterCallbackSession,
    interactionInfo: AgentInteractionVerifiedCredentialRequestSovrhd
  ): Promise<void> {
    const requestCredentialsResponse =
      await this.ssiSovrhdAdapter.requestCredentials(
        data.session,
        data.id,
        interactionInfo.credentialType
      );
    if (requestCredentialsResponse.result === 'ok') {
      // request has been made, await now the second call back
      return;
    }
  }

  async callbackCredentialRequestSovrhdCredential(
    data: SsiSovrhdRegisterCallbackCredential,
    interactionInfo: AgentInteractionVerifiedCredentialRequestSovrhd
  ): Promise<void> {
    this.logger.verbose?.(
      `Sovhrd credential callback: ${interactionInfo.credentialType}`,
      LogContext.SSI_SOVRHD
    );
    const validateCredential =
      this.ssiSovrhdAdapter.validateSovrhdCredentialResponse(data);
    if (!validateCredential) {
      return;
    }

    const credentials = data.content.verifiableCredential;
    this.logger.verbose?.(
      `Sovhrd credentials returned: ${credentials.length}`,
      LogContext.SSI_SOVRHD
    );

    const agent = interactionInfo.agent;
    await this.walletManagerAdapter.completeCredentialRequestInteractionSovrhd(
      agent.did,
      agent.password,
      interactionInfo?.interactionId,
      JSON.stringify(credentials[0]),
      interactionInfo.credentialType
    );

    const eventID = `credentials-${getRandomId()}`;
    const payload: ProfileCredentialVerified = {
      eventID,
      vc: 'something something vc',
      userEmail: agent.parentDisplayID ?? '',
    };

    await this.subscriptionVerifiedCredentials.publish(
      SubscriptionType.PROFILE_VERIFIED_CREDENTIAL,
      payload
    );
  }

  validateTrustedIssuerOrFail(vcName: string, vcToBeStored: any) {
    const trustedIssuerValidationEnabled = this.configService.get(
      ConfigurationTypes.SSI
    ).issuer_validation_enabled;
    if (!trustedIssuerValidationEnabled) return;

    const trustedIssuers =
      this.trustRegistryAdapter.getTrustedIssuersForCredentialNameOrFail(
        vcName
      );
    this.logger.verbose?.(
      `[completeCredentialRequestInteraction]: retrieved trusted issuers for VC with name '${vcName}': ${trustedIssuers}`,
      LogContext.SSI
    );
    const issuer = vcToBeStored.issuer;
    this.trustRegistryAdapter.validateIssuerOrFail(vcName, issuer);
  }

  @Profiling.api
  async beginCredentialOfferInteraction(
    issuerAgentID: string,
    credentials: { type: string; claims: IClaim[] }[]
  ): Promise<AgentBeginVerifiedCredentialOfferOutput> {
    if (!issuerAgentID || issuerAgentID.length == 0) {
      throw new AuthenticationException(
        'Unable to retrieve authenticated agent; no identifier',
        LogContext.AGENT
      );
    }
    const issuerAgent = await this.getAgentOrFail(issuerAgentID);

    const { nonce, uniqueCallbackURL } =
      this.trustRegistryAdapter.generateCredentialOfferUrl();

    const offeredCredentials =
      this.trustRegistryAdapter.getCredentialOffers(credentials);

    const credentialOfferResponse =
      await this.walletManagerAdapter.beingCredentialOfferInteraction(
        issuerAgent.did,
        issuerAgent.password,
        uniqueCallbackURL,
        offeredCredentials
      );

    const requestExpirationTtl =
      credentialOfferResponse.expiresOn - new Date().getTime();
    const interactionInfo: AgentInteractionVerifiedCredentialOffer = {
      nonce: nonce,
      issuer: SsiIssuerType.JOLOCOM,
      agent: issuerAgent,
      interactionId: credentialOfferResponse.interactionId,
      offeredCredentials: offeredCredentials,
    };
    this.cacheManager.set<AgentInteractionVerifiedCredentialOffer>(
      nonce,
      interactionInfo,
      {
        ttl: requestExpirationTtl,
      }
    );

    this.walletManagerAdapter.logVerifiedCredentialInteraction(
      credentialOfferResponse.jwt,
      WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION,
      'begin'
    );

    return { jwt: credentialOfferResponse.jwt, qrCodeImg: '' };
  }

  @Profiling.api
  async completeCredentialOfferInteraction(
    nonce: string,
    token: string
  ): Promise<any> {
    const interactionInfo =
      await this.cacheManager.get<AgentInteractionVerifiedCredentialOffer>(
        nonce
      );
    if (!interactionInfo) {
      throw new SsiInteractionNotFound(
        `Unable to locate intereaction: ${nonce}`,
        LogContext.SSI
      );
    }
    const interactionId = interactionInfo.interactionId;
    const agent = interactionInfo.agent;
    const offeredCredentials = interactionInfo.offeredCredentials;

    if (!agent || !offeredCredentials) {
      throw new Error('An agent could not be found for the interaction');
    }

    this.logger.verbose?.(
      `InteractionId with agent: ${interactionId} - ${
        agent.did
      } received ${token.substring(0, 25)}......`,
      LogContext.SSI
    );

    this.walletManagerAdapter.logVerifiedCredentialInteraction(
      token,
      WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION,
      '2-received'
    );

    return await this.walletManagerAdapter.completeCredentialOfferInteraction(
      agent?.did,
      agent?.password,
      interactionId,
      token,
      offeredCredentials.map(c => c.metadata)
    );
  }

  @Profiling.api
  async getSupportedCredentialMetadata(): Promise<CredentialMetadataOutput[]> {
    try {
      return this.trustRegistryAdapter
        .getSupportedCredentialMetadata()
        .map(x => ({
          ...x,
          context: JSON.stringify(x.context),
        }));
    } catch (err: any) {
      throw new SsiException(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION}]: Failed to offer credential: ${err.message}`
      );
    }
  }

  async ensureDidsCreated() {
    const agentsWithoutDids = await this.agentRepository.findBy({ did: '' });
    for (const agent of agentsWithoutDids) {
      await this.createDidOnAgent(agent);
    }
  }

  async countAgentsWithMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    return await this.credentialService.countMatchingCredentials(
      credentialCriteria
    );
  }
}
