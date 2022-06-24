import { ConfigurationTypes } from '@common/enums/configuration.type';
import { LogContext } from '@common/enums/logging.context';
import { AgentInfo } from '@core/authentication';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getConnection } from 'typeorm';
import { IAgent, ICredential } from '..';
@Injectable()
export class AgentCacheService {
  private readonly cache_ttl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService
  ) {
    this.cache_ttl = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.cache_ttl;
  }

  public async getAgentInfoFromCache(
    email: string
  ): Promise<AgentInfo | undefined> {
    return await this.cacheManager.get<AgentInfo>(
      this.getAgentInfoCacheKey(email)
    );
  }

  public async setAgentInfoCache(agentInfo: AgentInfo): Promise<AgentInfo> {
    return await this.cacheManager.set<AgentInfo>(
      this.getAgentInfoCacheKey(agentInfo.email),
      agentInfo,
      {
        ttl: this.cache_ttl,
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
      this.getAgentInfoCacheKey(email),
      cachedAgentInfo,
      {
        ttl: this.cache_ttl,
      }
    );
  }

  private getAgentInfoCacheKey(email: string): string {
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
