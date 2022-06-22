import { LogContext } from '@common/enums/logging.context';
import { AgentInfo } from '@core/authentication';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getConnection } from 'typeorm';
import { IAgent, ICredential } from '..';
@Injectable()
export class AgentCacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
    const email = await this.getAgentEmail(agent.id);

    if (!email) return undefined;

    const cachedAgentInfo = await this.getAgentInfoFromCache(email);

    if (!cachedAgentInfo) {
      this.logger.verbose?.(
        `No user cache found for user ${email}. Skipping cache update!`,
        LogContext.AGENT
      );

      return undefined;
    }

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

  public async getAgentEmail(agentId: string): Promise<string | undefined> {
    const users: { email: string }[] = await getConnection().query(
      `SELECT \`u\`.\`email\` FROM \`agent\` as \`a\`
      RIGHT JOIN \`user\` as \`u\`
      ON \`u\`.\`agentId\` = \`a\`.\`id\`
      WHERE \`a\`.\`id\` = '${agentId}'`
    );

    if (!users[0]) return undefined;

    return users[0].email;
  }
}
