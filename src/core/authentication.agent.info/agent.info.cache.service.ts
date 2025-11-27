import { LogContext } from '@common/enums/logging.context';
import { AgentInfo } from './agent.info';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { EntityManager } from 'typeorm';
import { IAgent, ICredential } from '../../domain/agent';
import { AlkemioConfig } from '@src/types';
@Injectable()
export class AgentInfoCacheService {
  private readonly cache_ttl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    // @Inject(REDIS_LOCK_SERVICE)
    // private readonly redisLockService: Redlock,
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

  public async getAgentInfoFromCache(
    authenticationID: string
  ): Promise<AgentInfo | undefined> {
    return await this.cacheManager.get<AgentInfo>(
      this.getAgentInfoCacheKey(authenticationID)
    );
  }

  public async deleteAgentInfoFromCache(
    authenticationID: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getAgentInfoCacheKey(authenticationID)
    );
  }

  public async setAgentInfoCache(agentInfo: AgentInfo): Promise<AgentInfo> {
    if (!agentInfo.authenticationID) {
      this.logger.warn?.(
        'Attempted to cache AgentInfo without authenticationID',
        LogContext.AUTH
      );
      return agentInfo;
    }
    const cacheKey = this.getAgentInfoCacheKey(agentInfo.authenticationID);
    return await this.cacheManager.set<AgentInfo>(cacheKey, agentInfo, {
      ttl: this.cache_ttl,
    });
  }

  //toDo add redis distributed to lock to make the code thread-safe
  //https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2021

  // public async setAgentInfoCache(
  //   agentInfo: AgentInfo
  // ): Promise<AgentInfo | undefined> {
  //   let updatedAgentInfo: AgentInfo = new AgentInfo();
  //   const cacheKey = this.getAgentInfoCacheKey(agentInfo.authenticationID);

  //   let lock;
  //   try {
  //     lock = await this.redisLockService.acquire([`lock:${cacheKey}`], 2000);
  //   } catch (error) {
  //     this.logger.verbose?.(
  //       `Couldn't acquire redis lock: ${error}`,
  //       LogContext.AUTH
  //     );
  //     return undefined;
  //   }

  //   try {
  //     updatedAgentInfo = await this.cacheManager.set<AgentInfo>(
  //       cacheKey,
  //       agentInfo,
  //       {
  //         ttl: this.cache_ttl,
  //       }
  //     );
  //   } catch (error) {
  //     this.logger.error(`Couldn't update cache: ${error}`, LogContext.AUTH);
  //     return undefined;
  //   } finally {
  //     await lock?.release();
  //   }
  // await this.redisLockService.using(
  //   [cacheKey],
  //   1000,
  //   async (signal: RedlockAbortSignal) => {
  //     if (signal.aborted) {
  //       throw signal.error;
  //     }

  //     updatedAgentInfo = await this.cacheManager.set<AgentInfo>(
  //       cacheKey,
  //       agentInfo,
  //       {
  //         ttl: this.cache_ttl,
  //       }
  //     );
  //   }
  // );
  //   return updatedAgentInfo;
  // }

  public async updateAgentInfoCache(
    agent: IAgent
  ): Promise<AgentInfo | undefined> {
    const authenticationID = await this.getAgentAuthenticationID(agent.id);

    if (!authenticationID) return undefined;

    const cachedAgentInfo = await this.getAgentInfoFromCache(authenticationID);
    await this.cacheManager.store;
    if (!cachedAgentInfo) {
      this.logger.verbose?.(
        `No user cache found for user ${authenticationID}. Skipping cache update!`,
        LogContext.AGENT
      );

      return undefined;
    }

    cachedAgentInfo.credentials = agent.credentials as ICredential[];
    return await this.setAgentInfoCache(cachedAgentInfo);
  }

  private getAgentInfoCacheKey(authenticationID: string): string {
    return `@agentInfo:authId:${authenticationID}`;
  }

  public async getAgentAuthenticationID(
    agentId: string
  ): Promise<string | undefined> {
    const users: { authenticationID: string }[] =
      await this.entityManager.connection.query(
        `SELECT \`u\`.\`authenticationID\` FROM \`agent\` as \`a\`
      RIGHT JOIN \`user\` as \`u\`
      ON \`u\`.\`agentId\` = \`a\`.\`id\`
      WHERE \`a\`.\`id\` = ?`,
        [agentId]
      );

    if (!users[0]) return undefined;

    return users[0].authenticationID;
  }
}
