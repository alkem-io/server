import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IInvitation } from '../invitation';
import { RoleName } from '@common/enums/role.name';
import { IApplication } from '../application';

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

  public async getMembershipStatusFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<CommunityMembershipStatus | undefined> {
    return await this.cacheManager.get<CommunityMembershipStatus>(
      this.getMembershipStatusCacheKey(agentId, roleSetId)
    );
  }

  public async getOpenInvitationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<IInvitation | undefined> {
    return await this.cacheManager.get<IInvitation>(
      this.getOpenInvitationCacheKey(userId, roleSetId)
    );
  }

  public async getOpenApplicationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<IApplication | undefined> {
    return await this.cacheManager.get<IApplication>(
      this.getOpenApplicationCacheKey(userId, roleSetId)
    );
  }

  public async getAgentRolesFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<RoleName[] | undefined> {
    return await this.cacheManager.get<RoleName[]>(
      this.getAgentRolesCacheKey(agentId, roleSetId)
    );
  }

  public async getAgentIsMemberFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<boolean | undefined> {
    return await this.cacheManager.get<boolean>(
      this.getAgentIsMemberCacheKey(agentId, roleSetId)
    );
  }

  public async deleteMembershipStatusFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getMembershipStatusCacheKey(agentId, roleSetId)
    );
  }

  public async deleteAgentRolesFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getAgentRolesCacheKey(agentId, roleSetId)
    );
  }

  public async deleteOpenInvitationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getOpenInvitationCacheKey(userId, roleSetId)
    );
  }

  public async deleteOpenApplicationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getOpenApplicationCacheKey(userId, roleSetId)
    );
  }

  public async deleteAgentIsMemberFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<any> {
    return await this.cacheManager.del(
      this.getAgentIsMemberCacheKey(agentId, roleSetId)
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

  public async setOpenInvitationCache(
    userId: string,
    roleSetId: string,
    invitation: IInvitation
  ): Promise<IInvitation> {
    const cacheKey = this.getOpenInvitationCacheKey(userId, roleSetId);
    return await this.cacheManager.set<IInvitation>(cacheKey, invitation, {
      ttl: this.cache_ttl,
    });
  }

  public async setOpenApplicationCache(
    userId: string,
    roleSetId: string,
    application: IApplication
  ): Promise<IApplication> {
    const cacheKey = this.getOpenApplicationCacheKey(userId, roleSetId);
    return await this.cacheManager.set<IApplication>(cacheKey, application, {
      ttl: this.cache_ttl,
    });
  }

  public async setAgentRolesCache(
    agentId: string,
    roleSetId: string,
    roles: RoleName[]
  ): Promise<RoleName[]> {
    const cacheKey = this.getAgentRolesCacheKey(agentId, roleSetId);
    return await this.cacheManager.set<RoleName[]>(cacheKey, roles, {
      ttl: this.cache_ttl,
    });
  }

  public async setAgentIsMemberCache(
    agentId: string,
    roleSetId: string,
    isMember: boolean
  ): Promise<boolean> {
    const cacheKey = this.getAgentIsMemberCacheKey(agentId, roleSetId);
    return await this.cacheManager.set<boolean>(cacheKey, isMember, {
      ttl: this.cache_ttl,
    });
  }

  private getMembershipStatusCacheKey(
    agentId: string,
    roleSetId: string
  ): string {
    return `membershipStatus:${agentId}:${roleSetId}`;
  }

  private getOpenInvitationCacheKey(userId: string, roleSetId: string): string {
    return `openInvitation:${userId}:${roleSetId}`;
  }

  private getOpenApplicationCacheKey(
    userId: string,
    roleSetId: string
  ): string {
    return `openApplication:${userId}:${roleSetId}`;
  }

  private getAgentRolesCacheKey(agentId: string, roleSetId: string): string {
    return `agentRoles:${agentId}:${roleSetId}`;
  }

  private getAgentIsMemberCacheKey(agentId: string, roleSetId: string): string {
    return `isMember:${agentId}:${roleSetId}`;
  }
}
