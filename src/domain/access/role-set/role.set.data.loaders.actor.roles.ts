import { RoleName } from '@common/enums/role.name';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import {
  ensureRolesLoaded,
  loadActorCredentials,
} from './role.set.data.loader.utils';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleSetCacheService } from './role.set.service.cache';
import { ActorRoleKey } from './types';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetActorRolesDataLoader {
  public readonly loader: DataLoader<ActorRoleKey, RoleName[], string>;

  constructor(
    private readonly actorService: ActorService,
    private readonly roleSetCacheService: RoleSetCacheService,
    @InjectRepository(RoleSet)
    private readonly roleSetRepository: Repository<RoleSet>
  ) {
    this.loader = new DataLoader<ActorRoleKey, RoleName[], string>(
      async (keys: readonly ActorRoleKey[]) => this.batchLoad(keys),
      {
        cacheKeyFn: (key: ActorRoleKey) =>
          `${key.actorContext.actorID}-${key.roleSet.id}`,
      }
    );
  }

  private async batchLoad(
    keys: readonly ActorRoleKey[]
  ): Promise<RoleName[][]> {
    const results: RoleName[][] = new Array(keys.length);

    // 1. Anonymous keys have no roles; the rest are looked up in the cache.
    const cacheEntries: Array<{ actorID: string; roleSetId: string }> = [];
    const cacheIndexMap: number[] = [];
    for (let i = 0; i < keys.length; i++) {
      const { actorContext, roleSet } = keys[i];
      if (!actorContext.actorID) {
        results[i] = [];
      } else {
        cacheEntries.push({
          actorID: actorContext.actorID,
          roleSetId: roleSet.id,
        });
        cacheIndexMap.push(i);
      }
    }
    const cachedValues =
      await this.roleSetCacheService.getActorRolesBatchFromCache(cacheEntries);

    const uncachedIndices: number[] = [];
    // Driven by the entries, not by the reply: a store that answers with a
    // shorter array must read as a miss rather than leave a hole in `results`.
    for (let j = 0; j < cacheEntries.length; j++) {
      const cached = cachedValues[j];
      if (cached !== undefined) {
        results[cacheIndexMap[j]] = cached;
      } else {
        uncachedIndices.push(cacheIndexMap[j]);
      }
    }
    if (uncachedIndices.length === 0) {
      return results;
    }

    // 2. For the misses only: credentials once per actor, role definitions once.
    const uncachedKeys = uncachedIndices.map(i => keys[i]);
    const [credentialsByActor] = await Promise.all([
      loadActorCredentials(uncachedKeys, this.actorService),
      ensureRolesLoaded(
        uncachedKeys.map(k => k.roleSet),
        this.roleSetRepository
      ),
    ]);

    // 3. Resolve in memory, then write back before returning: a write that
    // landed after a concurrent mutation invalidated the key would put the
    // stale roles back for the whole TTL.
    const cacheWrites: Promise<unknown>[] = [];
    for (const i of uncachedIndices) {
      const { actorContext, roleSet } = keys[i];
      const roles = this.resolveRolesInMemory(
        roleSet,
        credentialsByActor.get(actorContext.actorID) ?? []
      );
      results[i] = roles;
      if (roleSet.roles) {
        cacheWrites.push(
          this.roleSetCacheService.setActorRolesCache(
            actorContext.actorID,
            roleSet.id,
            roles
          )
        );
      }
    }
    await Promise.all(cacheWrites);

    return results;
  }

  /** Pure in-memory check: which of the role set's roles do the credentials grant? */
  private resolveRolesInMemory(
    roleSet: IRoleSet,
    credentials: ICredential[]
  ): RoleName[] {
    return (roleSet.roles ?? [])
      .filter(role =>
        credentials.some(
          c =>
            c.type === role.credential.type &&
            (!role.credential.resourceID ||
              c.resourceID === role.credential.resourceID)
        )
      )
      .map(role => role.name);
  }
}
