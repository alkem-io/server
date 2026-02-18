import { SYSTEM_ACTOR_IDS } from '@common/constants/system.actor.ids';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import DataLoader from 'dataloader';
import { EntityManager, In } from 'typeorm';

/**
 * DataLoader creator for batching contributor lookups by agent ID.
 * This prevents N+1 queries when resolving message senders and reaction senders.
 * Queries User, Organization, and VirtualContributor entities in parallel.
 */
@Injectable()
export class ContributorByAgentIdLoaderCreator
  implements DataLoaderCreator<IActor | null>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<IActor | null> {
    return new DataLoader<string, IActor | null>(
      async agentIds => this.batchLoadByAgentIds(agentIds),
      { cache: true, name: 'ContributorByAgentIdLoader' }
    );
  }

  private async batchLoadByAgentIds(
    agentIds: readonly string[]
  ): Promise<(IActor | null)[]> {
    // Filter out system actors and invalid UUIDs
    const validIds = [...agentIds].filter(
      id => !SYSTEM_ACTOR_IDS.has(id) && isUUID(id)
    );

    if (validIds.length === 0) {
      return agentIds.map(() => null);
    }

    // Parallel batch queries for all contributor types
    // Since entities now extend Actor directly, the entity ID is the actor ID
    const [users, orgs, vcs] = await Promise.all([
      this.manager.find(User, {
        where: { id: In(validIds) },
        relations: { profile: true },
      }),
      this.manager.find(Organization, {
        where: { id: In(validIds) },
        relations: { profile: true },
      }),
      this.manager.find(VirtualContributor, {
        where: { id: In(validIds) },
        relations: { profile: true },
      }),
    ]);

    // Map by actor ID (which is the entity ID) for O(1) lookup
    const byAgentId = new Map<string, IActor>();
    for (const u of users) byAgentId.set(u.id, u);
    for (const o of orgs) byAgentId.set(o.id, o);
    for (const vc of vcs) byAgentId.set(vc.id, vc);

    // Return in input order
    return agentIds.map(id => byAgentId.get(id) ?? null);
  }
}
