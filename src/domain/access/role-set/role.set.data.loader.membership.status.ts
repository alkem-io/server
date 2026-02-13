import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import { InvitationService } from '../invitation/invitation.service';
import {
  ensureRolesLoaded,
  loadAgentCredentials,
} from './role.set.data.loader.utils';
import { RoleSet } from './role.set.entity';
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
    @InjectRepository(RoleSet)
    private readonly roleSetRepository: Repository<RoleSet>
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

    // 2. Check Redis cache; collect indices that still need computation.
    const uncachedIndices: number[] = [];
    for (let i = 0; i < keys.length; i++) {
      const { agentInfo, roleSet } = keys[i];
      if (!agentInfo.agentID) {
        results[i] = CommunityMembershipStatus.NOT_MEMBER;
        continue;
      }

      const cached =
        await this.roleSetCacheService.getMembershipStatusFromCache(
          agentInfo.agentID,
          roleSet.id
        );
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
      }
    }

    // 3. Batch-load roles for any roleSets that don't have them pre-loaded.
    await ensureRolesLoaded(
      uncachedIndices.map(i => keys[i].roleSet),
      this.roleSetRepository
    );

    // 4. In-memory membership check + fallback for non-members.
    for (const i of uncachedIndices) {
      const { agentInfo, roleSet } = keys[i];
      const credentials = credentialsByAgent.get(agentInfo.agentID);

      // Check member credential in memory
      if (credentials && this.isMemberInMemory(roleSet, credentials)) {
        results[i] = CommunityMembershipStatus.MEMBER;
        await this.roleSetCacheService.setMembershipStatusCache(
          agentInfo.agentID,
          roleSet.id,
          CommunityMembershipStatus.MEMBER
        );
        continue;
      }

      // For non-members: check application & invitation (already cached individually)
      const status = await this.resolveNonMemberStatus(agentInfo, roleSet);
      results[i] = status;
      await this.roleSetCacheService.setMembershipStatusCache(
        agentInfo.agentID,
        roleSet.id,
        status
      );
    }

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

  /** For non-members, check pending applications and invitations. */
  private async resolveNonMemberStatus(
    agentInfo: { userID: string },
    roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    const openApplication = await this.roleSetService.findOpenApplication(
      agentInfo.userID,
      roleSet.id
    );
    if (openApplication) {
      return CommunityMembershipStatus.APPLICATION_PENDING;
    }

    const openInvitation = await this.roleSetService.findOpenInvitation(
      agentInfo.userID,
      roleSet.id
    );
    if (
      openInvitation &&
      (await this.invitationService.canInvitationBeAccepted(openInvitation.id))
    ) {
      return CommunityMembershipStatus.INVITATION_PENDING;
    }

    return CommunityMembershipStatus.NOT_MEMBER;
  }
}
