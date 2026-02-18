import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import { InvitationService } from '../invitation/invitation.service';
import {
  ensureRolesLoaded,
  loadActorCredentials,
} from './role.set.data.loader.utils';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';
import { RoleSetCacheService } from './role.set.service.cache';
import { ActorRoleKey } from './types';

@Injectable({ scope: Scope.REQUEST })
export class RoleSetMembershipStatusDataLoader {
  public readonly loader: DataLoader<
    ActorRoleKey,
    CommunityMembershipStatus,
    string
  >;

  constructor(
    private readonly actorService: ActorService,
    private readonly roleSetCacheService: RoleSetCacheService,
    private readonly roleSetService: RoleSetService,
    private readonly invitationService: InvitationService,
    @InjectRepository(RoleSet)
    private readonly roleSetRepository: Repository<RoleSet>
  ) {
    this.loader = new DataLoader<
      ActorRoleKey,
      CommunityMembershipStatus,
      string
    >(async (keys: readonly ActorRoleKey[]) => this.batchLoad(keys), {
      cacheKeyFn: (key: ActorRoleKey) =>
        `${key.actorContext.actorId}-${key.roleSet.id}`,
    });
  }

  private async batchLoad(
    keys: readonly ActorRoleKey[]
  ): Promise<CommunityMembershipStatus[]> {
    const results: CommunityMembershipStatus[] = new Array(keys.length);

    // 1. Load agent credentials ONCE for the unique agent(s) in this batch.
    const credentialsByAgent = await loadActorCredentials(
      keys,
      this.actorService
    );

    // 2. Check Redis cache via single mget; collect indices that still need computation.
    const cacheEntries: Array<{ actorId: string; roleSetId: string }> = [];
    const cacheIndexMap: number[] = []; // cacheEntries[j] corresponds to keys[cacheIndexMap[j]]
    for (let i = 0; i < keys.length; i++) {
      const { actorContext, roleSet } = keys[i];
      if (!actorContext.actorId) {
        results[i] = CommunityMembershipStatus.NOT_MEMBER;
      } else {
        cacheEntries.push({
          actorId: actorContext.actorId,
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
      this.roleSetRepository
    );

    // 4. In-memory membership check; split into members and non-members.
    const nonMemberIndices: number[] = [];
    const cacheWrites: Promise<unknown>[] = [];

    for (const i of uncachedIndices) {
      const { actorContext, roleSet } = keys[i];
      const credentials = credentialsByAgent.get(actorContext.actorId);

      if (credentials && this.isMemberInMemory(roleSet, credentials)) {
        results[i] = CommunityMembershipStatus.MEMBER;
        cacheWrites.push(
          this.roleSetCacheService.setMembershipStatusCache(
            actorContext.actorId,
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
        const { actorContext, roleSet } = keys[i];
        const status = await this.resolveNonMemberStatus(actorContext, roleSet);
        results[i] = status;
        cacheWrites.push(
          this.roleSetCacheService.setMembershipStatusCache(
            actorContext.actorId,
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
    actorContext: { actorId: string },
    roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    // Fetch application and invitation concurrently
    const [openApplication, openInvitation] = await Promise.all([
      this.roleSetService.findOpenApplication(actorContext.actorId, roleSet.id),
      this.roleSetService.findOpenInvitation(actorContext.actorId, roleSet.id),
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
