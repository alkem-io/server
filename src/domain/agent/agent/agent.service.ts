import { Injectable } from '@nestjs/common';
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
  RemoveCredentialInput,
  AssignCredentialInput,
} from '@domain/agent/agent';
import { LogContext } from '@common/enums';
import { CredentialService } from '../credential/credential.service';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { SsiAgentService } from '@src/services/ssi/agent/agent.service';

@Injectable()
export class AgentService {
  constructor(
    private credentialService: CredentialService,
    private ssiAgentService: SsiAgentService,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>
  ) {}

  async createAgent(): Promise<IAgent> {
    const agent: IAgent = new Agent();
    agent.credentials = [];

    return await this.saveAgent(agent);
  }

  async getAgentOrFail(
    agentID: number,
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

  async deleteAgent(agentID: number): Promise<IAgent> {
    // Note need to load it in with all contained entities so can remove fully
    const agent = await this.getAgentOrFail(agentID);

    // Remove all credentials
    if (agent.credentials) {
      for (const credential of agent.credentials) {
        await this.credentialService.deleteCredential(credential.id);
      }
    }

    return await this.agentRepository.remove(agent as Agent);
  }

  async saveAgent(agent: IAgent): Promise<IAgent> {
    return await this.agentRepository.save(agent);
  }

  async findAgentsWithMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<IAgent[]> {
    const matchingCredentials = await this.credentialService.findMatchingCredentials(
      credentialCriteria
    );

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
    agentID: number
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

  async assignCredential(
    assignCredentialData: AssignCredentialInput
  ): Promise<IAgent> {
    const { agent, credentials } = await this.getAgentCredentials(
      assignCredentialData.agentID
    );

    if (!assignCredentialData.resourceID) assignCredentialData.resourceID = -1;

    // Check if the agent already has this credential type + Value
    for (const credential of credentials) {
      if (
        credential.type === assignCredentialData.type &&
        credential.resourceID == assignCredentialData.resourceID
      ) {
        throw new ValidationException(
          `Agent for user (${
            (agent as Agent).user?.email
          }) already has assigned credential: ${assignCredentialData.type}`,
          LogContext.AUTH
        );
      }
    }

    const credential = await this.credentialService.createCredential({
      type: assignCredentialData.type,
      resourceID: assignCredentialData.resourceID,
    });

    agent.credentials?.push(credential);

    return await this.saveAgent(agent);
  }

  async removeCredential(
    removeCredentialData: RemoveCredentialInput
  ): Promise<IAgent> {
    const { agent, credentials } = await this.getAgentCredentials(
      removeCredentialData.agentID
    );

    if (!removeCredentialData.resourceID) removeCredentialData.resourceID = -1;

    for (const credential of credentials) {
      if (
        credential.type === removeCredentialData.type &&
        credential.resourceID == removeCredentialData.resourceID
      ) {
        await this.credentialService.deleteCredential(credential.id);
      }
    }

    return agent;
  }

  async hasValidCredential(
    userID: number,
    credentialCriteria: CredentialsSearchInput
  ): Promise<boolean> {
    const { credentials } = await this.getAgentCredentials(userID);

    for (const credential of credentials) {
      if (credential.type === credentialCriteria.type) {
        if (!credentialCriteria.resourceID) return true;
        if (credentialCriteria.resourceID == credential.resourceID) return true;
      }
    }

    return false;
  }

  async createDidOnAgent(agent: IAgent): Promise<IAgent> {
    agent.password = Math.random()
      .toString(36)
      .substr(2, 10);

    agent.did = await this.ssiAgentService.createIdentity(agent.password);
    return await this.saveAgent(agent);
  }
}
