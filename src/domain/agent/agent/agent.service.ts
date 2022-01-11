import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import {
  Agent,
  IAgent,
  RevokeCredentialInput,
  GrantCredentialInput,
  CreateAgentInput,
} from '@domain/agent/agent';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { CredentialService } from '../credential/credential.service';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { VerifiedCredential } from '@src/services/platform/ssi/agent';
import { ConfigService } from '@nestjs/config';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { ClientProxy } from '@nestjs/microservices';
import { WALLET_MANAGEMENT_SERVICE } from '@common/constants';
import { from, tap, catchError } from 'rxjs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAgent(inputData: CreateAgentInput): Promise<IAgent> {
    const agent: IAgent = Agent.create(inputData);
    agent.credentials = [];
    agent.authorization = new AuthorizationPolicy();

    const ssiEnabled = this.configService.get(ConfigurationTypes.IDENTITY).ssi
      .enabled;

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

  async createDidOnAgent(agent: IAgent): Promise<IAgent> {
    agent.password = Math.random().toString(36).substr(2, 10);

    return new Promise((resolve, _reject) =>
      from(
        this.walletManagementClient
          .send(
            { cmd: 'createIdentity' },
            {
              password: agent.password,
            }
          )
          .pipe(
            tap(async did => {
              agent.did = await did;
              await this.saveAgent(agent);
              resolve(agent);
            }),
            catchError(err => {
              this.logger.error(
                `Failed to get identity info from wallet manager: ${err}`,
                LogContext.SSI
              );
              throw new Error(err.message);
            })
          )
      ).subscribe()
    );
  }

  async getVerifiedCredentials(agent: IAgent): Promise<VerifiedCredential[]> {
    return new Promise((resolve, _reject) =>
      from(
        this.walletManagementClient
          .send(
            { cmd: 'getIdentityInfo' },
            {
              did: agent.did,
              password: agent.password,
            }
          )
          .pipe(
            tap(identityInfo => {
              resolve(identityInfo.verifiedCredentials);
            }),
            catchError(err => {
              this.logger.error(
                `Failed to get identity info from wallet manager: ${err}`,
                LogContext.SSI
              );
              throw new Error(err.message);
            })
          )
      ).subscribe()
    );
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
