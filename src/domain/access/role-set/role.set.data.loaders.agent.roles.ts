import { RoleName } from '@common/enums/role.name';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import { IRole } from '../role/role.interface';
import {
  ensureRolesLoaded,
  loadAgentCredentials,
} from './role.set.data.loader.utils';
import { RoleSet } from './role.set.entity';
import { RoleSetCacheService } from './role.set.service.cache';
import { AgentRoleKey } from './types';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetAgentRolesDataLoader {
  public readonly loader: DataLoader<AgentRoleKey, RoleName[], string>;

  constructor(
    private readonly agentService: AgentService,
    private readonly roleSetCacheService: RoleSetCacheService,
    @InjectRepository(RoleSet)
    private readonly roleSetRepository: Repository<RoleSet>
  ) {
    this.loader = new DataLoader<AgentRoleKey, RoleName[], string>(
      async (keys: readonly AgentRoleKey[]) => this.batchLoad(keys),
      {
        cacheKeyFn: (key: AgentRoleKey) =>
          `${key.agentInfo.agentID}-${key.roleSet.id}`,
      }
    );
  }

  private async batchLoad(
    keys: readonly AgentRoleKey[]
  ): Promise<RoleName[][]> {
    const results: RoleName[][] = new Array(keys.length);

    // 1. Load agent credentials ONCE for the unique agent(s) in this batch.
    //    In the MyMemberships flow all keys share the same agentID.
    const credentialsByAgent = await loadAgentCredentials(
      keys,
      this.agentService
    );

    // 2. Check Redis cache via single mget; collect indices that still need computation.
    const cacheEntries: Array<{ agentId: string; roleSetId: string }> = [];
    const cacheIndexMap: number[] = []; // cacheEntries[j] corresponds to keys[cacheIndexMap[j]]
    for (let i = 0; i < keys.length; i++) {
      const { agentInfo, roleSet } = keys[i];
      if (!agentInfo.agentID) {
        results[i] = [];
      } else {
        cacheEntries.push({
          agentId: agentInfo.agentID,
          roleSetId: roleSet.id,
        });
        cacheIndexMap.push(i);
      }
    }
    const cachedValues =
      await this.roleSetCacheService.getAgentRolesBatchFromCache(cacheEntries);

    const uncachedIndices: number[] = [];
    for (let j = 0; j < cachedValues.length; j++) {
      const cached = cachedValues[j];
      if (cached) {
        results[cacheIndexMap[j]] = cached;
      } else {
        uncachedIndices.push(cacheIndexMap[j]);
      }
    }

    // 3. Batch-load roles for any roleSets that don't have them pre-loaded.
    await ensureRolesLoaded(
      uncachedIndices.map(i => keys[i].roleSet),
      this.roleSetRepository
    );

    // 4. In-memory credential matching for uncached keys.
    for (const i of uncachedIndices) {
      const { agentInfo, roleSet } = keys[i];
      const credentials = credentialsByAgent.get(agentInfo.agentID);
      if (!credentials) {
        results[i] = [];
        continue;
      }

      const agentRoles = this.matchRolesInMemory(
        roleSet.roles ?? [],
        credentials
      );
      results[i] = agentRoles;

      // 5. Cache the result.
      await this.roleSetCacheService.setAgentRolesCache(
        agentInfo.agentID,
        roleSet.id,
        agentRoles
      );
    }

    return results;
  }

  /** Pure in-memory check: which roles does the agent hold? */
  private matchRolesInMemory(
    roleDefinitions: IRole[],
    credentials: ICredential[]
  ): RoleName[] {
    const agentRoles: RoleName[] = [];
    for (const roleDef of roleDefinitions) {
      const credDef = roleDef.credential;
      const hasRole = credentials.some(
        c =>
          c.type === credDef.type &&
          (!credDef.resourceID || c.resourceID === credDef.resourceID)
      );
      if (hasRole) {
        agentRoles.push(roleDef.name);
      }
    }
    return agentRoles;
  }
}
