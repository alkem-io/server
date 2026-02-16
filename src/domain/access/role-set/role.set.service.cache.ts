import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { LogContext } from '@common/enums/logging.context';
import { RoleName } from '@common/enums/role.name';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IApplication } from '../application';
import { IInvitation } from '../invitation';

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
      {
        infer: true,
      }
    );
  }

  /* Generic Cache Helpers */

  /**
   * Get a value from cache.
   * @param key - Cache key
   * @returns Cached value of type T or undefined if not found/error.
   */
  private async cacheGet<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.warn?.(
        `RoleSet cache read failed for key ${key}: ${error}`,
        LogContext.COMMUNITY
      );
      return undefined;
    }
  }

  /**
   * Get multiple values from cache in a single round-trip.
   * Falls back to sequential gets if the store doesn't support mget.
   */
  private async cacheMget<T>(keys: string[]): Promise<(T | undefined)[]> {
    if (keys.length === 0) return [];
    const mget = this.cacheManager.store.mget;
    if (mget) {
      try {
        return await mget<T>(...keys);
      } catch (error) {
        this.logger.warn?.(
          `RoleSet cache mget failed, treating as cache miss: ${error}`,
          LogContext.COMMUNITY
        );
        return new Array(keys.length).fill(undefined);
      }
    }
    // Fallback: individual gets — each one is independently resilient via cacheGet
    return Promise.all(keys.map(k => this.cacheGet<T>(k)));
  }

  /**
   * Set a value in cache.
   * @param key - Cache key
   * @param value - Value to cache
   * @returns The cached value.
   */
  private async cacheSet<T>(key: string, value: T): Promise<T> {
    try {
      return await this.cacheManager.set<T>(key, value, { ttl: this.cache_ttl });
    } catch (error) {
      this.logger.warn?.(
        `RoleSet cache write failed for key ${key}: ${error}`,
        LogContext.COMMUNITY
      );
      return value;
    }
  }

  /**
   * Delete a value from cache.
   * @param key - Cache key
   * @returns Promise resolving when deletion is complete.
   */
  private cacheDel(key: string): Promise<any> {
    return this.cacheManager.del(key);
  }

  /* Key Generation Helpers */

  /**
   * Generate a cache key for a given prefix and identifiers.
   * @param prefix - Prefix for the key
   * @param id1 - First identifier (agentId or userId)
   * @param roleSetId - Role set identifier.
   * @returns A string representing the cache key.
   */
  private getCacheKey(prefix: string, id1: string, roleSetId: string): string {
    return `${prefix}:${id1}:${roleSetId}`;
  }

  private getMembershipStatusCacheKey(
    agentId: string,
    roleSetId: string
  ): string {
    return this.getCacheKey('membershipStatus', agentId, roleSetId);
  }

  private getOpenInvitationCacheKey(userId: string, roleSetId: string): string {
    return this.getCacheKey('openInvitation', userId, roleSetId);
  }

  private getOpenApplicationCacheKey(
    userId: string,
    roleSetId: string
  ): string {
    return this.getCacheKey('openApplication', userId, roleSetId);
  }

  private getAgentRolesCacheKey(agentId: string, roleSetId: string): string {
    return this.getCacheKey('agentRoles', agentId, roleSetId);
  }

  private getAgentIsMemberCacheKey(agentId: string, roleSetId: string): string {
    return this.getCacheKey('isMember', agentId, roleSetId);
  }

  /* Public Cache Retrieval Methods */

  /**
   * Retrieve the membership status from cache.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached CommunityMembershipStatus or undefined.
   */
  public getMembershipStatusFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<CommunityMembershipStatus | undefined> {
    return this.cacheGet<CommunityMembershipStatus>(
      this.getMembershipStatusCacheKey(agentId, roleSetId)
    );
  }

  /**
   * Retrieve an open invitation from cache.
   * @param userId - User identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached IInvitation or undefined.
   */
  public getOpenInvitationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<IInvitation | undefined> {
    return this.cacheGet<IInvitation>(
      this.getOpenInvitationCacheKey(userId, roleSetId)
    );
  }

  /**
   * Retrieve an open application from cache.
   * @param userId - User identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached IApplication or undefined.
   */
  public getOpenApplicationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<IApplication | undefined> {
    return this.cacheGet<IApplication>(
      this.getOpenApplicationCacheKey(userId, roleSetId)
    );
  }

  /**
   * Retrieve agent roles from cache.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached RoleName array or undefined.
   */
  public getAgentRolesFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<RoleName[] | undefined> {
    return this.cacheGet<RoleName[]>(
      this.getAgentRolesCacheKey(agentId, roleSetId)
    );
  }

  /**
   * Retrieve whether the agent is a member from cache.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached boolean value or undefined.
   */
  public getAgentIsMemberFromCache(
    agentId: string,
    roleSetId: string
  ): Promise<boolean | undefined> {
    return this.cacheGet<boolean>(
      this.getAgentIsMemberCacheKey(agentId, roleSetId)
    );
  }

  /* Batch Cache Retrieval Methods (mget) */

  /**
   * Retrieve agent roles for multiple (agentId, roleSetId) pairs in a single round-trip.
   */
  public async getAgentRolesBatchFromCache(
    entries: ReadonlyArray<{ agentId: string; roleSetId: string }>
  ): Promise<(RoleName[] | undefined)[]> {
    const keys = entries.map(e =>
      this.getAgentRolesCacheKey(e.agentId, e.roleSetId)
    );
    return this.cacheMget<RoleName[]>(keys);
  }

  /**
   * Retrieve membership status for multiple (agentId, roleSetId) pairs in a single round-trip.
   */
  public async getMembershipStatusBatchFromCache(
    entries: ReadonlyArray<{ agentId: string; roleSetId: string }>
  ): Promise<(CommunityMembershipStatus | undefined)[]> {
    const keys = entries.map(e =>
      this.getMembershipStatusCacheKey(e.agentId, e.roleSetId)
    );
    return this.cacheMget<CommunityMembershipStatus>(keys);
  }

  /* Public Cache Deletion Methods */

  /**
   * Deletes all cache entries related to an agent's membership.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @returns Promise that resolves when deletion is complete.
   */
  public async cleanAgentMembershipCache(
    agentId: string,
    roleSetId: string
  ): Promise<void> {
    await Promise.all([
      this.cacheDel(this.getMembershipStatusCacheKey(agentId, roleSetId)),
      this.cacheDel(this.getAgentRolesCacheKey(agentId, roleSetId)),
      this.cacheDel(this.getAgentIsMemberCacheKey(agentId, roleSetId)),
    ]);
  }

  /**
   * Delete the open invitation from cache.
   * @param userId - User identifier.
   * @param roleSetId - Role set identifier.
   * @returns Promise resolving when deletion is complete.
   */
  public deleteOpenInvitationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<any> {
    return this.cacheDel(this.getOpenInvitationCacheKey(userId, roleSetId));
  }

  /**
   * Delete the open application from cache.
   * @param userId - User identifier.
   * @param roleSetId - Role set identifier.
   * @returns Promise resolving when deletion is complete.
   */
  public deleteOpenApplicationFromCache(
    userId: string,
    roleSetId: string
  ): Promise<any> {
    return this.cacheDel(this.getOpenApplicationCacheKey(userId, roleSetId));
  }

  /* Public Cache Update Methods */

  /**
   * Set membership status in cache.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @param membershipStatus - Membership status value.
   * @returns The cached membership status.
   */
  public setMembershipStatusCache(
    agentId: string,
    roleSetId: string,
    membershipStatus: CommunityMembershipStatus
  ): Promise<CommunityMembershipStatus> {
    return this.cacheSet(
      this.getMembershipStatusCacheKey(agentId, roleSetId),
      membershipStatus
    );
  }

  public deleteMembershipStatusCache(
    agentId: string,
    roleSetId: string
  ): Promise<any> {
    return this.cacheDel(this.getMembershipStatusCacheKey(agentId, roleSetId));
  }

  /**
   * Set open invitation in cache.
   * @param userId - User identifier.
   * @param roleSetId - Role set identifier.
   * @param invitation - Invitation object.
   * @returns The cached invitation.
   */
  public setOpenInvitationCache(
    userId: string,
    roleSetId: string,
    invitation: IInvitation
  ): Promise<IInvitation> {
    return this.cacheSet(
      this.getOpenInvitationCacheKey(userId, roleSetId),
      invitation
    );
  }

  /**
   * Set open application in cache.
   * @param userId - User identifier.
   * @param roleSetId - Role set identifier.
   * @param application - Application object.
   * @returns The cached application.
   */
  public setOpenApplicationCache(
    userId: string,
    roleSetId: string,
    application: IApplication
  ): Promise<IApplication> {
    return this.cacheSet(
      this.getOpenApplicationCacheKey(userId, roleSetId),
      application
    );
  }

  /**
   * Set agent roles in cache.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @param roles - Array of role names.
   * @returns The cached roles.
   */
  public setAgentRolesCache(
    agentId: string,
    roleSetId: string,
    roles: RoleName[]
  ): Promise<RoleName[]> {
    return this.cacheSet(this.getAgentRolesCacheKey(agentId, roleSetId), roles);
  }

  /**
   * Set agent membership status in cache.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @param isMember - Boolean indicating membership.
   * @returns The cached membership flag.
   */
  public setAgentIsMemberCache(
    agentId: string,
    roleSetId: string,
    isMember: boolean
  ): Promise<boolean> {
    return this.cacheSet(
      this.getAgentIsMemberCacheKey(agentId, roleSetId),
      isMember
    );
  }

  /**
   * Add a single role to the agent's existing cached roles.
   * @param agentId - Agent identifier.
   * @param roleSetId - Role set identifier.
   * @param role - Role name to add.
   * @returns The updated cached roles array or undefined if no existing roles.
   */
  public async appendAgentRoleCache(
    agentId: string,
    roleSetId: string,
    role: RoleName
  ): Promise<RoleName[] | undefined> {
    const existingRoles = await this.getAgentRolesFromCache(agentId, roleSetId);
    if (!existingRoles) {
      return undefined;
    }

    // Only add the role if it's not already present
    if (!existingRoles.includes(role)) {
      const updatedRoles = [...existingRoles, role];
      await this.setAgentRolesCache(agentId, roleSetId, updatedRoles);
      return updatedRoles;
    }

    return existingRoles;
  }
}
