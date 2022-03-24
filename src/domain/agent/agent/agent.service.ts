import { PubSubEngine } from 'graphql-subscriptions';
import {
  SUBSCRIPTION_PROFILE_VERIFIED_CREDENTIAL,
  WALLET_MANAGEMENT_SERVICE,
} from '@common/constants';
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
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { firstValueFrom } from 'rxjs';
import { FindOneOptions, Repository } from 'typeorm';
import { CredentialService } from '../credential/credential.service';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { WalletManagerCommand } from '@common/enums/wallet.manager.command';
import { CredentialMetadataOutput } from '../verified-credential/dto/verified.credential.dto.metadata';
import jwt_decode from 'jwt-decode';
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

@Injectable()
export class AgentService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private configService: ConfigService,
    private credentialService: CredentialService,
    @Inject(WALLET_MANAGEMENT_SERVICE)
    private walletManagementClient: ClientProxy,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    private trustRegistryAdapter: TrustRegistryAdapter,
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

    const did$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.CREATE_IDENTITY },
      {
        password: agent.password,
      }
    );

    try {
      const did = await firstValueFrom(did$);
      agent.did = did;
      return await this.saveAgent(agent);
    } catch (err: any) {
      throw new SsiException(`Failed to create DID on agent: ${err.message}`);
    }
  }

  @Profiling.api
  async getVerifiedCredentials(agent: IAgent): Promise<IVerifiedCredential[]> {
    const credentialMetadata =
      this.trustRegistryAdapter.getSupportedCredentialMetadata();

    const identityInfo$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.GET_IDENTITY_INFO },
      {
        did: agent.did,
        password: agent.password,
        credentialMetadata: credentialMetadata,
      }
    );

    try {
      const verifiedCredentials: IVerifiedCredential[] = await firstValueFrom(
        identityInfo$
      );
      for (const vc of verifiedCredentials) {
        vc.claims = await this.verifiedCredentialService.getClaims(vc.claim);
      }

      return verifiedCredentials;
    } catch (err: any) {
      throw new SsiException(
        `Failed to get identity info from wallet manager: ${err.message}`
      );
    }
  }

  @Profiling.api
  async beginCredentialRequestInteraction(
    issuerAgentID: string,
    credentialTypes: string[]
  ): Promise<AgentBeginVerifiedCredentialRequestOutput> {
    const { nonce, uniqueCallbackURL } =
      this.trustRegistryAdapter.generateCredentialRequestUrl();
    const issuerAgent = await this.getAgentOrFail(issuerAgentID);
    const credentialRequest$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION },
      {
        issuerDId: issuerAgent.did,
        issuerPassword: issuerAgent.password,
        credentialMetadata:
          this.trustRegistryAdapter.getSupportedCredentialMetadata(
            credentialTypes
          ),
        uniqueCallbackURL: uniqueCallbackURL,
      }
    );

    try {
      const request =
        await firstValueFrom<AgentBeginVerifiedCredentialRequestOutput>(
          credentialRequest$
        );

      const requestExpirationTtl = request.expiresOn - new Date().getTime();
      const interactionInfo: AgentInteractionVerifiedCredentialRequest = {
        nonce: nonce,
        interactionId: request.interactionId,
        issuer: SsiIssuerType.JOLOCOM,
        agent: issuerAgent,
      };
      this.cacheManager.set<AgentInteractionVerifiedCredentialRequest>(
        nonce,
        interactionInfo,
        {
          ttl: requestExpirationTtl,
        }
      );
      this.logVerifiedCredentialInteraction(
        request.jwt,
        WalletManagerCommand.BEGIN_CREDENTIAL_REQUEST_INTERACTION,
        'begin'
      );

      return request;
    } catch (err: any) {
      throw new SsiException(
        `[beginCredentialRequestInteraction]: Failed to request credential: ${err.message}`
      );
    }
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

    this.logVerifiedCredentialInteraction(
      token,
      WalletManagerCommand.COMPLETE_CREDENTIAL_REQUEST_INTERACTION,
      'response'
    );

    // Retrieve the credential to store
    const tokenDecoded: any = jwt_decode(token);
    const vcToBeStored = tokenDecoded.interactionToken.suppliedCredentials[0];
    const vcName = vcToBeStored.name;
    this.logger.verbose?.(
      `[completeCredentialRequestInteraction]: received VC with name '${vcName}' to be stored`,
      LogContext.SSI
    );

    this.validateTrustedIssuerOrFail(vcName, vcToBeStored);

    const credentialStoreRequest$ = this.walletManagementClient.send(
      { cmd: RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION },
      {
        interactionId: interactionInfo?.interactionId,
        jwt: token,
      }
    );

    try {
      const result = await firstValueFrom<boolean>(credentialStoreRequest$);
      this.logger.verbose?.(
        `[RestEndpoint.COMPLETE_CREDENTIAL_REQUEST_INTERACTION] - completed with result: ${result}`,
        LogContext.AGENT
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
    } catch (err: any) {
      throw new SsiException(
        `[completeCredentialRequestInteraction]: Failed to request credential: ${err.message}`
      );
    }
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

  private logVerifiedCredentialInteraction(
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

    const credentialOffer$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION },
      {
        issuerDId: issuerAgent.did,
        issuerPassword: issuerAgent.password,
        offeredCredentials: offeredCredentials,
        uniqueCallbackURL: uniqueCallbackURL,
      }
    );

    try {
      const request =
        await firstValueFrom<AgentBeginVerifiedCredentialOfferOutput>(
          credentialOffer$
        );

      const requestExpirationTtl = request.expiresOn - new Date().getTime();
      const interactionInfo: AgentInteractionVerifiedCredentialOffer = {
        nonce: nonce,
        issuer: SsiIssuerType.JOLOCOM,
        agent: issuerAgent,
        interactionId: request.interactionId,
        offeredCredentials: offeredCredentials,
      };
      this.cacheManager.set<AgentInteractionVerifiedCredentialOffer>(
        nonce,
        interactionInfo,
        {
          ttl: requestExpirationTtl,
        }
      );

      this.logVerifiedCredentialInteraction(
        request.jwt,
        WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION,
        'begin'
      );

      return request;
    } catch (err: any) {
      throw new SsiException(
        `[${WalletManagerCommand.BEGIN_CREDENTIAL_OFFER_INTERACTION}]: Failed to offer credential: ${err.message}`
      );
    }
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

    this.logVerifiedCredentialInteraction(
      token,
      WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION,
      '2-received'
    );

    const credentialOfferSelection$ = this.walletManagementClient.send(
      { cmd: RestEndpoint.COMPLETE_CREDENTIAL_OFFER_INTERACTION },
      {
        interactionId: interactionId,
        credentialMetadata: offeredCredentials.map(c => c.metadata),
        jwt: token,
      }
    );

    try {
      const result = await firstValueFrom(credentialOfferSelection$);
      this.logVerifiedCredentialInteraction(
        result.token,
        WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION,
        '3-completed'
      );
      return result;
    } catch (err: any) {
      throw new SsiException(
        `[${WalletManagerCommand.COMPLETE_CREDENTIAL_OFFER_INTERACTION}]:Failed to offer credential: ${err.message}`
      );
    }
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

  @Profiling.api
  async issueVerifiedCredential(
    issuerAgent: IAgent,
    receiverAgent: IAgent,
    credentialType: string,
    credentialName: string,
    credentialContext: any
  ): Promise<void> {
    const credentialRequest$ = this.walletManagementClient.send(
      { cmd: WalletManagerCommand.ISSUE_VERIFIED_CREDENTIAL },
      {
        issuerDId: issuerAgent.did,
        issuerPassword: issuerAgent.password,
        receiverDId: receiverAgent.did,
        receiverPassword: receiverAgent.password,
        types: credentialType,
        name: credentialName,
        context: credentialContext,
      }
    );

    try {
      await firstValueFrom(credentialRequest$);
    } catch (err: any) {
      throw new SsiException(`Failed to issue credential: ${err.message}`);
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
