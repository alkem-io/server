import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { Inject, Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { InvitationService } from '../invitation/invitation.service';
import {
  ensureRolesLoaded,
  loadAgentCredentials,
} from './role.set.data.loader.utils';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';
import { RoleSetCacheService } from './role.set.service.cache';
import { AgentRoleKey } from './types';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetMembershipStatusDataLoader {
  public readonly loader: DataLoader<
    AgentRoleKey,
    CommunityMembershipStatus,
    string
  >;

  constructor(
    private readonly agentService: AgentService,
    private readonly roleSetCacheService: RoleSetCacheService,
    private readonly roleSetService: RoleSetService,
    private readonly invitationService: InvitationService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {
    this.loader = new DataLoader<
      AgentRoleKey,
      CommunityMembershipStatus,
      string
    >(async (keys: readonly AgentRoleKey[]) => this.batchLoad(keys), {
      cacheKeyFn: (key: AgentRoleKey) =>
        `${key.agentInfo.agentID}-${key.roleSet.id}`,
    });
  }

  private async batchLoad(
    keys: readonly AgentRoleKey[]
  ): Promise<CommunityMembershipStatus[]> {
    const results: CommunityMembershipStatus[] = new Array(keys.length);

    // 1. Load agent credentials ONCE for the unique agent(s) in this batch.
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
        results[i] = CommunityMembershipStatus.NOT_MEMBER;
      } else {
        cacheEntries.push({
          agentId: agentInfo.agentID,
          roleSetId: roleSet.id,
        });
        cacheIndexMap.push(i);
      }
    }
    const cachedValues =
      await this.roleSetCacheService.getMembershipStatusBatchFromCache(
        cacheEntries
      );

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
      this.db
    );

    // 4. In-memory membership check; split into members and non-members.
    const nonMemberIndices: number[] = [];
    const cacheWrites: Promise<unknown>[] = [];

    for (const i of uncachedIndices) {
      const { agentInfo, roleSet } = keys[i];
      const credentials = credentialsByAgent.get(agentInfo.agentID);

      if (credentials && this.isMemberInMemory(roleSet, credentials)) {
        results[i] = CommunityMembershipStatus.MEMBER;
        cacheWrites.push(
          this.roleSetCacheService.setMembershipStatusCache(
            agentInfo.agentID,
            roleSet.id,
            CommunityMembershipStatus.MEMBER
          )
        );
      } else {
        nonMemberIndices.push(i);
      }
    }

    // 5. Resolve non-member statuses in parallel (application + invitation checks).
    await Promise.all(
      nonMemberIndices.map(async i => {
        const { agentInfo, roleSet } = keys[i];
        const status = await this.resolveNonMemberStatus(agentInfo, roleSet);
        results[i] = status;
        cacheWrites.push(
          this.roleSetCacheService.setMembershipStatusCache(
            agentInfo.agentID,
            roleSet.id,
            status
          )
        );
      })
    );

    // 6. Fire-and-forget: cache writes don't affect the response.
    void Promise.all(cacheWrites);

    return results;
  }

  /** Pure in-memory check: does the agent hold the MEMBER role? */
  private isMemberInMemory(
    roleSet: IRoleSet,
    credentials: ICredential[]
  ): boolean {
    const memberRole = (roleSet.roles ?? []).find(
      r => r.name === RoleName.MEMBER
    );
    if (!memberRole) return false;

    const credDef = memberRole.credential;
    return credentials.some(
      c =>
        c.type === credDef.type &&
        (!credDef.resourceID || c.resourceID === credDef.resourceID)
    );
  }

  /** For non-members, check pending applications and invitations in parallel. */
  private async resolveNonMemberStatus(
    agentInfo: { userID: string },
    roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    // Fetch application and invitation concurrently
    const [openApplication, openInvitation] = await Promise.all([
      this.roleSetService.findOpenApplication(agentInfo.userID, roleSet.id),
      this.roleSetService.findOpenInvitation(agentInfo.userID, roleSet.id),
    ]);

    if (openApplication) {
      return CommunityMembershipStatus.APPLICATION_PENDING;
    }

    // Lifecycle is already eager-loaded; check in-memory without re-fetching
    if (
      openInvitation &&
      this.invitationService.canAcceptInvitation(openInvitation)
    ) {
      return CommunityMembershipStatus.INVITATION_PENDING;
    }

    return CommunityMembershipStatus.NOT_MEMBER;
  }
}
