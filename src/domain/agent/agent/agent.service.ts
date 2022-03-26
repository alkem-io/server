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
import { ProfileCredentialVerified } from '@domain/common/agent/agent.dto.profile.credential.verified';
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
import { IClaim } from '@services/platform/trust-registry/trust.registry.claim/claim.interface';
import { TrustRegistryAdapter } from '@services/platform/trust-registry/trust.registry.adapter/trust.registry.adapter';
import { GrantCredentialInput } from './dto/agent.dto.credential.grant';
import { RevokeCredentialInput } from './dto/agent.dto.credential.revoke';
import { AgentBeginVerifiedCredentialRequestOutput } from './dto/agent.dto.verified.credential.request.begin.output';
import { AgentBeginVerifiedCredentialOfferOutput } from './dto/agent.dto.verified.credential.offer.begin.output';
import { VerifiedCredentialService } from '../verified-credential/verified.credential.service';
import { IVerifiedCredential } from '../verified-credential/verified.credential.interface';
import { AgentInteractionVerifiedCredentialRequest } from './dto/agent.dto.interaction.verified.credential.request';
import { SsiIssuerType } from '@common/enums/ssi.issuer.type';
import { SsiInteractionNotFound } from '@common/exceptions/ssi.interaction.not.found';
import { AgentInteractionVerifiedCredentialOffer } from './dto/agent.dto.interaction.verified.credential.offer';
import { SsiSovrhdAdapter } from '@services/platform/ssi-sovrhd/ssi.sovrhd.adapter';
import { WalletManagerAdapter } from '@services/platform/wallet-manager-adapter/wallet.manager.adapter';
import { VerifiedCredential } from '../verified-credential/dto/verified.credential.dto.result';

@Injectable()
export class AgentService {
  constructor(
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
  ): Promise<IAgent> {
    const agent = await this.agentRepository.findOne({ id: agentID }, options);
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

  async getAgentCredentials(
    agentID: string
  ): Promise<{ agent: IAgent; credentials: ICredential[] }> {
    const agent = await this.getAgentOrFail(agentID, {
      relations: ['credentials'],
    });

    if (!agent.credentials) {
      throw new EntityNotInitializedException(
        `Agent not initialized: ${agentID}`,
        LogContext.AGENT
      );
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
    return agent;
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
    const { nonce, uniqueCallbackURL } =
      this.trustRegistryAdapter.generateCredentialRequestUrl();
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

    const agentWalletResponse =
      await this.walletManagerAdapter.beginCredentialRequestInteraction(
        issuerAgent.did,
        issuerAgent.password,
        uniqueCallbackURL
      );
    const clientResponse: AgentBeginVerifiedCredentialRequestOutput = {
      qrCodeImg: '',
      jwt: '',
    };
    const interactionInfo: AgentInteractionVerifiedCredentialRequest = {
      nonce: nonce,
      interactionId: agentWalletResponse.interactionId,
      issuer: vcIssuerType,
      agent: issuerAgent,
      sovrhdSessionId: '',
    };

    // Adapt behaviour based on IssuerType
    if (vcIssuerType === SsiIssuerType.SOVRHD) {
      const sovrhdRegisterResponse =
        await this.ssiSovrhdAdapter.establishSession(uniqueCallbackURL);
      interactionInfo.sovrhdSessionId = sovrhdRegisterResponse.session;
      clientResponse.qrCodeImg = sovrhdRegisterResponse.qr;
    } else if (vcIssuerType === SsiIssuerType.JOLOCOM) {
      clientResponse.jwt = agentWalletResponse.jwt;
    }

    const requestExpirationTtl =
      agentWalletResponse.expiresOn - new Date().getTime();
    this.cacheManager.set<AgentInteractionVerifiedCredentialRequest>(
      nonce,
      interactionInfo,
      {
        ttl: requestExpirationTtl,
      }
    );
    this.walletManagerAdapter.logVerifiedCredentialInteraction(
      agentWalletResponse.jwt,
      WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION,
      'begin'
    );

    return clientResponse;
  }

  @Profiling.api
  async completeCredentialRequestInteraction(
    nonce: string,
    token: string
  ): Promise<void> {
    const interactionInfo =
      await this.cacheManager.get<AgentInteractionVerifiedCredentialRequest>(
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
      `InteractionId with agent: ${interactionInfo} - ${
        agent.did
      } received ${token.substring(0, 25)}...`,
      LogContext.SSI
    );

    this.walletManagerAdapter.logVerifiedCredentialInteraction(
      token,
      WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION,
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

    await this.walletManagerAdapter.completeCredentialRequestInteraction(
      agent.did,
      agent.password,
      interactionInfo?.interactionId,
      token
    );

    const eventID = `credentials-${Math.floor(Math.random() * 100)}`;
    const payload: ProfileCredentialVerified = {
      eventID,
      vc: 'something something vc',
    };

    this.subscriptionVerifiedCredentials.publish(
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
        'Unable to retrieve authenticated agent; no identifier'
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

    return { jwt: credentialOfferResponse.jwt };
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
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION}]:Failed to offer credential: ${err.message}`
      );
    }
  }

  async ensureDidsCreated() {
    const agentsWithoutDids = await this.agentRepository.find({ did: '' });
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
