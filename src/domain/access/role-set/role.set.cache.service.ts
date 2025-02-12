import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class RoleSetCacheService {
  private readonly cache_ttl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {
    this.cache_ttl = this.configService.get(
      'collaboration.membership.cache_ttl',
      { infer: true }
    );
  }

  public async getMembershipFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<CommunityMembershipStatus | undefined> {
    return await this.cacheManager.get<CommunityMembershipStatus>(
      this.getMembershipStatusCacheKey(agentId, roleSetId)
    );
  }

  public async deleteAgentInfoFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getMembershipStatusCacheKey(agentId, roleSetId)
    );
  }

  public async setMembershipStatusCache(
    agentId: string,
    roleSetId: string,
    membershipStatus: CommunityMembershipStatus
  ): Promise<CommunityMembershipStatus> {
    const cacheKey = this.getMembershipStatusCacheKey(agentId, roleSetId);
    return await this.cacheManager.set<CommunityMembershipStatus>(
      cacheKey,
      membershipStatus,
      {
        ttl: this.cache_ttl,
      }
    );
  }

  private getMembershipStatusCacheKey(
    agentId: string,
    roleSetId: string
  ): string {
    return `membershipStatus:${agentId}:${roleSetId}`;
  }
}
