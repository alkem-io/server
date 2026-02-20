import { ActorType } from '@common/enums/actor.type';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';

@Injectable()
export class ActorTypeCacheService {
  private readonly cache_ttl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private configService: ConfigService<AlkemioConfig, true>
  ) {
    // Actor types are immutable - use a long TTL (default 1 hour)
    this.cache_ttl =
      this.configService.get('identity.authentication.cache_ttl', {
        infer: true,
      }) || 3600;
  }

  /**
   * Get actor type from cache.
   * @param actorID - Actor identifier.
   * @returns Cached ActorType or undefined if not found.
   */
  public getActorType(actorID: string): Promise<ActorType | undefined> {
    return this.cacheManager.get<ActorType>(this.getActorTypeCacheKey(actorID));
  }

  /**
   * Set actor type in cache.
   * @param actorID - Actor identifier.
   * @param actorType - Actor type to cache.
   * @returns The cached actor type.
   */
  public setActorType(
    actorID: string,
    actorType: ActorType
  ): Promise<ActorType> {
    return this.cacheManager.set<ActorType>(
      this.getActorTypeCacheKey(actorID),
      actorType,
      { ttl: this.cache_ttl }
    );
  }

  /**
   * Set multiple actor types in cache.
   * @param typeMap - Map of actorID to ActorType.
   * @returns Promise resolving when all entries are cached.
   */
  public async setActorTypes(typeMap: Map<string, ActorType>): Promise<void> {
    const promises: Promise<ActorType>[] = [];
    for (const [actorID, actorType] of typeMap) {
      promises.push(this.setActorType(actorID, actorType));
    }
    await Promise.all(promises);
  }

  /**
   * Get multiple actor types from cache.
   * @param actorIDs - Array of actor identifiers.
   * @returns Map of actorID to ActorType for found entries.
   */
  public async getActorTypes(
    actorIDs: string[]
  ): Promise<Map<string, ActorType>> {
    const result = new Map<string, ActorType>();
    const promises = actorIDs.map(async actorID => {
      const type = await this.getActorType(actorID);
      if (type != null) {
        result.set(actorID, type);
      }
    });
    await Promise.all(promises);
    return result;
  }

  /**
   * Delete actor type from cache.
   * @param actorID - Actor identifier.
   * @returns Promise resolving when deletion is complete.
   */
  public deleteActorType(actorID: string): Promise<void> {
    return this.cacheManager.del(this.getActorTypeCacheKey(actorID));
  }

  private getActorTypeCacheKey(actorID: string): string {
    return `@actorType:${actorID}`;
  }
}
