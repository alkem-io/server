import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Agent, CreateAgentInput, IAgent } from '@domain/agent/agent';
import { CredentialsSearchInput, ICredential } from '@domain/agent/credential';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AgentInfoCacheService } from '../../../core/authentication.agent.info/agent.info.cache.service';
import { CredentialService } from '../credential/credential.service';
import { GrantCredentialToAgentInput } from './dto/agent.dto.credential.grant';
import { RevokeCredentialInput } from './dto/agent.dto.credential.revoke';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { agents } from './agent.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AgentService {
  private readonly cache_ttl: number;

  constructor(
    private agentInfoCacheService: AgentInfoCacheService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private configService: ConfigService<AlkemioConfig, true>,
    private credentialService: CredentialService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache
  ) {
    this.cache_ttl = this.configService.get(
      'identity.authentication.cache_ttl',
      { infer: true }
    );
  }

  public async createAgent(inputData: CreateAgentInput): Promise<IAgent> {
    // a very weird type error is resolved by spreading the input
    const agent: IAgent = Agent.create({ ...inputData });
    agent.credentials = [];
    agent.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.AGENT
    );
    agent.type = inputData.type;

    return agent;
  }

  async getAgentOrFail(
    agentID: string,
    options?: { relations?: { credentials?: boolean } }
  ): Promise<IAgent | never> {
    const agent = await this.db.query.agents.findFirst({
      where: eq(agents.id, agentID),
      with: options?.relations?.credentials ? { credentials: true } : undefined,
    });
    if (!agent)
      throw new EntityNotFoundException(
        `No Agent found with the given id: ${agentID}`,
        LogContext.AGENT
      );
    return agent as unknown as IAgent;
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

    await this.db.delete(agents).where(eq(agents.id, agentID));
    return agent;
  }

  async saveAgent(agent: IAgent): Promise<IAgent> {
    if (agent.id) {
      const [updated] = await this.db
        .update(agents)
        .set({
          type: agent.type,
          authorizationId: agent.authorization?.id,
        })
        .where(eq(agents.id, agent.id))
        .returning();
      // Preserve in-memory relations not in DB
      return { ...agent, ...updated } as unknown as IAgent;
    } else {
      const [created] = await this.db
        .insert(agents)
        .values({
          type: agent.type,
          authorizationId: agent.authorization?.id,
        })
        .returning();
      // Preserve in-memory relations not in DB
      return { ...agent, ...created } as unknown as IAgent;
    }
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
      ttl: this.cache_ttl,
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

  /**
   * Batch-load credentials for multiple agents using a single Redis mget + batched DB fallback.
   * Returns a Map from agentID to its credentials array.
   */
  async getAgentCredentialsBatch(
    agentIDs: string[]
  ): Promise<Map<string, ICredential[]>> {
    const result = new Map<string, ICredential[]>();
    if (agentIDs.length === 0) return result;

    // 1. Build cache keys and attempt mget
    const cacheKeys = agentIDs.map(id => this.getAgentCacheKey(id));
    let cached: (IAgent | undefined)[];
    try {
      const mget = this.cacheManager.store.mget;
      cached = mget
        ? await mget<IAgent>(...cacheKeys)
        : await Promise.all(
            cacheKeys.map(k => this.cacheManager.get<IAgent>(k))
          );
    } catch (error) {
      this.logger.warn?.(
        `Agent cache mget failed, treating as cache miss: ${error}`,
        LogContext.AGENT
      );
      cached = new Array(agentIDs.length).fill(undefined);
    }

    // 2. Separate hits from misses
    const missedIDs: string[] = [];
    for (let i = 0; i < agentIDs.length; i++) {
      const agent = cached[i];
      if (agent?.credentials) {
        result.set(agentIDs[i], agent.credentials);
      } else {
        missedIDs.push(agentIDs[i]);
      }
    }

    if (missedIDs.length === 0) return result;

    // 3. Batch DB load for cache misses
    const agents = await this.agentRepository.find({
      where: { id: In(missedIDs) },
      relations: { credentials: true },
    });

    // 4. Populate result + warm cache
    for (const agent of agents) {
      if (agent.credentials) {
        result.set(agent.id, agent.credentials);
      }
      await this.setAgentCache(agent);
    }

    // 5. For any IDs that weren't in DB either, set empty
    for (const id of missedIDs) {
      if (!result.has(id)) {
        result.set(id, []);
      }
    }

    return result;
  }

  /**
   *
   * @param grantCredentialData
   * @throws ValidationException If the agent already has a credential of the same type AND resourceID
   */
  async grantCredentialOrFail(
    grantCredentialData: GrantCredentialToAgentInput
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
          'Agent already has credential of this type on this resource',
          LogContext.AUTH,
          {
            agentId: agent.id,
            credentialType: grantCredentialData.type,
            resourceID: grantCredentialData.resourceID,
          }
        );
      }
    }

    const credential =
      await this.credentialService.createCredential(grantCredentialData);
    credential.agent = agent;
    await this.credentialService.save(credential);
    const agentWithCredential = await this.getAgentOrFail(agent.id);
    await this.agentInfoCacheService.updateAgentInfoCache(agentWithCredential);
    await this.setAgentCache(agentWithCredential);

    return agentWithCredential;
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
    await this.agentInfoCacheService.updateAgentInfoCache(agent);
    await this.setAgentCache(agent);

    return await this.saveAgent(agent);
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

  async countAgentsWithMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    return await this.credentialService.countMatchingCredentials(
      credentialCriteria
    );
  }

  async countAgentsWithMatchingCredentialsBatch(
    criteriaList: CredentialsSearchInput[]
  ): Promise<Map<string, number>> {
    return await this.credentialService.countMatchingCredentialsBatch(
      criteriaList
    );
  }
}
