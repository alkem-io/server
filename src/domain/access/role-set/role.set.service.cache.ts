import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { IInvitation } from '../invitation';
import { RoleName } from '@common/enums/role.name';
import { IApplication } from '../application';

@Injectable()
export class RoleSetCacheService {
  private readonly cache_ttl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
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
  private cacheGet<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Set a value in cache.
   * @param key - Cache key
   * @param value - Value to cache
   * @returns The cached value.
   */
  private cacheSet<T>(key: string, value: T): Promise<T> {
    return this.cacheManager.set<T>(key, value, { ttl: this.cache_ttl });
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
   * @param id1 - First identifier (actorId or userId)
   * @param roleSetId - Role set identifier.
   * @returns A string representing the cache key.
   */
  private getCacheKey(prefix: string, id1: string, roleSetId: string): string {
    return `${prefix}:${id1}:${roleSetId}`;
  }

  private getMembershipStatusCacheKey(
    actorId: string,
    roleSetId: string
  ): string {
    return this.getCacheKey('membershipStatus', actorId, roleSetId);
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

  private getActorRolesCacheKey(actorId: string, roleSetId: string): string {
    return this.getCacheKey('actorRoles', actorId, roleSetId);
  }

  private getActorIsMemberCacheKey(actorId: string, roleSetId: string): string {
    return this.getCacheKey('isMember', actorId, roleSetId);
  }

  /* Public Cache Retrieval Methods */

  /**
   * Retrieve the membership status from cache.
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached CommunityMembershipStatus or undefined.
   */
  public getMembershipStatusFromCache(
    actorId: string,
    roleSetId: string
  ): Promise<CommunityMembershipStatus | undefined> {
    return this.cacheGet<CommunityMembershipStatus>(
      this.getMembershipStatusCacheKey(actorId, roleSetId)
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
   * Retrieve actor roles from cache.
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached RoleName array or undefined.
   */
  public getActorRolesFromCache(
    actorId: string,
    roleSetId: string
  ): Promise<RoleName[] | undefined> {
    return this.cacheGet<RoleName[]>(
      this.getActorRolesCacheKey(actorId, roleSetId)
    );
  }

  /**
   * Retrieve whether the actor is a member from cache.
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @returns Cached boolean value or undefined.
   */
  public getActorIsMemberFromCache(
    actorId: string,
    roleSetId: string
  ): Promise<boolean | undefined> {
    return this.cacheGet<boolean>(
      this.getActorIsMemberCacheKey(actorId, roleSetId)
    );
  }

  /* Public Cache Deletion Methods */

  /**
   * Deletes all cache entries related to an actor's membership.
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @returns Promise that resolves when deletion is complete.
   */
  public async cleanActorMembershipCache(
    actorId: string,
    roleSetId: string
  ): Promise<void> {
    await Promise.all([
      this.cacheDel(this.getMembershipStatusCacheKey(actorId, roleSetId)),
      this.cacheDel(this.getActorRolesCacheKey(actorId, roleSetId)),
      this.cacheDel(this.getActorIsMemberCacheKey(actorId, roleSetId)),
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
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @param membershipStatus - Membership status value.
   * @returns The cached membership status.
   */
  public setMembershipStatusCache(
    actorId: string,
    roleSetId: string,
    membershipStatus: CommunityMembershipStatus
  ): Promise<CommunityMembershipStatus> {
    return this.cacheSet(
      this.getMembershipStatusCacheKey(actorId, roleSetId),
      membershipStatus
    );
  }

  public deleteMembershipStatusCache(
    actorId: string,
    roleSetId: string
  ): Promise<any> {
    return this.cacheDel(this.getMembershipStatusCacheKey(actorId, roleSetId));
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
   * Set actor roles in cache.
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @param roles - Array of role names.
   * @returns The cached roles.
   */
  public setActorRolesCache(
    actorId: string,
    roleSetId: string,
    roles: RoleName[]
  ): Promise<RoleName[]> {
    return this.cacheSet(this.getActorRolesCacheKey(actorId, roleSetId), roles);
  }

  /**
   * Set actor membership status in cache.
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @param isMember - Boolean indicating membership.
   * @returns The cached membership flag.
   */
  public setActorIsMemberCache(
    actorId: string,
    roleSetId: string,
    isMember: boolean
  ): Promise<boolean> {
    return this.cacheSet(
      this.getActorIsMemberCacheKey(actorId, roleSetId),
      isMember
    );
  }

  /**
   * Add a single role to the actor's existing cached roles.
   * @param actorId - Actor identifier.
   * @param roleSetId - Role set identifier.
   * @param role - Role name to add.
   * @returns The updated cached roles array or undefined if no existing roles.
   */
  public async appendActorRoleCache(
    actorId: string,
    roleSetId: string,
    role: RoleName
  ): Promise<RoleName[] | undefined> {
    const existingRoles = await this.getActorRolesFromCache(actorId, roleSetId);
    if (!existingRoles) {
      return undefined;
    }

    // Only add the role if it's not already present
    if (!existingRoles.includes(role)) {
      const updatedRoles = [...existingRoles, role];
      await this.setActorRolesCache(actorId, roleSetId, updatedRoles);
      return updatedRoles;
    }

    return existingRoles;
  }
}
