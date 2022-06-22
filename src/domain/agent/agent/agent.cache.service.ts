import { validateEmail } from '@common/utils';
import { AgentInfo } from '@core/authentication';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Agent, IAgent, ICredential } from '..';
@Injectable()
export class AgentCacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>
  ) {}

  public async getAgentInfoFromCache(
    email: string
  ): Promise<AgentInfo | undefined> {
    return await this.cacheManager.get<AgentInfo>(
      await this.getAgentInfoCacheKey(email)
    );
  }

  public async setAgentInfoCache(agentInfo: AgentInfo): Promise<AgentInfo> {
    return await this.cacheManager.set<AgentInfo>(
      await this.getAgentInfoCacheKey(agentInfo.email),
      agentInfo,
      {
        ttl: 1,
      }
    );
  }

  public async updateAgentInfoCache(
    agent: IAgent
  ): Promise<AgentInfo | undefined> {
    if (!agent.parentDisplayID)
      throw new Error('Agent parent not initialized correctly!');

    if (!validateEmail(agent.parentDisplayID)) return undefined;
    const { email } = await this.getAgentEmail(agent.id);

    const cachedAgentInfo = await this.getAgentInfoFromCache(
      await this.getAgentEmail(email)
    );

    if (!cachedAgentInfo) throw new Error('No entry found in cache!');

    cachedAgentInfo.credentials = agent.credentials as ICredential[];
    return await this.cacheManager.set<AgentInfo>(
      await this.getAgentInfoCacheKey(email),
      cachedAgentInfo,
      {
        ttl: 1,
      }
    );
  }

  private async getAgentInfoCacheKey(email: string): Promise<string> {
    return `@agentInfo:email:${email}`;
  }

  public getAgentEmail(agentId: string): Promise<any> {
    return this.agentRepository
      .createQueryBuilder('agent')
      .leftJoin('user.agent', 'user')
      .select(['user.email as email'])
      .where('agent.id = :agentId', { agentId: agentId })
      .getOne();
  }
}
