import { LogContext } from '@common/enums/logging.context';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { EntityManager } from 'typeorm';
import { IAgent, ICredential } from '../../domain/agent';
import { AgentInfo } from './agent.info';
@Injectable()
export class AgentInfoCacheService {
  private readonly cache_ttl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {
    this.cache_ttl = this.configService.get(
      'identity.authentication.cache_ttl',
      { infer: true }
    );
  }

  /**
   * Retrieves cached AgentInfo by authenticationID (Kratos identity ID).
   * @param authenticationID - The Kratos identity ID used as cache key
   */
  public async getAgentInfoFromCache(
    authenticationID: string
  ): Promise<AgentInfo | undefined> {
    return await this.cacheManager.get<AgentInfo>(
      this.getAgentInfoCacheKey(authenticationID)
    );
  }

  /**
   * Deletes cached AgentInfo by authenticationID.
   * @param authenticationID - The Kratos identity ID used as cache key
   */
  public async deleteAgentInfoFromCache(
    authenticationID: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getAgentInfoCacheKey(authenticationID)
    );
  }

  /**
   * Caches AgentInfo using the authenticationID as key.
   * Only caches if authenticationID is present (authenticated users only).
   */
  public async setAgentInfoCache(agentInfo: AgentInfo): Promise<AgentInfo> {
    if (!agentInfo.authenticationID) {
      // Don't cache users without authenticationID (guests, anonymous, unlinked)
      return agentInfo;
    }
    const cacheKey = this.getAgentInfoCacheKey(agentInfo.authenticationID);
    return await this.cacheManager.set<AgentInfo>(cacheKey, agentInfo, {
      ttl: this.cache_ttl,
    });
  }

  /**
   * Updates cached AgentInfo credentials when an agent's credentials change.
   * Looks up the user's authenticationID via the agent, then updates the cache.
   */
  public async updateAgentInfoCache(
    agent: IAgent
  ): Promise<AgentInfo | undefined> {
    const authenticationID = await this.getAuthenticationIdForAgent(agent.id);

    if (!authenticationID) {
      this.logger.verbose?.(
        `No authenticationID found for agent ${agent.id}. Skipping cache update.`,
        LogContext.AGENT
      );
      return undefined;
    }

    const cachedAgentInfo = await this.getAgentInfoFromCache(authenticationID);
    if (!cachedAgentInfo) {
      this.logger.verbose?.(
        'No cache entry found for authenticationID. Skipping cache update.',
        LogContext.AGENT
      );
      return undefined;
    }

    cachedAgentInfo.credentials = agent.credentials as ICredential[];
    return await this.setAgentInfoCache(cachedAgentInfo);
  }

  /**
   * Cache key uses authenticationID (Kratos identity ID) - stable across email changes.
   */
  private getAgentInfoCacheKey(authenticationID: string): string {
    return `@agentInfo:authId:${authenticationID}`;
  }

  /**
   * Looks up the user's authenticationID given an agent ID.
   * Used when updating cache after credential changes.
   */
  private async getAuthenticationIdForAgent(
    agentId: string
  ): Promise<string | undefined> {
    const users: { authenticationID: string | null }[] =
      await this.entityManager.connection.query(
        `SELECT "u"."authenticationID" FROM "agent" as "a"
        RIGHT JOIN "user" as "u"
        ON "u"."agentId" = "a"."id"
        WHERE "a"."id" = $1`,
        [agentId]
      );

    if (!users[0] || !users[0].authenticationID) return undefined;

    return users[0].authenticationID;
  }
}
